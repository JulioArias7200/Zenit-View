"""
Configuration settings for BloomWatch API
"""

import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    
    # NASA EarthData Credentials
    NASA_USERNAME: Optional[str] = None
    NASA_PASSWORD: Optional[str] = None
    
    # Database Configuration
    DATABASE_URL: str = "postgresql://username:password@localhost:5432/bloomwatch_db"
    REDIS_URL: str = "redis://localhost:6379"
    
    # External APIs
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    
    # Celery Configuration
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # File paths
    DATA_DIR: str = "data"
    STATIC_DIR: str = "static"
    TEMP_DIR: str = "temp"
    
    # NASA API endpoints
    NASA_CMR_URL: str = "https://cmr.earthdata.nasa.gov/search"
    NASA_LAADS_URL: str = "https://ladsweb.modaps.eosdis.nasa.gov/api/v2"
    NASA_LP_DAAC_URL: str = "https://e4ftl01.cr.usgs.gov"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields instead of raising error

# Create settings instance
settings = Settings()

# Ensure directories exist
for directory in [settings.DATA_DIR, settings.STATIC_DIR, settings.TEMP_DIR]:
    os.makedirs(directory, exist_ok=True)
