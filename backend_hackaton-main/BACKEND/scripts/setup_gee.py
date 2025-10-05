#!/usr/bin/env python3
"""
Google Earth Engine Setup Script for BloomWatch
This script helps set up and verify Google Earth Engine access
"""

import ee
import os
import sys
from pathlib import Path

def check_gee_authentication():
    """Check if Google Earth Engine is properly authenticated"""
    try:
        # Try to initialize Earth Engine
        if not ee.data._initialized:
            ee.Initialize()
        
        print("✅ Google Earth Engine is authenticated and initialized")
        return True
        
    except Exception as e:
        print(f"❌ Google Earth Engine authentication failed: {e}")
        return False

def test_nasa_collections():
    """Test access to NASA satellite collections"""
    try:
        # Test MODIS collection
        modis = ee.ImageCollection("MODIS/006/MOD13Q1").limit(1)
        modis_size = modis.size().getInfo()
        print(f"✅ MODIS collection accessible: {modis_size} images")
        
        # Test Landsat collection
        landsat = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").limit(1)
        landsat_size = landsat.size().getInfo()
        print(f"✅ Landsat collection accessible: {landsat_size} images")
        
        # Test VIIRS collection
        viirs = ee.ImageCollection("NOAA/VIIRS/001/VNP13A1").limit(1)
        viirs_size = viirs.size().getInfo()
        print(f"✅ VIIRS collection accessible: {viirs_size} images")
        
        return True
        
    except Exception as e:
        print(f"❌ Error accessing NASA collections: {e}")
        return False

def test_simple_analysis():
    """Test a simple NDVI analysis"""
    try:
        # Define a small area (New York City)
        aoi = ee.Geometry.Rectangle([-74.1, 40.7, -73.9, 40.8])
        
        # Get MODIS NDVI for a recent period
        modis = ee.ImageCollection("MODIS/006/MOD13Q1") \
            .filterDate('2024-01-01', '2024-01-31') \
            .filterBounds(aoi) \
            .select(['NDVI'])
        
        # Get the first image
        image = modis.first()
        
        # Calculate mean NDVI
        mean_ndvi = image.select('NDVI').reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=aoi,
            scale=250,
            maxPixels=1e9
        )
        
        result = mean_ndvi.getInfo()
        print(f"✅ Simple NDVI analysis successful: {result}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in simple analysis: {e}")
        return False

def main():
    """Main setup function"""
    print("🛰️  BloomWatch - Google Earth Engine Setup")
    print("=" * 50)
    
    # Check authentication
    if not check_gee_authentication():
        print("\n🔧 Setup Instructions:")
        print("1. Run: earthengine authenticate")
        print("2. Follow the authentication flow in your browser")
        print("3. Run this script again to verify setup")
        return False
    
    # Test NASA collections
    print("\n📡 Testing NASA satellite collections...")
    if not test_nasa_collections():
        print("❌ Failed to access NASA collections")
        return False
    
    # Test simple analysis
    print("\n🔬 Testing simple NDVI analysis...")
    if not test_simple_analysis():
        print("❌ Failed to perform simple analysis")
        return False
    
    print("\n🎉 Google Earth Engine setup completed successfully!")
    print("✅ All NASA satellite collections are accessible")
    print("✅ NDVI analysis is working correctly")
    print("\nYou can now run the BloomWatch API:")
    print("python run.py")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
