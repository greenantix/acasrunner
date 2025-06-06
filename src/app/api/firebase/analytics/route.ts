import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/firebase/auth-middleware';
import { syncService } from '@/lib/firebase/sync-service';
import { errorHandler } from '@/lib/firebase/error-handler';

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    let timeRange: { start: Date; end: Date } | undefined;
    
    if (startDate && endDate) {
      timeRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    switch (type) {
      case 'usage':
        const usageAnalytics = await syncService.getUsageAnalytics(user.uid, timeRange);
        return NextResponse.json({ analytics: usageAnalytics });

      case 'errors':
        // Only allow admins or the user themselves to see error stats
        const errorStats = await errorHandler.getErrorStats(timeRange);
        return NextResponse.json({ analytics: errorStats });

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});