import { providerManager } from '@/services/llm-providers/provider-manager';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const { providerId, testMessage = 'Hello, this is a test message.' } = await request.json();

    if (!providerId) {
      return NextResponse.json({ error: 'Missing providerId' }, { status: 400 });
    }

    const provider = providerManager.getProvider(providerId);
    if (!provider) {
      return NextResponse.json({ error: `Provider not found: ${providerId}` }, { status: 404 });
    }

    // Test the provider connection
    const connectionTest = await provider.testConnection();

    if (!connectionTest) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider connection test failed',
          providerId,
          providerType: provider.getType(),
        },
        { status: 400 }
      );
    }

    // If connection works, try a simple request
    try {
      const response = await provider.sendRequest({
        prompt: `Test request: ${testMessage}. Please respond with a brief acknowledgment.`,
        temperature: 0.1,
        maxTokens: 100,
      });
      return NextResponse.json({
        success: true,
        providerId,
        providerType: provider.getType(),
        connectionTest: true,
        testResponse: response.content,
        responseTime: 0, // LLM response doesn't include time metrics
      });
    } catch (requestError) {
      return NextResponse.json({
        success: false,
        providerId,
        providerType: provider.getType(),
        connectionTest: true,
        requestTest: false,
        error: `Request test failed: ${requestError instanceof Error ? requestError.message : String(requestError)}`,
      });
    }
  } catch (error) {
    console.error('Error testing LLM provider:', error);
    return NextResponse.json(
      {
        error: `Failed to test provider: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Test all providers
    const results = await providerManager.testAllProviders();
    const stats = providerManager.getProviderStats();

    return NextResponse.json({
      testResults: results,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error testing all LLM providers:', error);
    return NextResponse.json(
      {
        error: `Failed to test providers: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}

