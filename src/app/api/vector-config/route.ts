import { NextRequest, NextResponse } from 'next/server';
import { getVectorStorageConfigService } from '@/services/vector-storage/config-service';

export async function GET() {
  try {
    const configService = getVectorStorageConfigService();
    const config = await configService.getConfig();
    const validation = await configService.validateConfig(config);

    return NextResponse.json({
      config,
      validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Vector config fetch error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch vector storage configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json();
    
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be a valid configuration object' },
        { status: 400 }
      );
    }

    const configService = getVectorStorageConfigService();
    
    // Validate the updates first
    const currentConfig = await configService.getConfig();
    const updatedConfig = { ...currentConfig, ...updates };
    const validation = await configService.validateConfig(updatedConfig);

    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Configuration validation failed',
          validation_errors: validation.errors
        },
        { status: 400 }
      );
    }

    // Apply the updates
    await configService.updateConfig(updates);
    
    // Return the updated configuration
    const newConfig = await configService.getConfig();

    return NextResponse.json({
      config: newConfig,
      updated_fields: Object.keys(updates),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Vector config update error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update vector storage configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const configService = getVectorStorageConfigService();

    switch (action) {
      case 'validate': {
        const config = await configService.getConfig();
        const validation = await configService.validateConfig(config);
        
        return NextResponse.json({
          action,
          validation,
          timestamp: new Date().toISOString()
        });
      }

      case 'reset_cache': {
        configService.clearCache();
        const config = await configService.getConfig();
        
        return NextResponse.json({
          action,
          config,
          message: 'Configuration cache cleared and reloaded',
          timestamp: new Date().toISOString()
        });
      }

      case 'reset_to_defaults': {
        // This would reset all settings to defaults
        // For safety, we'll just return what the defaults would be
        const defaultConfig = await configService.getDefaultConfig();
        
        return NextResponse.json({
          action,
          default_config: defaultConfig,
          message: 'Default configuration (not applied - use PUT to apply)',
          timestamp: new Date().toISOString()
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Vector config action error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to execute configuration action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
