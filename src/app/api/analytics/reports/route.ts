import { NextRequest, NextResponse } from 'next/server';
import { InsightsEngine } from '@/services/analytics/insights-engine';
import { AnalyticsDataCollector } from '@/services/analytics/data-collector';
import { DateRange } from '@/types/analytics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'weekly';
    const format = searchParams.get('format') || 'json';
    
    const insightsEngine = InsightsEngine.getInstance();
    let report;
    
    switch (type) {
      case 'weekly':
        report = await insightsEngine.generateWeeklyReport();
        break;
      case 'daily':
        // Generate daily report (simplified version of weekly)
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const dailyTimeframe = { start: yesterday, end: today };
        const dataCollector = AnalyticsDataCollector.getInstance();
        
        const [productivity, errors, ai] = await Promise.all([
          dataCollector.collectProductivityData(dailyTimeframe),
          dataCollector.collectErrorData(dailyTimeframe),
          dataCollector.collectAIData(dailyTimeframe)
        ]);
        
        const insights = await insightsEngine.generateDailyInsights();
        const recommendations = await insightsEngine.suggestOptimizations();
        
        report = {
          id: `daily-${Date.now()}`,
          title: `Daily Analytics Report - ${today.toLocaleDateString()}`,
          timeframe: dailyTimeframe,
          sections: {
            productivity,
            errors,
            ai,
            insights: insights.slice(0, 5), // Top 5 insights
            recommendations: recommendations.slice(0, 3) // Top 3 recommendations
          },
          generatedAt: new Date(),
          format: 'json'
        };
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report type' },
          { status: 400 }
        );
    }
    
    // Handle different export formats
    if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csvData = convertReportToCSV(report);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${report.id}.csv"`
        }
      });
    }
    
    if (format === 'pdf') {
      // In a real implementation, you would generate a PDF here
      return NextResponse.json({
        success: false,
        error: 'PDF export not implemented yet'
      }, { status: 501 });
    }
    
    return NextResponse.json({
      success: true,
      data: report
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      startDate, 
      endDate, 
      metrics = [], 
      format = 'json',
      includeInsights = true,
      includeRecommendations = true 
    } = body;
    
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
    const insightsEngine = InsightsEngine.getInstance();
    
    // Collect requested metrics
    const sections: any = {};
    
    if (metrics.length === 0 || metrics.includes('productivity')) {
      sections.productivity = await dataCollector.collectProductivityData(dateRange);
    }
    
    if (metrics.length === 0 || metrics.includes('errors')) {
      sections.errors = await dataCollector.collectErrorData(dateRange);
    }
    
    if (metrics.length === 0 || metrics.includes('ai')) {
      sections.ai = await dataCollector.collectAIData(dateRange);
    }
    
    if (metrics.length === 0 || metrics.includes('plugins')) {
      sections.plugins = await dataCollector.collectPluginData(dateRange);
    }
    
    if (metrics.length === 0 || metrics.includes('workflows')) {
      sections.workflows = await dataCollector.collectWorkflowData(dateRange);
    }
    
    // Add insights and recommendations if requested
    if (includeInsights) {
      sections.insights = await insightsEngine.generateDailyInsights();
    }
    
    if (includeRecommendations) {
      sections.recommendations = await insightsEngine.suggestOptimizations();
    }
    
    const report = {
      id: `custom-${Date.now()}`,
      title: `Custom Analytics Report - ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`,
      timeframe: dateRange,
      sections,
      generatedAt: new Date(),
      format
    };
    
    // Handle different export formats
    if (format === 'csv') {
      const csvData = convertReportToCSV(report);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${report.id}.csv"`
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      data: report
    });
    
  } catch (error) {
    console.error('Error generating custom report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate custom report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function convertReportToCSV(report: any): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`"Report: ${report.title}"`);
  lines.push(`"Generated: ${report.generatedAt.toISOString()}"`);
  lines.push(`"Period: ${report.timeframe.start.toLocaleDateString()} - ${report.timeframe.end.toLocaleDateString()}"`);
  lines.push('');
  
  // Productivity metrics
  if (report.sections.productivity) {
    lines.push('"PRODUCTIVITY METRICS"');
    lines.push('"Metric","Value"');
    lines.push(`"Lines Added","${report.sections.productivity.linesOfCode.added}"`);
    lines.push(`"Lines Deleted","${report.sections.productivity.linesOfCode.deleted}"`);
    lines.push(`"Lines Modified","${report.sections.productivity.linesOfCode.modified}"`);
    lines.push(`"Commits","${report.sections.productivity.commits.count}"`);
    lines.push(`"Focus Score","${report.sections.productivity.focusScore}"`);
    lines.push('');
  }
  
  // Error metrics
  if (report.sections.errors) {
    lines.push('"ERROR METRICS"');
    lines.push('"Error Type","Count","Trend"');
    report.sections.errors.errorTypes.forEach((error: any) => {
      lines.push(`"${error.type}","${error.count}","${(error.trend * 100).toFixed(1)}%"`);
    });
    lines.push('');
  }
  
  // AI metrics
  if (report.sections.ai) {
    lines.push('"AI METRICS"');
    lines.push('"Metric","Value"');
    lines.push(`"Total Escalations","${report.sections.ai.escalationStats.total}"`);
    lines.push(`"Resolved Escalations","${report.sections.ai.escalationStats.resolved}"`);
    lines.push(`"Accuracy","${report.sections.ai.escalationStats.accuracy}%"`);
    lines.push(`"Avg Response Time","${report.sections.ai.escalationStats.averageResponseTime}s"`);
    lines.push('');
  }
  
  // Insights
  if (report.sections.insights) {
    lines.push('"INSIGHTS"');
    lines.push('"Type","Severity","Title","Description"');
    report.sections.insights.forEach((insight: any) => {
      lines.push(`"${insight.type}","${insight.severity}","${insight.title}","${insight.description}"`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}