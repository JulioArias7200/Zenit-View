"""
Google Earth Engine service for accessing NASA satellite data
This service uses GEE to access Landsat, MODIS, VIIRS data directly from NASA
"""

import ee
import logging
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import json
import os
from app.core.config import settings

logger = logging.getLogger(__name__)

class GEEService:
    """Service for accessing NASA satellite data through Google Earth Engine"""
    
    def __init__(self):
        self.initialized = False
        self._initialize_ee()
    
    def _initialize_ee(self):
        """Initialize Google Earth Engine"""
        try:
            # Set environment variable for credentials
            import os
            if not os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'):
                os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '/Users/amilcaryujra/.config/gcloud/application_default_credentials.json'
            
            # Initialize Earth Engine
            if not ee.data._initialized:
                ee.Initialize()
            
            # Test GEE with a simple operation
            try:
                test_collection = ee.ImageCollection('MODIS/006/MOD13Q1').limit(1)
                test_count = test_collection.size().getInfo()
                logger.info(f"GEE test successful (found {test_count} images)")
            except Exception as test_error:
                logger.warning(f"GEE test failed: {test_error}")
                # Don't fail initialization just because test failed
            
            self.initialized = True
            logger.info("Google Earth Engine initialized successfully")
            
        except Exception as e:
            logger.warning(f"Google Earth Engine not initialized: {e}")
            logger.info("GEE features will be disabled. Configure GEE authentication to enable.")
            self.initialized = False
    
    def is_available(self) -> bool:
        """Check if GEE is available and initialized"""
        return self.initialized
    
    async def get_landsat_ndvi(
        self,
        start_date: datetime,
        end_date: datetime,
        bbox: Tuple[float, float, float, float],
        cloud_filter: float = 20
    ) -> Dict:
        """
        Get Landsat NDVI data using Google Earth Engine
        
        Args:
            start_date: Start date for data collection
            end_date: End date for data collection
            bbox: Bounding box (min_lon, min_lat, max_lon, max_lat)
            cloud_filter: Maximum cloud coverage percentage
            
        Returns:
            Dictionary with NDVI data and metadata
        """
        try:
            if not self.initialized:
                raise Exception("Google Earth Engine not initialized")
            
            # Define area of interest
            min_lon, min_lat, max_lon, max_lat = bbox
            aoi = ee.Geometry.Rectangle([min_lon, min_lat, max_lon, max_lat])
            
            # Load Landsat 8/9 collection
            landsat = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2") \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filterBounds(aoi) \
                .filter(ee.Filter.lt('CLOUD_COVER', cloud_filter)) \
                .select(['SR_B4', 'SR_B5', 'QA_PIXEL'])  # Red, NIR, QA
            
            # Add NDVI calculation
            def add_ndvi(image):
                # Apply scale factors
                def apply_scale_factors(band):
                    return image.select(band).multiply(0.0000275).add(-0.2)
                
                red = apply_scale_factors('SR_B4')
                nir = apply_scale_factors('SR_B5')
                
                # Calculate NDVI
                ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
                
                # Apply cloud mask
                qa = image.select('QA_PIXEL')
                cloud_mask = qa.bitwiseAnd(1 << 3).eq(0)  # Cloud bit
                ndvi_masked = ndvi.updateMask(cloud_mask)
                
                return image.addBands(ndvi_masked)
            
            # Apply NDVI calculation
            landsat_ndvi = landsat.map(add_ndvi)
            
            # Get statistics
            stats = ndvi_masked.select('NDVI').reduceRegion(
                reducer=ee.Reducer.mean().combine(
                    ee.Reducer.minMax(), '', True
                ).combine(
                    ee.Reducer.stdDev(), '', True
                ),
                geometry=aoi,
                scale=30,
                maxPixels=1e9
            )
            
            # Get image count
            image_count = landsat_ndvi.size()
            
            # Get latest image for visualization
            latest_image = landsat_ndvi.sort('system:time_start', False).first()
            
            return {
                "collection": "LANDSAT/LC08/C02/T1_L2",
                "image_count": image_count.getInfo(),
                "statistics": stats.getInfo(),
                "latest_image_date": latest_image.get('system:time_start').getInfo(),
                "bbox": bbox,
                "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
                "cloud_filter": cloud_filter,
                "gee_image": latest_image  # For further processing
            }
            
        except Exception as e:
            logger.error(f"Error getting Landsat NDVI: {e}")
            return {"error": str(e)}
    
    async def get_modis_ndvi(
        self,
        start_date: datetime,
        end_date: datetime,
        bbox: Tuple[float, float, float, float]
    ) -> Dict:
        """
        Get MODIS NDVI data using Google Earth Engine
        
        Args:
            start_date: Start date for data collection
            end_date: End date for data collection
            bbox: Bounding box (min_lon, min_lat, max_lon, max_lat)
            
        Returns:
            Dictionary with MODIS NDVI data and metadata
        """
        try:
            if not self.initialized:
                raise Exception("Google Earth Engine not initialized")
            
            # Define area of interest
            min_lon, min_lat, max_lon, max_lat = bbox
            aoi = ee.Geometry.Rectangle([min_lon, min_lat, max_lon, max_lat])
            
            # Load MODIS NDVI collection (MOD13Q1 - 16-day composite)
            modis = ee.ImageCollection("MODIS/061/MOD13Q1") \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filterBounds(aoi) \
                .select(['NDVI', 'EVI', 'SummaryQA'])
            
            # Get statistics
            ndvi_stats = modis.select('NDVI').reduce(ee.Reducer.mean())
            evi_stats = modis.select('EVI').reduce(ee.Reducer.mean())
            
            # Calculate statistics for the area
            stats = ndvi_stats.reduceRegion(
                reducer=ee.Reducer.mean().combine(
                    ee.Reducer.minMax(), '', True
                ).combine(
                    ee.Reducer.stdDev(), '', True
                ),
                geometry=aoi,
                scale=250,
                maxPixels=1e9
            )
            
            # Get image count
            image_count = modis.size()
            
            # Get latest image
            latest_image = modis.sort('system:time_start', False).first()
            
            return {
                "collection": "MODIS/061/MOD13Q1",
                "image_count": image_count.getInfo(),
                "statistics": stats.getInfo(),
                "latest_image_date": latest_image.get('system:time_start').getInfo(),
                "bbox": bbox,
                "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
                "gee_image": latest_image  # For further processing
            }
            
        except Exception as e:
            logger.error(f"Error getting MODIS NDVI: {e}")
            return {"error": str(e)}
    
    async def get_viirs_ndvi(
        self,
        start_date: datetime,
        end_date: datetime,
        bbox: Tuple[float, float, float, float]
    ) -> Dict:
        """
        Get VIIRS NDVI data using Google Earth Engine
        
        Args:
            start_date: Start date for data collection
            end_date: End date for data collection
            bbox: Bounding box (min_lon, min_lat, max_lon, max_lat)
            
        Returns:
            Dictionary with VIIRS NDVI data and metadata
        """
        try:
            if not self.initialized:
                raise Exception("Google Earth Engine not initialized")
            
            # Define area of interest
            min_lon, min_lat, max_lon, max_lat = bbox
            aoi = ee.Geometry.Rectangle([min_lon, min_lat, max_lon, max_lat])
            
            # Load VIIRS NDVI collection (VNP13A1 - 16-day composite)
            viirs = ee.ImageCollection("NOAA/VIIRS/001/VNP13A1") \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filterBounds(aoi) \
                .select(['NDVI', 'EVI'])
            
            # Get statistics
            stats = viirs.select('NDVI').reduce(ee.Reducer.mean()).reduceRegion(
                reducer=ee.Reducer.mean().combine(
                    ee.Reducer.minMax(), '', True
                ).combine(
                    ee.Reducer.stdDev(), '', True
                ),
                geometry=aoi,
                scale=500,
                maxPixels=1e9
            )
            
            # Get image count
            image_count = viirs.size()
            
            # Get latest image
            latest_image = viirs.sort('system:time_start', False).first()
            
            return {
                "collection": "NOAA/VIIRS/001/VNP13A1",
                "image_count": image_count.getInfo(),
                "statistics": stats.getInfo(),
                "latest_image_date": latest_image.get('system:time_start').getInfo(),
                "bbox": bbox,
                "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
                "gee_image": latest_image  # For further processing
            }
            
        except Exception as e:
            logger.error(f"Error getting VIIRS NDVI: {e}")
            return {"error": str(e)}
    
    async def analyze_temporal_patterns(
        self,
        collection: str,
        start_date: datetime,
        end_date: datetime,
        bbox: Tuple[float, float, float, float],
        point: Tuple[float, float] = None
    ) -> Dict:
        """
        Analyze temporal patterns of vegetation for bloom detection
        
        Args:
            collection: GEE collection name
            start_date: Start date for analysis
            end_date: End date for analysis
            bbox: Bounding box for area analysis
            point: Optional point for time series analysis (lon, lat)
            
        Returns:
            Dictionary with temporal analysis results
        """
        try:
            if not self.initialized:
                raise Exception("Google Earth Engine not initialized")
            
            min_lon, min_lat, max_lon, max_lat = bbox
            aoi = ee.Geometry.Rectangle([min_lon, min_lat, max_lon, max_lat])
            
            # Load collection
            if "LANDSAT" in collection:
                dataset = ee.ImageCollection(collection) \
                    .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                    .filterBounds(aoi) \
                    .select(['SR_B4', 'SR_B5'])
                
                def add_ndvi(image):
                    red = image.select('SR_B4').multiply(0.0000275).add(-0.2)
                    nir = image.select('SR_B5').multiply(0.0000275).add(-0.2)
                    ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
                    return image.addBands(ndvi)
                
                dataset = dataset.map(add_ndvi)
                
            elif "MODIS" in collection:
                dataset = ee.ImageCollection(collection) \
                    .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                    .filterBounds(aoi) \
                    .select(['NDVI'])
                    
            elif "VIIRS" in collection:
                dataset = ee.ImageCollection(collection) \
                    .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                    .filterBounds(aoi) \
                    .select(['NDVI'])
            
            # Get time series
            if point:
                point_geom = ee.Geometry.Point(point[0], point[1])
                time_series = dataset.select('NDVI').getRegion(
                    point_geom, 
                    30,  # scale
                    'system:time_start'
                ).getInfo()
                
                # Process time series data
                dates = []
                values = []
                for i, row in enumerate(time_series[1:]):  # Skip header
                    if len(row) >= 2:
                        dates.append(datetime.fromtimestamp(row[0] / 1000))
                        values.append(row[1] if row[1] is not None else 0)
                
                # Detect peaks (potential bloom periods)
                peaks = self._detect_peaks_temporal(values)
                
                return {
                    "time_series": {
                        "dates": [d.isoformat() for d in dates],
                        "ndvi_values": values,
                        "peaks": peaks
                    },
                    "analysis_point": point,
                    "total_images": len(dates)
                }
            
            else:
                # Area-based temporal analysis
                # Calculate mean NDVI over time
                def calculate_mean(image):
                    mean_ndvi = image.select('NDVI').reduceRegion(
                        reducer=ee.Reducer.mean(),
                        geometry=aoi,
                        scale=30,
                        maxPixels=1e9
                    )
                    return image.set(mean_ndvi)
                
                dataset_with_stats = dataset.map(calculate_mean)
                
                # Get the statistics
                stats_list = dataset_with_stats.aggregate_array('NDVI').getInfo()
                dates_list = dataset_with_stats.aggregate_array('system:time_start').getInfo()
                
                # Convert timestamps to dates
                dates = [datetime.fromtimestamp(ts / 1000) for ts in dates_list]
                
                # Detect peaks
                peaks = self._detect_peaks_temporal(stats_list)
                
                return {
                    "time_series": {
                        "dates": [d.isoformat() for d in dates],
                        "ndvi_values": stats_list,
                        "peaks": peaks
                    },
                    "analysis_area": bbox,
                    "total_images": len(dates)
                }
                
        except Exception as e:
            logger.error(f"Error in temporal analysis: {e}")
            return {"error": str(e)}
    
    def _detect_peaks_temporal(self, values: List[float], threshold: float = 0.1) -> List[int]:
        """
        Detect peaks in temporal NDVI data
        
        Args:
            values: List of NDVI values over time
            threshold: Minimum relative height for peak detection
            
        Returns:
            List of peak indices
        """
        try:
            if len(values) < 3:
                return []
            
            # Simple peak detection algorithm
            peaks = []
            for i in range(1, len(values) - 1):
                if (values[i] > values[i-1] and 
                    values[i] > values[i+1] and 
                    values[i] > np.mean(values) + threshold * np.std(values)):
                    peaks.append(i)
            
            return peaks
        except Exception as e:
            logger.error(f"Error detecting peaks: {e}")
            return []
    
    async def detect_bloom_areas(
        self,
        collection: str,
        start_date: datetime,
        end_date: datetime,
        bbox: Tuple[float, float, float, float],
        ndvi_threshold: float = 0.6
    ) -> Dict:
        """
        Detect bloom areas using NDVI threshold
        
        Args:
            collection: GEE collection name
            start_date: Start date for analysis
            end_date: End date for analysis
            bbox: Bounding box
            ndvi_threshold: NDVI threshold for bloom detection
            
        Returns:
            Dictionary with bloom detection results
        """
        try:
            if not self.initialized:
                raise Exception("Google Earth Engine not initialized")
            
            min_lon, min_lat, max_lon, max_lat = bbox
            aoi = ee.Geometry.Rectangle([min_lon, min_lat, max_lon, max_lat])
            
            # Load and process data based on collection
            if "LANDSAT" in collection:
                dataset = ee.ImageCollection(collection) \
                    .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                    .filterBounds(aoi) \
                    .select(['SR_B4', 'SR_B5'])
                
                def add_ndvi(image):
                    red = image.select('SR_B4').multiply(0.0000275).add(-0.2)
                    nir = image.select('SR_B5').multiply(0.0000275).add(-0.2)
                    ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
                    return image.addBands(ndvi)
                
                dataset = dataset.map(add_ndvi)
                
            elif "MODIS" in collection:
                dataset = ee.ImageCollection(collection) \
                    .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                    .filterBounds(aoi) \
                    .select(['NDVI'])
                    
            elif "VIIRS" in collection:
                dataset = ee.ImageCollection(collection) \
                    .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                    .filterBounds(aoi) \
                    .select(['NDVI'])
            
            # Get latest image for bloom detection
            latest_image = dataset.sort('system:time_start', False).first()
            
            # Create bloom mask
            bloom_mask = latest_image.select('NDVI').gt(ndvi_threshold)
            
            # Calculate bloom statistics
            bloom_stats = bloom_mask.reduceRegion(
                reducer=ee.Reducer.sum().combine(
                    ee.Reducer.count(), '', True
                ).combine(
                    ee.Reducer.mean(), '', True
                ),
                geometry=aoi,
                scale=30,
                maxPixels=1e9
            )
            
            # Get NDVI statistics
            ndvi_stats = latest_image.select('NDVI').reduceRegion(
                reducer=ee.Reducer.mean().combine(
                    ee.Reducer.minMax(), '', True
                ).combine(
                    ee.Reducer.stdDev(), '', True
                ),
                geometry=aoi,
                scale=30,
                maxPixels=1e9
            )
            
            return {
                "collection": collection,
                "analysis_date": start_date.strftime('%Y-%m-%d'),
                "bbox": bbox,
                "ndvi_threshold": ndvi_threshold,
                "bloom_statistics": bloom_stats.getInfo(),
                "ndvi_statistics": ndvi_stats.getInfo(),
                "bloom_mask": bloom_mask,  # GEE Image for visualization
                "latest_image": latest_image
            }
            
        except Exception as e:
            logger.error(f"Error detecting bloom areas: {e}")
            return {"error": str(e)}
    
    async def export_to_asset(
        self,
        image: ee.Image,
        asset_path: str,
        description: str = "BloomWatch Analysis"
    ) -> Dict:
        """
        Export GEE image to asset
        
        Args:
            image: GEE Image to export
            asset_path: Asset path in GEE
            description: Description for the export
            
        Returns:
            Export task information
        """
        try:
            if not self.initialized:
                raise Exception("Google Earth Engine not initialized")
            
            # Start export task
            task = ee.batch.Export.image.toAsset(
                image=image,
                description=description,
                assetId=asset_path,
                scale=30,
                region=None,  # Use image bounds
                maxPixels=1e9
            )
            
            task.start()
            
            return {
                "task_id": task.id,
                "status": "RUNNING",
                "asset_path": asset_path,
                "description": description
            }
            
        except Exception as e:
            logger.error(f"Error exporting to asset: {e}")
            return {"error": str(e)}
    
    async def get_available_collections(self) -> List[Dict]:
        """
        Get list of available NASA satellite collections in GEE
        
        Returns:
            List of available collections with metadata
        """
        collections = [
            {
                "name": "LANDSAT/LC08/C02/T1_L2",
                "description": "Landsat 8 Collection 2 Level-2",
                "resolution": "30m",
                "temporal_resolution": "16 days",
                "bands": ["SR_B4 (Red)", "SR_B5 (NIR)", "QA_PIXEL"],
                "ndvi_calculation": "Custom (requires scaling)",
                "best_for": "High-resolution bloom detection"
            },
            {
                "name": "MODIS/061/MOD13Q1",
                "description": "MODIS Terra Vegetation Indices 16-Day L3 Global 250m",
                "resolution": "250m",
                "temporal_resolution": "16 days",
                "bands": ["NDVI", "EVI", "SummaryQA"],
                "ndvi_calculation": "Pre-calculated",
                "best_for": "Regional bloom monitoring"
            },
            {
                "name": "NOAA/VIIRS/001/VNP13A1",
                "description": "VIIRS Vegetation Indices 16-Day L3 Global 500m",
                "resolution": "500m",
                "temporal_resolution": "16 days",
                "bands": ["NDVI", "EVI"],
                "ndvi_calculation": "Pre-calculated",
                "best_for": "Global bloom monitoring"
            },
            {
                "name": "LANDSAT/LC09/C02/T1_L2",
                "description": "Landsat 9 Collection 2 Level-2",
                "resolution": "30m",
                "temporal_resolution": "16 days",
                "bands": ["SR_B4 (Red)", "SR_B5 (NIR)", "QA_PIXEL"],
                "ndvi_calculation": "Custom (requires scaling)",
                "best_for": "High-resolution bloom detection"
            }
        ]
        
        return collections
    async def get_history_parcel(self, coordinates: List[List[float]]) -> Dict:
        """
        Get historical bloom data for a specific parcel
        
        Args:
            coordinates: List of coordinates defining the parcel polygon
            
        Returns:
            List of dicts with fields:
            date, timestamp, NDVI, EVI, LST_day, LST_night, precip_7d, precip_15d, precip_30d, precip_60d, precip_90d,
            LST_range, LST_mean, NDVI_EVI_ratio, year, month, day_of_year, season, thermal_stress, NDVI_change,
            NDVI_rolling_mean_30d, ET_estimate, water_balance_7d, water_balance_15d, water_balance_30d, water_balance_60d, water_balance_90d
        """
        try:
            if not self.initialized:
                raise Exception("Google Earth Engine not initialized")
            parcel_geom = ee.Geometry.Polygon(coordinates)
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=5*365)
            # MODIS Vegetation Indices
            modis = ee.ImageCollection("MODIS/061/MOD13Q1") \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filterBounds(parcel_geom) \
                .select(['NDVI', 'EVI'])
            # MODIS Land Surface Temperature
            lst = ee.ImageCollection("MODIS/061/MOD11A2") \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filterBounds(parcel_geom) \
                .select(['LST_Day_1km', 'LST_Night_1km'])
            # CHIRPS Precipitation
            chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY") \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filterBounds(parcel_geom) \
                .select(['precipitation'])
            # MODIS ET
            et = ee.ImageCollection("MODIS/061/MOD16A2") \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filterBounds(parcel_geom) \
                .select(['ET'])
            # Prepare dates
            dates = modis.aggregate_array('system:time_start').getInfo()
            results = []
            prev_ndvi = None
            ndvi_rolling = []
            for ts in dates:
                date = datetime.utcfromtimestamp(ts/1000)
                year = date.year
                month = date.month
                day_of_year = date.timetuple().tm_yday
                # Season
                if month in [12,1,2]:
                    season = 'winter'
                elif month in [3,4,5]:
                    season = 'spring'
                elif month in [6,7,8]:
                    season = 'summer'
                else:
                    season = 'autumn'
                # Get NDVI/EVI
                img = modis.filterDate(date.strftime('%Y-%m-%d'), (date+timedelta(days=16)).strftime('%Y-%m-%d')).first()
                ndvi = img.reduceRegion(ee.Reducer.mean(), parcel_geom, 250).get('NDVI').getInfo()
                evi = img.reduceRegion(ee.Reducer.mean(), parcel_geom, 250).get('EVI').getInfo()
                # Get LST
                img_lst = lst.filterDate(date.strftime('%Y-%m-%d'), (date+timedelta(days=8)).strftime('%Y-%m-%d')).first()
                lst_day = img_lst.reduceRegion(ee.Reducer.mean(), parcel_geom, 1000).get('LST_Day_1km').getInfo()
                lst_night = img_lst.reduceRegion(ee.Reducer.mean(), parcel_geom, 1000).get('LST_Night_1km').getInfo()
                # Precipitation sums
                def sum_precip(days):
                    precip_imgs = chirps.filterDate((date-timedelta(days=days)).strftime('%Y-%m-%d'), date.strftime('%Y-%m-%d'))
                    return precip_imgs.reduce(ee.Reducer.sum()).reduceRegion(ee.Reducer.mean(), parcel_geom, 5000).get('precipitation').getInfo()
                precip_7d = sum_precip(7)
                precip_15d = sum_precip(15)
                precip_30d = sum_precip(30)
                precip_60d = sum_precip(60)
                precip_90d = sum_precip(90)
                # LST stats
                lst_range = None
                lst_mean = None
                if lst_day is not None and lst_night is not None:
                    lst_range = lst_day - lst_night
                    lst_mean = (lst_day + lst_night) / 2
                # NDVI/EVI ratio
                ndvi_evi_ratio = None
                if ndvi is not None and evi is not None and evi != 0:
                    ndvi_evi_ratio = ndvi / evi
                # NDVI change
                ndvi_change = None
                if prev_ndvi is not None and ndvi is not None:
                    ndvi_change = ndvi - prev_ndvi
                prev_ndvi = ndvi
                # NDVI rolling mean 30d
                ndvi_rolling.append(ndvi if ndvi is not None else 0)
                if len(ndvi_rolling) > 2:
                    ndvi_rolling_mean_30d = np.mean(ndvi_rolling[-2:])
                else:
                    ndvi_rolling_mean_30d = ndvi
                # ET
                img_et = et.filterDate(date.strftime('%Y-%m-%d'), (date+timedelta(days=8)).strftime('%Y-%m-%d')).first()
                et_estimate = img_et.reduceRegion(ee.Reducer.mean(), parcel_geom, 500).get('ET').getInfo() if img_et else None
                # Water balance = precip - ET
                def water_balance(days):
                    precip = sum_precip(days)
                    et_imgs = et.filterDate((date-timedelta(days=days)).strftime('%Y-%m-%d'), date.strftime('%Y-%m-%d'))
                    et_sum = et_imgs.reduce(ee.Reducer.sum()).reduceRegion(ee.Reducer.mean(), parcel_geom, 500).get('ET').getInfo()
                    if precip is not None and et_sum is not None:
                        return precip - et_sum
                    return None
                water_balance_7d = water_balance(7)
                water_balance_15d = water_balance(15)
                water_balance_30d = water_balance(30)
                water_balance_60d = water_balance(60)
                water_balance_90d = water_balance(90)
                # Thermal stress (simple: LST_day > 305K)
                thermal_stress = lst_day > 305 if lst_day is not None else None
                results.append({
                    "date": date.strftime('%Y-%m-%d'),
                    "timestamp": ts,
                    "NDVI": ndvi,
                    "EVI": evi,
                    "LST_day": lst_day,
                    "LST_night": lst_night,
                    "precip_7d": precip_7d,
                    "precip_15d": precip_15d,
                    "precip_30d": precip_30d,
                    "precip_60d": precip_60d,
                    "precip_90d": precip_90d,
                    "LST_range": lst_range,
                    "LST_mean": lst_mean,
                    "NDVI_EVI_ratio": ndvi_evi_ratio,
                    "year": year,
                    "month": month,
                    "day_of_year": day_of_year,
                    "season": season,
                    "thermal_stress": thermal_stress,
                    "NDVI_change": ndvi_change,
                    "NDVI_rolling_mean_30d": ndvi_rolling_mean_30d,
                    "ET_estimate": et_estimate,
                    "water_balance_7d": water_balance_7d,
                    "water_balance_15d": water_balance_15d,
                    "water_balance_30d": water_balance_30d,
                    "water_balance_60d": water_balance_60d,
                    "water_balance_90d": water_balance_90d
                })
            return {"history": results}
        except Exception as e:
            logger.error(f"Error getting history for parcel: {e}")
            return {"error": str(e)}
    
    async def get_current_parcel_data(self, coordinates: List[List[float]]) -> Dict:
        """
        Get current (latest available) data for a specific parcel
        Args:
            coordinates: List of coordinates defining the parcel polygon
        Returns:
            Dict with fields:
            NDVI, EVI, NDVI_EVI_ratio, LST_day, LST_night, LST_range, LST_mean, thermal_stress,
            precip_7d, precip_15d, precip_30d, precip_60d, precip_90d, NDVI_change, NDVI_rolling_mean_30d,
            ET_estimate, water_balance_7d, water_balance_15d, water_balance_30d, water_balance_60d, water_balance_90d
        """
        try:
            if not self.initialized:
                raise Exception("Google Earth Engine not initialized")
            parcel_geom = ee.Geometry.Polygon(coordinates)
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=90)
            # MODIS Vegetation Indices
            modis = ee.ImageCollection("MODIS/061/MOD13Q1") \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filterBounds(parcel_geom) \
                .select(['NDVI', 'EVI'])
            latest_img = modis.sort('system:time_start', False).first()
            ndvi = latest_img.reduceRegion(ee.Reducer.mean(), parcel_geom, 250).get('NDVI').getInfo()
            evi = latest_img.reduceRegion(ee.Reducer.mean(), parcel_geom, 250).get('EVI').getInfo()
            ndvi_evi_ratio = ndvi / evi if ndvi is not None and evi is not None and evi != 0 else None
            # LST
            lst = ee.ImageCollection("MODIS/061/MOD11A2") \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filterBounds(parcel_geom) \
                .select(['LST_Day_1km', 'LST_Night_1km'])
            latest_lst = lst.sort('system:time_start', False).first()
            lst_day = latest_lst.reduceRegion(ee.Reducer.mean(), parcel_geom, 1000).get('LST_Day_1km').getInfo()
            lst_night = latest_lst.reduceRegion(ee.Reducer.mean(), parcel_geom, 1000).get('LST_Night_1km').getInfo()
            lst_range = lst_day - lst_night if lst_day is not None and lst_night is not None else None
            lst_mean = (lst_day + lst_night) / 2 if lst_day is not None and lst_night is not None else None
            thermal_stress = lst_day > 305 if lst_day is not None else None
            # Precipitación
            chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY") \
                .filterDate((end_date-timedelta(days=90)).strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filterBounds(parcel_geom) \
                .select(['precipitation'])
            def sum_precip(days):
                precip_imgs = chirps.filterDate((end_date-timedelta(days=days)).strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                return precip_imgs.reduce(ee.Reducer.sum()).reduceRegion(ee.Reducer.mean(), parcel_geom, 5000).get('precipitation').getInfo()
            precip_7d = sum_precip(7)
            precip_15d = sum_precip(15)
            precip_30d = sum_precip(30)
            precip_60d = sum_precip(60)
            precip_90d = sum_precip(90)
            # NDVI rolling mean 30d y cambio
            ndvi_imgs = modis.sort('system:time_start', False).limit(2)
            ndvi_list = ndvi_imgs.aggregate_array('NDVI').getInfo()
            ndvi_change = None
            if len(ndvi_list) == 2 and ndvi_list[0] is not None and ndvi_list[1] is not None:
                ndvi_change = ndvi_list[0] - ndvi_list[1]
            ndvi_rolling_mean_30d = np.mean(ndvi_list) if ndvi_list else None
            # ET
            et = ee.ImageCollection("MODIS/061/MOD16A2") \
                .filterDate((end_date-timedelta(days=30)).strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filterBounds(parcel_geom) \
                .select(['ET'])
            latest_et = et.sort('system:time_start', False).first()
            et_estimate = latest_et.reduceRegion(ee.Reducer.mean(), parcel_geom, 500).get('ET').getInfo() if latest_et else None
            # Water balance
            def water_balance(days):
                precip = sum_precip(days)
                et_imgs = et.filterDate((end_date-timedelta(days=days)).strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                et_sum = et_imgs.reduce(ee.Reducer.sum()).reduceRegion(ee.Reducer.mean(), parcel_geom, 500).get('ET').getInfo()
                if precip is not None and et_sum is not None:
                    return precip - et_sum
                return None
            water_balance_7d = water_balance(7)
            water_balance_15d = water_balance(15)
            water_balance_30d = water_balance(30)
            water_balance_60d = water_balance(60)
            water_balance_90d = water_balance(90)
            return {
                "NDVI": ndvi,
                "EVI": evi,
                "NDVI_EVI_ratio": ndvi_evi_ratio,
                "LST_day": lst_day,
                "LST_night": lst_night,
                "LST_range": lst_range,
                "LST_mean": lst_mean,
                "thermal_stress": thermal_stress,
                "precip_7d": precip_7d,
                "precip_15d": precip_15d,
                "precip_30d": precip_30d,
                "precip_60d": precip_60d,
                "precip_90d": precip_90d,
                "NDVI_change": ndvi_change,
                "NDVI_rolling_mean_30d": ndvi_rolling_mean_30d,
                "ET_estimate": et_estimate,
                "water_balance_7d": water_balance_7d,
                "water_balance_15d": water_balance_15d,
                "water_balance_30d": water_balance_30d,
                "water_balance_60d": water_balance_60d,
                "water_balance_90d": water_balance_90d
            }
        except Exception as e:
            logger.error(f"Error getting current data for parcel: {e}")
            return {"error": str(e)}
# Create global instance
gee_service = GEEService()
