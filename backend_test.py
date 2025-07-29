#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Project Management System
Tests all authentication, project, and task management endpoints
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get base URL from environment - using localhost for testing since external routing has issues
BASE_URL = "http://localhost:3000/api"

class ProjectManagementAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_user = None
        self.test_project = None
        self.test_task = None
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
    
    def log_result(self, test_name, success, message="", response=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response and not success:
            print(f"   Response: {response.status_code} - {response.text[:200]}")
        
        if success:
            self.results['passed'] += 1
        else:
            self.results['failed'] += 1
            self.results['errors'].append(f"{test_name}: {message}")
        print()
    
    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "Project Management API" in data.get('message', ''):
                    self.log_result("API Root Endpoint", True, "API is accessible")
                    return True
                else:
                    self.log_result("API Root Endpoint", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("API Root Endpoint", False, f"Status: {response.status_code}", response)
                return False
        except Exception as e:
            self.log_result("API Root Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        try:
            # Test successful registration
            user_data = {
                "name": "Sarah Johnson",
                "email": f"sarah.johnson.{datetime.now().timestamp()}@example.com",
                "password": "SecurePass123!"
            }
            
            response = self.session.post(f"{self.base_url}/auth/register", json=user_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'user' in data and data['user']['email'] == user_data['email']:
                    self.test_user = data['user']
                    self.log_result("User Registration - Success", True, f"User created: {data['user']['name']}")
                    
                    # Verify password is not returned
                    if 'password' not in data['user']:
                        self.log_result("User Registration - Password Security", True, "Password not returned in response")
                    else:
                        self.log_result("User Registration - Password Security", False, "Password returned in response")
                    
                    return True
                else:
                    self.log_result("User Registration - Success", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("User Registration - Success", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("User Registration - Success", False, f"Exception: {str(e)}")
            return False
    
    def test_user_registration_validation(self):
        """Test user registration validation"""
        try:
            # Test missing fields
            invalid_data = {"name": "Test User"}
            response = self.session.post(f"{self.base_url}/auth/register", json=invalid_data)
            
            if response.status_code == 400:
                self.log_result("User Registration - Validation", True, "Properly validates missing fields")
                return True
            else:
                self.log_result("User Registration - Validation", False, f"Should return 400 for missing fields, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("User Registration - Validation", False, f"Exception: {str(e)}")
            return False
    
    def test_duplicate_user_registration(self):
        """Test duplicate user registration"""
        if not self.test_user:
            self.log_result("Duplicate User Registration", False, "No test user available")
            return False
            
        try:
            # Try to register same user again
            user_data = {
                "name": "Sarah Johnson Duplicate",
                "email": self.test_user['email'],
                "password": "AnotherPass123!"
            }
            
            response = self.session.post(f"{self.base_url}/auth/register", json=user_data)
            
            if response.status_code == 400:
                data = response.json()
                if 'already exists' in data.get('error', '').lower():
                    self.log_result("Duplicate User Registration", True, "Properly prevents duplicate registration")
                    return True
                else:
                    self.log_result("Duplicate User Registration", False, f"Wrong error message: {data}")
                    return False
            else:
                self.log_result("Duplicate User Registration", False, f"Should return 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Duplicate User Registration", False, f"Exception: {str(e)}")
            return False
    
    def test_user_login(self):
        """Test user login endpoint"""
        if not self.test_user:
            self.log_result("User Login - Success", False, "No test user available")
            return False
            
        try:
            login_data = {
                "email": self.test_user['email'],
                "password": "SecurePass123!"
            }
            
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'user' in data and data['user']['id'] == self.test_user['id']:
                    self.log_result("User Login - Success", True, f"Login successful for: {data['user']['name']}")
                    
                    # Verify password is not returned
                    if 'password' not in data['user']:
                        self.log_result("User Login - Password Security", True, "Password not returned in response")
                    else:
                        self.log_result("User Login - Password Security", False, "Password returned in response")
                    
                    return True
                else:
                    self.log_result("User Login - Success", False, f"Invalid response: {data}")
                    return False
            else:
                self.log_result("User Login - Success", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("User Login - Success", False, f"Exception: {str(e)}")
            return False
    
    def test_user_login_invalid_credentials(self):
        """Test user login with invalid credentials"""
        if not self.test_user:
            self.log_result("User Login - Invalid Credentials", False, "No test user available")
            return False
            
        try:
            # Test wrong password
            login_data = {
                "email": self.test_user['email'],
                "password": "WrongPassword123!"
            }
            
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code == 401:
                self.log_result("User Login - Invalid Credentials", True, "Properly rejects invalid password")
                
                # Test non-existent user
                login_data = {
                    "email": "nonexistent@example.com",
                    "password": "SomePassword123!"
                }
                
                response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
                
                if response.status_code == 401:
                    self.log_result("User Login - Non-existent User", True, "Properly rejects non-existent user")
                    return True
                else:
                    self.log_result("User Login - Non-existent User", False, f"Should return 401, got {response.status_code}")
                    return False
            else:
                self.log_result("User Login - Invalid Credentials", False, f"Should return 401, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("User Login - Invalid Credentials", False, f"Exception: {str(e)}")
            return False
    
    def test_project_creation(self):
        """Test project creation endpoint"""
        if not self.test_user:
            self.log_result("Project Creation", False, "No test user available")
            return False
            
        try:
            project_data = {
                "name": "E-commerce Platform Redesign",
                "description": "Complete redesign of the company's e-commerce platform with modern UI/UX",
                "ownerId": self.test_user['id']
            }
            
            response = self.session.post(f"{self.base_url}/projects", json=project_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'id' in data and data['name'] == project_data['name']:
                    self.test_project = data
                    self.log_result("Project Creation", True, f"Project created: {data['name']}")
                    return True
                else:
                    self.log_result("Project Creation", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("Project Creation", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Project Creation", False, f"Exception: {str(e)}")
            return False
    
    def test_project_creation_validation(self):
        """Test project creation validation"""
        try:
            # Test missing required fields
            invalid_data = {"description": "Project without name or owner"}
            response = self.session.post(f"{self.base_url}/projects", json=invalid_data)
            
            if response.status_code == 400:
                self.log_result("Project Creation - Validation", True, "Properly validates required fields")
                return True
            else:
                self.log_result("Project Creation - Validation", False, f"Should return 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Project Creation - Validation", False, f"Exception: {str(e)}")
            return False
    
    def test_project_retrieval(self):
        """Test project retrieval endpoint"""
        if not self.test_user or not self.test_project:
            self.log_result("Project Retrieval", False, "No test user or project available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/projects?userId={self.test_user['id']}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if our test project is in the results
                    project_found = any(p['id'] == self.test_project['id'] for p in data)
                    if project_found:
                        self.log_result("Project Retrieval", True, f"Retrieved {len(data)} projects including test project")
                        return True
                    else:
                        self.log_result("Project Retrieval", False, "Test project not found in results")
                        return False
                else:
                    self.log_result("Project Retrieval", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("Project Retrieval", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Project Retrieval", False, f"Exception: {str(e)}")
            return False
    
    def test_project_retrieval_validation(self):
        """Test project retrieval validation"""
        try:
            # Test missing userId parameter
            response = self.session.get(f"{self.base_url}/projects")
            
            if response.status_code == 400:
                self.log_result("Project Retrieval - Validation", True, "Properly validates missing userId")
                return True
            else:
                self.log_result("Project Retrieval - Validation", False, f"Should return 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Project Retrieval - Validation", False, f"Exception: {str(e)}")
            return False
    
    def test_task_creation(self):
        """Test task creation endpoint"""
        if not self.test_project:
            self.log_result("Task Creation", False, "No test project available")
            return False
            
        try:
            task_data = {
                "title": "Implement user authentication system",
                "description": "Design and implement secure user authentication with JWT tokens and password hashing",
                "projectId": self.test_project['id'],
                "status": "todo",
                "priority": "high"
            }
            
            response = self.session.post(f"{self.base_url}/tasks", json=task_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'id' in data and data['title'] == task_data['title']:
                    self.test_task = data
                    self.log_result("Task Creation", True, f"Task created: {data['title']}")
                    return True
                else:
                    self.log_result("Task Creation", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("Task Creation", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Task Creation", False, f"Exception: {str(e)}")
            return False
    
    def test_task_creation_validation(self):
        """Test task creation validation"""
        try:
            # Test missing required fields
            invalid_data = {"description": "Task without title or project"}
            response = self.session.post(f"{self.base_url}/tasks", json=invalid_data)
            
            if response.status_code == 400:
                self.log_result("Task Creation - Validation", True, "Properly validates required fields")
                return True
            else:
                self.log_result("Task Creation - Validation", False, f"Should return 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Task Creation - Validation", False, f"Exception: {str(e)}")
            return False
    
    def test_task_retrieval(self):
        """Test task retrieval endpoint"""
        if not self.test_project or not self.test_task:
            self.log_result("Task Retrieval", False, "No test project or task available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/tasks?projectId={self.test_project['id']}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if our test task is in the results
                    task_found = any(t['id'] == self.test_task['id'] for t in data)
                    if task_found:
                        self.log_result("Task Retrieval", True, f"Retrieved {len(data)} tasks including test task")
                        return True
                    else:
                        self.log_result("Task Retrieval", False, "Test task not found in results")
                        return False
                else:
                    self.log_result("Task Retrieval", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("Task Retrieval", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Task Retrieval", False, f"Exception: {str(e)}")
            return False
    
    def test_task_update(self):
        """Test task update endpoint"""
        if not self.test_task:
            self.log_result("Task Update", False, "No test task available")
            return False
            
        try:
            update_data = {
                "status": "in-progress",
                "priority": "medium",
                "description": "Updated: Design and implement secure user authentication with JWT tokens, password hashing, and session management"
            }
            
            response = self.session.put(f"{self.base_url}/tasks/{self.test_task['id']}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if data['status'] == update_data['status'] and data['priority'] == update_data['priority']:
                    self.log_result("Task Update", True, f"Task updated successfully - Status: {data['status']}")
                    self.test_task = data  # Update our test task reference
                    return True
                else:
                    self.log_result("Task Update", False, f"Update not reflected: {data}")
                    return False
            else:
                self.log_result("Task Update", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Task Update", False, f"Exception: {str(e)}")
            return False
    
    def test_task_update_nonexistent(self):
        """Test task update with non-existent task"""
        try:
            update_data = {"status": "done"}
            fake_task_id = "non-existent-task-id"
            
            response = self.session.put(f"{self.base_url}/tasks/{fake_task_id}", json=update_data)
            
            if response.status_code == 404:
                self.log_result("Task Update - Non-existent", True, "Properly handles non-existent task")
                return True
            else:
                self.log_result("Task Update - Non-existent", False, f"Should return 404, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Task Update - Non-existent", False, f"Exception: {str(e)}")
            return False
    
    def test_task_deletion(self):
        """Test task deletion endpoint"""
        if not self.test_task:
            self.log_result("Task Deletion", False, "No test task available")
            return False
            
        try:
            response = self.session.delete(f"{self.base_url}/tasks/{self.test_task['id']}")
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'deleted' in data['message'].lower():
                    self.log_result("Task Deletion", True, "Task deleted successfully")
                    
                    # Verify task is actually deleted by trying to retrieve it
                    verify_response = self.session.get(f"{self.base_url}/tasks?projectId={self.test_project['id']}")
                    if verify_response.status_code == 200:
                        tasks = verify_response.json()
                        task_still_exists = any(t['id'] == self.test_task['id'] for t in tasks)
                        if not task_still_exists:
                            self.log_result("Task Deletion - Verification", True, "Task successfully removed from database")
                            return True
                        else:
                            self.log_result("Task Deletion - Verification", False, "Task still exists in database")
                            return False
                    else:
                        self.log_result("Task Deletion - Verification", False, "Could not verify deletion")
                        return False
                else:
                    self.log_result("Task Deletion", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Task Deletion", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Task Deletion", False, f"Exception: {str(e)}")
            return False
    
    def test_task_deletion_nonexistent(self):
        """Test task deletion with non-existent task"""
        try:
            fake_task_id = "non-existent-task-id"
            response = self.session.delete(f"{self.base_url}/tasks/{fake_task_id}")
            
            if response.status_code == 404:
                self.log_result("Task Deletion - Non-existent", True, "Properly handles non-existent task")
                return True
            else:
                self.log_result("Task Deletion - Non-existent", False, f"Should return 404, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Task Deletion - Non-existent", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("=" * 80)
        print("PROJECT MANAGEMENT SYSTEM - BACKEND API TESTING")
        print("=" * 80)
        print(f"Testing API at: {self.base_url}")
        print()
        
        # Test sequence - order matters for data dependencies
        tests = [
            # Basic connectivity
            self.test_api_root,
            
            # Authentication tests
            self.test_user_registration,
            self.test_user_registration_validation,
            self.test_duplicate_user_registration,
            self.test_user_login,
            self.test_user_login_invalid_credentials,
            
            # Project tests
            self.test_project_creation,
            self.test_project_creation_validation,
            self.test_project_retrieval,
            self.test_project_retrieval_validation,
            
            # Task tests
            self.test_task_creation,
            self.test_task_creation_validation,
            self.test_task_retrieval,
            self.test_task_update,
            self.test_task_update_nonexistent,
            self.test_task_deletion,
            self.test_task_deletion_nonexistent,
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                self.log_result(test.__name__, False, f"Test execution failed: {str(e)}")
        
        # Print summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📊 Total: {self.results['passed'] + self.results['failed']}")
        
        if self.results['failed'] > 0:
            print("\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 EXCELLENT: Backend API is production-ready!")
        elif success_rate >= 75:
            print("✅ GOOD: Backend API is mostly working with minor issues")
        elif success_rate >= 50:
            print("⚠️  NEEDS WORK: Backend API has significant issues")
        else:
            print("🚨 CRITICAL: Backend API has major problems")
        
        return success_rate >= 75

if __name__ == "__main__":
    tester = ProjectManagementAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)