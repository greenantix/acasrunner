import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/services/chat-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fromMessageId } = body;

    const newSession = await chatService.branchSession(id, fromMessageId);
    
    return NextResponse.json({ 
      success: true, 
      data: newSession 
    }, { status: 201 });
  } catch (error) {
    console.error('Error branching session:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to branch session' 
      },
      { status: 500 }
    );
  }
}