import { getMigrationService } from '@/lib/database/migrations';
import { getSQLiteVecService } from './vector-storage';
import { getVectorStorageConfigService } from './vector-storage/config-service';

export interface StartupStatus {
  initialized: boolean;
  services: {
    database_migrations: boolean;
    vector_storage: boolean;
    configuration: boolean;
  };
  errors: string[];
  timestamp: string;
}

export class StartupService {
  private static instance: StartupService | null = null;
  private initializationPromise: Promise<StartupStatus> | null = null;
  private status: StartupStatus = {
    initialized: false,
    services: {
      database_migrations: false,
      vector_storage: false,
      configuration: false
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
    console.log('🚀 Starting ACAS Vector Storage initialization...');
    
    const errors: string[] = [];
    const services = {
      database_migrations: false,
      vector_storage: false,
      configuration: false
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
      // 3. Initialize SQLite-vec service
      console.log('🗄️ Initializing vector storage...');
      const vectorService = getSQLiteVecService();
      await vectorService.initialize();
      services.vector_storage = true;
      console.log('✅ Vector storage initialized');

      // Get initial stats
      const stats = await vectorService.getStats();
      console.log(`📊 Vector database stats: ${stats.total_embeddings} embeddings across ${Object.keys(stats.languages).length} languages`);
    } catch (error) {
      const errorMsg = `Vector storage initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
      console.log('🎉 ACAS Vector Storage initialization completed successfully!');
    } else {
      console.warn('⚠️ ACAS Vector Storage initialization completed with errors');
    }

    // Clear the promise to allow re-initialization if needed
    this.initializationPromise = null;

    return this.status;
  }

  getStatus(): StartupStatus {
    return { ...this.status };
  }

  async reinitialize(): Promise<StartupStatus> {
    console.log('🔄 Reinitializing ACAS Vector Storage...');
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
      const vectorService = getSQLiteVecService();
      const stats = await vectorService.getStats();
      serviceHealth.vector_storage = true;
      details.vector_storage = {
        total_embeddings: stats.total_embeddings,
        file_types: Object.keys(stats.file_types).length,
        languages: Object.keys(stats.languages).length
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

    const healthy = Object.values(serviceHealth).every(status => status);

    return {
      healthy,
      services: serviceHealth,
      details
    };
  }
}

// Singleton access
export function getStartupService(): StartupService {
  return StartupService.getInstance();
}

// Auto-initialize on import (for server-side initialization)
if (typeof window === 'undefined') {
  // Only auto-initialize on server-side
  getStartupService().initialize().catch(error => {
    console.error('Auto-initialization failed:', error);
  });
}