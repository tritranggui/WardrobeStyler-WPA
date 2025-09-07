import requests
import sys
import base64
import json
from datetime import datetime

class OutfitGeniusAPITester:
    def __init__(self, base_url="https://outfit-genius-39.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = f"test-user-{datetime.now().strftime('%H%M%S')}"
        self.clothing_item_id = None
        self.outfit_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, params=params, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def create_sample_image_base64(self):
        """Create a simple base64 encoded image for testing"""
        # Create a minimal 1x1 pixel PNG image in base64
        # This is a valid PNG image data
        return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_analyze_clothing(self):
        """Test clothing analysis endpoint"""
        sample_image = self.create_sample_image_base64()
        
        success, response = self.run_test(
            "Analyze Clothing",
            "POST",
            "clothing/analyze",
            200,
            data={
                "user_id": self.user_id,
                "image_base64": sample_image
            }
        )
        
        if success and 'id' in response:
            self.clothing_item_id = response['id']
            print(f"   Created clothing item with ID: {self.clothing_item_id}")
        
        return success

    def test_get_user_clothing(self):
        """Test getting user's clothing items"""
        success, response = self.run_test(
            "Get User Clothing",
            "GET",
            f"clothing/{self.user_id}",
            200
        )
        
        if success:
            print(f"   Found {len(response)} clothing items for user")
        
        return success

    def test_generate_outfit(self):
        """Test outfit generation"""
        if not self.clothing_item_id:
            print("❌ Cannot test outfit generation - no clothing item available")
            return False
        
        success, response = self.run_test(
            "Generate Outfit",
            "POST",
            "outfit/generate",
            200,
            data={
                "user_id": self.user_id,
                "style": "casual",
                "clothing_items": [self.clothing_item_id]
            }
        )
        
        if success and 'id' in response:
            self.outfit_id = response['id']
            print(f"   Generated outfit with ID: {self.outfit_id}")
        
        return success

    def test_get_user_outfits(self):
        """Test getting user's generated outfits"""
        success, response = self.run_test(
            "Get User Outfits",
            "GET",
            f"outfit/{self.user_id}",
            200
        )
        
        if success:
            print(f"   Found {len(response)} outfits for user")
        
        return success

    def test_delete_clothing_item(self):
        """Test deleting a clothing item"""
        if not self.clothing_item_id:
            print("❌ Cannot test delete - no clothing item available")
            return False
        
        success, response = self.run_test(
            "Delete Clothing Item",
            "DELETE",
            f"clothing/{self.clothing_item_id}",
            200,
            params={"user_id": self.user_id}
        )
        
        return success

    def test_status_endpoints(self):
        """Test the original status endpoints"""
        # Test create status
        success1, response1 = self.run_test(
            "Create Status Check",
            "POST",
            "status",
            200,
            data={"client_name": "test_client"}
        )
        
        # Test get status
        success2, response2 = self.run_test(
            "Get Status Checks",
            "GET",
            "status",
            200
        )
        
        return success1 and success2

def main():
    print("🚀 Starting Outfit Genius API Tests")
    print("=" * 50)
    
    # Setup
    tester = OutfitGeniusAPITester()
    
    # Run all tests in sequence
    tests = [
        tester.test_root_endpoint,
        tester.test_analyze_clothing,
        tester.test_get_user_clothing,
        tester.test_generate_outfit,
        tester.test_get_user_outfits,
        tester.test_status_endpoints,
        tester.test_delete_clothing_item,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed - check the details above")
        return 1

if __name__ == "__main__":
    sys.exit(main())