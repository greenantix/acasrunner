import { NextRequest, NextResponse } from 'next/server';
import { workflowService } from '@/services/orchestration/workflow-service';
import { Workflow } from '@/types/workflow';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const enabled = searchParams.get('enabled');
    
    const filters = {
      enabled: enabled ? enabled === 'true' : undefined
    };

    const workflows = await workflowService.listWorkflows(filters);
    
    return NextResponse.json({ 
      success: true, 
      data: workflows 
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch workflows' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Workflow name is required' 
        },
        { status: 400 }
      );
    }

    const workflow = await workflowService.createWorkflow(body);

    return NextResponse.json({ 
      success: true, 
      data: workflow 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create workflow' 
      },
      { status: 500 }
    );
  }
}