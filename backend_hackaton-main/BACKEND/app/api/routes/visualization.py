"""
Visualization API endpoints for generating maps and charts
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import logging
import os
import json
import folium
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import base64

from app.services.gee_service import gee_service
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models
class MapGenerationRequest(BaseModel):
    """Request model for map generation"""
    bbox: List[float] = Field(..., description="Bounding box [min_lon, min_lat, max_lon, max_lat]", min_items=4, max_items=4)
    collection: str = Field(default="MODIS/006/MOD13Q1", description="NASA satellite collection")
    start_date: datetime = Field(..., description="Start date for data")
    end_date: datetime = Field(..., description="End date for data")
    map_type: str = Field(default="ndvi", description="Type of map to generate")
    ndvi_threshold: Optional[float] = Field(default=0.6, description="NDVI threshold for bloom areas")

class ChartGenerationRequest(BaseModel):
    """Request model for chart generation"""
    bbox: List[float] = Field(..., description="Bounding box [min_lon, min_lat, max_lon, max_lat]", min_items=4, max_items=4)
    collection: str = Field(default="MODIS/006/MOD13Q1", description="NASA satellite collection")
    start_date: datetime = Field(..., description="Start date for analysis")
    end_date: datetime = Field(..., description="End date for analysis")
    chart_type: str = Field(default="temporal", description="Type of chart to generate")
    point: Optional[List[float]] = Field(default=None, description="Specific point for time series [lon, lat]")

@router.post("/map/ndvi")
async def generate_ndvi_map(request: MapGenerationRequest):
    """
    Generate NDVI map for a specified area and time period
    
    Creates an interactive map showing NDVI values and potential bloom areas
    using NASA satellite data through Google Earth Engine.
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
        
        # Check if GEE is available
        if not gee_service.is_available():
            raise HTTPException(status_code=503, detail="Google Earth Engine service not available")
        
        # Get NDVI data
        if "LANDSAT" in request.collection:
            data_result = await gee_service.get_landsat_ndvi(
                start_date=request.start_date,
                end_date=request.end_date,
                bbox=bbox_tuple
            )
        elif "MODIS" in request.collection:
            data_result = await gee_service.get_modis_ndvi(
                start_date=request.start_date,
                end_date=request.end_date,
                bbox=bbox_tuple
            )
        elif "VIIRS" in request.collection:
            data_result = await gee_service.get_viirs_ndvi(
                start_date=request.start_date,
                end_date=request.end_date,
                bbox=bbox_tuple
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported collection for map generation")
        
        if "error" in data_result:
            raise HTTPException(status_code=500, detail=data_result["error"])
        
        # Generate map
        map_html = await _generate_ndvi_map_html(
            bbox_tuple, 
            data_result, 
            request.ndvi_threshold
        )
        
        # Save map to file
        map_filename = f"ndvi_map_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.html"
        map_path = os.path.join(settings.STATIC_DIR, map_filename)
        
        with open(map_path, 'w', encoding='utf-8') as f:
            f.write(map_html)
        
        return {
            "map_type": "ndvi",
            "collection": request.collection,
            "analysis_area": bbox_tuple,
            "period": f"{request.start_date.strftime('%Y-%m-%d')} to {request.end_date.strftime('%Y-%m-%d')}",
            "ndvi_threshold": request.ndvi_threshold,
            "map_url": f"/static/{map_filename}",
            "map_file": map_filename,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating NDVI map: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/chart/temporal")
async def generate_temporal_chart(request: ChartGenerationRequest):
    """
    Generate temporal chart showing NDVI trends over time
    
    Creates a chart showing NDVI values over time to identify bloom periods
    and seasonal patterns.
    """
    try:
        # Validate bbox
        if len(request.bbox) != 4:
            raise HTTPException(status_code=400, detail="Bounding box must have 4 coordinates")
        
        min_lon, min_lat, max_lon, max_lat = request.bbox
        bbox_tuple = (min_lon, min_lat, max_lon, max_lat)
        
        # Validate point if provided
        point_tuple = None
        if request.point:
            if len(request.point) != 2:
                raise HTTPException(status_code=400, detail="Point must have 2 coordinates [lon, lat]")
            point_tuple = (request.point[0], request.point[1])
        
        # Validate date range
        if request.end_date <= request.start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        # Check if GEE is available
        if not gee_service.is_available():
            raise HTTPException(status_code=503, detail="Google Earth Engine service not available")
        
        # Get temporal analysis data
        temporal_result = await gee_service.analyze_temporal_patterns(
            collection=request.collection,
            start_date=request.start_date,
            end_date=request.end_date,
            bbox=bbox_tuple,
            point=point_tuple
        )
        
        if "error" in temporal_result:
            raise HTTPException(status_code=500, detail=temporal_result["error"])
        
        # Generate chart
        chart_data = temporal_result.get("time_series", {})
        if not chart_data:
            raise HTTPException(status_code=500, detail="No temporal data available for chart generation")
        
        # Create chart
        chart_filename = f"temporal_chart_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.png"
        chart_path = os.path.join(settings.STATIC_DIR, chart_filename)
        
        await _generate_temporal_chart(
            chart_data, 
            chart_path,
            request.collection,
            bbox_tuple,
            point_tuple
        )
        
        return {
            "chart_type": "temporal",
            "collection": request.collection,
            "analysis_area": bbox_tuple,
            "analysis_point": point_tuple,
            "period": f"{request.start_date.strftime('%Y-%m-%d')} to {request.end_date.strftime('%Y-%m-%d')}",
            "chart_url": f"/static/{chart_filename}",
            "chart_file": chart_filename,
            "data_points": len(chart_data.get("dates", [])),
            "peaks_detected": len(chart_data.get("peaks", [])),
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating temporal chart: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/maps")
async def list_generated_maps():
    """
    List all generated maps
    
    Returns a list of all generated maps available in the static directory.
    """
    try:
        static_dir = settings.STATIC_DIR
        if not os.path.exists(static_dir):
            return {"maps": [], "total": 0}
        
        map_files = []
        for filename in os.listdir(static_dir):
            if filename.endswith('.html'):
                file_path = os.path.join(static_dir, filename)
                file_stats = os.stat(file_path)
                map_files.append({
                    "filename": filename,
                    "url": f"/static/{filename}",
                    "created_at": datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
                    "size_bytes": file_stats.st_size
                })
        
        return {
            "maps": sorted(map_files, key=lambda x: x["created_at"], reverse=True),
            "total": len(map_files),
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error listing maps: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/charts")
async def list_generated_charts():
    """
    List all generated charts
    
    Returns a list of all generated charts available in the static directory.
    """
    try:
        static_dir = settings.STATIC_DIR
        if not os.path.exists(static_dir):
            return {"charts": [], "total": 0}
        
        chart_files = []
        for filename in os.listdir(static_dir):
            if filename.endswith(('.png', '.jpg', '.jpeg', '.svg')):
                file_path = os.path.join(static_dir, filename)
                file_stats = os.stat(file_path)
                chart_files.append({
                    "filename": filename,
                    "url": f"/static/{filename}",
                    "created_at": datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
                    "size_bytes": file_stats.st_size
                })
        
        return {
            "charts": sorted(chart_files, key=lambda x: x["created_at"], reverse=True),
            "total": len(chart_files),
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error listing charts: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def _generate_ndvi_map_html(
    bbox: Tuple[float, float, float, float],
    data_result: dict,
    ndvi_threshold: float
) -> str:
    """Generate HTML for NDVI map using Folium"""
    try:
        min_lon, min_lat, max_lon, max_lat = bbox
        
        # Create base map
        center_lat = (min_lat + max_lat) / 2
        center_lon = (min_lon + max_lon) / 2
        
        m = folium.Map(
            location=[center_lat, center_lon],
            zoom_start=10,
            tiles='OpenStreetMap'
        )
        
        # Add bounding box
        folium.Rectangle(
            bounds=[[min_lat, min_lon], [max_lat, max_lon]],
            color='red',
            fill=False,
            weight=2
        ).add_to(m)
        
        # Add NDVI statistics as popup
        stats = data_result.get("statistics", {})
        ndvi_mean = stats.get("NDVI", 0)
        ndvi_max = stats.get("NDVI_max", 0)
        ndvi_min = stats.get("NDVI_min", 0)
        
        popup_text = f"""
        <b>NDVI Analysis</b><br>
        Mean NDVI: {ndvi_mean:.3f}<br>
        Max NDVI: {ndvi_max:.3f}<br>
        Min NDVI: {ndvi_min:.3f}<br>
        Bloom Threshold: {ndvi_threshold}<br>
        Collection: {data_result.get('collection', 'Unknown')}<br>
        Images: {data_result.get('image_count', 0)}
        """
        
        folium.Marker(
            [center_lat, center_lon],
            popup=folium.Popup(popup_text, max_width=300),
            icon=folium.Icon(color='green', icon='info-sign')
        ).add_to(m)
        
        # Add bloom areas if NDVI is above threshold
        if ndvi_mean > ndvi_threshold:
            bloom_color = 'darkgreen'
            bloom_text = f"Potential Bloom Area (NDVI: {ndvi_mean:.3f})"
        else:
            bloom_color = 'lightgreen'
            bloom_text = f"Normal Vegetation (NDVI: {ndvi_mean:.3f})"
        
        folium.Circle(
            [center_lat, center_lon],
            radius=1000,
            color=bloom_color,
            fill=True,
            fillColor=bloom_color,
            fillOpacity=0.3,
            popup=bloom_text
        ).add_to(m)
        
        # Return HTML
        return m._repr_html_()
        
    except Exception as e:
        logger.error(f"Error generating map HTML: {e}")
        return f"<html><body><h1>Error generating map: {str(e)}</h1></body></html>"

async def _generate_temporal_chart(
    chart_data: dict,
    output_path: str,
    collection: str,
    bbox: Tuple[float, float, float, float],
    point: Optional[Tuple[float, float]] = None
):
    """Generate temporal chart using matplotlib"""
    try:
        dates = chart_data.get("dates", [])
        values = chart_data.get("ndvi_values", [])
        peaks = chart_data.get("peaks", [])
        
        if not dates or not values:
            raise ValueError("No data available for chart generation")
        
        # Set up the plot
        plt.figure(figsize=(12, 8))
        plt.style.use('seaborn-v0_8')
        
        # Convert date strings to datetime objects
        date_objects = [datetime.fromisoformat(date) for date in dates]
        
        # Create the plot
        plt.plot(date_objects, values, 'b-', linewidth=2, label='NDVI Values')
        
        # Highlight peaks
        if peaks:
            peak_dates = [date_objects[i] for i in peaks]
            peak_values = [values[i] for i in peaks]
            plt.scatter(peak_dates, peak_values, color='red', s=100, zorder=5, label='Peak Periods')
        
        # Add threshold line
        plt.axhline(y=0.6, color='orange', linestyle='--', alpha=0.7, label='Bloom Threshold (0.6)')
        plt.axhline(y=0.3, color='green', linestyle='--', alpha=0.7, label='Vegetation Threshold (0.3)')
        
        # Customize the plot
        plt.title(f'NDVI Temporal Analysis - {collection}', fontsize=16, fontweight='bold')
        plt.xlabel('Date', fontsize=12)
        plt.ylabel('NDVI Value', fontsize=12)
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # Rotate x-axis labels
        plt.xticks(rotation=45)
        
        # Add statistics text
        mean_ndvi = sum(values) / len(values)
        max_ndvi = max(values)
        min_ndvi = min(values)
        
        stats_text = f'Mean: {mean_ndvi:.3f}\nMax: {max_ndvi:.3f}\nMin: {min_ndvi:.3f}\nPeaks: {len(peaks)}'
        plt.text(0.02, 0.98, stats_text, transform=plt.gca().transAxes, 
                verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))
        
        # Add area/point info
        if point:
            location_text = f'Analysis Point: {point[1]:.4f}°N, {point[0]:.4f}°E'
        else:
            min_lon, min_lat, max_lon, max_lat = bbox
            location_text = f'Analysis Area: {min_lat:.2f}°-{max_lat:.2f}°N, {min_lon:.2f}°-{max_lon:.2f}°E'
        
        plt.figtext(0.5, 0.02, location_text, ha='center', fontsize=10, style='italic')
        
        # Adjust layout and save
        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.close()
        
    except Exception as e:
        logger.error(f"Error generating temporal chart: {e}")
        raise
