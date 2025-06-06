import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest } from 'next/server';

interface FirebaseAdminConfig {
  projectId: string;
  privateKeyId: string;
  privateKey: string;
  clientEmail: string;
  clientId: string;
  authUri: string;
  tokenUri: string;
  authProviderX509CertUrl: string;
}

class FirebaseAdminService {
  private static instance: FirebaseAdminService;
  private app: any;
  private auth: any;
  private db: any;

  private constructor() {
    this.initializeFirebase();
  }

  public static getInstance(): FirebaseAdminService {
    if (!FirebaseAdminService.instance) {
      FirebaseAdminService.instance = new FirebaseAdminService();
    }
    return FirebaseAdminService.instance;
  }

  private initializeFirebase() {
    if (getApps().length === 0) {
      const serviceAccount: ServiceAccount = {
        type: 'service_account',
        projectId: process.env.FIREBASE_PROJECT_ID!,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        clientId: process.env.FIREBASE_CLIENT_ID!,
        authUri: process.env.FIREBASE_AUTH_URI!,
        tokenUri: process.env.FIREBASE_TOKEN_URI!,
        authProviderX509CertUrl: process.env.FIREBASE_CERT_URL!,
      };

      this.app = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      this.app = getApps()[0];
    }

    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
  }

  async verifyIdToken(idToken: string) {
    try {
      const decodedToken = await this.auth.verifyIdToken(idToken);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        provider: decodedToken.firebase?.sign_in_provider,
        customClaims: decodedToken.custom_claims || {},
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  async getUserProfile(uid: string) {
    try {
      const docRef = this.db.collection('users').doc(uid);
      const doc = await docRef.get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async createOrUpdateUserProfile(uid: string, userData: any) {
    try {
      const docRef = this.db.collection('users').doc(uid);
      const updateData = {
        ...userData,
        updatedAt: new Date(),
        lastSeen: new Date(),
      };

      await docRef.set(updateData, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  async createProject(projectData: any, ownerUid: string) {
    try {
      const projectRef = this.db.collection('projects').doc();
      const projectDoc = {
        projectId: projectRef.id,
        name: projectData.name,
        description: projectData.description || '',
        ownerUid,
        createdAt: new Date(),
        updatedAt: new Date(),
        collaborators: { [ownerUid]: 'owner' },
        settings: {
          autoIndex: true,
          filePatterns: ['.py', '.js', '.ts', '.java'],
          excludePatterns: ['node_modules', '__pycache__', '.git'],
          embeddingModel: 'nomic-embed-text-v1.5',
        },
        indexingStatus: {
          totalFiles: 0,
          indexedFiles: 0,
          lastIndexed: null,
          status: 'pending',
        },
      };

      await projectRef.set(projectDoc);
      return { projectId: projectRef.id, success: true };
    } catch (error) {
      console.error('Error creating project:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProjects(uid: string) {
    try {
      // Get projects where user is owner
      const ownerQuery = this.db.collection('projects').where('ownerUid', '==', uid);
      const ownerSnapshot = await ownerQuery.get();
      
      // Get projects where user is collaborator
      const collabQuery = this.db.collection('projects').where(`collaborators.${uid}`, '>', '');
      const collabSnapshot = await collabQuery.get();

      const projects: any[] = [];
      const projectIds = new Set();

      ownerSnapshot.forEach((doc) => {
        projects.push({ id: doc.id, ...doc.data() });
        projectIds.add(doc.id);
      });

      collabSnapshot.forEach((doc) => {
        if (!projectIds.has(doc.id)) {
          projects.push({ id: doc.id, ...doc.data() });
        }
      });

      return projects;
    } catch (error) {
      console.error('Error getting user projects:', error);
      return [];
    }
  }

  async recordStrugglePattern(struggleData: any) {
    try {
      const struggleRef = this.db.collection('struggles').doc();
      const doc = {
        ...struggleData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await struggleRef.set(doc);
      return struggleRef.id;
    } catch (error) {
      console.error('Error recording struggle pattern:', error);
      return null;
    }
  }

  async updateProjectIndexingStatus(projectId: string, status: any) {
    try {
      const projectRef = this.db.collection('projects').doc(projectId);
      await projectRef.update({
        'indexingStatus': status,
        'updatedAt': new Date(),
      });
      return true;
    } catch (error) {
      console.error('Error updating project indexing status:', error);
      return false;
    }
  }

  async recordSearchActivity(uid: string, projectId: string, queryHash: string, resultsCount: number) {
    try {
      // Update user stats
      const userRef = this.db.collection('users').doc(uid);
      await userRef.update({
        'usageStats.totalSearches': this.db.FieldValue.increment(1),
        'usageStats.lastActivity': new Date(),
      });

      // Record search event
      const searchRef = this.db.collection('searchEvents').doc();
      await searchRef.set({
        userUid: uid,
        projectId,
        queryHash,
        resultsCount,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      console.error('Error recording search activity:', error);
      return false;
    }
  }

  getFirestore() {
    return this.db;
  }

  getAuth() {
    return this.auth;
  }
}

export const firebaseAdmin = FirebaseAdminService.getInstance();

export async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return await firebaseAdmin.verifyIdToken(token);
}