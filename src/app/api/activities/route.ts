import { NextRequest, NextResponse } from 'next/server';
import { activityEscalationBridge } from '@/services/activity-escalation-bridge';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const since = url.searchParams.get('since');
    
    const sinceDate = since ? new Date(since) : undefined;
    const activities = activityEscalationBridge.getActivitiesForStream(sinceDate);
    const stats = activityEscalationBridge.getActivityStats();

    return NextResponse.json({
      activities,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const activity = await request.json();
    
    // Validate required fields
    if (!activity.type || !activity.source || !activity.message) {
      return NextResponse.json(
        { error: 'Missing required fields: type, source, message' },
        { status: 400 }
      );
    }

    // Add timestamp and ID if not present
    const newActivity = {
      id: activity.id || `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(),
      ...activity,
    };

    // Send to escalation bridge for processing
    activityEscalationBridge.receiveFromClient(newActivity);

    console.log(`📝 New activity: ${newActivity.type} - ${newActivity.message}`);

    return NextResponse.json({ 
      success: true, 
      activity: newActivity 
    });
  } catch (error) {
    console.error('Error adding activity:', error);
    return NextResponse.json(
      { error: 'Failed to add activity' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // For now, we don't implement clearing since it's handled by the bridge
    // In a real implementation, this would clear the database
    
    console.log('🧹 Clear activities requested (not implemented in bridge mode)');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Clear request noted - activities managed by escalation bridge' 
    });
  } catch (error) {
    console.error('Error processing clear request:', error);
    return NextResponse.json(
      { error: 'Failed to process clear request' },
      { status: 500 }
    );
  }
}

