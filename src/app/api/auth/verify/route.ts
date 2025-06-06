import { NextRequest, NextResponse } from 'next/server';
import { firebaseAdmin } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const userInfo = await firebaseAdmin.verifyIdToken(token);

    if (!userInfo) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get or create user profile
    let profile = await firebaseAdmin.getUserProfile(userInfo.uid);
    
    if (!profile) {
      // Create initial profile
      const initialProfile = {
        uid: userInfo.uid,
        email: userInfo.email,
        emailVerified: userInfo.emailVerified,
        provider: userInfo.provider,
        createdAt: new Date(),
        preferences: {
          defaultLanguage: 'python',
          searchScope: 'current_project',
          embeddingModel: 'nomic-embed-text-v1.5',
          autoIndex: true,
          notifications: {
            struggleAlerts: true,
            escalations: true,
          },
        },
        usageStats: {
          totalSearches: 0,
          projectsIndexed: 0,
          lastActivity: new Date(),
        },
      };

      await firebaseAdmin.createOrUpdateUserProfile(userInfo.uid, initialProfile);
      profile = initialProfile;
    } else {
      // Update last seen
      await firebaseAdmin.createOrUpdateUserProfile(userInfo.uid, {
        lastSeen: new Date(),
      });
    }

    return NextResponse.json({
      user: {
        ...userInfo,
        profile,
      },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
