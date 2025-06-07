import { getEmbeddingService } from '@/services/vector-storage';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const { text, texts } = await request.json();

    if (!text && !texts) {
      return NextResponse.json(
        { error: 'Either "text" or "texts" parameter is required' },
        { status: 400 }
      );
    }

    if (text && texts) {
      return NextResponse.json(
        { error: 'Provide either "text" or "texts", not both' },
        { status: 400 }
      );
    }

    const embeddingService = getEmbeddingService();

    if (text) {
      // Single text embedding
      if (typeof text !== 'string') {
        return NextResponse.json({ error: 'Text must be a string' }, { status: 400 });
      }

      const embedding = await embeddingService.generateEmbedding(text);

      return NextResponse.json({
        embedding: Array.from(embedding),
        dimensions: embedding.length,
        input: text,
      });
    } else {
      // Multiple texts embedding
      if (!Array.isArray(texts) || !texts.every(t => typeof t === 'string')) {
        return NextResponse.json({ error: 'Texts must be an array of strings' }, { status: 400 });
      }

      if (texts.length > 100) {
        return NextResponse.json({ error: 'Maximum 100 texts per request' }, { status: 400 });
      }

      const embeddings = await embeddingService.generateEmbeddings(texts);

      return NextResponse.json({
        embeddings: embeddings.map(emb => Array.from(emb)),
        dimensions: embeddings[0]?.length || 0,
        count: embeddings.length,
        inputs: texts,
      });
    }
  } catch (error) {
    console.error('Embedding generation error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error during embedding generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const embeddingService = getEmbeddingService();
    const config = embeddingService.getConfig();
    const isConnected = await embeddingService.testConnection();

    return NextResponse.json({
      config: {
        model_name: config.model_name,
        dimensions: config.dimensions,
        api_url: config.api_url,
        batch_size: config.batch_size,
        timeout: config.timeout,
      },
      status: {
        connected: isConnected,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Embedding service status error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get embedding service status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
