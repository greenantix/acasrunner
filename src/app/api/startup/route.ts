import { NextRequest, NextResponse } from 'next/server';
import { getStartupService } from '@/services/startup-service';

export async function GET() {
  try {
    const startupService = getStartupService();
    const status = startupService.getStatus();

    return NextResponse.json({
      ...status,
      endpoint: 'status'
    });
  } catch (error) {
    console.error('Startup status error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get startup status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const startupService = getStartupService();

    switch (action) {
      case 'initialize': {
        const status = await startupService.initialize();
        
        return NextResponse.json({
          action,
          ...status
        });
      }

      case 'reinitialize': {
        const status = await startupService.reinitialize();
        
        return NextResponse.json({
          action,
          ...status
        });
      }

      case 'health_check': {
        const health = await startupService.healthCheck();
        
        return NextResponse.json({
          action,
          ...health,
          timestamp: new Date().toISOString()
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Startup action error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to execute startup action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}