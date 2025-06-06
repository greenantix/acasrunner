import { EventEmitter } from 'events';
import { existsSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DriftDetection {
  packageJsonBaseline: PackageJson;
  badImportQueue: ImportViolation[];
  newDependencies: string[];
  escalationTriggers: {
    badImports: number; // Auto-pause after 4 bad imports
    outdatedDeps: number; // Flag 3+ outdated dependencies
    missingDeps: number; // Missing dependencies trigger
  };
}

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: any;
}

export interface ImportViolation {
  id: string;
  filePath: string;
  importStatement: string;
  moduleName: string;
  line: number;
  column?: number;
  violationType: 'missing_dependency' | 'outdated_dependency' | 'unauthorized_import' | 'security_risk';
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
  timestamp: Date;
}

export interface DriftAction {
  action: 'ignore' | 'auto_install' | 'escalate' | 'pause_session';
  reason: string;
  violationCount: number;
  suggestions: string[];
}

export interface HealthReport {
  packageJsonPath: string;
  isValid: boolean;
  outdatedDependencies: OutdatedDependency[];
  securityVulnerabilities: SecurityVulnerability[];
  missingDependencies: string[];
  unusedDependencies: string[];
  lastCheck: Date;
  nextCheck: Date;
}

export interface OutdatedDependency {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  location: string;
  homepage?: string;
}

export interface SecurityVulnerability {
  name: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  via: string[];
  range: string;
  nodes: string[];
  fixAvailable: boolean;
}

export interface FixRecommendation {
  dependency: string;
  currentVersion: string;
  recommendedVersion: string;
  migrationSteps: string[];
  breakingChanges: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  documentation: string[];
}

export class DriftDetector extends EventEmitter {
  private driftDetection?: DriftDetection;
  private isActive = false;
  private projectPath: string;
  private packageJsonPath: string;
  private baselineLoaded = false;
  private violationQueue: ImportViolation[] = [];
  private checkInterval = 300000; // 5 minutes
  private intervalId?: NodeJS.Timeout;

  constructor(projectPath: string = process.cwd()) {
    super();
    this.projectPath = resolve(projectPath);
    this.packageJsonPath = join(this.projectPath, 'package.json');
  }

  async initialize(): Promise<void> {
    console.log('[Drift Detector] Initializing dependency drift detection...');
    this.isActive = true;
    
    // Load package.json baseline
    await this.loadBaseline(this.projectPath);
    
    // Start periodic health checks
    this.startPeriodicChecks();
    
    console.log(`[Drift Detector] ✅ Initialized for project: ${this.projectPath}`);
  }

  async cleanup(): Promise<void> {
    console.log('[Drift Detector] Cleaning up drift detector...');
    this.isActive = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    this.violationQueue.length = 0;
  }

  // Load package.json at session start
  async loadBaseline(projectPath: string): Promise<void> {
    try {
      this.projectPath = resolve(projectPath);
      this.packageJsonPath = join(this.projectPath, 'package.json');

      if (!existsSync(this.packageJsonPath)) {
        console.warn(`[Drift Detector] No package.json found at ${this.packageJsonPath}`);
        this.createDefaultBaseline();
        return;
      }

      const packageJsonContent = readFileSync(this.packageJsonPath, 'utf-8');
      const packageJson: PackageJson = JSON.parse(packageJsonContent);

      this.driftDetection = {
        packageJsonBaseline: packageJson,
        badImportQueue: [],
        newDependencies: [],
        escalationTriggers: {
          badImports: 4, // Auto-pause after 4 bad imports
          outdatedDeps: 3, // Flag 3+ outdated dependencies
          missingDeps: 2 // Missing dependencies trigger
        }
      };

      this.baselineLoaded = true;
      
      console.log(`[Drift Detector] ✅ Loaded baseline from ${this.packageJsonPath}`);
      console.log(`[Drift Detector] Dependencies: ${Object.keys(packageJson.dependencies || {}).length}, DevDependencies: ${Object.keys(packageJson.devDependencies || {}).length}`);
      
      this.emit('baseline-loaded', {
        projectPath: this.projectPath,
        packageJson: packageJson
      });

    } catch (error) {
      console.error('[Drift Detector] Error loading package.json baseline:', error);
      this.createDefaultBaseline();
    }
  }

