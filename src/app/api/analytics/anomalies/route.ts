import { NextRequest, NextResponse } from 'next/server';
import { InsightsEngine } from '@/services/analytics/insights-engine';
import { AnalyticsDataCollector } from '@/services/analytics/data-collector';
import { DateRange } from '@/types/analytics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || 'week';
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    
    // Calculate date range
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
      default:
        start.setDate(start.getDate() - 7);
    }
    
    const dateRange: DateRange = { start, end };
    
    // Get data for anomaly detection
    const dataCollector = AnalyticsDataCollector.getInstance();
    const productivity = await dataCollector.collectProductivityData(dateRange);
    
    // Detect anomalies
    const insightsEngine = InsightsEngine.getInstance();
    const anomalies = await insightsEngine.detectAnomalies(productivity.timeSeries);
    
    // Apply filters
    let filteredAnomalies = anomalies;
    
    if (severity) {
      filteredAnomalies = filteredAnomalies.filter(anomaly => anomaly.severity === severity);
    }
    
    if (type) {
      filteredAnomalies = filteredAnomalies.filter(anomaly => anomaly.type === type);
    }
    
    // Sort by severity and confidence
    filteredAnomalies.sort((a, b) => {
      const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const severityDiff = severityOrder[b.severity as keyof typeof severityOrder] - severityOrder[a.severity as keyof typeof severityOrder];
      
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });
    
    return NextResponse.json({
      success: true,
      data: {
        anomalies: filteredAnomalies,
        total: anomalies.length,
        filtered: filteredAnomalies.length,
        timeframe: dateRange,
        summary: {
          critical: anomalies.filter(a => a.severity === 'critical').length,
          high: anomalies.filter(a => a.severity === 'high').length,
          medium: anomalies.filter(a => a.severity === 'medium').length,
          low: anomalies.filter(a => a.severity === 'low').length
        }
      }
    });
    
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to detect anomalies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, algorithm = 'zscore', sensitivity = 2.5 } = body;
    
    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: 'Time series data array is required' },
        { status: 400 }
      );
    }
    
    // Convert data to time series format
    const timeSeries = data.map(point => ({
      timestamp: new Date(point.timestamp),
      value: Number(point.value),
      label: point.label
    }));
    
    const insightsEngine = InsightsEngine.getInstance();
    const anomalies = await insightsEngine.detectAnomalies(timeSeries);
    
    return NextResponse.json({
      success: true,
      data: {
        anomalies,
        algorithm,
        sensitivity,
        analyzed: timeSeries.length,
        detected: anomalies.length
      }
    });
    
  } catch (error) {
    console.error('Error analyzing anomalies:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to analyze anomalies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}