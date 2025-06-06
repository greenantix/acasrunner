import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/firebase/auth-middleware';
import { syncService } from '@/lib/firebase/sync-service';

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const { type, data } = await request.json();

    switch (type) {
      case 'project_metadata':
        const { projectId, stats } = data;
        const success = await syncService.syncProjectMetadata(projectId, stats);
        return NextResponse.json({ success });

      case 'search_activity':
        const searchSuccess = await syncService.recordSearchActivity({
          ...data,
          userUid: user.uid,
        });
        return NextResponse.json({ success: searchSuccess });

      case 'struggle_pattern':
        const struggleId = await syncService.syncStrugglePattern({
          ...data,
          userUid: user.uid,
        });
        return NextResponse.json({ 
          success: !!struggleId, 
          struggleId 
        });

      case 'session_start':
        const sessionId = await syncService.recordSession({
          ...data,
          userUid: user.uid,
        });
        return NextResponse.json({ 
          success: !!sessionId, 
          sessionId 
        });

      case 'session_end':
        const { sessionId: endSessionId, finalMetrics } = data;
        const endSuccess = await syncService.endSession(endSessionId, finalMetrics);
        return NextResponse.json({ success: endSuccess });

      default:
        return NextResponse.json(
          { error: 'Invalid sync type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
