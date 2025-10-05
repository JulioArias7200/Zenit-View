"""
NASA EarthData API integration service
Handles authentication and data retrieval from NASA satellites
"""

import requests
import os
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import json
from requests.auth import HTTPBasicAuth
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

class NASAService:
    """Service for interacting with NASA EarthData APIs"""
    
    def __init__(self):
        self.username = settings.NASA_USERNAME
        self.password = settings.NASA_PASSWORD
        self.cmr_url = settings.NASA_CMR_URL
        self.laads_url = settings.NASA_LAADS_URL
        
        if not self.username or not self.password:
            logger.warning("NASA credentials not configured. Set NASA_USERNAME and NASA_PASSWORD environment variables.")
    
    def authenticate(self) -> bool:
        """Test NASA authentication"""
        try:
            if not self.username or not self.password:
                return False
                
            # Test authentication with a simple request
            response = requests.get(
                f"{self.laads_url}/products",
                auth=HTTPBasicAuth(self.username, self.password),
                timeout=30
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return False
    
    async def search_datasets(
        self, 
        collection: str = None,
        start_date: datetime = None,
        end_date: datetime = None,
        bbox: Tuple[float, float, float, float] = None,
        limit: int = 100
    ) -> List[Dict]:
        """
        Search for datasets using NASA CMR API
        
        Args:
            collection: Dataset collection (e.g., 'MOD13Q1', 'VNP13A1')
            start_date: Start date for temporal filter
            end_date: End date for temporal filter
            bbox: Bounding box (min_lon, min_lat, max_lon, max_lat)
            limit: Maximum number of results
            
        Returns:
            List of dataset metadata
        """
        try:
            params = {
                "collection_concept_id": collection,
                "page_size": limit,
                "sort_key": "-start_date"
            }
            
            # Add temporal filter
            if start_date and end_date:
                params["temporal"] = f"{start_date.strftime('%Y-%m-%d')}T00:00:00Z,{end_date.strftime('%Y-%m-%d')}T23:59:59Z"
            
            # Add spatial filter
            if bbox:
                min_lon, min_lat, max_lon, max_lat = bbox
                params["bounding_box"] = f"{min_lon},{min_lat},{max_lon},{max_lat}"
            
            response = requests.get(f"{self.cmr_url}/granules.json", params=params)
            response.raise_for_status()
            
            data = response.json()
            return data.get("feed", {}).get("entry", [])
            
        except Exception as e:
            logger.error(f"Error searching datasets: {e}")
            return []
    
    async def get_modis_ndvi_data(
        self,
        start_date: datetime,
        end_date: datetime,
        bbox: Tuple[float, float, float, float] = None
    ) -> List[Dict]:
        """
        Get MODIS NDVI data (MOD13Q1 product)
        
        Args:
            start_date: Start date
            end_date: End date
            bbox: Bounding box (min_lon, min_lat, max_lon, max_lat)
            
        Returns:
            List of available MODIS NDVI files
        """
        return await self.search_datasets(
            collection="MODIS/006/MOD13Q1",
            start_date=start_date,
            end_date=end_date,
            bbox=bbox
        )
    
    async def get_viirs_ndvi_data(
        self,
        start_date: datetime,
        end_date: datetime,
        bbox: Tuple[float, float, float, float] = None
    ) -> List[Dict]:
        """
        Get VIIRS NDVI data (VNP13A1 product)
        
        Args:
            start_date: Start date
            end_date: End date
            bbox: Bounding box (min_lon, min_lat, max_lon, max_lat)
            
        Returns:
            List of available VIIRS NDVI files
        """
        return await self.search_datasets(
            collection="VIIRS/001/VNP13A1",
            start_date=start_date,
            end_date=end_date,
            bbox=bbox
        )
    
    async def get_landsat_data(
        self,
        start_date: datetime,
        end_date: datetime,
        bbox: Tuple[float, float, float, float] = None
    ) -> List[Dict]:
        """
        Get Landsat data
        
        Args:
            start_date: Start date
            end_date: End date
            bbox: Bounding box (min_lon, min_lat, max_lon, max_lat)
            
        Returns:
            List of available Landsat files
        """
        return await self.search_datasets(
            collection="HLSL30",
            start_date=start_date,
            end_date=end_date,
            bbox=bbox
        )
    
    async def download_file(
        self,
        file_url: str,
        output_path: str,
        chunk_size: int = 8192
    ) -> bool:
        """
        Download a file from NASA servers
        
        Args:
            file_url: URL of the file to download
            output_path: Local path to save the file
            chunk_size: Size of chunks for streaming download
            
        Returns:
            True if download successful, False otherwise
        """
        try:
            if not self.username or not self.password:
                logger.error("NASA credentials required for download")
                return False
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            with requests.get(
                file_url,
                auth=HTTPBasicAuth(self.username, self.password),
                stream=True,
                timeout=300
            ) as response:
                response.raise_for_status()
                
                with open(output_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=chunk_size):
                        f.write(chunk)
            
            logger.info(f"Downloaded file: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Download failed: {e}")
            return False
    
    async def get_available_products(self) -> List[Dict]:
        """
        Get list of available products from LAADS DAAC
        
        Returns:
            List of available products
        """
        try:
            if not self.username or not self.password:
                return []
                
            response = requests.get(
                f"{self.laads_url}/products",
                auth=HTTPBasicAuth(self.username, self.password),
                timeout=30
            )
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error getting products: {e}")
            return []
    
    def extract_file_url(self, dataset_metadata: Dict) -> Optional[str]:
        """
        Extract download URL from dataset metadata
        
        Args:
            dataset_metadata: Dataset metadata from CMR
            
        Returns:
            Download URL or None
        """
        try:
            links = dataset_metadata.get("links", [])
            for link in links:
                if link.get("rel") == "http://esipfed.org/ns/fedsearch/1.1/data#":
                    return link.get("href")
            return None
        except Exception as e:
            logger.error(f"Error extracting file URL: {e}")
            return None
    
    def get_temporal_coverage(self, dataset_metadata: Dict) -> Optional[Tuple[datetime, datetime]]:
        """
        Extract temporal coverage from dataset metadata
        
        Args:
            dataset_metadata: Dataset metadata from CMR
            
        Returns:
            Tuple of (start_date, end_date) or None
        """
        try:
            time_start = dataset_metadata.get("time_start")
            time_end = dataset_metadata.get("time_end")
            
            if time_start and time_end:
                start_date = datetime.fromisoformat(time_start.replace('Z', '+00:00'))
                end_date = datetime.fromisoformat(time_end.replace('Z', '+00:00'))
                return (start_date, end_date)
            
            return None
        except Exception as e:
            logger.error(f"Error extracting temporal coverage: {e}")
            return None

# Create global instance
nasa_service = NASAService()
