import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/firebase/auth-middleware';
import { syncService } from '@/lib/firebase/sync-service';

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const struggles = await syncService.getProjectStruggles(projectId, user.uid);
    return NextResponse.json({ struggles });
  } catch (error) {
    console.error('Error fetching struggles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const struggleData = await request.json();
    
    const struggleId = await syncService.syncStrugglePattern({
      ...struggleData,
      userUid: user.uid,
    });

    if (!struggleId) {
      return NextResponse.json(
        { error: 'Failed to record struggle pattern' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Struggle pattern recorded successfully',
      struggleId,
    });
  } catch (error) {
    console.error('Error recording struggle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});