"""
Data processing service for satellite imagery analysis
Handles NDVI calculation, bloom detection, and spectral analysis
"""

import numpy as np
import rasterio
import xarray as xr
import cv2
from scipy import ndimage
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Tuple, Optional, Union
import logging
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class DataProcessor:
    """Service for processing satellite imagery data"""
    
    def __init__(self):
        self.ndvi_threshold = 0.3  # Minimum NDVI for vegetation
        self.bloom_threshold = 0.6  # NDVI threshold for potential blooms
        self.temporal_window = 30  # Days to consider for temporal analysis
    
    def calculate_ndvi(self, nir_band: np.ndarray, red_band: np.ndarray) -> np.ndarray:
        """
        Calculate Normalized Difference Vegetation Index (NDVI)
        
        Args:
            nir_band: Near-infrared band data
            red_band: Red band data
            
        Returns:
            NDVI array
        """
        try:
            # Avoid division by zero
            denominator = nir_band + red_band
            ndvi = np.where(
                denominator != 0,
                (nir_band - red_band) / denominator,
                0
            )
            
            # Clip values to valid range [-1, 1]
            ndvi = np.clip(ndvi, -1, 1)
            
            return ndvi
        except Exception as e:
            logger.error(f"Error calculating NDVI: {e}")
            return np.zeros_like(nir_band)
    
    def calculate_evi(self, nir_band: np.ndarray, red_band: np.ndarray, blue_band: np.ndarray) -> np.ndarray:
        """
        Calculate Enhanced Vegetation Index (EVI)
        
        Args:
            nir_band: Near-infrared band data
            red_band: Red band data
            blue_band: Blue band data
            
        Returns:
            EVI array
        """
        try:
            # EVI formula: 2.5 * ((NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1))
            denominator = nir_band + 6 * red_band - 7.5 * blue_band + 1
            evi = np.where(
                denominator != 0,
                2.5 * (nir_band - red_band) / denominator,
                0
            )
            
            # Clip values to valid range
            evi = np.clip(evi, -1, 1)
            
            return evi
        except Exception as e:
            logger.error(f"Error calculating EVI: {e}")
            return np.zeros_like(nir_band)
    
    def detect_vegetation(self, ndvi: np.ndarray) -> np.ndarray:
        """
        Detect vegetation pixels based on NDVI threshold
        
        Args:
            ndvi: NDVI array
            
        Returns:
            Binary mask of vegetation pixels
        """
        return ndvi > self.ndvi_threshold
    
    def detect_bloom_candidates(self, ndvi: np.ndarray) -> np.ndarray:
        """
        Detect potential bloom areas based on high NDVI values
        
        Args:
            ndvi: NDVI array
            
        Returns:
            Binary mask of potential bloom areas
        """
        return ndvi > self.bloom_threshold
    
    def apply_morphological_operations(self, binary_mask: np.ndarray) -> np.ndarray:
        """
        Apply morphological operations to clean up binary mask
        
        Args:
            binary_mask: Binary mask
            
        Returns:
            Cleaned binary mask
        """
        try:
            # Remove small noise
            kernel = np.ones((3, 3), np.uint8)
            
            # Opening (erosion followed by dilation)
            cleaned = cv2.morphologyEx(binary_mask.astype(np.uint8), cv2.MORPH_OPEN, kernel)
            
            # Closing (dilation followed by erosion) to fill gaps
            cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel)
            
            return cleaned.astype(bool)
        except Exception as e:
            logger.error(f"Error in morphological operations: {e}")
            return binary_mask
    
    def detect_bloom_clusters(self, bloom_mask: np.ndarray, min_area: int = 100) -> List[Dict]:
        """
        Detect clusters of bloom pixels and return their properties
        
        Args:
            bloom_mask: Binary mask of bloom areas
            min_area: Minimum area for a cluster to be considered
            
        Returns:
            List of cluster properties
        """
        try:
            # Find connected components
            num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
                bloom_mask.astype(np.uint8), connectivity=8
            )
            
            clusters = []
            for i in range(1, num_labels):  # Skip background (label 0)
                area = stats[i, cv2.CC_STAT_AREA]
                if area >= min_area:
                    cluster = {
                        'id': i,
                        'area': int(area),
                        'centroid': (int(centroids[i][0]), int(centroids[i][1])),
                        'bounding_box': {
                            'x': int(stats[i, cv2.CC_STAT_LEFT]),
                            'y': int(stats[i, cv2.CC_STAT_TOP]),
                            'width': int(stats[i, cv2.CC_STAT_WIDTH]),
                            'height': int(stats[i, cv2.CC_STAT_HEIGHT])
                        }
                    }
                    clusters.append(cluster)
            
            return clusters
        except Exception as e:
            logger.error(f"Error detecting bloom clusters: {e}")
            return []
    
    def calculate_temporal_metrics(self, ndvi_series: List[np.ndarray], dates: List[datetime]) -> Dict:
        """
        Calculate temporal metrics for bloom detection
        
        Args:
            ndvi_series: List of NDVI arrays over time
            dates: List of corresponding dates
            
        Returns:
            Dictionary with temporal metrics
        """
        try:
            if len(ndvi_series) < 2:
                return {}
            
            # Calculate mean NDVI over time
            mean_ndvi = [np.mean(ndvi[ndvi > self.ndvi_threshold]) for ndvi in ndvi_series]
            
            # Detect peaks (potential bloom periods)
            ndvi_array = np.array(mean_ndvi)
            peaks = self._find_peaks(ndvi_array)
            
            # Calculate bloom intensity and duration
            bloom_periods = []
            for peak_idx in peaks:
                if peak_idx < len(dates):
                    bloom_periods.append({
                        'date': dates[peak_idx],
                        'intensity': mean_ndvi[peak_idx],
                        'ndvi_value': ndvi_array[peak_idx]
                    })
            
            return {
                'mean_ndvi_series': mean_ndvi,
                'bloom_periods': bloom_periods,
                'peak_count': len(peaks),
                'max_ndvi': np.max(ndvi_array),
                'min_ndvi': np.min(ndvi_array),
                'avg_ndvi': np.mean(ndvi_array)
            }
        except Exception as e:
            logger.error(f"Error calculating temporal metrics: {e}")
            return {}
    
    def _find_peaks(self, data: np.ndarray, threshold: float = 0.1) -> List[int]:
        """
        Find peaks in 1D data
        
        Args:
            data: 1D array
            threshold: Minimum relative height for a peak
            
        Returns:
            List of peak indices
        """
        try:
            from scipy.signal import find_peaks
            
            # Normalize data for peak detection
            if np.max(data) > np.min(data):
                normalized = (data - np.min(data)) / (np.max(data) - np.min(data))
            else:
                return []
            
            peaks, _ = find_peaks(normalized, height=threshold)
            return peaks.tolist()
        except Exception as e:
            logger.error(f"Error finding peaks: {e}")
            return []
    
    def analyze_spectral_signatures(self, bands: Dict[str, np.ndarray]) -> Dict:
        """
        Analyze spectral signatures for bloom detection
        
        Args:
            bands: Dictionary of band names and data arrays
            
        Returns:
            Dictionary with spectral analysis results
        """
        try:
            analysis = {}
            
            # Calculate various vegetation indices
            if 'nir' in bands and 'red' in bands:
                analysis['ndvi'] = self.calculate_ndvi(bands['nir'], bands['red'])
            
            if 'nir' in bands and 'red' in bands and 'blue' in bands:
                analysis['evi'] = self.calculate_evi(bands['nir'], bands['red'], bands['blue'])
            
            # Calculate spectral ratios that might indicate blooms
            if 'green' in bands and 'red' in bands:
                analysis['green_red_ratio'] = np.where(
                    bands['red'] != 0,
                    bands['green'] / bands['red'],
                    0
                )
            
            # Detect anomalous spectral patterns
            if 'nir' in bands and 'red' in bands:
                nir_red_diff = bands['nir'] - bands['red']
                analysis['spectral_anomaly'] = self._detect_spectral_anomalies(nir_red_diff)
            
            return analysis
        except Exception as e:
            logger.error(f"Error in spectral analysis: {e}")
            return {}
    
    def _detect_spectral_anomalies(self, data: np.ndarray, threshold: float = 2.0) -> np.ndarray:
        """
        Detect spectral anomalies using statistical methods
        
        Args:
            data: Spectral difference data
            threshold: Z-score threshold for anomaly detection
            
        Returns:
            Binary mask of anomalies
        """
        try:
            # Remove zeros and calculate statistics
            valid_data = data[data != 0]
            if len(valid_data) == 0:
                return np.zeros_like(data, dtype=bool)
            
            mean_val = np.mean(valid_data)
            std_val = np.std(valid_data)
            
            if std_val == 0:
                return np.zeros_like(data, dtype=bool)
            
            # Calculate z-scores
            z_scores = np.abs((data - mean_val) / std_val)
            
            # Identify anomalies
            anomalies = z_scores > threshold
            
            return anomalies
        except Exception as e:
            logger.error(f"Error detecting spectral anomalies: {e}")
            return np.zeros_like(data, dtype=bool)
    
    def generate_bloom_report(self, analysis_results: Dict, metadata: Dict) -> Dict:
        """
        Generate comprehensive bloom detection report
        
        Args:
            analysis_results: Results from bloom detection analysis
            metadata: Image metadata
            
        Returns:
            Comprehensive bloom report
        """
        try:
            report = {
                'metadata': metadata,
                'analysis_timestamp': datetime.now().isoformat(),
                'bloom_detection': {
                    'bloom_areas_detected': len(analysis_results.get('clusters', [])),
                    'total_bloom_area': sum(cluster['area'] for cluster in analysis_results.get('clusters', [])),
                    'bloom_intensity': analysis_results.get('max_ndvi', 0),
                    'confidence_score': self._calculate_confidence_score(analysis_results)
                },
                'temporal_analysis': analysis_results.get('temporal_metrics', {}),
                'spectral_analysis': analysis_results.get('spectral_analysis', {}),
                'recommendations': self._generate_recommendations(analysis_results)
            }
            
            return report
        except Exception as e:
            logger.error(f"Error generating bloom report: {e}")
            return {}
    
    def _calculate_confidence_score(self, results: Dict) -> float:
        """
        Calculate confidence score for bloom detection
        
        Args:
            results: Analysis results
            
        Returns:
            Confidence score between 0 and 1
        """
        try:
            score = 0.0
            
            # Base score from NDVI values
            max_ndvi = results.get('max_ndvi', 0)
            if max_ndvi > self.bloom_threshold:
                score += 0.4
            
            # Score from number of clusters
            cluster_count = len(results.get('clusters', []))
            if cluster_count > 0:
                score += min(0.3, cluster_count * 0.05)
            
            # Score from temporal consistency
            bloom_periods = results.get('temporal_metrics', {}).get('bloom_periods', [])
            if len(bloom_periods) > 0:
                score += 0.3
            
            return min(1.0, score)
        except Exception as e:
            logger.error(f"Error calculating confidence score: {e}")
            return 0.0
    
    def _generate_recommendations(self, results: Dict) -> List[str]:
        """
        Generate recommendations based on analysis results
        
        Args:
            results: Analysis results
            
        Returns:
            List of recommendations
        """
        recommendations = []
        
        try:
            bloom_count = len(results.get('clusters', []))
            max_ndvi = results.get('max_ndvi', 0)
            
            if bloom_count > 0:
                recommendations.append(f"Detected {bloom_count} bloom areas with high confidence")
                
                if max_ndvi > 0.8:
                    recommendations.append("Very high vegetation activity detected - possible mass flowering event")
                elif max_ndvi > 0.6:
                    recommendations.append("High vegetation activity - monitor for bloom progression")
                
                recommendations.append("Consider field verification for detected bloom areas")
            else:
                recommendations.append("No significant bloom activity detected in current analysis")
                recommendations.append("Continue monitoring for seasonal bloom patterns")
            
            # Temporal recommendations
            bloom_periods = results.get('temporal_metrics', {}).get('bloom_periods', [])
            if len(bloom_periods) > 1:
                recommendations.append("Multiple bloom periods detected - analyze seasonal patterns")
            
            return recommendations
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return ["Analysis completed - review results for bloom detection"]

# Create global instance
data_processor = DataProcessor()
