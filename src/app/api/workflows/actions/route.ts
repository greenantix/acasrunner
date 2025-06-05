import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Return available workflow actions
    const actions = [
      {
        type: 'file.read',
        category: 'File Operations',
        description: 'Read content from a file',
        schema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to read' },
            encoding: { type: 'string', default: 'utf8' }
          },
          required: ['path']
        }
      },
      {
        type: 'file.write',
        category: 'File Operations',
        description: 'Write content to a file',
        schema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to write' },
            content: { type: 'string', description: 'Content to write' },
            append: { type: 'boolean', default: false }
          },
          required: ['path', 'content']
        }
      },
      {
        type: 'ai.analyze',
        category: 'AI Operations',
        description: 'Analyze content using AI',
        schema: {
          type: 'object',
          properties: {
            provider: { type: 'string', enum: ['claude', 'openai', 'gemini'] },
            prompt: { type: 'string', description: 'Analysis prompt' },
            includeContext: { type: 'boolean', default: true }
          },
          required: ['provider', 'prompt']
        }
      },
      {
        type: 'git.commit',
        category: 'Git Operations',
        description: 'Commit changes to git',
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Commit message' },
            addAll: { type: 'boolean', default: false }
          },
          required: ['message']
        }
      },
      {
        type: 'notification.send',
        category: 'Notifications',
        description: 'Send a notification',
        schema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['chat', 'console'] },
            message: { type: 'string', description: 'Notification message' },
            title: { type: 'string', description: 'Notification title' }
          },
          required: ['type', 'message']
        }
      },
      {
        type: 'shell.execute',
        category: 'System',
        description: 'Execute a shell command',
        schema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
            args: { type: 'array', items: { type: 'string' } },
            timeout: { type: 'number', default: 30000 }
          },
          required: ['command']
        }
      }
    ];

    return NextResponse.json({ 
      success: true, 
      data: actions 
    });
  } catch (error) {
    console.error('Error fetching actions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch actions' 
      },
      { status: 500 }
    );
  }
}