import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { join, resolve, normalize } from 'path';

const execAsync = promisify(exec);

export interface SystemInfo {
  availableRAM: number; // GB
  totalRAM: number; // GB
  cpuCores: number;
  isWSL: boolean;
  wslDistro?: string;
  windowsVersion?: string;
  nodeVersion: string;
  platform: string;
}

export interface WSLPathMapping {
  windowsPath: string;
  wslPath: string;
  isValid: boolean;
  driveMapping?: string;
}

export interface TurboPromptEnhancement {
  systemResources: string;
  optimizationHints: string[];
  memoryGuidance: string;
  performanceMode: 'standard' | 'turbo' | 'conservative';
}

export class WSLOptimizer extends EventEmitter {
  private systemInfo?: SystemInfo;
  private isActive = false;
  private pathCache = new Map<string, WSLPathMapping>();
  private wslDistroName?: string;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    console.log('[WSL Optimizer] Initializing WSL optimization and path translation...');
    this.isActive = true;
    
    // Detect system resources and WSL environment
    this.systemInfo = await this.detectSystemResources();
    
    if (this.systemInfo.isWSL) {
      await this.setupWSLIntegration();
      console.log(`[WSL Optimizer] ✅ WSL environment detected: ${this.systemInfo.wslDistro}`);
    } else {
      console.log('[WSL Optimizer] ℹ️  Non-WSL environment detected, basic optimization enabled');
    }
  }

  async cleanup(): Promise<void> {
    console.log('[WSL Optimizer] Cleaning up WSL optimizer...');
    this.isActive = false;
    this.pathCache.clear();
  }

  // Detect available system memory and resources
  async detectSystemResources(): Promise<SystemInfo> {
    const systemInfo: SystemInfo = {
      availableRAM: 0,
      totalRAM: 0,
      cpuCores: 1,
      isWSL: false,
      nodeVersion: process.version,
      platform: process.platform
    };

    try {
      // Detect WSL environment
      systemInfo.isWSL = await this.detectWSL();
      
      if (systemInfo.isWSL) {
        systemInfo.wslDistro = await this.getWSLDistroName();
        systemInfo.windowsVersion = await this.getWindowsVersion();
      }

      // Get memory information
      if (process.platform === 'linux') {
        const memInfo = await this.getLinuxMemoryInfo();
        systemInfo.totalRAM = memInfo.total;
        systemInfo.availableRAM = memInfo.available;
      } else if (process.platform === 'win32') {
        const memInfo = await this.getWindowsMemoryInfo();
        systemInfo.totalRAM = memInfo.total;
        systemInfo.availableRAM = memInfo.available;
      } else {
        // Fallback for other platforms
        const memInfo = await this.getFallbackMemoryInfo();
        systemInfo.totalRAM = memInfo.total;
        systemInfo.availableRAM = memInfo.available;
      }

      // Get CPU core count
      systemInfo.cpuCores = await this.getCPUCoreCount();

      console.log(`[WSL Optimizer] System detected: ${systemInfo.totalRAM}GB RAM (${systemInfo.availableRAM}GB available), ${systemInfo.cpuCores} cores`);

    } catch (error) {
      console.error('[WSL Optimizer] Error detecting system resources:', error);
      
      // Set safe defaults
      systemInfo.totalRAM = 8;
      systemInfo.availableRAM = 4;
      systemInfo.cpuCores = 4;
    }

    return systemInfo;
  }

  // Front-load Claude prompt with memory hints
  generateTurboPrompt(basePrompt?: string): TurboPromptEnhancement {
    if (!this.systemInfo) {
      throw new Error('System info not available. Call initialize() first.');
    }

    const performanceMode = this.determinePerformanceMode();
    const optimizationHints: string[] = [];
    
    // Memory-based optimization hints
    if (this.systemInfo.availableRAM >= 16) {
      optimizationHints.push('Use parallel processing for file operations');
      optimizationHints.push('Prefer in-memory operations over disk I/O');
      optimizationHints.push('Enable aggressive caching strategies');
    } else if (this.systemInfo.availableRAM >= 8) {
      optimizationHints.push('Use moderate parallelization');
      optimizationHints.push('Balance memory usage with performance');
    } else {
      optimizationHints.push('Prefer streaming operations over batch processing');
      optimizationHints.push('Use conservative memory allocation');
    }

    // CPU-based optimization hints
    if (this.systemInfo.cpuCores >= 8) {
      optimizationHints.push('Leverage multi-threading for intensive operations');
      optimizationHints.push('Use parallel build processes');
    } else if (this.systemInfo.cpuCores >= 4) {
      optimizationHints.push('Use moderate parallelization');
    } else {
      optimizationHints.push('Prefer sequential processing to avoid context switching');
    }

    // WSL-specific optimizations
    if (this.systemInfo.isWSL) {
      optimizationHints.push('Minimize Windows-WSL boundary crossings');
      optimizationHints.push('Use native Linux tools where possible');
      optimizationHints.push('Cache path translations to improve performance');
      
      if (this.systemInfo.wslDistro?.includes('Ubuntu')) {
        optimizationHints.push('Leverage Ubuntu-specific optimizations');
      }
    }

    const systemResources = `System has ${this.systemInfo.availableRAM}GB available RAM (${this.systemInfo.totalRAM}GB total), ${this.systemInfo.cpuCores} CPU cores. ${this.systemInfo.isWSL ? `WSL environment (${this.systemInfo.wslDistro}).` : 'Native environment.'}`;

    const memoryGuidance = this.generateMemoryGuidance();

    return {
      systemResources,
      optimizationHints,
      memoryGuidance,
      performanceMode
    };
  }

  // Auto-translate Windows paths to WSL paths
  async translatePath(inputPath: string): Promise<WSLPathMapping> {
    // Check cache first
    const cached = this.pathCache.get(inputPath);
    if (cached) {
      return cached;
    }

    const mapping: WSLPathMapping = {
      windowsPath: inputPath,
      wslPath: inputPath,
      isValid: true
    };

    try {
      if (!this.systemInfo?.isWSL) {
        // Not in WSL, return path as-is
        this.pathCache.set(inputPath, mapping);
        return mapping;
      }

      // Handle different Windows path formats
      const normalizedPath = normalize(inputPath);
      
      // Check if it's already a WSL path
      if (normalizedPath.startsWith('/')) {
        mapping.wslPath = normalizedPath;
        this.pathCache.set(inputPath, mapping);
        return mapping;
      }

      // Windows drive letter translation (C:\ -> /mnt/c/)
      const driveMatch = normalizedPath.match(/^([A-Za-z]):[\\\/](.*)$/);
      if (driveMatch) {
        const [, drive, pathPart] = driveMatch;
        const driveLetter = drive.toLowerCase();
        mapping.driveMapping = driveLetter;
        
        // Convert backslashes to forward slashes
        const unixPath = pathPart.replace(/\\/g, '/');
        mapping.wslPath = `/mnt/${driveLetter}/${unixPath}`;
        
        // Verify the path exists in WSL
        mapping.isValid = await this.verifyWSLPath(mapping.wslPath);
      }
      // UNC path handling (\\server\share -> might not be directly translatable)
      else if (normalizedPath.startsWith('\\\\')) {
        console.warn(`[WSL Optimizer] UNC path detected, may not be directly accessible in WSL: ${inputPath}`);
        mapping.wslPath = inputPath; // Keep original
        mapping.isValid = false;
      }
      // Relative paths
      else if (!normalizedPath.includes(':')) {
        // Assume it's a relative path, resolve it relative to current working directory
        const cwd = process.cwd();
        const resolvedPath = resolve(cwd, normalizedPath);
        return await this.translatePath(resolvedPath); // Recursive call with absolute path
      }
      else {
        // Unknown format
        console.warn(`[WSL Optimizer] Unknown path format: ${inputPath}`);
        mapping.isValid = false;
      }

    } catch (error) {
      console.error(`[WSL Optimizer] Error translating path ${inputPath}:`, error);
      mapping.isValid = false;
    }

    this.pathCache.set(inputPath, mapping);
    return mapping;
  }

  // WSL-specific Claude Code integration
  async setupWSLIntegration(): Promise<void> {
    try {
      // Auto-detect WSL distro
      this.wslDistroName = await this.getWSLDistroName();
      
      // Configure optimal working directory
      const optimalWorkingDir = await this.findOptimalWorkingDirectory();
      if (optimalWorkingDir) {
        console.log(`[WSL Optimizer] Optimal working directory: ${optimalWorkingDir}`);
      }

      // Set up path translation service
      console.log('[WSL Optimizer] Path translation service ready');
      
      // Emit WSL ready event
      this.emit('wsl-ready', {
        distro: this.wslDistroName,
        workingDir: optimalWorkingDir
      });

    } catch (error) {
      console.error('[WSL Optimizer] Error setting up WSL integration:', error);
    }
  }

  // Public API methods
  async getOptimizedCommand(command: string, workingDir?: string): Promise<string> {
    if (!this.systemInfo?.isWSL) {
      return command;
    }

    let optimizedCommand = command;

    // Path translation in commands
    const pathMatches = command.match(/[A-Za-z]:[\\\/][^\s]*/g);
    if (pathMatches) {
      for (const path of pathMatches) {
        const mapping = await this.translatePath(path);
        if (mapping.isValid) {
          optimizedCommand = optimizedCommand.replace(path, mapping.wslPath);
        }
      }
    }

    // Working directory optimization
    if (workingDir) {
      const workingDirMapping = await this.translatePath(workingDir);
      if (workingDirMapping.isValid) {
        // Could modify command to include cd to optimal directory
      }
    }

    return optimizedCommand;
  }

  async batchTranslatePaths(paths: string[]): Promise<WSLPathMapping[]> {
    const results: WSLPathMapping[] = [];
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(path => this.translatePath(path))
      );
      results.push(...batchResults);
    }

    return results;
  }

  getSystemInfo(): SystemInfo | undefined {
    return this.systemInfo;
  }

  clearPathCache(): void {
    this.pathCache.clear();
    console.log('[WSL Optimizer] Path cache cleared');
  }

  getPathCacheStats(): { size: number; entries: Array<{ input: string; output: string; valid: boolean }> } {
    const entries = Array.from(this.pathCache.entries()).map(([input, mapping]) => ({
      input,
      output: mapping.wslPath,
      valid: mapping.isValid
    }));

    return {
      size: this.pathCache.size,
      entries
    };
  }

  // Private helper methods
  private async detectWSL(): Promise<boolean> {
    try {
      // Check for WSL-specific environment variables
      if (process.env.WSL_DISTRO_NAME || process.env.WSLENV) {
        return true;
      }

      // Check /proc/version for WSL signature
      if (existsSync('/proc/version')) {
        const version = readFileSync('/proc/version', 'utf-8');
        if (version.toLowerCase().includes('microsoft') || version.toLowerCase().includes('wsl')) {
          return true;
        }
      }

      // Check for Windows interop
      const { stdout } = await execAsync('which cmd.exe 2>/dev/null || echo ""');
      return stdout.trim().length > 0;

    } catch (error) {
      return false;
    }
  }

  private async getWSLDistroName(): Promise<string | undefined> {
    try {
      // First try environment variable
      if (process.env.WSL_DISTRO_NAME) {
        return process.env.WSL_DISTRO_NAME;
      }

      // Try wsl command if available
      const { stdout } = await execAsync('wsl.exe -l -v 2>/dev/null | grep "\\*" || echo ""');
      const match = stdout.match(/\*\s+(\S+)/);
      if (match) {
        return match[1];
      }

      // Fallback: try to detect from system info
      if (existsSync('/etc/os-release')) {
        const osRelease = readFileSync('/etc/os-release', 'utf-8');
        const nameMatch = osRelease.match(/^NAME="([^"]+)"/m);
        if (nameMatch) {
          return nameMatch[1];
        }
      }

      return 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  private async getWindowsVersion(): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync('cmd.exe /c ver 2>/dev/null || echo ""');
      return stdout.trim();
    } catch (error) {
      return undefined;
    }
  }

  private async getLinuxMemoryInfo(): Promise<{ total: number; available: number }> {
    try {
      const { stdout } = await execAsync('free -g');
      const lines = stdout.trim().split('\n');
      const memLine = lines[1];
      const values = memLine.split(/\s+/);
      
      return {
        total: parseInt(values[1]) || 8,
        available: parseInt(values[6]) || 4
      };
    } catch (error) {
      return { total: 8, available: 4 };
    }
  }

  private async getWindowsMemoryInfo(): Promise<{ total: number; available: number }> {
    try {
      const { stdout } = await execAsync('wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value');
      const lines = stdout.split('\n');
      
      let total = 0;
      let available = 0;
      
      for (const line of lines) {
        if (line.includes('TotalVisibleMemorySize=')) {
          total = Math.round(parseInt(line.split('=')[1]) / 1024 / 1024);
        }
        if (line.includes('FreePhysicalMemory=')) {
          available = Math.round(parseInt(line.split('=')[1]) / 1024 / 1024);
        }
      }
      
      return { total: total || 8, available: available || 4 };
    } catch (error) {
      return { total: 8, available: 4 };
    }
  }

  private async getFallbackMemoryInfo(): Promise<{ total: number; available: number }> {
    // Use Node.js built-in methods as fallback
    const totalMem = Math.round(require('os').totalmem() / 1024 / 1024 / 1024);
    const freeMem = Math.round(require('os').freemem() / 1024 / 1024 / 1024);
    
    return {
      total: totalMem,
      available: freeMem
    };
  }

  private async getCPUCoreCount(): Promise<number> {
    try {
      return require('os').cpus().length;
    } catch (error) {
      return 4; // Safe default
    }
  }

  private async verifyWSLPath(wslPath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`test -e "${wslPath}" && echo "exists" || echo "missing"`);
      return stdout.trim() === 'exists';
    } catch (error) {
      return false;
    }
  }

  private async findOptimalWorkingDirectory(): Promise<string | undefined> {
    try {
      // Prefer WSL home directory over Windows mounts for better performance
      const homeDir = process.env.HOME || '/home/ubuntu';
      
      if (await this.verifyWSLPath(homeDir)) {
        return homeDir;
      }

      // Fallback to current directory
      return process.cwd();
    } catch (error) {
      return process.cwd();
    }
  }

  private determinePerformanceMode(): 'standard' | 'turbo' | 'conservative' {
    if (!this.systemInfo) return 'standard';

    if (this.systemInfo.availableRAM >= 16 && this.systemInfo.cpuCores >= 8) {
      return 'turbo';
    } else if (this.systemInfo.availableRAM < 4 || this.systemInfo.cpuCores < 2) {
      return 'conservative';
    }
    
    return 'standard';
  }

  private generateMemoryGuidance(): string {
    if (!this.systemInfo) return 'Standard memory usage recommended.';

    const availableRAM = this.systemInfo.availableRAM;
    
    if (availableRAM >= 16) {
      return 'High memory available - use aggressive caching, parallel processing, and in-memory operations.';
    } else if (availableRAM >= 8) {
      return 'Moderate memory available - balance performance with memory efficiency.';
    } else if (availableRAM >= 4) {
      return 'Limited memory - prefer streaming operations and conservative memory allocation.';
    } else {
      return 'Very limited memory - use minimal memory footprint and sequential processing.';
    }
  }
}