import { providerManager } from '@/services/llm-providers/provider-manager';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const configurations = providerManager.getProviderConfigurations();
    const stats = providerManager.getProviderStats();

    return NextResponse.json({
      providers: configurations,
      stats,
    });
  } catch (error) {
    console.error('Error fetching LLM providers:', error);
    return NextResponse.json({ error: 'Failed to fetch LLM providers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { provider, config } = await request.json();

    // Validate required fields
    if (!provider?.id || !provider?.type || !config?.apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: provider.id, provider.type, config.apiKey' },
        { status: 400 }
      );
    }

    // Add the provider
    providerManager.addProvider(provider, config);

    console.log(`✅ Added LLM provider: ${provider.name} (${provider.type})`);

    return NextResponse.json({
      success: true,
      message: `Provider ${provider.name} added successfully`,
    });
  } catch (error) {
    console.error('Error processing escalation request:', error);
    return NextResponse.json(
      {
        error:
          'Failed to process request: ' +
          (error instanceof Error ? error.message : JSON.stringify(error)),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { providerId, updates } = await request.json();

    if (!providerId) {
      return NextResponse.json({ error: 'Missing providerId' }, { status: 400 });
    }

    providerManager.updateProviderConfig(providerId, updates);

    console.log(`🔄 Updated LLM provider: ${providerId}`);

    return NextResponse.json({
      success: true,
      message: `Provider ${providerId} updated successfully`,
    });
  } catch (error) {
    console.error('Error updating LLM provider:', error);
    return NextResponse.json(
      {
        error: `Failed to update provider: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const providerId = url.searchParams.get('id');

    if (!providerId) {
      return NextResponse.json({ error: 'Missing provider ID' }, { status: 400 });
    }

    providerManager.removeProvider(providerId);

    console.log(`🗑️ Removed LLM provider: ${providerId}`);

    return NextResponse.json({
      success: true,
      message: `Provider ${providerId} removed successfully`,
    });
  } catch (error) {
    console.error('Error removing LLM provider:', error);
    return NextResponse.json(
      {
        error: `Failed to remove provider: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}

