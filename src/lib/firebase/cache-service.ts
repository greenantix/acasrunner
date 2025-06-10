interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTtl: number = 300000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.clearExpired();
    }, 60000); // Clean up every minute
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    };

    this.cache.set(key, entry);
  }

  async invalidate(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  private clearExpired(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      totalEntries: this.cache.size,
      activeEntries: active,
      expiredEntries: expired,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in bytes
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // UTF-16 encoding
      size += JSON.stringify(entry.data).length * 2;
      size += 24; // Overhead for timestamp, ttl, and map entry
    }
    return size;
  }

  // Cached Firebase operations
  async getCachedUserProfile(uid: string) {
    const cacheKey = `user_profile:${uid}`;
    const cached = await this.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Import here to avoid circular dependency
    const { firebaseAdmin } = await import('./admin');
    const profile = await firebaseAdmin.getUserProfile(uid);
    
    if (profile) {
      await this.set(cacheKey, profile, 600000); // Cache for 10 minutes
    }
    
    return profile;
  }

  async getCachedProject(projectId: string, userUid: string) {
    const cacheKey = `project:${projectId}:${userUid}`;
    const cached = await this.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const { firebaseAdmin } = await import('./admin');
    const db = firebaseAdmin.getFirestore();
    
    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (projectDoc.exists) {
      const projectData = projectDoc.data();
      
      // Check access
      if (
        projectData?.ownerUid === userUid ||
        projectData?.collaborators?.[userUid]
      ) {
        const project = { id: projectDoc.id, ...projectData };
        await this.set(cacheKey, project, 300000); // Cache for 5 minutes
        return project;
      }
    }
    
    return null;
  }

  async getCachedUserProjects(uid: string) {
    const cacheKey = `user_projects:${uid}`;
    const cached = await this.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const { firebaseAdmin } = await import('./admin');
    const projects = await firebaseAdmin.getUserProjects(uid);
    
    if (projects) {
      await this.set(cacheKey, projects, 180000); // Cache for 3 minutes
    }
    
    return projects;
  }

  async invalidateUserCache(uid: string) {
    await this.invalidatePattern(`user_*:${uid}*`);
  }

  async invalidateProjectCache(projectId: string) {
    await this.invalidatePattern(`project:${projectId}*`);
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

export const cacheService = CacheService.getInstance();

// Cleanup on process exit
process.on('SIGINT', () => {
  cacheService.destroy();
});

process.on('SIGTERM', () => {
  cacheService.destroy();
});
