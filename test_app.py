#!/usr/bin/env python3
"""
Simple test script to verify the BRM Renewal Calendar app works correctly.
Run this after starting the application with docker compose up.
"""

import requests
import json
import time
from pathlib import Path

BASE_URL = "http://localhost:8000"

def test_health():
    """Test if the API is running"""
    try:
        response = requests.get(f"{BASE_URL}/contracts")
        print(f"✓ API is running (status: {response.status_code})")
        return True
    except requests.exceptions.ConnectionError:
        print("✗ API is not responding. Make sure to run 'docker compose up' first")
        return False

def test_pdf_upload():
    """Test PDF upload functionality.

    Tries common sample locations:
    - SampleAgreements/BRM_OrderForm_Anthropic.pdf (legacy)
    - First PDF found under SampleData/ (or nested)
    """
    # Preferred legacy sample path
    legacy = Path("SampleAgreements/BRM_OrderForm_Anthropic.pdf")
    pdf_path: Path | None = None
    if legacy.exists():
        pdf_path = legacy
    else:
        # Fallback: any PDF under SampleData (non-recursive or recursive)
        candidates = list(Path("SampleData").glob("**/*.pdf"))
        if candidates:
            pdf_path = candidates[0]
    if not pdf_path or not pdf_path.exists():
        print("✗ No sample PDF found. Place a PDF in 'SampleData/' or 'SampleAgreements/'.")
        return False
    
    try:
        with open(pdf_path, 'rb') as f:
            files = {'files': (pdf_path.name, f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/contracts", files=files)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ PDF upload successful")
            print(f"  Uploaded: {result['items'][0]['file_name']}")
            print(f"  Status: {result['items'][0]['extraction_status']}")
            return result['items'][0].get('id')
        else:
            print(f"✗ PDF upload failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ PDF upload error: {e}")
        return False

def test_contracts_list():
    """Test contracts listing"""
    try:
        response = requests.get(f"{BASE_URL}/contracts")
        if response.status_code == 200:
            contracts = response.json()
            print(f"✓ Contracts list working ({len(contracts)} contracts)")
            return contracts
        else:
            print(f"✗ Contracts list failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Contracts list error: {e}")
        return False

def test_calendar_events():
    """Test calendar events generation"""
    try:
        response = requests.get(f"{BASE_URL}/calendar")
        if response.status_code == 200:
            calendar_data = response.json()
            events = calendar_data.get('events', [])
            print(f"✓ Calendar events working ({len(events)} events)")
            for event in events[:3]:  # Show first 3 events
                print(f"  - {event['title']} on {event['date']}")
            return True
        else:
            print(f"✗ Calendar events failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Calendar events error: {e}")
        return False

def main():
    print("🔍 Testing BRM Renewal Calendar Application\n")
    
    # Test 1: API Health
    if not test_health():
        return
    
    print()
    
    # Test 2: PDF Upload
    contract_id = test_pdf_upload()
    if not contract_id:
        print("⚠️  PDF upload test failed, but continuing with other tests...")
    
    print()
    
    # Test 3: Contracts List
    contracts = test_contracts_list()
    
    print()
    
    # Test 4: Calendar Events
    test_calendar_events()
    
    print()
    print("✅ Basic functionality test complete!")
    print()
    print("🌐 Access the application at:")
    print("   Frontend: http://localhost:5173")
    print("   Backend API docs: http://localhost:8000/docs")

if __name__ == "__main__":
    main()