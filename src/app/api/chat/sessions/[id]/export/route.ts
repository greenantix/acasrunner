import { NextRequest, NextResponse } from 'next/server';
import { exportService } from '@/services/export-service';
import { ExportFormat } from '@/types/chat';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { format, options = {} } = body;

    if (!format) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Export format is required' 
        },
        { status: 400 }
      );
    }

    let result: string | Buffer;
    let mimeType: string;
    let filename: string;

    switch (format as ExportFormat) {
      case 'markdown':
        result = await exportService.exportToMarkdown(params.id, options);
        mimeType = 'text/markdown';
        filename = `chat-${params.id}.md`;
        break;
        
      case 'json':
        result = await exportService.exportToJSON(params.id, options.includeMetadata);
        mimeType = 'application/json';
        filename = `chat-${params.id}.json`;
        break;
        
      case 'html':
        result = await exportService.exportToHTML(params.id, options);
        mimeType = 'text/html';
        filename = `chat-${params.id}.html`;
        break;
        
      case 'plaintext':
        result = await exportService.exportToPlaintext(params.id);
        mimeType = 'text/plain';
        filename = `chat-${params.id}.txt`;
        break;
        
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: `Export format ${format} not supported yet` 
          },
          { status: 400 }
        );
    }

    // Return the content with appropriate headers for download
    return new NextResponse(result, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting session:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to export session' 
      },
      { status: 500 }
    );
  }
}