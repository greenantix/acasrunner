import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth
from typing import Dict, List, Optional, Any
import asyncio
from datetime import datetime
import logging

class FirebaseService:
    def __init__(self):
        self.db = None
        self.app = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        if not firebase_admin._apps:
            try:
                # Create credentials from environment variables
                cred_dict = {
                    "type": "service_account",
                    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
                    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
                    "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n'),
                    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
                    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
                    "auth_uri": os.getenv("FIREBASE_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
                    "token_uri": os.getenv("FIREBASE_TOKEN_URI", "https://oauth2.googleapis.com/token"),
                    "auth_provider_x509_cert_url": os.getenv("FIREBASE_CERT_URL")
                }
                
                # Validate required fields
                required_fields = ["project_id", "private_key", "client_email"]
                missing_fields = [field for field in required_fields if not cred_dict.get(field)]
                
                if missing_fields:
                    raise ValueError(f"Missing required Firebase configuration: {missing_fields}")
                
                cred = credentials.Certificate(cred_dict)
                self.app = firebase_admin.initialize_app(cred)
                
            except Exception as e:
                logging.error(f"Failed to initialize Firebase: {e}")
                # Try to use default credentials or service account file
                try:
                    # Check for service account file
                    service_account_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
                    if service_account_path and os.path.exists(service_account_path):
                        cred = credentials.Certificate(service_account_path)
                        self.app = firebase_admin.initialize_app(cred)
                    else:
                        # Use default credentials
                        self.app = firebase_admin.initialize_app()
                except Exception as fallback_error:
                    logging.error(f"Firebase initialization failed completely: {fallback_error}")
                    raise
        else:
            self.app = firebase_admin.get_app()
        
        self.db = firestore.client()
        logging.info("Firebase initialized successfully")
    
    async def verify_token(self, id_token: str) -> Optional[Dict]:
        """Verify Firebase ID token and return user info"""
        try:
            decoded_token = auth.verify_id_token(id_token)
            return {
                'uid': decoded_token['uid'],
                'email': decoded_token.get('email'),
                'email_verified': decoded_token.get('email_verified', False),
                'provider': decoded_token.get('firebase', {}).get('sign_in_provider'),
                'custom_claims': decoded_token.get('custom_claims', {}),
                'name': decoded_token.get('name'),
                'picture': decoded_token.get('picture')
            }
        except Exception as e:
            logging.error(f"Token verification failed: {e}")
            return None
    
    async def get_user_profile(self, uid: str) -> Optional[Dict]:
        """Get user profile from Firestore"""
        try:
            doc_ref = self.db.collection('users').document(uid)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logging.error(f"Error getting user profile: {e}")
            return None
    
    async def create_or_update_user_profile(self, uid: str, user_data: Dict) -> bool:
        """Create or update user profile in Firestore"""
        try:
            doc_ref = self.db.collection('users').document(uid)
            update_data = {
                **user_data,
                'updated_at': firestore.SERVER_TIMESTAMP,
                'last_seen': firestore.SERVER_TIMESTAMP
            }
            
            # Use set with merge to create or update
            doc_ref.set(update_data, merge=True)
            return True
            
        except Exception as e:
            logging.error(f"Error updating user profile: {e}")
            return False
    
    async def create_project(self, user_uid: str, project_data: Dict) -> Dict[str, Any]:
        """Create a new project in Firestore"""
        try:
            project_ref = self.db.collection('projects').document()
            project_id = project_ref.id
            
            project_doc = {
                'project_id': project_id,
                'name': project_data['name'],
                'description': project_data.get('description', ''),
                'owner_uid': user_uid,
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP,
                'collaborators': {user_uid: 'owner'},
                'settings': {
                    'auto_index': project_data.get('auto_index', True),
                    'file_patterns': project_data.get('file_patterns', ['.py', '.js', '.ts', '.java']),
                    'exclude_patterns': project_data.get('exclude_patterns', ['node_modules', '__pycache__', '.git']),
                    'embedding_model': 'nomic-embed-text-v1.5'
                },
                'indexing_status': {
                    'total_files': 0,
                    'indexed_files': 0,
                    'last_indexed': None,
                    'status': 'pending'
                }
            }
            
            project_ref.set(project_doc)
            return {
                'success': True,
                'project_id': project_id,
                'project_doc': project_doc
            }
            
        except Exception as e:
            logging.error(f"Error creating project: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_user_projects(self, uid: str) -> List[Dict]:
        """Get all projects for a user"""
        try:
            # Get projects where user is owner
            owner_query = self.db.collection('projects').where('owner_uid', '==', uid)
            owner_docs = owner_query.stream()
            
            projects = []
            project_ids = set()
            
            for doc in owner_docs:
                project_data = doc.to_dict()
                project_data['id'] = doc.id
                projects.append(project_data)
                project_ids.add(doc.id)
            
            # Get projects where user is collaborator
            # Note: This is a simplified query. For production, consider using array-contains
            # or restructuring the collaborators field for better querying
            all_projects = self.db.collection('projects').stream()
            
            for doc in all_projects:
                if doc.id not in project_ids:
                    project_data = doc.to_dict()
                    collaborators = project_data.get('collaborators', {})
                    if uid in collaborators:
                        project_data['id'] = doc.id
                        projects.append(project_data)
            
            return projects
            
        except Exception as e:
            logging.error(f"Error getting user projects: {e}")
            return []
    
    async def get_project(self, project_id: str, user_uid: str = None) -> Optional[Dict]:
        """Get a specific project (with optional access control)"""
        try:
            doc_ref = self.db.collection('projects').document(project_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return None
            
            project_data = doc.to_dict()
            
            # Check access if user_uid provided
            if user_uid:
                collaborators = project_data.get('collaborators', {})
                if user_uid not in collaborators and project_data.get('owner_uid') != user_uid:
                    return None
            
            project_data['id'] = doc.id
            return project_data
            
        except Exception as e:
            logging.error(f"Error getting project: {e}")
            return None
    
    async def update_project_indexing_status(self, project_id: str, status_data: Dict) -> bool:
        """Update project indexing status"""
        try:
            doc_ref = self.db.collection('projects').document(project_id)
            
            update_data = {
                'indexing_status': status_data,
                'updated_at': firestore.SERVER_TIMESTAMP
            }
            
            doc_ref.update(update_data)
            return True
            
        except Exception as e:
            logging.error(f"Error updating project indexing status: {e}")
            return False
    
    async def record_struggle(self, user_uid: str, struggle_data: Dict) -> Optional[str]:
        """Record a struggle pattern"""
        try:
            struggle_ref = self.db.collection('struggles').document()
            
            struggle_doc = {
                'struggle_id': struggle_ref.id,
                'user_uid': user_uid,
                'project_id': struggle_data.get('project_id'),
                'pattern_type': struggle_data.get('pattern_type'),
                'severity': struggle_data.get('severity', 'medium'),
                'error_message': struggle_data.get('error_message'),
                'error_hash': struggle_data.get('error_hash'),
                'file_path': struggle_data.get('file_path'),
                'language': struggle_data.get('language'),
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP,
                'status': 'active',
                'frequency': 1,
                'auto_ignore': False,
                'escalation_threshold': struggle_data.get('escalation_threshold', 3),
                'context': struggle_data.get('context', {}),
                'recommended_action': struggle_data.get('recommended_action', 'escalate')
            }
            
            struggle_ref.set(struggle_doc)
            return struggle_ref.id
            
        except Exception as e:
            logging.error(f"Error recording struggle: {e}")
            return None
    
    async def get_user_struggles(self, user_uid: str, project_id: str = None, limit: int = 50) -> List[Dict]:
        """Get struggles for a user, optionally filtered by project"""
        try:
            query = self.db.collection('struggles').where('user_uid', '==', user_uid)
            
            if project_id:
                query = query.where('project_id', '==', project_id)
            
            query = query.order_by('created_at', direction=firestore.Query.DESCENDING).limit(limit)
            
            docs = query.stream()
            struggles = []
            
            for doc in docs:
                struggle_data = doc.to_dict()
                struggle_data['id'] = doc.id
                struggles.append(struggle_data)
            
            return struggles
            
        except Exception as e:
            logging.error(f"Error getting user struggles: {e}")
            return []
    
    async def update_struggle_frequency(self, struggle_id: str) -> bool:
        """Increment struggle frequency"""
        try:
            doc_ref = self.db.collection('struggles').document(struggle_id)
            
            doc_ref.update({
                'frequency': firestore.Increment(1),
                'updated_at': firestore.SERVER_TIMESTAMP
            })
            
            return True
            
        except Exception as e:
            logging.error(f"Error updating struggle frequency: {e}")
            return False
    
    async def record_search_activity(self, user_uid: str, project_id: str, query: str, results_count: int) -> bool:
        """Record search activity for analytics"""
        try:
            # Update user stats
            user_ref = self.db.collection('users').document(user_uid)
            user_ref.update({
                'usage_stats.total_searches': firestore.Increment(1),
                'usage_stats.last_activity': firestore.SERVER_TIMESTAMP
            })
            
            # Record search event
            search_ref = self.db.collection('search_events').document()
            search_doc = {
                'user_uid': user_uid,
                'project_id': project_id,
                'query_hash': str(hash(query)),  # Don't store actual query for privacy
                'results_count': results_count,
                'timestamp': firestore.SERVER_TIMESTAMP
            }
            
            search_ref.set(search_doc)
            return True
            
        except Exception as e:
            logging.error(f"Error recording search activity: {e}")
            return False
    
    async def get_project_collaborators(self, project_id: str) -> Dict[str, str]:
        """Get project collaborators"""
        try:
            project = await self.get_project(project_id)
            if project:
                return project.get('collaborators', {})
            return {}
            
        except Exception as e:
            logging.error(f"Error getting project collaborators: {e}")
            return {}
    
    async def add_project_collaborator(self, project_id: str, user_uid: str, role: str = 'collaborator') -> bool:
        """Add a collaborator to a project"""
        try:
            doc_ref = self.db.collection('projects').document(project_id)
            
            doc_ref.update({
                f'collaborators.{user_uid}': role,
                'updated_at': firestore.SERVER_TIMESTAMP
            })
            
            return True
            
        except Exception as e:
            logging.error(f"Error adding project collaborator: {e}")
            return False
    
    def get_firestore_client(self):
        """Get direct access to Firestore client for advanced operations"""
        return self.db