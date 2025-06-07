import { NextRequest } from 'next/server';
import { activityEscalationBridge } from '@/services/activity-escalation-bridge';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      
      // Track the most recent activity timestamp to send only new activities
      let lastTimestamp = new Date();
      
      // Send periodic updates with real activities from the bridge
      const interval = setInterval(() => {
        try {
          // Get activities that occurred since the last update
          const activities = activityEscalationBridge.getActivitiesForStream(lastTimestamp);
          
          if (activities.length > 0) {
            // Update the timestamp to the most recent activity
            lastTimestamp = new Date();
            
            // Send each activity as an SSE event
            activities.forEach(activity => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(activity)}\n\n`));
            });
          } else {
            // Send a heartbeat if no new activities
            const heartbeat = JSON.stringify({
              id: `heartbeat_${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: 'system_event',
              source: 'activity-stream',
              message: `Heartbeat - ${new Date().toLocaleTimeString()}`,
              details: { severity: 'low' }
            });
            
            controller.enqueue(encoder.encode(`data: ${heartbeat}\n\n`));
          }
        } catch (error) {
          console.error('Error sending activity data:', error);
          clearInterval(interval as unknown as number);
          controller.close();
        }
      }, 30000); // Every 30 seconds
      
      // Clean up on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval as unknown as number);
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
