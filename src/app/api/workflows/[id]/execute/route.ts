import { NextRequest, NextResponse } from 'next/server';
import { workflowEngine } from '@/services/orchestration/workflow-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { context, dryRun = false } = body;

    const result = await workflowEngine.executeWorkflow(id, {
      triggeredBy: { 
        id: 'manual', 
        type: 'manual', 
        config: {}, 
        enabled: true 
      },
      variables: new Map(Object.entries(context || {})),
      dryRun
    });

    return NextResponse.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to execute workflow'
      },
      { status: 500 }
    );
  }
}