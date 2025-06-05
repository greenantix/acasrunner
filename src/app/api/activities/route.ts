import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for activities (in production, use a database)
const activities: any[] = [];

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const type = url.searchParams.get('type');
    const severity = url.searchParams.get('severity');

    let filteredActivities = [...activities];

    // Apply filters
    if (type) {
      filteredActivities = filteredActivities.filter(a => a.type === type);
    }
    
    if (severity) {
      filteredActivities = filteredActivities.filter(a => a.details?.severity === severity);
    }

    // Sort by timestamp (newest first) and limit
    filteredActivities = filteredActivities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json({
      activities: filteredActivities,
      total: activities.length,
      filtered: filteredActivities.length,
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
      timestamp: activity.timestamp || new Date().toISOString(),
      ...activity,
    };

    // Add to in-memory storage
    activities.unshift(newActivity);

    // Keep only last 1000 activities to prevent memory issues
    if (activities.length > 1000) {
      activities.splice(1000);
    }

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
    // Clear all activities
    activities.length = 0;
    
    console.log('🧹 Activities cleared');
    
    return NextResponse.json({ 
      success: true, 
      message: 'All activities cleared' 
    });
  } catch (error) {
    console.error('Error clearing activities:', error);
    return NextResponse.json(
      { error: 'Failed to clear activities' },
      { status: 500 }
    );
  }
}
