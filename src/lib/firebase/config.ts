import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Check if Firebase environment variables are available
const hasFirebaseConfig = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef123456',
};

// Initialize Firebase app
let app: any = null;
let db: any = null;
let auth: any = null;

try {
  if (hasFirebaseConfig) {
    // Initialize Firebase with real config
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
  } else {
    // Use demo/mock configuration for builds without environment variables
    console.warn('[Firebase] Environment variables not found, using demo configuration');
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
  }
} catch (error) {
  console.error('[Firebase] Initialization failed:', error);
  // Create stub objects to prevent build failures
  db = null;
  auth = null;
}

// Export Firebase instances
export { db, auth };

// Connect to emulators in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  try {
    // Only connect to emulators if not already connected
    if (!window.location.hostname.includes('localhost')) {
      // In production, don't connect to emulators
    } else {
      // Uncomment these lines if you're using Firebase emulators
      // connectFirestoreEmulator(db, 'localhost', 8080);
      // connectAuthEmulator(auth, 'http://localhost:9099');
    }
  } catch (error) {
    // Emulators already connected or not available
    console.log('Firebase emulators connection skipped:', error);
  }
}

export default app;
