import { NextRequest } from 'next/server';

// This would be a proper SSE endpoint for real-time updates
// For now, we'll create a simple mock that demonstrates the concept

export async function GET(request: NextRequest) {
  // Create a streaming response for Server-Sent Events
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialData = JSON.stringify({
        id: `init_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'system_event',
        source: 'activity-stream',
        message: 'Connected to activity stream',
        details: { severity: 'low' }
      });
      
      controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));
      
      // Send periodic test messages (in production, this would be driven by actual events)
      const interval = setInterval(() => {
        try {
          const testData = JSON.stringify({
            id: `test_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'system_event',
            source: 'activity-stream',
            message: `Heartbeat - ${new Date().toLocaleTimeString()}`,
            details: { severity: 'low' }
          });
          
          controller.enqueue(encoder.encode(`data: ${testData}\n\n`));
        } catch (error) {
          console.error('Error sending test data:', error);
          clearInterval(interval);
          controller.close();
        }
      }, 30000); // Every 30 seconds
      
      // Clean up on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}