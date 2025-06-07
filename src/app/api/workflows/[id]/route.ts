import { NextRequest, NextResponse } from 'next/server';
import { workflowService } from '@/services/orchestration/workflow-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workflow = await workflowService.getWorkflow(id);
    
    if (!workflow) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Workflow not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: workflow 
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch workflow' 
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    await workflowService.updateWorkflow(id, body);
    
    const updatedWorkflow = await workflowService.getWorkflow(id);
    
    return NextResponse.json({ 
      success: true, 
      data: updatedWorkflow 
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update workflow' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await workflowService.deleteWorkflow(id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Workflow deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete workflow' 
      },
      { status: 500 }
    );
  }
}