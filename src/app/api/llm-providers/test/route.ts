import { NextRequest, NextResponse } from 'next/server';
import { providerManager } from '@/services/llm-providers/provider-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Test all providers
    const testResults = await providerManager.testAllProviders();
    
    // Get provider stats
    const stats = providerManager.getProviderStats();
    
    // Get provider configurations
    const configurations = providerManager.getProviderConfigurations();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      testResults,
      stats,
      configurations: configurations.map(config => ({
        id: config.id,
        name: config.name,
        type: config.type,
        model: config.model,
        enabled: config.enabled,
        specialties: config.specialties
      }))
    });

  } catch (error) {
    console.error('LLM provider test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test LLM providers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId, prompt } = body;

    if (!providerId || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: providerId, prompt' },
        { status: 400 }
      );
    }

    // Test specific provider
    const response = await providerManager.sendRequest(providerId, {
      prompt,
      maxTokens: 200,
      temperature: 0.1
    });

    return NextResponse.json({
      success: true,
      providerId,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Provider test request failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test provider request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}