import { FirebaseCollections, COLLECTIONS } from '../firebase/collections';
import { collection, doc, getDoc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

// Migration interface
export interface Migration {
  version: string;
  name: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
  dependencies?: string[];
}

// Migration record in database
interface MigrationRecord {
  version: string;
  name: string;
  appliedAt: Date;
  appliedBy: string;
  status: 'pending' | 'applied' | 'failed' | 'rolled_back';
  error?: string;
}

export class DatabaseMigrationService {
  private migrations: Map<string, Migration> = new Map();
  private readonly MIGRATIONS_COLLECTION = 'migrations';

  constructor() {
    this.registerMigrations();
  }

  // Register all migrations
  private registerMigrations(): void {
    // Migration 1: Initial schema setup
    this.addMigration({
      version: '1.0.0',
      name: 'initial_schema',
      description: 'Create initial Firestore collections and indexes',
      up: async () => {
        await this.createInitialCollections();
        await this.createInitialIndexes();
      },
      down: async () => {
        // Cannot easily drop collections in Firestore, so we'll mark as rolled back
        console.log('Initial schema rollback - collections remain but marked as inactive');
      }
    });

    // Migration 2: Add user preferences
    this.addMigration({
      version: '1.1.0',
      name: 'user_preferences',
      description: 'Add user preferences and settings structure',
      up: async () => {
        await this.addUserPreferencesFields();
      },
      down: async () => {
        await this.removeUserPreferencesFields();
      },
      dependencies: ['1.0.0']
    });

    // Migration 3: Plugin system enhancements
    this.addMigration({
      version: '1.2.0',
      name: 'plugin_enhancements',
      description: 'Add plugin registry and security features',
      up: async () => {
        await this.enhancePluginSystem();
      },
      down: async () => {
        await this.revertPluginEnhancements();
      },
      dependencies: ['1.1.0']
    });

    // Migration 4: Workflow system
    this.addMigration({
      version: '1.3.0',
      name: 'workflow_system',
      description: 'Add workflow definitions and execution tracking',
      up: async () => {
        await this.addWorkflowSystem();
      },
      down: async () => {
        await this.removeWorkflowSystem();
      },
      dependencies: ['1.2.0']
    });

    // Migration 5: Analytics and metrics
    this.addMigration({
      version: '1.4.0',
      name: 'analytics_metrics',
      description: 'Add analytics collection and user metrics',
      up: async () => {
        await this.addAnalyticsSystem();
      },
      down: async () => {
        await this.removeAnalyticsSystem();
      },
      dependencies: ['1.3.0']
    });
  }

  // Add a migration
  addMigration(migration: Migration): void {
    this.migrations.set(migration.version, migration);
  }

  // Run all pending migrations
  async migrate(): Promise<void> {
    console.log('🔄 Starting database migrations...');

    const appliedMigrations = await this.getAppliedMigrations();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));

    // Sort migrations by version
    const sortedMigrations = Array.from(this.migrations.values())
      .sort((a, b) => this.compareVersions(a.version, b.version));

    for (const migration of sortedMigrations) {
      if (appliedVersions.has(migration.version)) {
        console.log(`✅ Migration ${migration.version} already applied`);
        continue;
      }

      // Check dependencies
      if (migration.dependencies) {
        for (const dependency of migration.dependencies) {
          if (!appliedVersions.has(dependency)) {
            throw new Error(`Migration ${migration.version} depends on ${dependency} which is not applied`);
          }
        }
      }

      await this.runMigration(migration);
      appliedVersions.add(migration.version);
    }

    console.log('✅ All migrations completed successfully');
  }

  // Run a specific migration
  private async runMigration(migration: Migration): Promise<void> {
    console.log(`🔄 Running migration ${migration.version}: ${migration.name}`);

    const migrationRecord: MigrationRecord = {
      version: migration.version,
      name: migration.name,
      appliedAt: new Date(),
      appliedBy: 'system',
      status: 'pending'
    };

    try {
      // Record migration start
      await this.recordMigration(migrationRecord);

      // Run the migration
      await migration.up();

      // Update record as successful
      migrationRecord.status = 'applied';
      await this.recordMigration(migrationRecord);

      console.log(`✅ Migration ${migration.version} completed successfully`);
    } catch (error) {
      console.error(`❌ Migration ${migration.version} failed:`, error);

      // Record failure
      migrationRecord.status = 'failed';
      migrationRecord.error = error instanceof Error ? error.message : String(error);
      await this.recordMigration(migrationRecord);

      throw error;
    }
  }

  // Rollback to a specific version
  async rollback(targetVersion: string): Promise<void> {
    console.log(`🔄 Rolling back to version ${targetVersion}...`);

    const appliedMigrations = await this.getAppliedMigrations();
    const sortedMigrations = appliedMigrations
      .filter(m => this.compareVersions(m.version, targetVersion) > 0)
      .sort((a, b) => this.compareVersions(b.version, a.version)); // Reverse order for rollback

    for (const migrationRecord of sortedMigrations) {
      const migration = this.migrations.get(migrationRecord.version);
      if (!migration) {
        console.warn(`Migration ${migrationRecord.version} not found for rollback`);
        continue;
      }

      await this.rollbackMigration(migration, migrationRecord);
    }

    console.log(`✅ Rollback to version ${targetVersion} completed`);
  }

  // Rollback a specific migration
  private async rollbackMigration(migration: Migration, record: MigrationRecord): Promise<void> {
    console.log(`🔄 Rolling back migration ${migration.version}: ${migration.name}`);

    try {
      await migration.down();

      // Update record
      const updatedRecord: MigrationRecord = {
        ...record,
        status: 'rolled_back',
        appliedAt: new Date()
      };
      await this.recordMigration(updatedRecord);

      console.log(`✅ Migration ${migration.version} rolled back successfully`);
    } catch (error) {
      console.error(`❌ Rollback of migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  // Get applied migrations from database
  private async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      const migrationsRef = collection(db, this.MIGRATIONS_COLLECTION);
      const snapshot = await getDocs(query(migrationsRef, where('status', 'in', ['applied', 'rolled_back'])));
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        appliedAt: doc.data().appliedAt.toDate()
      })) as MigrationRecord[];
    } catch (error) {
      console.log('Migrations collection does not exist yet, starting fresh');
      return [];
    }
  }

  // Record migration in database
  private async recordMigration(record: MigrationRecord): Promise<void> {
    const migrationRef = doc(db, this.MIGRATIONS_COLLECTION, record.version);
    await setDoc(migrationRef, {
      ...record,
      appliedAt: record.appliedAt
    }, { merge: true });
  }

  // Compare version strings (semver-like)
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }
    
    return 0;
  }

  // Migration implementations

  private async createInitialCollections(): Promise<void> {
    // Create initial documents in each collection to ensure they exist
    const collections = [
      COLLECTIONS.ACTIVITIES,
      COLLECTIONS.ESCALATIONS,
      COLLECTIONS.WORKFLOWS,
      COLLECTIONS.PLUGINS,
      COLLECTIONS.USERS,
      COLLECTIONS.SESSIONS,
      COLLECTIONS.ANALYTICS,
      COLLECTIONS.SETTINGS
    ];

    for (const collectionName of collections) {
      const collectionRef = collection(db, collectionName);
      const initDoc = doc(collectionRef, '_init');
      
      await setDoc(initDoc, {
        _initialized: true,
        createdAt: new Date(),
        description: `Initial document for ${collectionName} collection`
      });
    }
  }

  private async createInitialIndexes(): Promise<void> {
    // Firestore indexes are typically created via Firebase console or CLI
    // This is a placeholder for any programmatic index creation
    console.log('Initial indexes creation - handled via firestore.indexes.json');
  }

  private async addUserPreferencesFields(): Promise<void> {
    // Add default user preferences structure
    await FirebaseCollections.setSetting({
      category: 'user_preferences',
      key: 'default_theme',
      value: 'system',
      type: 'string',
      description: 'Default theme preference for new users',
      isSystem: true,
      updatedBy: 'migration_1.1.0'
    });

    await FirebaseCollections.setSetting({
      category: 'user_preferences',
      key: 'default_ai_provider',
      value: 'claude',
      type: 'string',
      description: 'Default AI provider for new users',
      isSystem: true,
      updatedBy: 'migration_1.1.0'
    });
  }

  private async removeUserPreferencesFields(): Promise<void> {
    // Remove user preference settings
    // In a real implementation, you'd query and delete specific documents
    console.log('Removing user preferences fields (rollback)');
  }

  private async enhancePluginSystem(): Promise<void> {
    // Add plugin security settings
    await FirebaseCollections.setSetting({
      category: 'plugin_system',
      key: 'security_scan_enabled',
      value: true,
      type: 'boolean',
      description: 'Enable security scanning for plugins',
      isSystem: true,
      updatedBy: 'migration_1.2.0'
    });

    await FirebaseCollections.setSetting({
      category: 'plugin_system',
      key: 'max_plugins_per_user',
      value: 50,
      type: 'number',
      description: 'Maximum plugins per user',
      isSystem: true,
      updatedBy: 'migration_1.2.0'
    });
  }

  private async revertPluginEnhancements(): Promise<void> {
    console.log('Reverting plugin system enhancements (rollback)');
  }

  private async addWorkflowSystem(): Promise<void> {
    // Add workflow system settings
    await FirebaseCollections.setSetting({
      category: 'workflow_system',
      key: 'max_execution_time',
      value: 300000, // 5 minutes
      type: 'number',
      description: 'Maximum workflow execution time in milliseconds',
      isSystem: true,
      updatedBy: 'migration_1.3.0'
    });

    await FirebaseCollections.setSetting({
      category: 'workflow_system',
      key: 'max_concurrent_executions',
      value: 10,
      type: 'number',
      description: 'Maximum concurrent workflow executions',
      isSystem: true,
      updatedBy: 'migration_1.3.0'
    });
  }

  private async removeWorkflowSystem(): Promise<void> {
    console.log('Removing workflow system (rollback)');
  }

  private async addAnalyticsSystem(): Promise<void> {
    // Add analytics settings
    await FirebaseCollections.setSetting({
      category: 'analytics',
      key: 'collection_enabled',
      value: true,
      type: 'boolean',
      description: 'Enable analytics data collection',
      isSystem: true,
      updatedBy: 'migration_1.4.0'
    });

    await FirebaseCollections.setSetting({
      category: 'analytics',
      key: 'retention_days',
      value: 90,
      type: 'number',
      description: 'Analytics data retention period in days',
      isSystem: true,
      updatedBy: 'migration_1.4.0'
    });
  }

  private async removeAnalyticsSystem(): Promise<void> {
    console.log('Removing analytics system (rollback)');
  }

  // Get migration status
  async getMigrationStatus(): Promise<{
    currentVersion: string;
    availableVersions: string[];
    appliedMigrations: MigrationRecord[];
    pendingMigrations: string[];
  }> {
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));
    const availableVersions = Array.from(this.migrations.keys()).sort((a, b) => this.compareVersions(a, b));
    const pendingMigrations = availableVersions.filter(v => !appliedVersions.has(v));
    
    const currentVersion = appliedMigrations.length > 0
      ? appliedMigrations
          .filter(m => m.status === 'applied')
          .sort((a, b) => this.compareVersions(b.version, a.version))[0]?.version || '0.0.0'
      : '0.0.0';

    return {
      currentVersion,
      availableVersions,
      appliedMigrations,
      pendingMigrations
    };
  }

  // Check if migrations are needed
  async checkMigrationStatus(): Promise<boolean> {
    const status = await this.getMigrationStatus();
    return status.pendingMigrations.length > 0;
  }
}

// Singleton instance
let migrationService: DatabaseMigrationService | null = null;

export function getMigrationService(): DatabaseMigrationService {
  if (!migrationService) {
    migrationService = new DatabaseMigrationService();
  }
  return migrationService;
}

// Auto-run migrations on app startup (optional)
export async function runMigrationsOnStartup(): Promise<void> {
  try {
    const service = getMigrationService();
    const needsMigration = await service.checkMigrationStatus();
    
    if (needsMigration) {
      console.log('🔄 Auto-running database migrations...');
      await service.migrate();
    } else {
      console.log('✅ Database is up to date');
    }
  } catch (error) {
    console.error('❌ Auto-migration failed:', error);
    // Don't throw - let the app continue with potentially outdated schema
  }
}