import { readFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = {
  params: Promise<{ pluginId: string }>;
};

export async function GET(request: NextRequest, context: Params) {
  try {
    const { pluginId } = await context.params;

    // Map plugin IDs to their file names
    const pluginFiles: { [key: string]: string } = {
      'activity-logger': 'activity-logger.js',
      'ai-assistant': 'ai-assistant.js',
      'performance-monitor': 'performance-monitor.js',
    };

    if (!pluginFiles[pluginId]) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    const filePath = join(process.cwd(), 'src', 'examples', 'plugins', pluginFiles[pluginId]);

    try {
      const pluginCode = await readFile(filePath, 'utf-8');

      return new NextResponse(pluginCode, {
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    } catch (fileError) {
      // If file doesn't exist, return a placeholder plugin
      const placeholderPlugin = `
export default {
  id: '${pluginId}',
  name: '${pluginId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')}',
  version: '1.0.0',
  author: 'leo System',
  description: 'Built-in plugin - implementation coming soon',
  icon: '🔧',
  permissions: [],

  async onLoad(api) {
    api.log.info('${pluginId} plugin loaded');
  },

  async onEnable(api) {
    api.log.info('${pluginId} plugin enabled');
    api.ui.showNotification('${pluginId} enabled', 'success');
  },

  async onDisable(api) {
    api.log.info('${pluginId} plugin disabled');
  },

  async onUnload(api) {
    api.log.info('${pluginId} plugin unloaded');
  }
};
      `;

      return new NextResponse(placeholderPlugin, {
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
  } catch (error) {
    console.error('Error serving built-in plugin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
