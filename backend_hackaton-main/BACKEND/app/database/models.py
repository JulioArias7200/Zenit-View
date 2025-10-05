"""
Database models for BloomWatch application
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base

class SatelliteImage(Base):
    """Model for storing satellite image metadata"""
    __tablename__ = "satellite_images"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False, index=True)
    collection = Column(String(100), nullable=False)  # e.g., MOD13Q1, VNP13A1
    satellite = Column(String(50), nullable=False)  # e.g., MODIS, VIIRS, Landsat
    acquisition_date = Column(DateTime, nullable=False, index=True)
    spatial_coverage = Column(JSON)  # Bounding box coordinates
    resolution = Column(Float)  # Spatial resolution in meters
    cloud_coverage = Column(Float)  # Percentage of cloud coverage
    file_size = Column(Integer)  # File size in bytes
    download_url = Column(Text)
    local_path = Column(String(500))
    processing_status = Column(String(50), default="downloaded")  # downloaded, processed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    bloom_detections = relationship("BloomDetection", back_populates="satellite_image")

class BloomDetection(Base):
    """Model for storing bloom detection results"""
    __tablename__ = "bloom_detections"
    
    id = Column(Integer, primary_key=True, index=True)
    satellite_image_id = Column(Integer, ForeignKey("satellite_images.id"), nullable=False)
    detection_method = Column(String(100), nullable=False)  # ndvi_threshold, machine_learning, etc.
    
    # Bloom statistics
    bloom_areas_count = Column(Integer, default=0)
    total_bloom_area = Column(Float)  # Area in square meters
    max_ndvi_value = Column(Float)
    avg_ndvi_value = Column(Float)
    confidence_score = Column(Float)  # Between 0 and 1
    
    # Spatial information
    bloom_coordinates = Column(JSON)  # List of bloom area coordinates
    bounding_box = Column(JSON)  # Overall bounding box of bloom areas
    
    # Analysis results
    analysis_results = Column(JSON)  # Detailed analysis results
    recommendations = Column(JSON)  # Generated recommendations
    
    # Metadata
    processing_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    satellite_image = relationship("SatelliteImage", back_populates="bloom_detections")
    bloom_clusters = relationship("BloomCluster", back_populates="bloom_detection")

class BloomCluster(Base):
    """Model for storing individual bloom clusters"""
    __tablename__ = "bloom_clusters"
    
    id = Column(Integer, primary_key=True, index=True)
    bloom_detection_id = Column(Integer, ForeignKey("bloom_detections.id"), nullable=False)
    
    # Cluster properties
    cluster_id = Column(Integer, nullable=False)  # ID within the detection
    area = Column(Float, nullable=False)  # Area in square meters
    centroid_lat = Column(Float, nullable=False)
    centroid_lon = Column(Float, nullable=False)
    
    # Bounding box
    min_lat = Column(Float, nullable=False)
    max_lat = Column(Float, nullable=False)
    min_lon = Column(Float, nullable=False)
    max_lon = Column(Float, nullable=False)
    
    # Spectral properties
    avg_ndvi = Column(Float)
    max_ndvi = Column(Float)
    avg_evi = Column(Float)
    
    # Additional metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    bloom_detection = relationship("BloomDetection", back_populates="bloom_clusters")

class TemporalAnalysis(Base):
    """Model for storing temporal bloom analysis results"""
    __tablename__ = "temporal_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    location_name = Column(String(255), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Analysis period
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    # Temporal metrics
    bloom_periods_count = Column(Integer, default=0)
    peak_bloom_date = Column(DateTime)
    peak_ndvi_value = Column(Float)
    avg_ndvi = Column(Float)
    min_ndvi = Column(Float)
    max_ndvi = Column(Float)
    
    # Analysis results
    bloom_timeline = Column(JSON)  # Timeline of bloom events
    seasonal_patterns = Column(JSON)  # Detected seasonal patterns
    trend_analysis = Column(JSON)  # Trend analysis results
    
    # Metadata
    analysis_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Visualization(Base):
    """Model for storing generated visualizations"""
    __tablename__ = "visualizations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    visualization_type = Column(String(100), nullable=False)  # map, chart, animation
    data_source = Column(String(255))  # Source data or analysis
    
    # File information
    file_path = Column(String(500), nullable=False)
    file_format = Column(String(50), nullable=False)  # png, jpg, html, gif
    file_size = Column(Integer)
    
    # Visualization parameters
    parameters = Column(JSON)  # Visualization configuration
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))  # Optional expiration date

class AnalysisJob(Base):
    """Model for tracking analysis jobs"""
    __tablename__ = "analysis_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String(100), nullable=False)  # bloom_detection, temporal_analysis, etc.
    status = Column(String(50), nullable=False, default="pending")  # pending, running, completed, failed
    
    # Job parameters
    parameters = Column(JSON)  # Job configuration parameters
    
    # Results
    result_data = Column(JSON)  # Job results
    error_message = Column(Text)  # Error message if failed
    
    # Timing
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserSession(Base):
    """Model for tracking user sessions and API usage"""
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), nullable=False, unique=True, index=True)
    user_agent = Column(String(500))
    ip_address = Column(String(45))  # IPv6 compatible
    
    # API usage tracking
    api_calls_count = Column(Integer, default=0)
    data_downloaded = Column(Integer, default=0)  # Bytes downloaded
    
    # Session metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))

class SystemMetrics(Base):
    """Model for storing system performance metrics"""
    __tablename__ = "system_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(100), nullable=False, index=True)
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String(50))
    
    # Additional metadata
    tags = Column(JSON)  # Additional tags for categorization
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Context
    context = Column(JSON)  # Additional context information
