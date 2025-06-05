import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/services/chat-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Verify session exists
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

    // Create a readable stream for server-sent events
    const stream = new ReadableStream({
      start(controller) {
        // Subscribe to real-time messages for this session
        const unsubscribe = chatService.subscribeToMessages(id, (messages) => {
          const data = JSON.stringify({
            type: 'messages',
            data: messages,
            timestamp: new Date().toISOString()
          });
          
          controller.enqueue(`data: ${data}\n\n`);
        });

        // Subscribe to session updates
        const unsubscribeSession = chatService.subscribeToSession(id, (sessionData) => {
          if (sessionData) {
            const data = JSON.stringify({
              type: 'session',
              data: sessionData,
              timestamp: new Date().toISOString()
            });
            
            controller.enqueue(`data: ${data}\n\n`);
          }
        });

        // Send initial heartbeat
        const heartbeat = setInterval(() => {
          controller.enqueue(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
        }, 30000); // Every 30 seconds

        // Cleanup function
        return () => {
          unsubscribe();
          unsubscribeSession();
          clearInterval(heartbeat);
        };
      },
      cancel() {
        // Client disconnected
        console.log('Stream cancelled for session:', id);
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('Error setting up stream:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to establish stream' 
      },
      { status: 500 }
    );
  }
}