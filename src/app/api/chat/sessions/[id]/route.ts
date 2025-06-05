import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/services/chat-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await chatService.getSession(id);
    
    if (!session) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Session not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: session 
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch session' 
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
    const updates = body;

    await chatService.updateSession(id, updates);
    
    const updatedSession = await chatService.getSession(id);
    
    return NextResponse.json({ 
      success: true, 
      data: updatedSession 
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update session' 
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
    await chatService.deleteSession(id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Session deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete session' 
      },
      { status: 500 }
    );
  }
}