import { NextRequest, NextResponse } from 'next/server';
import { escalationManager } from '@/services/escalation-manager';
import { activityEscalationBridge } from '@/services/activity-escalation-bridge';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const status = url.searchParams.get('status');
    const severity = url.searchParams.get('severity');

    let escalations = escalationManager.getEscalationHistory(limit);
    
    // Apply filters
    if (status) {
      escalations = escalations.filter(e => e.status === status);
    }
    
    if (severity) {
      escalations = escalations.filter(e => e.severity === severity);
    }

    const stats = escalationManager.getEscalationStats();

    return NextResponse.json({
      escalations,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching escalations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch escalations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();

    switch (action) {
      case 'test':
        const testResult = await activityEscalationBridge.testEscalationFlow();
        return NextResponse.json({
          success: true,
          testResult,
          message: 'Escalation test completed'
        });

      case 'simulate_error':
        const { errorMessage, severity = 'medium' } = data;
        if (!errorMessage) {
          return NextResponse.json(
            { error: 'Missing errorMessage for simulation' },
            { status: 400 }
          );
        }
        
        await activityEscalationBridge.simulateError(errorMessage, severity);
        return NextResponse.json({
          success: true,
          message: `Simulated ${severity} error: ${errorMessage}`
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing escalation request:', error);
    return NextResponse.json(
      { error: `Failed to process request: ${error.message}` },
      { status: 500 }
    );
  }
}