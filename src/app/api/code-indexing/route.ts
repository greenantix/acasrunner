import { NextRequest, NextResponse } from 'next/server';
import { getIndexingService } from '@/services/vector-storage';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { action, file_path, directory_path, project_id = 'default', options = {} } = await request.json();

    if (!action || !['index_file', 'index_directory', 'remove_file'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action is required: index_file, index_directory, or remove_file' },
        { status: 400 }
      );
    }

    const indexingService = getIndexingService(project_id);

    switch (action) {
      case 'index_file': {
        if (!file_path) {
          return NextResponse.json(
            { error: 'file_path is required for index_file action' },
            { status: 400 }
          );
        }

        const absolutePath = path.resolve(file_path);
        await indexingService.indexFile(absolutePath, options.force_reindex);

        return NextResponse.json({
          action,
          file_path: absolutePath,
          status: 'indexed',
          project_id
        });
      }

      case 'index_directory': {
        if (!directory_path) {
          return NextResponse.json(
            { error: 'directory_path is required for index_directory action' },
            { status: 400 }
          );
        }

        const absolutePath = path.resolve(directory_path);
        const result = await indexingService.indexDirectory(absolutePath, options);

        return NextResponse.json({
          action,
          directory_path: absolutePath,
          result,
          project_id
        });
      }

      case 'remove_file': {
        if (!file_path) {
          return NextResponse.json(
            { error: 'file_path is required for remove_file action' },
            { status: 400 }
          );
        }

        const absolutePath = path.resolve(file_path);
        await indexingService.removeFile(absolutePath);

        return NextResponse.json({
          action,
          file_path: absolutePath,
          status: 'removed',
          project_id
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Code indexing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during code indexing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const project_id = searchParams.get('project_id') || 'default';
    const include_embedding_service = searchParams.get('include_embedding_service') === 'true';

    const indexingService = getIndexingService(project_id);
    
    const stats = await indexingService.getIndexingStats();
    const isIndexing = indexingService.isCurrentlyIndexing();

    const response: any = {
      project_id,
      stats,
      status: {
        indexing: isIndexing,
        timestamp: new Date().toISOString()
      }
    };

    if (include_embedding_service) {
      const embeddingServiceStatus = await indexingService.testEmbeddingService();
      response.embedding_service = {
        connected: embeddingServiceStatus,
        timestamp: new Date().toISOString()
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Indexing stats error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get indexing stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}