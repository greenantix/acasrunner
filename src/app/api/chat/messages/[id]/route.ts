import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/services/chat-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Message content is required' 
        },
        { status: 400 }
      );
    }

    await chatService.editMessage(id, content.trim());
    
    return NextResponse.json({ 
      success: true, 
      message: 'Message updated successfully' 
    });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update message' 
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
    await chatService.deleteMessage(id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Message deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete message' 
      },
      { status: 500 }
    );
  }
}