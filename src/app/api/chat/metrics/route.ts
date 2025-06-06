import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/services/chat-service';

export async function GET(request: NextRequest) {
  try {
    const metrics = await chatService.getMetrics();
    
    return NextResponse.json({ 
      success: true, 
      data: metrics 
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch metrics' 
      },
      { status: 500 }
    );
  }
}
