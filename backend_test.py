import requests
import sys
import json
from datetime import datetime

class EstofadosAPITester:
    def __init__(self, base_url="https://sofa-boutique-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            details = ""
            
            if not success:
                details = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_data = response.json()
                    details += f" - {error_data}"
                except:
                    details += f" - {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                return False, details

        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            print(f"   Error: {error_msg}")
            self.log_test(name, False, error_msg)
            return False, error_msg

    def test_categories(self):
        """Test categories endpoint"""
        print("\n" + "="*50)
        print("TESTING CATEGORIES")
        print("="*50)
        
        success, response = self.run_test(
            "GET /api/categories",
            "GET",
            "categories",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} categories")
            if len(response) > 0:
                print(f"   Sample category: {response[0].get('name', 'N/A')}")
        
        return success

    def test_products(self):
        """Test products endpoint"""
        print("\n" + "="*50)
        print("TESTING PRODUCTS")
        print("="*50)
        
        success, response = self.run_test(
            "GET /api/products",
            "GET",
            "products",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} products")
            if len(response) > 0:
                print(f"   Sample product: {response[0].get('name', 'N/A')} - R$ {response[0].get('price', 0)}")
        
        return success

    def test_reviews(self):
        """Test reviews endpoint"""
        print("\n" + "="*50)
        print("TESTING REVIEWS")
        print("="*50)
        
        success, response = self.run_test(
            "GET /api/reviews",
            "GET",
            "reviews",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} reviews")
            if len(response) > 0:
                print(f"   Sample review: {response[0].get('user_name', 'N/A')} - {response[0].get('rating', 0)} stars")
        
        return success

    def test_user_registration(self):
        """Test user registration"""
        print("\n" + "="*50)
        print("TESTING USER REGISTRATION")
        print("="*50)
        
        # Test data as specified in the request
        test_user_data = {
            "name": "João Silva",
            "email": "joao@test.com",
            "password": "123456",
            "phone": "21999887766"
        }
        
        success, response = self.run_test(
            "POST /api/auth/register",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and isinstance(response, dict):
            if 'access_token' in response:
                self.token = response['access_token']
                print(f"   Registration successful, token received")
                if 'user' in response:
                    self.user_id = response['user'].get('id')
                    print(f"   User ID: {self.user_id}")
            else:
                print(f"   Warning: No access_token in response")
        
        return success

    def test_user_login(self):
        """Test user login"""
        print("\n" + "="*50)
        print("TESTING USER LOGIN")
        print("="*50)
        
        # Clear token to test fresh login
        self.token = None
        
        login_data = {
            "email": "joao@test.com",
            "password": "123456"
        }
        
        success, response = self.run_test(
            "POST /api/auth/login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and isinstance(response, dict):
            if 'access_token' in response:
                self.token = response['access_token']
                print(f"   Login successful, token received")
                if 'user' in response:
                    self.user_id = response['user'].get('id')
                    print(f"   User ID: {self.user_id}")
            else:
                print(f"   Warning: No access_token in response")
        
        return success

    def test_cart_get(self):
        """Test get cart (requires authentication)"""
        print("\n" + "="*50)
        print("TESTING GET CART")
        print("="*50)
        
        if not self.token:
            print("   Skipping cart test - no authentication token")
            self.log_test("GET /api/cart", False, "No authentication token")
            return False
        
        success, response = self.run_test(
            "GET /api/cart",
            "GET",
            "cart",
            200
        )
        
        if success and isinstance(response, dict):
            items_count = len(response.get('items', []))
            total = response.get('total', 0)
            print(f"   Cart has {items_count} items, total: R$ {total}")
        
        return success

    def test_cart_add(self):
        """Test add to cart (requires authentication)"""
        print("\n" + "="*50)
        print("TESTING ADD TO CART")
        print("="*50)
        
        if not self.token:
            print("   Skipping add to cart test - no authentication token")
            self.log_test("POST /api/cart/add", False, "No authentication token")
            return False
        
        # First get products to find a valid product ID
        print("   Getting products to find a valid product ID...")
        products_success, products_response = self.run_test(
            "GET products for cart test",
            "GET",
            "products",
            200
        )
        
        if not products_success or not isinstance(products_response, list) or len(products_response) == 0:
            print("   Cannot test add to cart - no products available")
            self.log_test("POST /api/cart/add", False, "No products available")
            return False
        
        # Use the first product
        product = products_response[0]
        product_id = product.get('id')
        product_name = product.get('name', 'Unknown')
        
        print(f"   Adding product to cart: {product_name} (ID: {product_id})")
        
        cart_data = {
            "product_id": product_id,
            "quantity": 1
        }
        
        success, response = self.run_test(
            "POST /api/cart/add",
            "POST",
            "cart/add",
            200,
            data=cart_data
        )
        
        if success and isinstance(response, dict):
            if 'cart' in response:
                cart = response['cart']
                items_count = len(cart.get('items', []))
                total = cart.get('total', 0)
                print(f"   Product added successfully! Cart now has {items_count} items, total: R$ {total}")
            else:
                print(f"   Product added, but cart data not returned")
        
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Estofados Premium Outlet API Tests")
        print(f"🌐 Base URL: {self.base_url}")
        print(f"📡 API URL: {self.api_url}")
        print("="*70)
        
        # Test public endpoints first
        self.test_categories()
        self.test_products()
        self.test_reviews()
        
        # Test authentication
        self.test_user_registration()
        self.test_user_login()
        
        # Test authenticated endpoints
        self.test_cart_get()
        self.test_cart_add()
        
        # Print final results
        print("\n" + "="*70)
        print("📊 FINAL TEST RESULTS")
        print("="*70)
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Print failed tests details
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS DETAILS:")
            for test in failed_tests:
                print(f"   • {test['name']}: {test['details']}")
        
        print("\n" + "="*70)
        
        return self.tests_passed == self.tests_run

def main():
    """Main test function"""
    tester = EstofadosAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except Exception as e:
        print(f"💥 Test suite failed with error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())