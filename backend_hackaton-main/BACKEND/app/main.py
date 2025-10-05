"""
BloomWatch Backend - NASA Space Apps Challenge 2025
Main FastAPI application for monitoring plant blooms using NASA satellite data
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
from dotenv import load_dotenv

from app.api.routes import bloom, nasa_data, visualization
from app.core.config import settings
from app.database.database import engine, Base

# Load environment variables
load_dotenv()

# Create database tables (only if database is available)
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")
except Exception as e:
    print("⚠️  Database not available - running in database-free mode")

# Initialize FastAPI app
app = FastAPI(
    title="BloomWatch API",
    description="API para monitorear floraciones de plantas usando datos satelitales de la NASA",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(bloom.router, prefix="/api/v1/bloom", tags=["bloom-detection"])
app.include_router(nasa_data.router, prefix="/api/v1/nasa", tags=["nasa-data"])
app.include_router(visualization.router, prefix="/api/v1/viz", tags=["visualization"])

# Mount static files for serving generated visualizations
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    """Endpoint raíz con información del proyecto"""
    return {
        "message": "🌸 BloomWatch API - NASA Space Apps Challenge 2025",
        "description": "API para monitorear floraciones de plantas usando datos satelitales de la NASA",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "bloom_detection": "/api/v1/bloom",
            "nasa_data": "/api/v1/nasa",
            "visualization": "/api/v1/viz"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "BloomWatch API"}

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
