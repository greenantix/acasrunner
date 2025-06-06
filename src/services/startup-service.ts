import { getMigrationService } from '@/lib/database/migrations';
import { getChromaDBService } from './vector-storage/chroma-service';
import { getVectorStorageConfigService } from './vector-storage/config-service';
import { registerClaudeCodePlugin } from '../plugins/claude-code/register';
import { pluginRegistry } from './plugin-system/plugin-registry';
import { DataRetentionService } from './data-retention';

export interface StartupStatus {
  initialized: boolean;
  services: {
    database_migrations: boolean;
    vector_storage: boolean;
    configuration: boolean;
    plugins: boolean;
    data_retention: boolean;
  };
  errors: string[];
  timestamp: string;
}

export class StartupService {
  private static instance: StartupService | null = null;
  private static dataRetentionService: DataRetentionService | null = null;
  private initializationPromise: Promise<StartupStatus> | null = null;
  private status: StartupStatus = {
    initialized: false,
    services: {
      database_migrations: false,
      vector_storage: false,
      configuration: false,
      plugins: false,
      data_retention: false
    },
    errors: [],
    timestamp: new Date().toISOString()
  };

  static getInstance(): StartupService {
    if (!StartupService.instance) {
      StartupService.instance = new StartupService();
    }
    return StartupService.instance;
  }

  async initialize(): Promise<StartupStatus> {
    // Return existing initialization promise if already running
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Return cached status if already initialized
    if (this.status.initialized) {
      return this.status;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<StartupStatus> {
    console.log('🚀 Starting leo Vector Storage initialization...');
    
    const errors: string[] = [];
    const services = {
      database_migrations: false,
      vector_storage: false,
      configuration: false,
      plugins: false,
      data_retention: false
    };

    try {
      // 1. Initialize configuration service
      console.log('📋 Initializing configuration service...');
      const configService = getVectorStorageConfigService();
      const config = await configService.getConfig();
      const validation = await configService.validateConfig(config);
      
      if (!validation.valid) {
        errors.push(`Configuration validation failed: ${validation.errors.join(', ')}`);
      } else {
        services.configuration = true;
        console.log('✅ Configuration service initialized');
      }
    } catch (error) {
      const errorMsg = `Configuration initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌', errorMsg);
    }

    try {
      // 2. Run database migrations
      console.log('🔄 Running database migrations...');
      const migrationService = getMigrationService();
      await migrationService.migrate();
      services.database_migrations = true;
      console.log('✅ Database migrations completed');
    } catch (error) {
      const errorMsg = `Database migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌', errorMsg);
    }

    try {
      // 3. Initialize ChromaDB service
      console.log('🗄️ Initializing ChromaDB vector storage...');
      const vectorService = getChromaDBService();
      await vectorService.initialize();
      services.vector_storage = true;
      console.log('✅ ChromaDB vector storage initialized');

      // Get initial stats
      const stats = await vectorService.getStats();
      console.log(`📊 ChromaDB stats: ${stats.total_embeddings} embeddings, collection: ${vectorService.getCollectionInfo().name}`);
    } catch (error) {
      const errorMsg = `ChromaDB initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌', errorMsg);
    }

    try {
      // 4. Initialize plugins
      console.log('🔌 Initializing plugins...');
      await registerClaudeCodePlugin();
      services.plugins = true;
      console.log('✅ Plugins initialized');
    } catch (error) {
      const errorMsg = `Plugin initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌', errorMsg);
    }

    try {
      // 5. Initialize data retention service
      console.log('🗂️ Initializing data retention service...');
      if (!StartupService.dataRetentionService) {
        StartupService.dataRetentionService = new DataRetentionService();
      }
      await StartupService.dataRetentionService.initialize();
      services.data_retention = true;
      console.log('✅ Data retention service initialized (Firebase cleanup jobs active)');
    } catch (error) {
      const errorMsg = `Data retention initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌', errorMsg);
    }

    // Update final status
    const allServicesInitialized = Object.values(services).every(status => status);
    
    this.status = {
      initialized: allServicesInitialized,
      services,
      errors,
      timestamp: new Date().toISOString()
    };

    if (allServicesInitialized) {
      console.log('🎉 leo Vector Storage initialization completed successfully!');
    } else {
      console.warn('⚠️ leo Vector Storage initialization completed with errors');
    }

    // Clear the promise to allow re-initialization if needed
    this.initializationPromise = null;

    return this.status;
  }

  getStatus(): StartupStatus {
    return { ...this.status };
  }

  async reinitialize(): Promise<StartupStatus> {
    console.log('🔄 Reinitializing leo Vector Storage...');
    this.status.initialized = false;
    this.initializationPromise = null;
    return this.initialize();
  }

  // Health check for monitoring
  async healthCheck(): Promise<{
    healthy: boolean;
    services: Record<string, boolean>;
    details: Record<string, any>;
  }> {
    const details: Record<string, any> = {};
    const serviceHealth: Record<string, boolean> = {};

    try {
      // Check vector storage
      const vectorService = getChromaDBService();
      const stats = await vectorService.getStats();
      const collectionInfo = vectorService.getCollectionInfo();
      serviceHealth.vector_storage = vectorService.isAvailable();
      details.vector_storage = {
        total_embeddings: stats.total_embeddings,
        collection_name: collectionInfo.name,
        initialized: collectionInfo.isInitialized,
        path: collectionInfo.path
      };
    } catch (error) {
      serviceHealth.vector_storage = false;
      details.vector_storage = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    try {
      // Check configuration
      const configService = getVectorStorageConfigService();
      const config = await configService.getConfig();
      const validation = await configService.validateConfig(config);
      serviceHealth.configuration = validation.valid;
      details.configuration = {
        valid: validation.valid,
        errors: validation.errors
      };
    } catch (error) {
      serviceHealth.configuration = false;
      details.configuration = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    try {
      // Check migrations
      const migrationService = getMigrationService();
      const migrationStatus = await migrationService.getMigrationStatus();
      serviceHealth.database_migrations = migrationStatus.pendingMigrations.length === 0;
      details.database_migrations = {
        current_version: migrationStatus.currentVersion,
        pending_migrations: migrationStatus.pendingMigrations.length
      };
    } catch (error) {
      serviceHealth.database_migrations = false;
      details.database_migrations = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    try {
      // Check plugins
      const pluginStats = pluginRegistry.getStats();
      serviceHealth.plugins = pluginStats.enabled > 0 && pluginStats.errors === 0;
      details.plugins = {
        total: pluginStats.total,
        enabled: pluginStats.enabled,
        errors: pluginStats.errors
      };
    } catch (error) {
      serviceHealth.plugins = false;
      details.plugins = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    const healthy = Object.values(serviceHealth).every(status => status);

    return {
      healthy,
      services: serviceHealth,
      details
    };
  }

  // Get the data retention service instance
  static getDataRetentionService(): DataRetentionService | null {
    return StartupService.dataRetentionService;
  }
}

// Singleton access
export function getStartupService(): StartupService {
  return StartupService.getInstance();
}

// Get data retention service
export function getDataRetentionService(): DataRetentionService | null {
  return StartupService.getDataRetentionService();
}

// Auto-initialize on import (for server-side initialization)
if (typeof window === 'undefined') {
  // Only auto-initialize on server-side
  getStartupService().initialize().catch(error => {
    console.error('Auto-initialization failed:', error);
  });
}
