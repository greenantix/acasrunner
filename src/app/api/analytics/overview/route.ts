import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsDataCollector } from '@/services/analytics/data-collector';
import { InsightsEngine } from '@/services/analytics/insights-engine';
import { DateRange, AnalyticsData } from '@/types/analytics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || 'week';
    
    // Calculate date range based on timeframe
    const end = new Date();
    const start = new Date();
    
    switch (timeframe) {
      case 'day':
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setDate(start.getDate() - 30);
        break;
      case 'quarter':
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }
    
    const dateRange: DateRange = { start, end };
    
    // Collect analytics data
    const dataCollector = AnalyticsDataCollector.getInstance();
    
    const [productivity, errors, ai, plugins, workflows] = await Promise.all([
      dataCollector.collectProductivityData(dateRange),
      dataCollector.collectErrorData(dateRange),
      dataCollector.collectAIData(dateRange),
      dataCollector.collectPluginData(dateRange),
      dataCollector.collectWorkflowData(dateRange)
    ]);
    
    const analyticsData: AnalyticsData = {
      productivity,
      errors,
      ai,
      plugins,
      workflows,
      generatedAt: new Date()
    };
    
    return NextResponse.json({
      success: true,
      data: analyticsData,
      timeframe: dateRange
    });
    
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, metrics } = body;
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Start date and end date are required' },
        { status: 400 }
      );
    }
    
    const dateRange: DateRange = {
      start: new Date(startDate),
      end: new Date(endDate)
    };
    
    const dataCollector = AnalyticsDataCollector.getInstance();
    const requestedData: Partial<AnalyticsData> = { generatedAt: new Date() };
    
    // Collect only requested metrics
    if (!metrics || metrics.includes('productivity')) {
      requestedData.productivity = await dataCollector.collectProductivityData(dateRange);
    }
    
    if (!metrics || metrics.includes('errors')) {
      requestedData.errors = await dataCollector.collectErrorData(dateRange);
    }
    
    if (!metrics || metrics.includes('ai')) {
      requestedData.ai = await dataCollector.collectAIData(dateRange);
    }
    
    if (!metrics || metrics.includes('plugins')) {
      requestedData.plugins = await dataCollector.collectPluginData(dateRange);
    }
    
    if (!metrics || metrics.includes('workflows')) {
      requestedData.workflows = await dataCollector.collectWorkflowData(dateRange);
    }
    
    return NextResponse.json({
      success: true,
      data: requestedData,
      timeframe: dateRange
    });
    
  } catch (error) {
    console.error('Error generating custom analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}