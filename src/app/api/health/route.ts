import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Health check endpoint for VS Code extension and general monitoring
    return NextResponse.json({
      status: 'healthy',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      services: {
        activity_monitor: 'active',
        ai_assistant: 'active',
        workflow_manager: 'active',
        escalation_system: 'active',
        analytics: 'active',
        plugin_system: 'active',
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
