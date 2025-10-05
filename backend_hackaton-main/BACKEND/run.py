#!/usr/bin/env python3
"""
BloomWatch Backend - NASA Space Apps Challenge 2025
Script principal para ejecutar la aplicación
"""

import uvicorn
import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
# Check if the 'logs' directory exists, if not, create it

def main():
    """Main function to run the BloomWatch API"""
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Get configuration
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    debug = os.getenv("DEBUG", "True").lower() == "true"
    
    print("🌸 BloomWatch Backend - NASA Space Apps Challenge 2025")
    print("=" * 60)
    print(f"🚀 Starting server on {host}:{port}")
    print(f"🔧 Debug mode: {debug}")
    print(f"📚 API Documentation: http://{host}:{port}/docs")
    print(f"🔍 Alternative docs: http://{host}:{port}/redoc")
    print("=" * 60)
    logs_dir = project_root / "app/datamodels"
    if not logs_dir.exists():
        logs_dir.mkdir(parents=True)
        print(f"📁 Created directory: {logs_dir}")
    else:
        print(f"📁 Directory already exists: {logs_dir}")
    # Initialize Google Earth Engine
    try:
        import ee
        
        # Set credentials path if not already set
        if not os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'):
            # Try different possible credential paths
            possible_paths = [
                os.path.expanduser('~/.config/earthengine/credentials'),
                os.path.expanduser('~/.config/gcloud/application_default_credentials.json'),
                '/Users/amilcaryujra/.config/gcloud/application_default_credentials.json'
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = path
                    print(f"🔑 Using GEE credentials from: {path}")
                    break
        
        # Initialize Earth Engine
        if not ee.data._initialized:
            ee.Initialize()
            print("✅ Google Earth Engine initialized successfully")
        else:
            print("✅ Google Earth Engine already initialized")
            
        # Test GEE with a simple operation
        try:
            # Test with a simple collection that should always be available
            test_collection = ee.ImageCollection('MODIS/006/MOD13Q1').limit(1)
            test_count = test_collection.size().getInfo()
            print(f"✅ Google Earth Engine test successful (found {test_count} images)")
        except Exception as test_error:
            print(f"⚠️  GEE test failed: {test_error}")
            print("💡 GEE is initialized but some operations may fail")
        
    except ImportError:
        print("❌ Google Earth Engine not installed")
    except Exception as e:
        print(f"⚠️  Google Earth Engine initialization failed: {e}")
        print("💡 Run 'earthengine authenticate --auth_mode=notebook' to fix this")
    
    # Start the server
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info" if not debug else "debug"
    )

if __name__ == "__main__":
    main()
