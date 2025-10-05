"""
NASA data API endpoints for accessing satellite data through Google Earth Engine
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import logging

from app.services.gee_service import gee_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models
class NDVIAnalysisRequest(BaseModel):
    """Request model for NDVI analysis"""
    start_date: datetime = Field(..., description="Start date for analysis (YYYY-MM-DD)")
    end_date: datetime = Field(..., description="End date for analysis (YYYY-MM-DD)")
    bbox: List[float] = Field(..., description="Bounding box [min_lon, min_lat, max_lon, max_lat]", min_items=4, max_items=4)
    collection: str = Field(default="MODIS/006/MOD13Q1", description="NASA satellite collection")
    cloud_filter: Optional[float] = Field(default=20, description="Maximum cloud coverage percentage (for Landsat)")

class CollectionInfo(BaseModel):
    """Information about a satellite collection"""
    name: str
    description: str
    resolution: str
    temporal_resolution: str
    bands: List[str]
    ndvi_calculation: str
    best_for: str

@router.get("/collections", response_model=List[CollectionInfo])
async def get_nasa_collections():
    """
    Get available NASA satellite collections
    
    Returns information about all available NASA satellite datasets
    accessible through Google Earth Engine for bloom detection.
    """
    try:
        if not gee_service.is_available():
            raise HTTPException(status_code=503, detail="Google Earth Engine service not available")
        
        collections = await gee_service.get_available_collections()
        
        return [
            CollectionInfo(
                name=col["name"],
                description=col["description"],
                resolution=col["resolution"],
                temporal_resolution=col["temporal_resolution"],
                bands=col["bands"],
                ndvi_calculation=col["ndvi_calculation"],
                best_for=col["best_for"]
            )
            for col in collections
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting NASA collections: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/ndvi/landsat")
async def get_landsat_ndvi(request: NDVIAnalysisRequest):
    """
    Get Landsat NDVI data for a specified area and time period
    
    Uses Landsat 8/9 Collection 2 Level-2 data to calculate NDVI values.
    Provides high-resolution (30m) vegetation analysis suitable for detailed bloom detection.
    """
    try:
        # Validate bbox
        if len(request.bbox) != 4:
            raise HTTPException(status_code=400, detail="Bounding box must have 4 coordinates")
        
        min_lon, min_lat, max_lon, max_lat = request.bbox
        bbox_tuple = (min_lon, min_lat, max_lon, max_lat)
        
        # Validate date range
        if request.end_date <= request.start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        max_period = timedelta(days=365)
        if request.end_date - request.start_date > max_period:
            raise HTTPException(status_code=400, detail="Analysis period cannot exceed 365 days")
        
        # Check if GEE is available
        if not gee_service.is_available():
            raise HTTPException(status_code=503, detail="Google Earth Engine service not available")
        
        # Get Landsat NDVI data
        result = await gee_service.get_landsat_ndvi(
            start_date=request.start_date,
            end_date=request.end_date,
            bbox=bbox_tuple,
            cloud_filter=request.cloud_filter
        )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "data_type": "landsat_ndvi",
            "collection": "LANDSAT/LC08/C02/T1_L2",
            "resolution": "30m",
            "analysis_area": bbox_tuple,
            "period": f"{request.start_date.strftime('%Y-%m-%d')} to {request.end_date.strftime('%Y-%m-%d')}",
            "cloud_filter": request.cloud_filter,
            "results": result,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Landsat NDVI: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/ndvi/modis")
async def get_modis_ndvi(request: NDVIAnalysisRequest):
    """
    Get MODIS NDVI data for a specified area and time period
    
    Uses MODIS Terra Vegetation Indices (MOD13Q1) 16-day composite data.
    Provides moderate resolution (250m) vegetation analysis suitable for regional bloom monitoring.
    """
    try:
        # Validate bbox
        if len(request.bbox) != 4:
            raise HTTPException(status_code=400, detail="Bounding box must have 4 coordinates")
        
        min_lon, min_lat, max_lon, max_lat = request.bbox
        bbox_tuple = (min_lon, min_lat, max_lon, max_lat)
        
        # Validate date range
        if request.end_date <= request.start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        max_period = timedelta(days=365 * 3)  # MODIS has longer historical data
        if request.end_date - request.start_date > max_period:
            raise HTTPException(status_code=400, detail="Analysis period cannot exceed 3 years")
        
        # Check if GEE is available
        if not gee_service.is_available():
            raise HTTPException(status_code=503, detail="Google Earth Engine service not available")
        
        # Get MODIS NDVI data
        result = await gee_service.get_modis_ndvi(
            start_date=request.start_date,
            end_date=request.end_date,
            bbox=bbox_tuple
        )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "data_type": "modis_ndvi",
            "collection": "MODIS/006/MOD13Q1",
            "resolution": "250m",
            "analysis_area": bbox_tuple,
            "period": f"{request.start_date.strftime('%Y-%m-%d')} to {request.end_date.strftime('%Y-%m-%d')}",
            "results": result,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting MODIS NDVI: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/ndvi/viirs")
async def get_viirs_ndvi(request: NDVIAnalysisRequest):
    """
    Get VIIRS NDVI data for a specified area and time period
    
    Uses VIIRS Vegetation Indices (VNP13A1) 16-day composite data.
    Provides moderate resolution (500m) vegetation analysis suitable for global bloom monitoring.
    """
    try:
        # Validate bbox
        if len(request.bbox) != 4:
            raise HTTPException(status_code=400, detail="Bounding box must have 4 coordinates")
        
        min_lon, min_lat, max_lon, max_lat = request.bbox
        bbox_tuple = (min_lon, min_lat, max_lon, max_lat)
        
        # Validate date range
        if request.end_date <= request.start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        max_period = timedelta(days=365 * 3)
        if request.end_date - request.start_date > max_period:
            raise HTTPException(status_code=400, detail="Analysis period cannot exceed 3 years")
        
        # Check if GEE is available
        if not gee_service.is_available():
            raise HTTPException(status_code=503, detail="Google Earth Engine service not available")
        
        # Get VIIRS NDVI data
        result = await gee_service.get_viirs_ndvi(
            start_date=request.start_date,
            end_date=request.end_date,
            bbox=bbox_tuple
        )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "data_type": "viirs_ndvi",
            "collection": "NOAA/VIIRS/001/VNP13A1",
            "resolution": "500m",
            "analysis_area": bbox_tuple,
            "period": f"{request.start_date.strftime('%Y-%m-%d')} to {request.end_date.strftime('%Y-%m-%d')}",
            "results": result,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting VIIRS NDVI: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/status")
async def get_nasa_data_status():
    """
    Get status of NASA data services
    
    Returns the availability status of Google Earth Engine and NASA data access.
    """
    try:
        gee_available = gee_service.is_available()
        
        return {
            "service": "nasa_data",
            "status": "healthy" if gee_available else "degraded",
            "google_earth_engine": "available" if gee_available else "unavailable",
            "nasa_data_access": "available" if gee_available else "unavailable",
            "available_collections": [
                "LANDSAT/LC08/C02/T1_L2",
                "LANDSAT/LC09/C02/T1_L2", 
                "MODIS/006/MOD13Q1",
                "NOAA/VIIRS/001/VNP13A1"
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting NASA data status: {e}")
        return {
            "service": "nasa_data",
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/collections/{collection_name}/info")
async def get_collection_info(collection_name: str):
    """
    Get detailed information about a specific NASA collection
    
    Returns detailed metadata about the specified satellite collection.
    """
    try:
        if not gee_service.is_available():
            raise HTTPException(status_code=503, detail="Google Earth Engine service not available")
        
        collections = await gee_service.get_available_collections()
        
        # Find the requested collection
        collection_info = None
        for col in collections:
            if col["name"] == collection_name:
                collection_info = col
                break
        
        if not collection_info:
            raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' not found")
        
        return {
            "collection_name": collection_name,
            "info": collection_info,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting collection info: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
