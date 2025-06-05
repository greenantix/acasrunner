import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, metadata } = body;

    // Validate required fields
    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data' },
        { status: 400 }
      );
    }

    // Process activity data from VS Code extension
    const activityData = {
      id: `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      source: 'vscode-extension',
      type,
      data,
      metadata: {
        ...metadata,
        userAgent: request.headers.get('user-agent'),
        remoteAddr: request.headers.get('x-forwarded-for') || 'unknown'
      }
    };

    // Log activity (in a real implementation, this would save to database)
    console.log('VS Code Extension Activity:', activityData);

    // Here you would typically:
    // 1. Save to activity database
    // 2. Trigger real-time updates to dashboard
    // 3. Process activity for analytics
    // 4. Check for escalation triggers

    // Simulate processing different activity types
    switch (type) {
      case 'file_change':
        await processFileChange(activityData);
        break;
      case 'code_edit':
        await processCodeEdit(activityData);
        break;
      case 'error_occurred':
        await processError(activityData);
        break;
      case 'command_executed':
        await processCommand(activityData);
        break;
      default:
        console.log('Unknown activity type:', type);
    }

    return NextResponse.json({
      success: true,
      activityId: activityData.id,
      processed: true,
      timestamp: activityData.timestamp
    });

  } catch (error) {
    console.error('Extension activity processing failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process activity data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function processFileChange(activity: any) {
  // Process file change events
  const { data } = activity;
  
  if (data.changeType === 'created') {
    console.log(`File created: ${data.filePath}`);
  } else if (data.changeType === 'modified') {
    console.log(`File modified: ${data.filePath}`);
    
    // Check for potential issues or patterns
    if (data.filePath.endsWith('.ts') || data.filePath.endsWith('.js')) {
      // Analyze code changes for potential escalation
      // This could trigger AI analysis if certain patterns are detected
    }
  } else if (data.changeType === 'deleted') {
    console.log(`File deleted: ${data.filePath}`);
  }
}

async function processCodeEdit(activity: any) {
  // Process code editing events
  const { data } = activity;
  
  // Track productivity metrics
  const linesChanged = data.linesAdded + data.linesDeleted;
  console.log(`Code edit: ${linesChanged} lines changed in ${data.fileName}`);
  
  // Check for large changes that might need review
  if (linesChanged > 100) {
    console.log('Large code change detected - might benefit from AI review');
  }
}

async function processError(activity: any) {
  // Process error events from VS Code
  const { data } = activity;
  
  console.log(`Error occurred: ${data.errorMessage} in ${data.fileName}:${data.lineNumber}`);
  
  // This could trigger automatic escalation to AI for error analysis
  // or provide contextual help suggestions
}

async function processCommand(activity: any) {
  // Process VS Code command executions
  const { data } = activity;
  
  console.log(`Command executed: ${data.commandId}`);
  
  // Track workflow patterns and suggest optimizations
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const source = searchParams.get('source') || 'vscode-extension';

    // In a real implementation, this would fetch from database
    const mockActivities = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
      id: `ext-${Date.now() - i * 1000}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      source,
      type: ['file_change', 'code_edit', 'error_occurred', 'command_executed'][i % 4],
      data: {
        fileName: `example-${i}.ts`,
        action: 'example_action'
      }
    }));

    return NextResponse.json({
      success: true,
      activities: mockActivities,
      total: mockActivities.length
    });

  } catch (error) {
    console.error('Failed to fetch extension activities:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch activities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}