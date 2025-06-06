import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Health check endpoint for VS Code extension
    return NextResponse.json({
      status: 'healthy',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      services: {
        activity_monitor: 'active',
        ai_assistant: 'active',
        workflow_manager: 'active',
        escalation_system: 'active'
      }
    });
  } catch (error) {
    console.error('Extension health check failed:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        error: 'Health check failed',
        timestamp: new Date().toISOString() 
      },
      { status: 500 }
    );
  }
}
