import { NextRequest, NextResponse } from 'next/server';
import { firebaseAdmin } from './admin';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  provider?: string;
  customClaims: Record<string, any>;
  profile?: any;
}

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header', 401);
  }

  const token = authHeader.substring(7);
  const userInfo = await firebaseAdmin.verifyIdToken(token);

  if (!userInfo) {
    throw new AuthError('Invalid authentication token', 401);
  }

  // Get full user profile
  const profile = await firebaseAdmin.getUserProfile(userInfo.uid);
  
  return {
    ...userInfo,
    profile,
  };
}

export async function requireVerifiedEmail(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);
  
  if (!user.emailVerified) {
    throw new AuthError('Email verification required', 403);
  }
  
  return user;
}

export function withAuth(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    try {
      const user = await requireAuth(request);
      return await handler(request, user);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      
      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

export function withVerifiedEmail(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    try {
      const user = await requireVerifiedEmail(request);
      return await handler(request, user);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      
      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}