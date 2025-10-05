"""
Bloom detection service that orchestrates the entire bloom detection pipeline
"""

import asyncio
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
import os
import json

from app.services.gee_service import gee_service
from app.services.data_processor import data_processor
from app.database.models import SatelliteImage, BloomDetection, BloomCluster, AnalysisJob
from app.database.database import SessionLocal
from app.core.config import settings

logger = logging.getLogger(__name__)

class BloomDetector:
    """Main service for bloom detection pipeline"""
    
    def __init__(self):
        self.gee_service = gee_service
        self.data_processor = data_processor
    
    async def detect_blooms(
        self,
        start_date: datetime,
        end_date: datetime,
        bbox: Tuple[float, float, float, float],
        collection: str = "MODIS/006/MOD13Q1",
        detection_method: str = "ndvi_threshold"
    ) -> Dict:
        """
        Main method to detect blooms in a given area and time period
        
        Args:
            start_date: Start date for analysis
            end_date: End date for analysis
            bbox: Bounding box (min_lon, min_lat, max_lon, max_lat)
            collection: NASA collection to use (MOD13Q1, VNP13A1, etc.)
            detection_method: Method for bloom detection
            
        Returns:
            Dictionary with bloom detection results
        """
        try:
            logger.info(f"Starting bloom detection for {collection} from {start_date} to {end_date}")
            
            # Create analysis job record
            job_id = await self._create_analysis_job(
                job_type="bloom_detection",
                parameters={
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "bbox": bbox,
                    "collection": collection,
                    "detection_method": detection_method
                }
            )
            
            # Use Google Earth Engine for bloom detection
            if not self.gee_service.is_available():
                logger.error("Google Earth Engine not available")
                return await self._complete_job(job_id, status="failed", error="Google Earth Engine not available")
            
            # Detect blooms using GEE
            detection_result = await self._detect_blooms_gee(start_date, end_date, bbox, collection, detection_method)
            
            if not detection_result or "error" in detection_result:
                logger.warning("Bloom detection failed")
                return await self._complete_job(job_id, status="failed", error=detection_result.get("error", "Unknown error"))
            
            detection_results = [detection_result]
            
            # Combine results
            combined_results = await self._combine_detection_results(detection_results)
            
            # Store results in database
            await self._store_detection_results(combined_results, job_id)
            
            # Complete the job
            return await self._complete_job(job_id, status="completed", result=combined_results)
            
        except Exception as e:
            logger.error(f"Bloom detection failed: {e}")
            return {"error": str(e), "status": "failed"}
    
    async def _create_analysis_job(self, job_type: str, parameters: Dict) -> int:
        """Create a new analysis job record"""
        db = SessionLocal()
        try:
            job = AnalysisJob(
                job_type=job_type,
                parameters=parameters,
                status="running",
                started_at=datetime.utcnow()
            )
            db.add(job)
            db.commit()
            db.refresh(job)
            return job.id
        finally:
            db.close()
    
    async def _detect_blooms_gee(
        self,
        start_date: datetime,
        end_date: datetime,
        bbox: Tuple[float, float, float, float],
        collection: str,
        detection_method: str
    ) -> Dict:
        """Detect blooms using Google Earth Engine"""
        try:
            # Use GEE service to detect bloom areas
            if detection_method == "ndvi_threshold":
                result = await self.gee_service.detect_bloom_areas(
                    collection=collection,
                    start_date=start_date,
                    end_date=end_date,
                    bbox=bbox,
                    ndvi_threshold=0.6
                )
            else:
                # Default to NDVI threshold method
                result = await self.gee_service.detect_bloom_areas(
                    collection=collection,
                    start_date=start_date,
                    end_date=end_date,
                    bbox=bbox,
                    ndvi_threshold=0.6
                )
            
            if "error" in result:
                return result
            
            # Add temporal analysis
            temporal_result = await self.gee_service.analyze_temporal_patterns(
                collection=collection,
                start_date=start_date,
                end_date=end_date,
                bbox=bbox
            )
            
            # Combine results
            combined_result = {
                "detection_method": detection_method,
                "collection": collection,
                "bbox": bbox,
                "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
                "bloom_detection": result,
                "temporal_analysis": temporal_result,
                "processing_timestamp": datetime.utcnow().isoformat()
            }
            
            return combined_result
            
        except Exception as e:
            logger.error(f"Error in GEE bloom detection: {e}")
            return {"error": str(e)}
    
    async def _process_single_dataset(
        self, 
        dataset: Dict, 
        detection_method: str,
        bbox: Tuple[float, float, float, float]
    ) -> Optional[Dict]:
        """Process a single satellite dataset for bloom detection"""
        try:
            # Extract file URL and download if needed
            file_url = self.nasa_service.extract_file_url(dataset)
            if not file_url:
                logger.warning("Could not extract file URL from dataset")
                return None
            
            # Generate local filename
            filename = os.path.basename(file_url)
            local_path = os.path.join(settings.DATA_DIR, filename)
            
            # Download file if not exists
            if not os.path.exists(local_path):
                success = await self.nasa_service.download_file(file_url, local_path)
                if not success:
                    logger.error(f"Failed to download file: {filename}")
                    return None
            
            # Store satellite image metadata
            satellite_image = await self._store_satellite_image_metadata(dataset, local_path)
            
            # Process the image
            analysis_results = await self._analyze_satellite_image(local_path, detection_method)
            
            if not analysis_results:
                return None
            
            # Add metadata to results
            analysis_results.update({
                "satellite_image_id": satellite_image.id,
                "dataset_metadata": dataset,
                "bbox": bbox
            })
            
            return analysis_results
            
        except Exception as e:
            logger.error(f"Error processing dataset: {e}")
            return None
    
    async def _store_satellite_image_metadata(self, dataset: Dict, local_path: str) -> SatelliteImage:
        """Store satellite image metadata in database"""
        db = SessionLocal()
        try:
            # Extract metadata
            temporal_coverage = self.nasa_service.get_temporal_coverage(dataset)
            start_date = temporal_coverage[0] if temporal_coverage else datetime.utcnow()
            
            # Get file size
            file_size = os.path.getsize(local_path) if os.path.exists(local_path) else 0
            
            satellite_image = SatelliteImage(
                filename=os.path.basename(local_path),
                collection=dataset.get("collection_concept_id", "unknown"),
                satellite=self._extract_satellite_name(dataset),
                acquisition_date=start_date,
                file_size=file_size,
                download_url=dataset.get("links", [{}])[0].get("href", ""),
                local_path=local_path,
                processing_status="downloaded"
            )
            
            db.add(satellite_image)
            db.commit()
            db.refresh(satellite_image)
            
            return satellite_image
            
        finally:
            db.close()
    
    def _extract_satellite_name(self, dataset: Dict) -> str:
        """Extract satellite name from dataset metadata"""
        collection = dataset.get("collection_concept_id", "")
        if "MOD" in collection:
            return "MODIS"
        elif "VNP" in collection:
            return "VIIRS"
        elif "HLSL" in collection:
            return "Landsat"
        else:
            return "Unknown"
    
    async def _analyze_satellite_image(self, image_path: str, detection_method: str) -> Optional[Dict]:
        """Analyze satellite image for bloom detection"""
        try:
            # This is a simplified version - in practice, you'd load and process the actual satellite data
            # For now, we'll simulate the analysis
            
            if detection_method == "ndvi_threshold":
                return await self._ndvi_threshold_analysis(image_path)
            elif detection_method == "machine_learning":
                return await self._ml_bloom_analysis(image_path)
            elif detection_method == "spectral_analysis":
                return await self._spectral_analysis(image_path)
            else:
                logger.error(f"Unknown detection method: {detection_method}")
                return None
                
        except Exception as e:
            logger.error(f"Error analyzing satellite image: {e}")
            return None
    
    async def _ndvi_threshold_analysis(self, image_path: str) -> Dict:
        """Perform NDVI threshold-based bloom detection"""
        try:
            # Simulate NDVI analysis (in practice, you'd load the actual satellite data)
            # For demonstration, we'll create mock results
            
            # Simulate NDVI values
            ndvi_values = np.random.normal(0.4, 0.2, (1000, 1000))
            ndvi_values = np.clip(ndvi_values, -1, 1)
            
            # Detect vegetation and blooms
            vegetation_mask = self.data_processor.detect_vegetation(ndvi_values)
            bloom_mask = self.data_processor.detect_bloom_candidates(ndvi_values)
            
            # Clean up the masks
            cleaned_bloom_mask = self.data_processor.apply_morphological_operations(bloom_mask)
            
            # Detect clusters
            clusters = self.data_processor.detect_bloom_clusters(cleaned_bloom_mask)
            
            # Calculate statistics
            max_ndvi = np.max(ndvi_values)
            avg_ndvi = np.mean(ndvi_values[vegetation_mask])
            
            return {
                "detection_method": "ndvi_threshold",
                "max_ndvi": float(max_ndvi),
                "avg_ndvi": float(avg_ndvi),
                "bloom_areas_count": len(clusters),
                "total_bloom_area": sum(cluster["area"] for cluster in clusters),
                "clusters": clusters,
                "confidence_score": 0.8 if max_ndvi > 0.6 else 0.3,
                "analysis_results": {
                    "vegetation_pixels": int(np.sum(vegetation_mask)),
                    "bloom_pixels": int(np.sum(cleaned_bloom_mask)),
                    "total_pixels": ndvi_values.size
                }
            }
            
        except Exception as e:
            logger.error(f"Error in NDVI threshold analysis: {e}")
            return {}
    
    async def _ml_bloom_analysis(self, image_path: str) -> Dict:
        """Perform machine learning-based bloom detection"""
        try:
            # Placeholder for ML-based analysis
            # In practice, you'd load a trained model and apply it to the satellite data
            
            return {
                "detection_method": "machine_learning",
                "max_ndvi": 0.7,
                "avg_ndvi": 0.5,
                "bloom_areas_count": 3,
                "total_bloom_area": 1500.0,
                "clusters": [],
                "confidence_score": 0.9,
                "analysis_results": {
                    "model_version": "v1.0",
                    "prediction_confidence": 0.85
                }
            }
            
        except Exception as e:
            logger.error(f"Error in ML bloom analysis: {e}")
            return {}
    
    async def _spectral_analysis(self, image_path: str) -> Dict:
        """Perform spectral analysis-based bloom detection"""
        try:
            # Simulate spectral analysis
            # In practice, you'd analyze multiple spectral bands
            
            return {
                "detection_method": "spectral_analysis",
                "max_ndvi": 0.65,
                "avg_ndvi": 0.45,
                "bloom_areas_count": 2,
                "total_bloom_area": 800.0,
                "clusters": [],
                "confidence_score": 0.75,
                "analysis_results": {
                    "spectral_indices": ["NDVI", "EVI", "SAVI"],
                    "anomaly_score": 0.6
                }
            }
            
        except Exception as e:
            logger.error(f"Error in spectral analysis: {e}")
            return {}
    
    async def _combine_detection_results(self, results: List[Dict]) -> Dict:
        """Combine multiple detection results into a single summary"""
        try:
            if not results:
                return {"error": "No detection results to combine"}
            
            # Aggregate statistics
            total_bloom_areas = sum(r.get("bloom_areas_count", 0) for r in results)
            total_bloom_area = sum(r.get("total_bloom_area", 0) for r in results)
            max_ndvi = max(r.get("max_ndvi", 0) for r in results)
            avg_ndvi = np.mean([r.get("avg_ndvi", 0) for r in results])
            avg_confidence = np.mean([r.get("confidence_score", 0) for r in results])
            
            # Combine all clusters
            all_clusters = []
            for result in results:
                clusters = result.get("clusters", [])
                all_clusters.extend(clusters)
            
            return {
                "summary": {
                    "total_bloom_areas": total_bloom_areas,
                    "total_bloom_area": total_bloom_area,
                    "max_ndvi": max_ndvi,
                    "avg_ndvi": float(avg_ndvi),
                    "avg_confidence": float(avg_confidence),
                    "analysis_count": len(results)
                },
                "individual_results": results,
                "all_clusters": all_clusters,
                "detection_timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error combining detection results: {e}")
            return {"error": str(e)}
    
    async def _store_detection_results(self, results: Dict, job_id: int):
        """Store detection results in database"""
        db = SessionLocal()
        try:
            summary = results.get("summary", {})
            individual_results = results.get("individual_results", [])
            
            for result in individual_results:
                # Create bloom detection record
                bloom_detection = BloomDetection(
                    satellite_image_id=result.get("satellite_image_id"),
                    detection_method=result.get("detection_method", "unknown"),
                    bloom_areas_count=result.get("bloom_areas_count", 0),
                    total_bloom_area=result.get("total_bloom_area", 0),
                    max_ndvi_value=result.get("max_ndvi", 0),
                    avg_ndvi_value=result.get("avg_ndvi", 0),
                    confidence_score=result.get("confidence_score", 0),
                    bloom_coordinates=self._extract_bloom_coordinates(result.get("clusters", [])),
                    analysis_results=result.get("analysis_results", {}),
                    recommendations=self._generate_recommendations(result)
                )
                
                db.add(bloom_detection)
                db.flush()  # Get the ID
                
                # Store bloom clusters
                for cluster in result.get("clusters", []):
                    bloom_cluster = BloomCluster(
                        bloom_detection_id=bloom_detection.id,
                        cluster_id=cluster.get("id", 0),
                        area=cluster.get("area", 0),
                        centroid_lat=cluster.get("centroid", [0, 0])[1],
                        centroid_lon=cluster.get("centroid", [0, 0])[0],
                        min_lat=cluster.get("bounding_box", {}).get("y", 0),
                        max_lat=cluster.get("bounding_box", {}).get("y", 0) + cluster.get("bounding_box", {}).get("height", 0),
                        min_lon=cluster.get("bounding_box", {}).get("x", 0),
                        max_lon=cluster.get("bounding_box", {}).get("x", 0) + cluster.get("bounding_box", {}).get("width", 0),
                        avg_ndvi=cluster.get("avg_ndvi"),
                        max_ndvi=cluster.get("max_ndvi")
                    )
                    db.add(bloom_cluster)
            
            db.commit()
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error storing detection results: {e}")
        finally:
            db.close()
    
    def _extract_bloom_coordinates(self, clusters: List[Dict]) -> List[Dict]:
        """Extract coordinates from bloom clusters"""
        coordinates = []
        for cluster in clusters:
            bbox = cluster.get("bounding_box", {})
            coordinates.append({
                "cluster_id": cluster.get("id"),
                "centroid": cluster.get("centroid"),
                "bounding_box": bbox
            })
        return coordinates
    
    def _generate_recommendations(self, result: Dict) -> List[str]:
        """Generate recommendations based on detection results"""
        recommendations = []
        
        bloom_count = result.get("bloom_areas_count", 0)
        max_ndvi = result.get("max_ndvi", 0)
        confidence = result.get("confidence_score", 0)
        
        if bloom_count > 0:
            recommendations.append(f"Detected {bloom_count} bloom areas")
            
            if max_ndvi > 0.8:
                recommendations.append("Very high vegetation activity - possible mass flowering")
            elif max_ndvi > 0.6:
                recommendations.append("High vegetation activity detected")
            
            if confidence > 0.8:
                recommendations.append("High confidence in bloom detection")
            elif confidence < 0.5:
                recommendations.append("Low confidence - consider field verification")
        else:
            recommendations.append("No significant bloom activity detected")
        
        return recommendations
    
    async def _complete_job(self, job_id: int, status: str, result: Dict = None, error: str = None) -> Dict:
        """Complete an analysis job"""
        db = SessionLocal()
        try:
            job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
            if job:
                job.status = status
                job.completed_at = datetime.utcnow()
                if result:
                    job.result_data = result
                if error:
                    job.error_message = error
                
                db.commit()
            
            return {
                "job_id": job_id,
                "status": status,
                "result": result,
                "error": error,
                "completed_at": datetime.utcnow().isoformat()
            }
            
        finally:
            db.close()
    
    async def get_bloom_history(
        self,
        bbox: Tuple[float, float, float, float],
        days_back: int = 365
    ) -> Dict:
        """Get historical bloom detection data for an area"""
        db = SessionLocal()
        try:
            start_date = datetime.utcnow() - timedelta(days=days_back)
            
            # Query bloom detections in the area
            detections = db.query(BloomDetection).join(SatelliteImage).filter(
                SatelliteImage.acquisition_date >= start_date
            ).all()
            
            # Format results
            history = []
            for detection in detections:
                history.append({
                    "date": detection.satellite_image.acquisition_date.isoformat(),
                    "bloom_areas_count": detection.bloom_areas_count,
                    "total_bloom_area": detection.total_bloom_area,
                    "max_ndvi": detection.max_ndvi_value,
                    "confidence_score": detection.confidence_score,
                    "detection_method": detection.detection_method
                })
            
            return {
                "area": bbox,
                "period_days": days_back,
                "detections": history,
                "summary": {
                    "total_detections": len(history),
                    "avg_bloom_areas": np.mean([d["bloom_areas_count"] for d in history]) if history else 0,
                    "max_bloom_area": max([d["total_bloom_area"] for d in history]) if history else 0
                }
            }
            
        finally:
            db.close()

# Create global instance
bloom_detector = BloomDetector()
