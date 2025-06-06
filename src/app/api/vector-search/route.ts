import { NextRequest, NextResponse } from 'next/server';
import { getIndexingService } from '@/services/vector-storage';

export async function POST(request: NextRequest) {
  try {
    const { query, options = {} } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    const {
      limit = 10,
      threshold = 0.7,
      file_types,
      languages,
      project_id = 'default'
    } = options;

    const indexingService = getIndexingService(project_id);
    
    // Perform semantic search
    const results = await indexingService.searchCode(query, {
      limit,
      threshold,
      file_types,
      languages
    });

    return NextResponse.json({
      query,
      results,
      count: results.length,
      options: {
        limit,
        threshold,
        file_types,
        languages,
        project_id
      }
    });
  } catch (error) {
    console.error('Vector search error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during vector search',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');
    const threshold = parseFloat(searchParams.get('threshold') || '0.7');
    const file_types = searchParams.get('file_types')?.split(',').filter(Boolean);
    const languages = searchParams.get('languages')?.split(',').filter(Boolean);
    const project_id = searchParams.get('project_id') || 'default';

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const indexingService = getIndexingService(project_id);
    
    const results = await indexingService.searchCode(query, {
      limit,
      threshold,
      file_types,
      languages
    });

    return NextResponse.json({
      query,
      results,
      count: results.length,
      options: {
        limit,
        threshold,
        file_types,
        languages,
        project_id
      }
    });
  } catch (error) {
    console.error('Vector search error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during vector search',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
