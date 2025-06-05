import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/services/chat-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const sessionId = searchParams.get('sessionId') || undefined;

    if (!query) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Search query is required' 
        },
        { status: 400 }
      );
    }

    const messages = await chatService.searchMessages(query, sessionId);
    
    return NextResponse.json({ 
      success: true, 
      data: messages,
      query,
      count: messages.length
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search messages' 
      },
      { status: 500 }
    );
  }
}