  // Flag imports not in dependencies
  async checkImportViolation(importStatement: string, filePath: string, line: number = 0): Promise<ImportViolation | null> {
    if (!this.baselineLoaded || !this.driftDetection) {
      return null;
    }

    try {
      const moduleName = this.extractModuleName(importStatement);
      if (!moduleName) {
        return null;
      }

      // Skip built-in Node.js modules
      if (this.isBuiltinModule(moduleName)) {
        return null;
      }

      // Check if module exists in dependencies
      const packageJson = this.driftDetection.packageJsonBaseline;
      const allDependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
        ...packageJson.optionalDependencies
      };

      if (allDependencies[moduleName]) {
        // Check if it's outdated
        const outdatedInfo = await this.checkIfOutdated(moduleName, allDependencies[moduleName]);
        if (outdatedInfo) {
          return this.createViolation(
            filePath,
            importStatement,
            moduleName,
            line,
            'outdated_dependency',
            'medium',
            `Consider updating ${moduleName} from ${allDependencies[moduleName]} to ${outdatedInfo.latest}`
          );
        }
        return null; // Valid dependency
      }

      // Check for security risks
      const securityRisk = await this.checkSecurityRisk(moduleName);
      if (securityRisk) {
        return this.createViolation(
          filePath,
          importStatement,
          moduleName,
          line,
          'security_risk',
          'high',
          `Security risk detected for ${moduleName}: ${securityRisk}`
        );
      }

      // Missing dependency violation
      return this.createViolation(
        filePath,
        importStatement,
        moduleName,
        line,
        'missing_dependency',
        'medium',
        `Add ${moduleName} to package.json dependencies`
      );

    } catch (error) {
      console.error('[Drift Detector] Error checking import violation:', error);
      return null;
    }
  }

  // Queue violations, trigger auto-pause
  async processViolation(violation: ImportViolation): Promise<DriftAction> {
    if (!this.driftDetection) {
      return {
        action: 'ignore',
        reason: 'Drift detection not initialized',
        violationCount: 0,
        suggestions: []
      };
    }

    // Add to violation queue
    this.violationQueue.push(violation);
    this.driftDetection.badImportQueue.push(violation);

    // Count violations by type
    const violationCounts = this.getViolationCounts();
    const triggers = this.driftDetection.escalationTriggers;

    console.log(`[Drift Detector] Violation detected: ${violation.moduleName} in ${violation.filePath}:${violation.line}`);

    // Check escalation triggers
    if (violationCounts.missing_dependency >= triggers.missingDeps) {
      return {
        action: 'escalate',
        reason: `Missing dependencies threshold reached (${violationCounts.missing_dependency}/${triggers.missingDeps})`,
        violationCount: violationCounts.missing_dependency,
        suggestions: this.generateMissingDepSuggestions()
      };
    }

    if (violationCounts.outdated_dependency >= triggers.outdatedDeps) {
      return {
        action: 'escalate',
        reason: `Outdated dependencies threshold reached (${violationCounts.outdated_dependency}/${triggers.outdatedDeps})`,
        violationCount: violationCounts.outdated_dependency,
        suggestions: this.generateUpdateSuggestions()
      };
    }

    if (this.violationQueue.length >= triggers.badImports) {
      return {
        action: 'pause_session',
        reason: `Bad imports threshold reached (${this.violationQueue.length}/${triggers.badImports}) - pausing session`,
        violationCount: this.violationQueue.length,
        suggestions: ['Review and fix import violations before continuing']
      };
    }

    // Auto-install for simple missing dependencies
    if (violation.violationType === 'missing_dependency' && this.canAutoInstall(violation.moduleName)) {
      return {
        action: 'auto_install',
        reason: `Auto-installing common dependency: ${violation.moduleName}`,
        violationCount: violationCounts.missing_dependency,
        suggestions: [`npm install ${violation.moduleName}`]
      };
    }

    return {
      action: 'ignore',
      reason: `Violation logged for ${violation.moduleName}`,
      violationCount: this.violationQueue.length,
      suggestions: [violation.suggestion || 'Review import statement']
    };
  }

  // Integration with npm outdated/audit
  async checkDependencyHealth(): Promise<HealthReport> {
    const report: HealthReport = {
      packageJsonPath: this.packageJsonPath,
      isValid: false,
      outdatedDependencies: [],
      securityVulnerabilities: [],
      missingDependencies: [],
      unusedDependencies: [],
      lastCheck: new Date(),
      nextCheck: new Date(Date.now() + this.checkInterval)
    };

    try {
      if (!existsSync(this.packageJsonPath)) {
        return report;
      }

      report.isValid = true;

      // Check for outdated dependencies
      try {
        const { stdout: outdatedOutput } = await execAsync('npm outdated --json', {
          cwd: this.projectPath,
          timeout: 30000
        });
        
        if (outdatedOutput.trim()) {
          const outdatedData = JSON.parse(outdatedOutput);
          report.outdatedDependencies = Object.entries(outdatedData).map(([name, info]: [string, any]) => ({
            name,
            current: info.current,
            wanted: info.wanted,
            latest: info.latest,
            location: info.location || this.projectPath
          }));
        }
      } catch (error) {
        // npm outdated returns non-zero exit code when outdated packages exist
        if (error.stdout) {
          try {
            const outdatedData = JSON.parse(error.stdout);
            report.outdatedDependencies = Object.entries(outdatedData).map(([name, info]: [string, any]) => ({
              name,
              current: info.current,
              wanted: info.wanted,
              latest: info.latest,
              location: info.location || this.projectPath
            }));
          } catch (parseError) {
            console.warn('[Drift Detector] Could not parse npm outdated output');
          }
        }
      }

      // Check for security vulnerabilities
      try {
        const { stdout: auditOutput } = await execAsync('npm audit --json', {
          cwd: this.projectPath,
          timeout: 30000
        });
        
        const auditData = JSON.parse(auditOutput);
        if (auditData.vulnerabilities) {
          report.securityVulnerabilities = Object.entries(auditData.vulnerabilities).map(([name, vuln]: [string, any]) => ({
            name,
            severity: vuln.severity,
            via: vuln.via || [],
            range: vuln.range || '',
            nodes: vuln.nodes || [],
            fixAvailable: vuln.fixAvailable || false
          }));
        }
      } catch (error) {
        // npm audit returns non-zero exit code when vulnerabilities exist
        console.warn('[Drift Detector] npm audit check completed with warnings');
      }

      // Check for unused dependencies (basic check)
      report.unusedDependencies = await this.findUnusedDependencies();

      console.log(`[Drift Detector] Health check complete: ${report.outdatedDependencies.length} outdated, ${report.securityVulnerabilities.length} vulnerabilities`);

    } catch (error) {
      console.error('[Drift Detector] Error during health check:', error);
    }

    return report;
  }

  // Auto-escalate to research docs for migration recommendations
  async researchDependencyFix(dependency: string): Promise<FixRecommendation> {
    const recommendation: FixRecommendation = {
      dependency,
      currentVersion: 'unknown',
      recommendedVersion: 'latest',
      migrationSteps: [],
      breakingChanges: [],
      estimatedEffort: 'medium',
      documentation: []
    };

    try {
      // Get current version from package.json
      if (this.driftDetection?.packageJsonBaseline.dependencies?.[dependency]) {
        recommendation.currentVersion = this.driftDetection.packageJsonBaseline.dependencies[dependency];
      } else if (this.driftDetection?.packageJsonBaseline.devDependencies?.[dependency]) {
        recommendation.currentVersion = this.driftDetection.packageJsonBaseline.devDependencies[dependency];
      }

      // Get latest version from npm
      try {
        const { stdout } = await execAsync(`npm view ${dependency} version`, {
          timeout: 10000
        });
        recommendation.recommendedVersion = stdout.trim();
      } catch (error) {
        console.warn(`[Drift Detector] Could not fetch latest version for ${dependency}`);
      }

      // Generate migration suggestions based on common patterns
      recommendation.migrationSteps = this.generateMigrationSteps(dependency, recommendation.currentVersion, recommendation.recommendedVersion);
      recommendation.breakingChanges = this.identifyPotentialBreakingChanges(dependency);
      recommendation.estimatedEffort = this.estimateMigrationEffort(dependency, recommendation.currentVersion, recommendation.recommendedVersion);
      recommendation.documentation = this.getRelevantDocumentation(dependency);

    } catch (error) {
      console.error(`[Drift Detector] Error researching fix for ${dependency}:`, error);
    }

    return recommendation;
  }

  // Public API methods
  getViolationQueue(): ImportViolation[] {
    return [...this.violationQueue];
  }

  clearViolationQueue(): void {
    this.violationQueue.length = 0;
    if (this.driftDetection) {
      this.driftDetection.badImportQueue.length = 0;
    }
    console.log('[Drift Detector] Violation queue cleared');
  }

  getBaseline(): PackageJson | undefined {
    return this.driftDetection?.packageJsonBaseline;
  }

  async refreshBaseline(): Promise<void> {
    await this.loadBaseline(this.projectPath);
  }

  getViolationStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const stats = {
      total: this.violationQueue.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>
    };

    for (const violation of this.violationQueue) {
      stats.byType[violation.violationType] = (stats.byType[violation.violationType] || 0) + 1;
      stats.bySeverity[violation.severity] = (stats.bySeverity[violation.severity] || 0) + 1;
    }

    return stats;
  }

  // Private helper methods
  private createDefaultBaseline(): void {
    console.log('[Drift Detector] Creating default baseline (no package.json found)');
    
    this.driftDetection = {
      packageJsonBaseline: {
        name: 'unknown-project',
        version: '1.0.0',
        dependencies: {},
        devDependencies: {}
      },
      badImportQueue: [],
      newDependencies: [],
      escalationTriggers: {
        badImports: 4,
        outdatedDeps: 3,
        missingDeps: 2
      }
    };
    
    this.baselineLoaded = true;
  }

  private extractModuleName(importStatement: string): string | null {
    // Handle various import patterns
    const patterns = [
      /import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/, // import ... from 'module'
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/, // require('module')
      /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/, // import('module')
      /from\s+['"`]([^'"`]+)['"`]/ // from 'module'
    ];

    for (const pattern of patterns) {
      const match = importStatement.match(pattern);
      if (match) {
        let moduleName = match[1];
        
        // Handle scoped packages and subpaths
        if (moduleName.startsWith('@')) {
          const parts = moduleName.split('/');
          return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : moduleName;
        } else {
          return moduleName.split('/')[0];
        }
      }
    }

    return null;
  }

  private isBuiltinModule(moduleName: string): boolean {
    const builtinModules = [
      'fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'util', 'events',
      'stream', 'buffer', 'process', 'child_process', 'cluster', 'worker_threads',
      'readline', 'zlib', 'querystring', 'string_decoder', 'timers', 'tty',
      'v8', 'vm', 'assert', 'async_hooks', 'dgram', 'dns', 'domain', 'module',
      'net', 'perf_hooks', 'punycode', 'repl', 'trace_events', 'inspector'
    ];
    
    return builtinModules.includes(moduleName);
  }

  private createViolation(
    filePath: string,
    importStatement: string,
    moduleName: string,
    line: number,
    violationType: ImportViolation['violationType'],
    severity: ImportViolation['severity'],
    suggestion?: string
  ): ImportViolation {
    return {
      id: `violation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      filePath,
      importStatement,
      moduleName,
      line,
      violationType,
      severity,
      suggestion,
      timestamp: new Date()
    };
  }

  private async checkIfOutdated(moduleName: string, currentVersion: string): Promise<{ latest: string } | null> {
    try {
      const { stdout } = await execAsync(`npm view ${moduleName} version`, {
        timeout: 5000
      });
      const latestVersion = stdout.trim();
      
      // Simple version comparison (could be enhanced with semver library)
      if (currentVersion !== latestVersion && !currentVersion.includes(latestVersion)) {
        return { latest: latestVersion };
      }
    } catch (error) {
      // Module might not exist on npm
    }
    
    return null;
  }

  private async checkSecurityRisk(moduleName: string): Promise<string | null> {
    // Basic security risk patterns
    const riskyPatterns = [
      /^eval$/,
      /^vm2$/,
      /crypto-js$/,
      /request$/,
      /^lodash$/
    ];

    for (const pattern of riskyPatterns) {
      if (pattern.test(moduleName)) {
        return `Potentially risky module: ${moduleName}`;
      }
    }

    return null;
  }

  private getViolationCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const violation of this.violationQueue) {
      counts[violation.violationType] = (counts[violation.violationType] || 0) + 1;
    }
    
    return counts;
  }

  private canAutoInstall(moduleName: string): boolean {
    // Only auto-install well-known, safe dependencies
    const autoInstallableModules = [
      'lodash', 'axios', 'express', 'react', 'vue', 'moment', 'dayjs',
      '@types/node', '@types/react', 'typescript', 'eslint', 'prettier'
    ];
    
    return autoInstallableModules.includes(moduleName);
  }

  private generateMissingDepSuggestions(): string[] {
    const missingDeps = this.violationQueue
      .filter(v => v.violationType === 'missing_dependency')
      .map(v => v.moduleName);

    return [
      `Install missing dependencies: npm install ${[...new Set(missingDeps)].join(' ')}`,
      'Review import statements for typos',
      'Consider using a dependency manager like npm-check-updates'
    ];
  }

  private generateUpdateSuggestions(): string[] {
    return [
      'Run npm update to update dependencies to latest compatible versions',
      'Use npm outdated to see all outdated packages',
      'Consider using npm-check-updates for major version updates',
      'Review changelogs before updating major versions'
    ];
  }

  private async findUnusedDependencies(): Promise<string[]> {
    // Basic unused dependency detection
    // This could be enhanced with more sophisticated analysis
    const unused: string[] = [];
    
    try {
      if (this.driftDetection?.packageJsonBaseline.dependencies) {
        for (const dep of Object.keys(this.driftDetection.packageJsonBaseline.dependencies)) {
          // Skip if it's a built-in module or commonly used without explicit imports
          if (this.isBuiltinModule(dep) || this.isImplicitlyUsed(dep)) {
            continue;
          }
          
          // Simple grep-based check (could be enhanced with AST analysis)
          try {
            const { stdout } = await execAsync(`grep -r "import.*${dep}\\|require.*${dep}" ${this.projectPath}/src ${this.projectPath}/lib 2>/dev/null || echo ""`, {
              timeout: 5000
            });
            
            if (!stdout.trim()) {
              unused.push(dep);
            }
          } catch (error) {
            // Grep might fail, skip this dependency
          }
        }
      }
    } catch (error) {
      console.error('[Drift Detector] Error finding unused dependencies:', error);
    }
    
    return unused;
  }

  private isImplicitlyUsed(moduleName: string): boolean {
    // Modules that are typically used without explicit imports
    const implicitModules = [
      'react', 'vue', 'typescript', 'webpack', 'babel', 'eslint', 'prettier',
      'jest', 'mocha', 'chai', 'sinon', 'nodemon', 'concurrently'
    ];
    
    return implicitModules.some(implicit => moduleName.includes(implicit));
  }

  private generateMigrationSteps(dependency: string, currentVersion: string, recommendedVersion: string): string[] {
    const steps = [
      `Update ${dependency} from ${currentVersion} to ${recommendedVersion}`,
      `npm install ${dependency}@${recommendedVersion}`,
      'Test application functionality',
      'Update import statements if needed',
      'Review documentation for breaking changes'
    ];

    return steps;
  }

  private identifyPotentialBreakingChanges(dependency: string): string[] {
    // Common breaking change patterns
    const breakingChanges: string[] = [];

    if (dependency.includes('react')) {
      breakingChanges.push('React hooks API changes', 'Component lifecycle updates');
    }
    
    if (dependency.includes('webpack')) {
      breakingChanges.push('Configuration format changes', 'Plugin API updates');
    }

    if (dependency.includes('babel')) {
      breakingChanges.push('Preset configuration changes', 'Plugin compatibility');
    }

    return breakingChanges;
  }

  private estimateMigrationEffort(dependency: string, currentVersion: string, recommendedVersion: string): 'low' | 'medium' | 'high' {
    // Simple heuristic based on version jump
    try {
      const currentMajor = parseInt(currentVersion.split('.')[0]);
      const recommendedMajor = parseInt(recommendedVersion.split('.')[0]);
      
      if (recommendedMajor > currentMajor) {
        return 'high'; // Major version bump
      } else if (recommendedVersion !== currentVersion) {
        return 'medium'; // Minor/patch version bump
      }
    } catch (error) {
      // Version parsing failed
    }
    
    return 'low';
  }

  private getRelevantDocumentation(dependency: string): string[] {
    const docs = [
      `https://www.npmjs.com/package/${dependency}`,
      `https://github.com/search?q=${dependency}+migration+guide`,
      `${dependency} official documentation`
    ];

    return docs;
  }

  private startPeriodicChecks(): void {
    this.intervalId = setInterval(async () => {
      if (this.isActive) {
        try {
          const health = await this.checkDependencyHealth();
          
          if (health.outdatedDependencies.length > 0 || health.securityVulnerabilities.length > 0) {
            this.emit('health-check-complete', health);
          }
        } catch (error) {
          console.error('[Drift Detector] Error during periodic health check:', error);
        }
      }
    }, this.checkInterval);
  }
}