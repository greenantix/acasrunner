import { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface FirebaseUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  profile?: any;
}

interface AuthState {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
}

export function useFirebaseAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setIdToken(token);

          // Verify token with backend and get profile
          const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });

          if (response.ok) {
            const { user } = await response.json();
            setState({
              user,
              loading: false,
              error: null,
            });
          } else {
            setState({
              user: null,
              loading: false,
              error: 'Failed to verify authentication',
            });
          }
        } catch (error) {
          setState({
            user: null,
            loading: false,
            error: 'Authentication error',
          });
        }
      } else {
        setIdToken(null);
        setState({
          user: null,
          loading: false,
          error: null,
        });
      }
    });

    return unsubscribe;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Sign in failed',
      }));
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Sign up failed',
      }));
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Google sign in failed',
      }));
    }
  }, []);

  const signInWithGitHub = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'GitHub sign in failed',
      }));
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Sign out failed',
      }));
    }
  }, []);

  const updateProfile = useCallback(async (profileData: any) => {
    if (!idToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/auth/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    const { user } = await response.json();
    setState(prev => ({ ...prev, user }));
    
    return user;
  }, [idToken]);

  const getAuthHeaders = useCallback(() => {
    if (!idToken) {
      return {};
    }
    
    return {
      'Authorization': `Bearer ${idToken}`,
    };
  }, [idToken]);

  return {
    ...state,
    idToken,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
    updateProfile,
    getAuthHeaders,
  };
}
