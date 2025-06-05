import { NextRequest, NextResponse } from 'next/server';
import { InsightsEngine } from '@/services/analytics/insights-engine';
import { Insight } from '@/types/analytics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // Filter by insight type
    const severity = searchParams.get('severity'); // Filter by severity
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeRead = searchParams.get('includeRead') === 'true';
    
    const insightsEngine = InsightsEngine.getInstance();
    
    // Generate daily insights
    const insights = await insightsEngine.generateDailyInsights();
    
    // Apply filters
    let filteredInsights = insights;
    
    if (type) {
      filteredInsights = filteredInsights.filter(insight => insight.type === type);
    }
    
    if (severity) {
      filteredInsights = filteredInsights.filter(insight => insight.severity === severity);
    }
    
    if (!includeRead) {
      filteredInsights = filteredInsights.filter(insight => !insight.read);
    }
    
    // Apply limit
    filteredInsights = filteredInsights.slice(0, limit);
    
    return NextResponse.json({
      success: true,
      data: {
        insights: filteredInsights,
        total: insights.length,
        filtered: filteredInsights.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, insightId } = body;
    
    if (!action || !insightId) {
      return NextResponse.json(
        { success: false, error: 'Action and insight ID are required' },
        { status: 400 }
      );
    }
    
    // In a real implementation, this would update the database
    // For now, we'll just simulate the action
    
    switch (action) {
      case 'read':
        // Mark insight as read
        console.log(`Marking insight ${insightId} as read`);
        break;
      case 'dismiss':
        // Dismiss insight
        console.log(`Dismissing insight ${insightId}`);
        break;
      case 'archive':
        // Archive insight
        console.log(`Archiving insight ${insightId}`);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      message: `Insight ${action} successfully`,
      insightId
    });
    
  } catch (error) {
    console.error('Error updating insight:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update insight',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}