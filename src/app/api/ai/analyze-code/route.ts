import { NextRequest, NextResponse } from 'next/server';
import { escalateCodingProblem } from '@/ai/flows/escalate-coding-problem';

export async function POST(request: NextRequest) {
  try {
    const { code, language, context } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Code content is required' },
        { status: 400 }
      );
    }

    // Use the escalate coding problem flow for analysis
    const result = await escalateCodingProblem({
      error: `Analyze this ${language || 'code'} for potential issues, improvements, and best practices.`,
      context: `Language: ${language}\nCode:\n${code}\n\nContext: ${JSON.stringify(context, null, 2)}`
    });

    return NextResponse.json({
      explanation: result.explanation,
      severity: result.severity,
      suggestions: result.trace || [],
      language: language,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Code analysis failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze code',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}