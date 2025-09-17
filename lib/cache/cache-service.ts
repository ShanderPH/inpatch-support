import { Project } from '@/types/project';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  enableStats: boolean;
}

/**
 * Intelligent cache service with TTL, LRU eviction, and automatic cleanup
 * Optimized for Trello API responses and project data
 */
export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    cleanups: 0,
  };

  private config: CacheConfig = {
    maxSize: 1000,
    defaultTTL: 300000, // 5 minutes
    cleanupInterval: 60000, // 1 minute
    enableStats: true,
  };

  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...this.config, ...config };
    this.startCleanupTimer();
  }

  /**
   * Get cached projects with intelligent freshness check
   */
  async getCachedProjects(maxAge?: number): Promise<Project[] | null> {
    const key = 'trello-projects';
    const ttl = maxAge || this.config.defaultTTL;

    return this.get<Project[]>(key, ttl);
  }

  /**
   * Set cached projects with metadata
   */
  async setCachedProjects(projects: Project[], ttl?: number): Promise<void> {
    const key = 'trello-projects';
    const cacheTime = ttl || this.config.defaultTTL;

    this.set(key, projects, cacheTime);

    // Also cache individual projects for quick lookup
    projects.forEach(project => {
      if (project.id) {
        this.set(`project-${project.id}`, project, cacheTime);
      }
      if (project.trelloCardId) {
        this.set(`trello-card-${project.trelloCardId}`, project, cacheTime);
      }
    });
  }

  /**
   * Get cached project by ID
   */
  async getCachedProject(projectId: string): Promise<Project | null> {
    return this.get<Project>(`project-${projectId}`);
  }

  /**
   * Get cached project by Trello card ID
   */
  async getCachedProjectByTrelloId(
    trelloCardId: string
  ): Promise<Project | null> {
    return this.get<Project>(`trello-card-${trelloCardId}`);
  }

  /**
   * Cache Trello board lists
   */
  async setCachedBoardLists(lists: any[], ttl?: number): Promise<void> {
    const cacheTime = ttl || this.config.defaultTTL;

    this.set('trello-board-lists', lists, cacheTime);
  }

  /**
   * Get cached board lists
   */
  async getCachedBoardLists(): Promise<any[] | null> {
    return this.get<any[]>('trello-board-lists');
  }

  /**
   * Cache board actions for change detection
   */
  async setCachedBoardActions(actions: any[], ttl?: number): Promise<void> {
    const cacheTime = ttl || this.config.defaultTTL / 2; // Shorter TTL for actions

    this.set('trello-board-actions', actions, cacheTime);
  }

  /**
   * Get cached board actions
   */
  async getCachedBoardActions(): Promise<any[] | null> {
    return this.get<any[]>('trello-board-actions');
  }

  /**
   * Generic get method with TTL check
   */
  private get<T>(key: string, maxAge?: number): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;

      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    const ttl = maxAge || entry.ttl;

    if (age > ttl) {
      this.cache.delete(key);
      this.stats.misses++;

      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = now;
    this.stats.hits++;

    return entry.data as T;
  }

  /**
   * Generic set method with TTL and size management
   */
  private set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const cacheTime = ttl || this.config.defaultTTL;

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: cacheTime,
      hits: 0,
      lastAccessed: now,
    };

    this.cache.set(key, entry);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Invalidate specific cache entries
   */
  async invalidateProjects(): Promise<void> {
    const keysToDelete: string[] = [];

    for (const key of Array.from(this.cache.keys())) {
      if (
        key.startsWith('trello-projects') ||
        key.startsWith('project-') ||
        key.startsWith('trello-card-')
      ) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate all cache entries
   */
  async invalidateAll(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Invalidate entries by pattern
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    const keysToDelete: string[] = [];
    const regex = new RegExp(pattern);

    for (const key of Array.from(this.cache.keys())) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Smart invalidation based on Trello webhook events
   */
  async invalidateByWebhookEvent(event: any): Promise<void> {
    const { action, data } = event;

    switch (action?.type) {
      case 'createCard':
      case 'updateCard':
      case 'deleteCard':
        // Invalidate projects cache and specific card cache
        await this.invalidateProjects();
        if (data?.card?.id) {
          this.cache.delete(`trello-card-${data.card.id}`);
        }
        break;

      case 'moveCard':
        // Invalidate projects cache as status might have changed
        await this.invalidateProjects();
        break;

      case 'updateList':
      case 'createList':
        // Invalidate board lists cache
        this.cache.delete('trello-board-lists');
        break;

      case 'commentCard':
      case 'addAttachmentToCard':
        // These don't affect our project data, so no invalidation needed
        break;

      default:
        // For unknown events, invalidate projects to be safe
        await this.invalidateProjects();
    }
  }

  /**
   * Preload cache with fresh data
   */
  async preloadCache(
    projects: Project[],
    lists?: any[],
    actions?: any[]
  ): Promise<void> {
    await this.setCachedProjects(projects);

    if (lists) {
      await this.setCachedBoardLists(lists);
    }

    if (actions) {
      await this.setCachedBoardActions(actions);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    const totalHits = this.stats.hits;
    const totalMisses = this.stats.misses;
    const totalRequests = totalHits + totalMisses;

    return {
      totalEntries: this.cache.size,
      totalHits,
      totalMisses,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry:
        entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : now,
      newestEntry:
        entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : now,
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private estimateMemoryUsage(): number {
    let size = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      // Rough estimation: key size + JSON string size of data
      size += key.length * 2; // UTF-16 characters
      size += JSON.stringify(entry.data).length * 2;
      size += 64; // Overhead for entry metadata
    }

    return size;
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      const age = now - entry.timestamp;

      if (age > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      this.stats.cleanups++;
    }
  }

  /**
   * Stop cleanup timer and clear cache
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }

  /**
   * Check if cache is healthy
   */
  isHealthy(): boolean {
    const stats = this.getStats();

    // Consider cache healthy if:
    // - Hit rate is above 50% (if we have enough requests)
    // - Memory usage is reasonable
    // - Not too many entries
    const totalRequests = stats.totalHits + stats.totalMisses;

    if (totalRequests < 10) return true; // Not enough data to judge

    return (
      stats.hitRate > 50 &&
      stats.memoryUsage < 50 * 1024 * 1024 && // 50MB
      stats.totalEntries < this.config.maxSize * 0.9
    );
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart cleanup timer if interval changed
    if (newConfig.cleanupInterval && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.startCleanupTimer();
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService({
  maxSize: 500,
  defaultTTL: 300000, // 5 minutes
  cleanupInterval: 60000, // 1 minute
  enableStats: true,
});
