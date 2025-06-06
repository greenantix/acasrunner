import { NextRequest, NextResponse } from 'next/server';
import { realTimeAiTrace } from '@/ai/flows/real-time-ai-trace';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    if (!body.input || !Array.isArray(body.steps) || !body.output) {
      return NextResponse.json(
        { error: 'Invalid input: input, steps, and output are required' },
        { status: 400 }
      );
    }

    // Call the AI flow
    const result = await realTimeAiTrace(body);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in AI trace API:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI trace' },
      { status: 500 }
    );
  }
}
