import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/services/chat-service';
import { providerManager } from '@/services/llm-providers/provider-manager';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message, context = [], settings = {} } = body;

    // Verify session exists
    const session = await chatService.getSession(id);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Find the best provider for this session
    const provider = providerManager.getProvider(session.provider) ||
      await providerManager.selectBestProvider('general', 'low');
    
    if (!provider) {
      return NextResponse.json(
        { error: 'No AI provider available' },
        { status: 500 }
      );
    }

    // Create conversation context
    const contextMessages = context
      .map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`)
      .join('\n\n');
    
    const contextPrompt = contextMessages ? 
      `Previous conversation:\n${contextMessages}\n\n---\n\nUser: ${message}` : 
      message;

    // Send request to AI provider
    const response = await provider.sendRequest({
      prompt: contextPrompt,
      temperature: settings.temperature || 0.7,
      maxTokens: settings.maxTokens || 2000
    });

    // Save AI response to chat
    await chatService.sendMessage(
      id,
      response.content,
      'assistant'
    );

    return NextResponse.json({
      success: true,
      response: response.content,
      provider: provider.getType(),
      model: response.model || session.model
    });

  } catch (error) {
    console.error('Error processing AI request:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}