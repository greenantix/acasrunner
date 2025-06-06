import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/firebase/auth-middleware';
import { firebaseAdmin } from '@/lib/firebase/admin';

export const GET = withAuth(async (request: NextRequest, user) => {
  return NextResponse.json({ user });
});

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const profileData = await request.json();

    // Validate and sanitize profile data
    const allowedFields = [
      'displayName',
      'photoURL',
      'preferences',
      'usageStats',
    ];

    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (profileData[field] !== undefined) {
        updateData[field] = profileData[field];
      }
    }

    const success = await firebaseAdmin.createOrUpdateUserProfile(
      user.uid,
      updateData
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Get updated profile
    const updatedProfile = await firebaseAdmin.getUserProfile(user.uid);

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        ...user,
        profile: updatedProfile,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});