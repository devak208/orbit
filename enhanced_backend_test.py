#!/usr/bin/env python3
"""
Enhanced Backend API Testing for Advanced Project Management System
Tests all enhanced features including role-based auth, team management, invitations, 
advanced task management with comments, tags, and activity logging
"""

import requests
import json
import sys
import os
from datetime import datetime, timedelta

# Get base URL from environment - using localhost for testing since external routing has issues
BASE_URL = "http://localhost:3000/api"

class EnhancedProjectManagementAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_users = {}  # Store multiple test users with different roles
        self.test_project = None
        self.test_tasks = []
        self.test_invitation = None
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
                if "Project Hub API" in data.get('message', ''):
                    self.log_result("API Root Endpoint", True, "Enhanced API is accessible")
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
    
    def test_enhanced_user_registration_with_roles(self):
        """Test enhanced user registration with role selection"""
        try:
            # Test owner registration
            owner_data = {
                "name": "Alex Thompson",
                "email": f"alex.thompson.{datetime.now().timestamp()}@company.com",
                "password": "SecureOwnerPass123!",
                "role": "owner"
            }
            
            response = self.session.post(f"{self.base_url}/auth/register", json=owner_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'user' in data and data['user']['role'] == 'owner':
                    self.test_users['owner'] = data['user']
                    self.log_result("Enhanced Registration - Owner Role", True, f"Owner created: {data['user']['name']}")
                    
                    # Verify enhanced profile fields
                    user = data['user']
                    if 'settings' in user and 'profile' in user and 'avatar' in user:
                        self.log_result("Enhanced Registration - Profile Fields", True, "Enhanced profile structure present")
                    else:
                        self.log_result("Enhanced Registration - Profile Fields", False, "Missing enhanced profile fields")
                    
                    # Test developer registration
                    dev_data = {
                        "name": "Maria Rodriguez",
                        "email": f"maria.rodriguez.{datetime.now().timestamp()}@company.com",
                        "password": "SecureDevPass123!",
                        "role": "developer"
                    }
                    
                    dev_response = self.session.post(f"{self.base_url}/auth/register", json=dev_data)
                    if dev_response.status_code == 200:
                        dev_data_resp = dev_response.json()
                        if dev_data_resp['user']['role'] == 'developer':
                            self.test_users['developer'] = dev_data_resp['user']
                            self.log_result("Enhanced Registration - Developer Role", True, f"Developer created: {dev_data_resp['user']['name']}")
                            return True
                        else:
                            self.log_result("Enhanced Registration - Developer Role", False, "Role not set correctly")
                            return False
                    else:
                        self.log_result("Enhanced Registration - Developer Role", False, f"Status: {dev_response.status_code}")
                        return False
                else:
                    self.log_result("Enhanced Registration - Owner Role", False, f"Invalid response: {data}")
                    return False
            else:
                self.log_result("Enhanced Registration - Owner Role", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Enhanced Registration - Owner Role", False, f"Exception: {str(e)}")
            return False
    
    def test_user_profile_endpoints(self):
        """Test user profile GET and PUT endpoints"""
        if not self.test_users.get('owner'):
            self.log_result("User Profile Endpoints", False, "No test owner available")
            return False
            
        try:
            owner = self.test_users['owner']
            
            # Test GET user profile
            response = self.session.get(f"{self.base_url}/users/{owner['id']}")
            
            if response.status_code == 200:
                data = response.json()
                if data['id'] == owner['id'] and 'settings' in data and 'profile' in data:
                    self.log_result("User Profile - GET", True, f"Retrieved profile for: {data['name']}")
                    
                    # Test PUT user profile update
                    update_data = {
                        "profile": {
                            "bio": "Experienced project manager with 10+ years in tech",
                            "location": "San Francisco, CA",
                            "timezone": "America/Los_Angeles"
                        },
                        "settings": {
                            "theme": "dark",
                            "notifications": {
                                "email": False,
                                "push": True,
                                "mentions": True
                            }
                        }
                    }
                    
                    put_response = self.session.put(f"{self.base_url}/users/{owner['id']}", json=update_data)
                    
                    if put_response.status_code == 200:
                        updated_data = put_response.json()
                        if (updated_data['profile']['bio'] == update_data['profile']['bio'] and 
                            updated_data['settings']['theme'] == update_data['settings']['theme']):
                            self.log_result("User Profile - PUT", True, "Profile updated successfully")
                            return True
                        else:
                            self.log_result("User Profile - PUT", False, "Profile not updated correctly")
                            return False
                    else:
                        self.log_result("User Profile - PUT", False, f"PUT Status: {put_response.status_code}")
                        return False
                else:
                    self.log_result("User Profile - GET", False, f"Invalid profile structure: {data}")
                    return False
            else:
                self.log_result("User Profile - GET", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("User Profile Endpoints", False, f"Exception: {str(e)}")
            return False
    
    def test_advanced_project_creation_with_visibility(self):
        """Test project creation with visibility settings and enhanced features"""
        if not self.test_users.get('owner'):
            self.log_result("Advanced Project Creation", False, "No test owner available")
            return False
            
        try:
            project_data = {
                "name": "Advanced E-commerce Platform",
                "description": "Next-generation e-commerce platform with AI-powered recommendations",
                "ownerId": self.test_users['owner']['id'],
                "visibility": "team"
            }
            
            response = self.session.post(f"{self.base_url}/projects", json=project_data)
            
            if response.status_code == 200:
                data = response.json()
                if ('id' in data and data['name'] == project_data['name'] and 
                    'settings' in data and data['settings']['visibility'] == 'team' and
                    'stats' in data and 'members' in data):
                    self.test_project = data
                    self.log_result("Advanced Project Creation", True, f"Enhanced project created: {data['name']}")
                    
                    # Verify enhanced project structure
                    if (data['stats']['totalTasks'] == 0 and 
                        data['stats']['completedTasks'] == 0 and
                        data['settings']['allowMemberInvites'] == True):
                        self.log_result("Advanced Project - Structure", True, "Enhanced project structure verified")
                        return True
                    else:
                        self.log_result("Advanced Project - Structure", False, "Missing enhanced project fields")
                        return False
                else:
                    self.log_result("Advanced Project Creation", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("Advanced Project Creation", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Advanced Project Creation", False, f"Exception: {str(e)}")
            return False
    
    def test_team_invitation_system(self):
        """Test complete team invitation workflow"""
        if not self.test_project or not self.test_users.get('owner') or not self.test_users.get('developer'):
            self.log_result("Team Invitation System", False, "Missing test data")
            return False
            
        try:
            # Step 1: Send invitation
            invitation_data = {
                "projectId": self.test_project['id'],
                "email": self.test_users['developer']['email'],
                "role": "developer",
                "invitedBy": self.test_users['owner']['id']
            }
            
            response = self.session.post(f"{self.base_url}/invitations", json=invitation_data)
            
            if response.status_code == 200:
                data = response.json()
                if ('invitation' in data and 'token' in data['invitation'] and 
                    'inviteUrl' in data['invitation']):
                    self.test_invitation = data['invitation']
                    self.log_result("Team Invitation - Send", True, f"Invitation sent with token: {data['invitation']['token'][:10]}...")
                    
                    # Step 2: Accept invitation
                    accept_data = {
                        "userId": self.test_users['developer']['id']
                    }
                    
                    accept_response = self.session.post(
                        f"{self.base_url}/invitations/{self.test_invitation['token']}/accept", 
                        json=accept_data
                    )
                    
                    if accept_response.status_code == 200:
                        accept_result = accept_response.json()
                        if 'message' in accept_result and 'successfully' in accept_result['message']:
                            self.log_result("Team Invitation - Accept", True, "Invitation accepted successfully")
                            
                            # Step 3: Verify member was added to project
                            project_response = self.session.get(f"{self.base_url}/projects?userId={self.test_users['owner']['id']}")
                            if project_response.status_code == 200:
                                projects = project_response.json()
                                updated_project = next((p for p in projects if p['id'] == self.test_project['id']), None)
                                if updated_project and len(updated_project['members']) > 0:
                                    member_found = any(m['userId'] == self.test_users['developer']['id'] for m in updated_project['members'])
                                    if member_found:
                                        self.log_result("Team Invitation - Verification", True, "Member successfully added to project")
                                        return True
                                    else:
                                        self.log_result("Team Invitation - Verification", False, "Member not found in project")
                                        return False
                                else:
                                    self.log_result("Team Invitation - Verification", False, "No members found in project")
                                    return False
                            else:
                                self.log_result("Team Invitation - Verification", False, "Could not verify project membership")
                                return False
                        else:
                            self.log_result("Team Invitation - Accept", False, f"Unexpected accept response: {accept_result}")
                            return False
                    else:
                        self.log_result("Team Invitation - Accept", False, f"Accept Status: {accept_response.status_code}")
                        return False
                else:
                    self.log_result("Team Invitation - Send", False, f"Invalid invitation response: {data}")
                    return False
            else:
                self.log_result("Team Invitation - Send", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Team Invitation System", False, f"Exception: {str(e)}")
            return False
    
    def test_enhanced_task_creation_with_advanced_fields(self):
        """Test advanced task creation with tags, due dates, assignees, estimated hours"""
        if not self.test_project or not self.test_users.get('developer'):
            self.log_result("Enhanced Task Creation", False, "Missing test data")
            return False
            
        try:
            # Create task with all enhanced fields
            task_data = {
                "title": "Implement AI-powered product recommendations",
                "description": "Design and develop machine learning algorithms for personalized product recommendations",
                "projectId": self.test_project['id'],
                "status": "todo",
                "priority": "high",
                "assigneeId": self.test_users['developer']['id'],
                "tags": ["ai", "machine-learning", "backend", "algorithms"],
                "dueDate": (datetime.now() + timedelta(days=14)).isoformat(),
                "estimatedHours": 40
            }
            
            response = self.session.post(f"{self.base_url}/tasks", json=task_data)
            
            if response.status_code == 200:
                data = response.json()
                if (data['title'] == task_data['title'] and 
                    data['assigneeId'] == task_data['assigneeId'] and
                    data['tags'] == task_data['tags'] and
                    data['estimatedHours'] == task_data['estimatedHours'] and
                    data['dueDate'] is not None):
                    self.test_tasks.append(data)
                    self.log_result("Enhanced Task Creation", True, f"Advanced task created with all fields: {data['title']}")
                    
                    # Verify enhanced task structure
                    if ('comments' in data and 'subTasks' in data and 
                        'dependencies' in data and 'attachments' in data):
                        self.log_result("Enhanced Task - Structure", True, "Enhanced task structure verified")
                        return True
                    else:
                        self.log_result("Enhanced Task - Structure", False, "Missing enhanced task fields")
                        return False
                else:
                    self.log_result("Enhanced Task Creation", False, f"Task fields not set correctly: {data}")
                    return False
            else:
                self.log_result("Enhanced Task Creation", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Enhanced Task Creation", False, f"Exception: {str(e)}")
            return False
    
    def test_task_comments_system(self):
        """Test task commenting system"""
        if not self.test_tasks or not self.test_users.get('owner'):
            self.log_result("Task Comments System", False, "No test task or user available")
            return False
            
        try:
            task = self.test_tasks[0]
            comment_data = {
                "content": "Great progress on the AI recommendations! Let's make sure to include A/B testing for the algorithm performance.",
                "userId": self.test_users['owner']['id']
            }
            
            response = self.session.post(f"{self.base_url}/tasks/{task['id']}/comments", json=comment_data)
            
            if response.status_code == 200:
                data = response.json()
                if (data['content'] == comment_data['content'] and 
                    data['userId'] == comment_data['userId'] and
                    'user' in data and data['user']['name'] == self.test_users['owner']['name']):
                    self.log_result("Task Comments System", True, f"Comment added successfully: {data['content'][:50]}...")
                    
                    # Verify comment was added to task
                    task_response = self.session.get(f"{self.base_url}/tasks?projectId={self.test_project['id']}")
                    if task_response.status_code == 200:
                        tasks = task_response.json()
                        updated_task = next((t for t in tasks if t['id'] == task['id']), None)
                        if updated_task and len(updated_task['comments']) > 0:
                            self.log_result("Task Comments - Verification", True, "Comment successfully added to task")
                            return True
                        else:
                            self.log_result("Task Comments - Verification", False, "Comment not found in task")
                            return False
                    else:
                        self.log_result("Task Comments - Verification", False, "Could not verify comment addition")
                        return False
                else:
                    self.log_result("Task Comments System", False, f"Invalid comment response: {data}")
                    return False
            else:
                self.log_result("Task Comments System", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Task Comments System", False, f"Exception: {str(e)}")
            return False
    
    def test_enhanced_task_updates_with_activity_tracking(self):
        """Test enhanced task updates with activity tracking"""
        if not self.test_tasks or not self.test_users.get('developer'):
            self.log_result("Enhanced Task Updates", False, "No test task available")
            return False
            
        try:
            task = self.test_tasks[0]
            update_data = {
                "status": "inprogress",
                "priority": "urgent",
                "actualHours": 8,
                "updatedBy": self.test_users['developer']['id']
            }
            
            response = self.session.put(f"{self.base_url}/tasks/{task['id']}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if (data['status'] == update_data['status'] and 
                    data['priority'] == update_data['priority'] and
                    data['actualHours'] == update_data['actualHours']):
                    self.log_result("Enhanced Task Updates", True, f"Task updated with activity tracking: {data['status']}")
                    return True
                else:
                    self.log_result("Enhanced Task Updates", False, f"Update not reflected correctly: {data}")
                    return False
            else:
                self.log_result("Enhanced Task Updates", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Enhanced Task Updates", False, f"Exception: {str(e)}")
            return False
    
    def test_activity_logging_and_retrieval(self):
        """Test activity logging and retrieval system"""
        if not self.test_project:
            self.log_result("Activity Logging System", False, "No test project available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/activities?projectId={self.test_project['id']}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check for different types of activities
                    activity_types = [activity['action'] for activity in data]
                    expected_activities = ['project_created', 'member_invited', 'member_joined', 'task_created', 'task_status_changed']
                    
                    found_activities = [act for act in expected_activities if act in activity_types]
                    
                    if len(found_activities) >= 3:  # At least 3 different activity types
                        self.log_result("Activity Logging System", True, f"Retrieved {len(data)} activities with types: {', '.join(set(activity_types))}")
                        
                        # Verify activity structure
                        first_activity = data[0]
                        if ('id' in first_activity and 'projectId' in first_activity and 
                            'userId' in first_activity and 'action' in first_activity and
                            'metadata' in first_activity and 'createdAt' in first_activity):
                            self.log_result("Activity Logging - Structure", True, "Activity structure verified")
                            return True
                        else:
                            self.log_result("Activity Logging - Structure", False, "Invalid activity structure")
                            return False
                    else:
                        self.log_result("Activity Logging System", False, f"Not enough activity types found: {activity_types}")
                        return False
                else:
                    self.log_result("Activity Logging System", False, f"No activities found: {data}")
                    return False
            else:
                self.log_result("Activity Logging System", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Activity Logging System", False, f"Exception: {str(e)}")
            return False
    
    def test_project_member_management_and_statistics(self):
        """Test project member management and statistics"""
        if not self.test_project or not self.test_users.get('owner'):
            self.log_result("Project Member Management", False, "Missing test data")
            return False
            
        try:
            # Get updated project with member details
            response = self.session.get(f"{self.base_url}/projects?userId={self.test_users['owner']['id']}")
            
            if response.status_code == 200:
                projects = response.json()
                project = next((p for p in projects if p['id'] == self.test_project['id']), None)
                
                if project:
                    # Verify member details are included
                    if 'memberDetails' in project and len(project['memberDetails']) > 0:
                        member_details = project['memberDetails']
                        owner_found = any(m['id'] == self.test_users['owner']['id'] for m in member_details)
                        developer_found = any(m['id'] == self.test_users['developer']['id'] for m in member_details)
                        
                        if owner_found and developer_found:
                            self.log_result("Project Member Management", True, f"Member details retrieved: {len(member_details)} members")
                            
                            # Verify project statistics
                            if ('stats' in project and 'totalTasks' in project['stats'] and 
                                project['stats']['totalTasks'] > 0):
                                self.log_result("Project Statistics", True, f"Project stats: {project['stats']['totalTasks']} total tasks")
                                return True
                            else:
                                self.log_result("Project Statistics", False, "Project statistics not updated correctly")
                                return False
                        else:
                            self.log_result("Project Member Management", False, "Not all members found in details")
                            return False
                    else:
                        self.log_result("Project Member Management", False, "No member details found")
                        return False
                else:
                    self.log_result("Project Member Management", False, "Test project not found")
                    return False
            else:
                self.log_result("Project Member Management", False, f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Project Member Management", False, f"Exception: {str(e)}")
            return False
    
    def run_all_enhanced_tests(self):
        """Run all enhanced backend API tests"""
        print("=" * 80)
        print("ENHANCED PROJECT MANAGEMENT SYSTEM - BACKEND API TESTING")
        print("=" * 80)
        print(f"Testing Enhanced API at: {self.base_url}")
        print()
        
        # Test sequence - order matters for data dependencies
        tests = [
            # Basic connectivity
            self.test_api_root,
            
            # Enhanced authentication tests
            self.test_enhanced_user_registration_with_roles,
            self.test_user_profile_endpoints,
            
            # Advanced project management tests
            self.test_advanced_project_creation_with_visibility,
            
            # Team management and invitation tests
            self.test_team_invitation_system,
            
            # Enhanced task management tests
            self.test_enhanced_task_creation_with_advanced_fields,
            self.test_task_comments_system,
            self.test_enhanced_task_updates_with_activity_tracking,
            
            # Activity logging tests
            self.test_activity_logging_and_retrieval,
            
            # Project member management tests
            self.test_project_member_management_and_statistics,
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                self.log_result(test.__name__, False, f"Test execution failed: {str(e)}")
        
        # Print summary
        print("=" * 80)
        print("ENHANCED FEATURES TEST SUMMARY")
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
            print("🎉 EXCELLENT: Enhanced backend API is production-ready!")
        elif success_rate >= 75:
            print("✅ GOOD: Enhanced backend API is mostly working with minor issues")
        elif success_rate >= 50:
            print("⚠️  NEEDS WORK: Enhanced backend API has significant issues")
        else:
            print("🚨 CRITICAL: Enhanced backend API has major problems")
        
        return success_rate >= 75

if __name__ == "__main__":
    tester = EnhancedProjectManagementAPITester()
    success = tester.run_all_enhanced_tests()
    sys.exit(0 if success else 1)