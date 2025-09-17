import { Project, Platform, TeamMember } from '@/types/project';
import { TrelloAPI } from '@/lib/trello';
import { getAPIConfig } from '@/lib/config/api';
import { APIError, sanitizeString } from '@/lib/utils/validation';

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  dateLastActivity: string;
  list: {
    id: string;
    name: string;
  };
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  members: Array<{
    id: string;
    fullName: string;
    username: string;
  }>;
  badges: {
    checkItems: number;
    checkItemsChecked: number;
  };
}

interface WebhookConfig {
  modelType: 'board' | 'list' | 'card';
  events: string[];
  description?: string;
}

interface BatchOperation<T> {
  id: string;
  operation: () => Promise<T>;
  retries: number;
  priority: 'high' | 'medium' | 'low';
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: number;
}

/**
 * Enhanced Trello API with advanced features:
 * - Batch operations for multiple cards
 * - Advanced webhook management
 * - Circuit breaker pattern
 * - Retry with exponential backoff
 * - Performance metrics
 * - Connection pooling simulation
 */
export class EnhancedTrelloAPI extends TrelloAPI {
  private batchQueue: Map<string, BatchOperation<any>> = new Map();
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'closed',
  };
  private metrics: APIMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: 0,
  };
  private activeWebhooks: Map<string, any> = new Map();
  private connectionPool: Set<string> = new Set();

  // Circuit breaker configuration
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  private readonly MAX_BATCH_SIZE = 10;
  private readonly RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

  constructor() {
    super();
    this.initializeConnectionPool();
  }

  /**
   * Initialize connection pool simulation
   */
  private initializeConnectionPool(): void {
    // Simulate connection pool with 5 connections
    for (let i = 0; i < 5; i++) {
      this.connectionPool.add(`conn-${i}`);
    }
  }

  /**
   * Enhanced request method with circuit breaker and metrics
   */
  private async makeEnhancedRequest(
    endpoint: string,
    options: Record<string, any> = {},
    retryCount: number = 0
  ): Promise<any> {
    // Check circuit breaker
    if (this.circuitBreaker.state === 'open') {
      const timeSinceLastFailure =
        Date.now() - this.circuitBreaker.lastFailureTime;

      if (timeSinceLastFailure < this.CIRCUIT_BREAKER_TIMEOUT) {
        throw new APIError(
          'Circuit breaker is open. Service temporarily unavailable.',
          503,
          endpoint
        );
      } else {
        this.circuitBreaker.state = 'half-open';
      }
    }

    const startTime = Date.now();

    this.metrics.totalRequests++;

    try {
      // Use parent's makeRequest method
      const result = await (this as any).makeRequest(endpoint, options);

      // Update metrics on success
      const responseTime = Date.now() - startTime;

      this.updateMetrics(true, responseTime);
      this.resetCircuitBreaker();

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.updateMetrics(false, responseTime);
      this.handleCircuitBreakerFailure();

      // Retry with exponential backoff
      if (retryCount < this.RETRY_DELAYS.length && this.shouldRetry(error)) {
        const delay = this.RETRY_DELAYS[retryCount];

        await this.sleep(delay);

        return this.makeEnhancedRequest(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Update API metrics
   */
  private updateMetrics(success: boolean, responseTime: number): void {
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    const totalSuccessful = this.metrics.successfulRequests;

    if (totalSuccessful > 0) {
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime * (totalSuccessful - 1) +
          responseTime) /
        totalSuccessful;
    }

    this.metrics.lastRequestTime = Date.now();
  }

  /**
   * Handle circuit breaker failure
   */
  private handleCircuitBreakerFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreaker.state = 'open';
      console.warn('Circuit breaker opened due to repeated failures');
    }
  }

  /**
   * Reset circuit breaker on success
   */
  private resetCircuitBreaker(): void {
    if (this.circuitBreaker.state === 'half-open') {
      this.circuitBreaker.state = 'closed';
      this.circuitBreaker.failures = 0;
      console.info('Circuit breaker closed - service recovered');
    }
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: any): boolean {
    if (error instanceof APIError) {
      // Retry on server errors and rate limits, but not on client errors
      return error.statusCode >= 500 || error.statusCode === 429;
    }

    return true; // Retry network errors
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch operation to get multiple cards efficiently
   */
  async getBatchCards(cardIds: string[]): Promise<TrelloCard[]> {
    if (cardIds.length === 0) return [];

    const batches: string[][] = [];

    for (let i = 0; i < cardIds.length; i += this.MAX_BATCH_SIZE) {
      batches.push(cardIds.slice(i, i + this.MAX_BATCH_SIZE));
    }

    const batchPromises = batches.map(async (batch, index) => {
      // Add small delay between batches to respect rate limits
      if (index > 0) {
        await this.sleep(100 * index);
      }

      return Promise.all(
        batch.map(async cardId => {
          try {
            return await this.getCard(cardId);
          } catch (error) {
            console.warn(`Failed to fetch card ${cardId}:`, error);

            return null;
          }
        })
      );
    });

    const results = await Promise.all(batchPromises);

    return results.flat().filter((card): card is TrelloCard => card !== null);
  }

  /**
   * Batch operation to update multiple cards
   */
  async updateBatchCards(
    updates: Array<{ cardId: string; data: Partial<Project> }>
  ): Promise<TrelloCard[]> {
    const batches: (typeof updates)[] = [];

    for (let i = 0; i < updates.length; i += this.MAX_BATCH_SIZE) {
      batches.push(updates.slice(i, i + this.MAX_BATCH_SIZE));
    }

    const results: TrelloCard[] = [];

    for (const [index, batch] of Array.from(batches.entries())) {
      // Add delay between batches
      if (index > 0) {
        await this.sleep(200 * index);
      }

      const batchResults = await Promise.allSettled(
        batch.map(
          ({ cardId, data }: { cardId: string; data: Partial<Project> }) =>
            this.updateCard(cardId, data)
        )
      );

      batchResults.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.warn(
            `Failed to update card ${batch[i].cardId}:`,
            result.reason
          );
        }
      });
    }

    return results;
  }

  /**
   * Advanced webhook management with multiple event types
   */
  async setupAdvancedWebhooks(callbackURL: string): Promise<void> {
    // Validate callback URL
    try {
      new URL(callbackURL);
    } catch {
      throw new APIError('Invalid callback URL', 400, '/webhooks');
    }

    // Clean up existing webhooks first
    await this.cleanupExistingWebhooks();

    const webhookConfigs: WebhookConfig[] = [
      {
        modelType: 'board',
        events: ['createCard', 'updateCard', 'deleteCard', 'moveCard'],
        description: 'inPatch Suporte - Board Events',
      },
      {
        modelType: 'list',
        events: ['updateList', 'createList'],
        description: 'inPatch Suporte - List Events',
      },
      {
        modelType: 'card',
        events: [
          'commentCard',
          'addAttachmentToCard',
          'updateCheckItemStateOnCard',
        ],
        description: 'inPatch Suporte - Card Events',
      },
    ];

    for (const config of webhookConfigs) {
      try {
        const webhook = await this.createSpecificWebhook(callbackURL, config);

        this.activeWebhooks.set(webhook.id, webhook);
        console.info(
          `Created webhook for ${config.modelType} events:`,
          webhook.id
        );
      } catch (error) {
        console.warn(
          `Failed to create webhook for ${config.modelType}:`,
          error
        );
      }
    }
  }

  /**
   * Create specific webhook with configuration
   */
  private async createSpecificWebhook(
    callbackURL: string,
    config: WebhookConfig
  ): Promise<any> {
    const webhookData = {
      description:
        config.description || `inPatch Suporte - ${config.modelType} webhook`,
      callbackURL: sanitizeString(callbackURL),
      idModel: this.getConfig().trello.boardId,
      active: true,
    };

    return this.makeEnhancedRequest('/webhooks', {
      method: 'POST',
      body: JSON.stringify(webhookData),
    });
  }

  /**
   * Clean up existing webhooks to avoid duplicates
   */
  private async cleanupExistingWebhooks(): Promise<void> {
    try {
      const existingWebhooks = await this.getWebhooks();
      const inPatchWebhooks = existingWebhooks.filter(webhook =>
        webhook.description?.includes('inPatch Suporte')
      );

      for (const webhook of inPatchWebhooks) {
        try {
          await this.deleteWebhook(webhook.id);
          console.info(`Cleaned up existing webhook: ${webhook.id}`);
        } catch (error) {
          console.warn(`Failed to cleanup webhook ${webhook.id}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup existing webhooks:', error);
    }
  }

  /**
   * Get optimized board cards with field selection
   */
  async getOptimizedBoardCards(fields?: string[]): Promise<TrelloCard[]> {
    const defaultFields = [
      'id',
      'name',
      'desc',
      'due',
      'dateLastActivity',
      'list',
      'labels',
      'members',
      'badges',
    ];

    const selectedFields = fields || defaultFields;

    let endpoint =
      `/boards/${this.getConfig().trello.boardId}/cards?` +
      `fields=${selectedFields.join(',')}&` +
      'members=true&' +
      'member_fields=fullName,username&' +
      'labels=true&' +
      'list=true&' +
      'badges=true';

    return this.makeEnhancedRequest(endpoint);
  }

  /**
   * Get board cards with intelligent caching
   */
  async getCachedBoardCards(maxAge: number = 30000): Promise<TrelloCard[]> {
    const cacheKey = 'board-cards';
    const cached = this.getFromCache(cacheKey);

    if (cached && Date.now() - cached.timestamp < maxAge) {
      console.info('Returning cached board cards');

      return cached.data;
    }

    const cards = await this.getOptimizedBoardCards();

    this.setCache(cacheKey, cards);

    return cards;
  }

  /**
   * Simple in-memory cache implementation
   */
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  private getFromCache(key: string): { data: any; timestamp: number } | null {
    return this.cache.get(key) || null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });

    // Simple cache cleanup - remove entries older than 5 minutes
    setTimeout(() => {
      const entry = this.cache.get(key);

      if (entry && Date.now() - entry.timestamp > 300000) {
        this.cache.delete(key);
      }
    }, 300000);
  }

  /**
   * Get API performance metrics
   */
  getMetrics(): APIMetrics {
    return { ...this.metrics };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  /**
   * Get active webhooks
   */
  getActiveWebhooks(): Array<{ id: string; description: string }> {
    return Array.from(this.activeWebhooks.entries()).map(([id, webhook]) => ({
      id,
      description: webhook.description || 'Unknown',
    }));
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: APIMetrics;
    circuitBreaker: CircuitBreakerState;
    lastCheck: string;
  }> {
    try {
      const startTime = Date.now();

      await this.makeEnhancedRequest('/members/me', {}, 0);
      const responseTime = Date.now() - startTime;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (this.circuitBreaker.state === 'open') {
        status = 'unhealthy';
      } else if (
        responseTime > 5000 ||
        this.metrics.failedRequests > this.metrics.successfulRequests * 0.1
      ) {
        status = 'degraded';
      }

      return {
        status,
        metrics: this.getMetrics(),
        circuitBreaker: this.getCircuitBreakerStatus(),
        lastCheck: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'unhealthy',
        metrics: this.getMetrics(),
        circuitBreaker: this.getCircuitBreakerStatus(),
        lastCheck: new Date().toISOString(),
      };
    }
  }

  /**
   * Reset metrics (useful for testing or periodic cleanup)
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: 0,
    };
  }

  /**
   * Get configuration (protected method access)
   */
  private getConfig() {
    return getAPIConfig();
  }

  /**
   * Enhanced card transformation with better error handling
   */
  transformCardsToProjectsEnhanced(cards: TrelloCard[]): Project[] {
    const validCards = cards.filter(card => {
      try {
        // More robust validation
        if (!card?.id || !card?.name) return false;
        if (typeof card.name !== 'string' || card.name.trim() === '')
          return false;

        const name = card.name.toLowerCase();

        if (
          name.includes('template') ||
          name.includes('exemplo') ||
          name.includes('test')
        ) {
          return false;
        }

        return true;
      } catch (error) {
        console.warn('Error validating card:', card?.id, error);

        return false;
      }
    });

    return validCards.map(card => {
      try {
        return this.transformCardsToProjects([card])[0];
      } catch (error) {
        console.warn('Error transforming card:', card.id, error);

        // Return a minimal valid project as fallback
        return {
          id: card.id,
          title: sanitizeString(card.name || 'Untitled'),
          description: '',
          progress: 0,
          platforms: ['Backoffice'] as Platform[],
          responsible: ['Guilherme Souza'] as TeamMember[],
          startDate: new Date().toISOString(),
          estimatedEndDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: 'a-fazer' as const,
          priority: 'medium' as const,
          trelloCardId: card.id,
          labels: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    });
  }
}

// Export enhanced instance
export const enhancedTrelloApi = new EnhancedTrelloAPI();
