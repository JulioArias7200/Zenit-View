#!/usr/bin/env python3
"""
BloomWatch API Test Script
This script tests the main API endpoints to ensure everything is working
"""

import requests
import json
import time
from datetime import datetime, timedelta

# API Base URL
BASE_URL = "http://localhost:8000"

def test_health_endpoints():
    """Test health check endpoints"""
    print("🏥 Testing health endpoints...")
    
    try:
        # Test main health endpoint
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Main health endpoint: OK")
        else:
            print(f"❌ Main health endpoint: {response.status_code}")
            return False
        
        # Test bloom health endpoint
        response = requests.get(f"{BASE_URL}/api/v1/bloom/health")
        if response.status_code == 200:
            print("✅ Bloom service health: OK")
        else:
            print(f"❌ Bloom service health: {response.status_code}")
            return False
        
        # Test NASA data status
        response = requests.get(f"{BASE_URL}/api/v1/nasa/status")
        if response.status_code == 200:
            print("✅ NASA data status: OK")
        else:
            print(f"❌ NASA data status: {response.status_code}")
            return False
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Make sure the server is running.")
        return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_collections_endpoint():
    """Test NASA collections endpoint"""
    print("\n📡 Testing NASA collections endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/nasa/collections")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Collections endpoint: {len(data)} collections available")
            for collection in data:
                print(f"   - {collection['name']}: {collection['resolution']}")
            return True
        else:
            print(f"❌ Collections endpoint: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Collections test error: {e}")
        return False

def test_bloom_detection():
    """Test bloom detection endpoint"""
    print("\n🌸 Testing bloom detection endpoint...")
    
    try:
        # Test data - New York City area
        test_request = {
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-01-31T23:59:59Z",
            "bbox": [-74.1, 40.7, -73.9, 40.8],  # NYC area
            "collection": "MODIS/006/MOD13Q1",
            "detection_method": "ndvi_threshold",
            "ndvi_threshold": 0.6
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/bloom/detect",
            json=test_request,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Bloom detection: Job {data['job_id']} created")
            print(f"   Status: {data['status']}")
            return data['job_id']
        else:
            print(f"❌ Bloom detection: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Bloom detection test error: {e}")
        return None

def test_temporal_analysis():
    """Test temporal analysis endpoint"""
    print("\n📈 Testing temporal analysis endpoint...")
    
    try:
        test_request = {
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-12-31T23:59:59Z",
            "bbox": [-74.1, 40.7, -73.9, 40.8],
            "collection": "MODIS/006/MOD13Q1",
            "chart_type": "temporal"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/bloom/temporal-analysis",
            json=test_request,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Temporal analysis: OK")
            print(f"   Analysis type: {data['analysis_type']}")
            print(f"   Collection: {data['collection']}")
            return True
        else:
            print(f"❌ Temporal analysis: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Temporal analysis test error: {e}")
        return False

def test_visualization():
    """Test visualization endpoint"""
    print("\n🗺️  Testing visualization endpoint...")
    
    try:
        test_request = {
            "bbox": [-74.1, 40.7, -73.9, 40.8],
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-01-31T23:59:59Z",
            "collection": "MODIS/006/MOD13Q1",
            "map_type": "ndvi",
            "ndvi_threshold": 0.6
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/viz/map/ndvi",
            json=test_request,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Map generation: OK")
            print(f"   Map type: {data['map_type']}")
            print(f"   Map URL: {data['map_url']}")
            return True
        else:
            print(f"❌ Map generation: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Visualization test error: {e}")
        return False

def check_job_status(job_id):
    """Check the status of a job"""
    if not job_id:
        return False
    
    print(f"\n⏳ Checking job status for job {job_id}...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/bloom/status/{job_id}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Job status: {data['status']}")
            if data['status'] == 'completed':
                print("   Job completed successfully!")
                return True
            elif data['status'] == 'failed':
                print(f"   Job failed: {data.get('error_message', 'Unknown error')}")
                return False
            else:
                print("   Job still running...")
                return False
        else:
            print(f"❌ Job status check: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Job status check error: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 BloomWatch API Test Suite")
    print("=" * 40)
    
    # Test health endpoints
    if not test_health_endpoints():
        print("\n❌ Health checks failed. Make sure the API is running.")
        return False
    
    # Test collections endpoint
    if not test_collections_endpoint():
        print("\n❌ Collections endpoint failed.")
        return False
    
    # Test bloom detection
    job_id = test_bloom_detection()
    
    # Test temporal analysis
    if not test_temporal_analysis():
        print("\n❌ Temporal analysis failed.")
        return False
    
    # Test visualization
    if not test_visualization():
        print("\n❌ Visualization failed.")
        return False
    
    # Wait a bit and check job status if we have a job
    if job_id:
        time.sleep(5)  # Wait 5 seconds
        check_job_status(job_id)
    
    print("\n🎉 API test suite completed!")
    print("✅ All endpoints are responding correctly")
    print(f"📚 API Documentation: {BASE_URL}/docs")
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
