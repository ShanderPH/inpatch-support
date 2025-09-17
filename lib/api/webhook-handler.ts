import { Project } from '@/types/project';
import { cacheService } from '@/lib/cache/cache-service';
import { enhancedTrelloApi } from '@/lib/api/trello-enhanced';

interface WebhookEvent {
  action: {
    id: string;
    type: string;
    date: string;
    memberCreator: {
      id: string;
      fullName: string;
      username: string;
    };
  };
  model: {
    id: string;
    name: string;
  };
  data: {
    board?: {
      id: string;
      name: string;
    };
    list?: {
      id: string;
      name: string;
    };
    card?: {
      id: string;
      name: string;
      desc?: string;
      due?: string;
      closed?: boolean;
    };
    old?: {
      name?: string;
      desc?: string;
      due?: string;
      pos?: number;
      closed?: boolean;
    };
  };
}

interface WebhookProcessingResult {
  success: boolean;
  action: string;
  cardId?: string;
  projectsUpdated: number;
  cacheInvalidated: boolean;
  error?: string;
  processingTime: number;
}

interface WebhookStats {
  totalProcessed: number;
  successfulProcessed: number;
  failedProcessed: number;
  averageProcessingTime: number;
  eventTypes: Record<string, number>;
  lastProcessed: string;
}

/**
 * Advanced webhook handler for Trello events with intelligent processing
 * and real-time synchronization
 */
export class WebhookHandler {
  private stats: WebhookStats = {
    totalProcessed: 0,
    successfulProcessed: 0,
    failedProcessed: 0,
    averageProcessingTime: 0,
    eventTypes: {},
    lastProcessed: new Date().toISOString(),
  };

  private processingQueue: Map<string, WebhookEvent> = new Map();
  private isProcessing = false;
  private subscribers: Set<(projects: Project[]) => void> = new Set();

  /**
   * Process incoming webhook event
   */
  async processWebhookEvent(
    event: WebhookEvent
  ): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    const eventType = event.action?.type || 'unknown';

    // Update stats
    this.stats.totalProcessed++;
    this.stats.eventTypes[eventType] =
      (this.stats.eventTypes[eventType] || 0) + 1;
    this.stats.lastProcessed = new Date().toISOString();

    try {
      // Validate event
      if (!this.isValidEvent(event)) {
        throw new Error('Invalid webhook event structure');
      }

      // Add to processing queue to handle bursts
      const eventId = `${event.action.id}-${Date.now()}`;

      this.processingQueue.set(eventId, event);

      // Process the event
      const result = await this.handleEventByType(event);

      // Remove from queue
      this.processingQueue.delete(eventId);

      // Update success stats
      this.stats.successfulProcessed++;
      const processingTime = Date.now() - startTime;

      this.updateAverageProcessingTime(processingTime);

      return {
        success: true,
        action: eventType,
        cardId: event.data.card?.id,
        projectsUpdated: result.projectsUpdated,
        cacheInvalidated: result.cacheInvalidated,
        processingTime,
      };
    } catch (error) {
      this.stats.failedProcessed++;
      const processingTime = Date.now() - startTime;

      this.updateAverageProcessingTime(processingTime);

      console.error('Webhook processing error:', error);

      return {
        success: false,
        action: eventType,
        cardId: event.data.card?.id,
        projectsUpdated: 0,
        cacheInvalidated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Handle event based on its type
   */
  private async handleEventByType(event: WebhookEvent): Promise<{
    projectsUpdated: number;
    cacheInvalidated: boolean;
  }> {
    const eventType = event.action.type;

    switch (eventType) {
      case 'createCard':
        return this.handleCardCreated(event);

      case 'updateCard':
        return this.handleCardUpdated(event);

      case 'deleteCard':
        return this.handleCardDeleted(event);

      case 'moveCard':
        return this.handleCardMoved(event);

      case 'commentCard':
        return this.handleCardCommented(event);

      case 'addAttachmentToCard':
        return this.handleAttachmentAdded(event);

      case 'updateCheckItemStateOnCard':
        return this.handleChecklistUpdated(event);

      case 'updateList':
        return this.handleListUpdated(event);

      case 'createList':
        return this.handleListCreated(event);

      default:
        console.info(`Unhandled webhook event type: ${eventType}`);

        return { projectsUpdated: 0, cacheInvalidated: false };
    }
  }

  /**
   * Handle card creation
   */
  private async handleCardCreated(event: WebhookEvent): Promise<{
    projectsUpdated: number;
    cacheInvalidated: boolean;
  }> {
    const cardId = event.data.card?.id;

    if (!cardId) return { projectsUpdated: 0, cacheInvalidated: false };

    try {
      // Fetch the new card details
      const card = await enhancedTrelloApi.getCard(cardId);
      const projects = enhancedTrelloApi.transformCardsToProjectsEnhanced([
        card,
      ]);

      if (projects.length > 0) {
        // Invalidate cache to force refresh
        await cacheService.invalidateProjects();

        // Notify subscribers
        await this.notifySubscribers();

        return { projectsUpdated: 1, cacheInvalidated: true };
      }
    } catch (error) {
      console.warn('Failed to process card creation:', error);
    }

    return { projectsUpdated: 0, cacheInvalidated: false };
  }

  /**
   * Handle card updates
   */
  private async handleCardUpdated(event: WebhookEvent): Promise<{
    projectsUpdated: number;
    cacheInvalidated: boolean;
  }> {
    const cardId = event.data.card?.id;

    if (!cardId) return { projectsUpdated: 0, cacheInvalidated: false };

    try {
      // Check what changed
      const changes = this.detectCardChanges(event);

      if (changes.length === 0) {
        return { projectsUpdated: 0, cacheInvalidated: false };
      }

      // Fetch updated card details
      const card = await enhancedTrelloApi.getCard(cardId);
      const projects = enhancedTrelloApi.transformCardsToProjectsEnhanced([
        card,
      ]);

      if (projects.length > 0) {
        // Invalidate specific cache entries
        await cacheService.invalidateByWebhookEvent(event);

        // Notify subscribers with change details
        await this.notifySubscribers(changes);

        return { projectsUpdated: 1, cacheInvalidated: true };
      }
    } catch (error) {
      console.warn('Failed to process card update:', error);
    }

    return { projectsUpdated: 0, cacheInvalidated: false };
  }

  /**
   * Handle card deletion
   */
  private async handleCardDeleted(event: WebhookEvent): Promise<{
    projectsUpdated: number;
    cacheInvalidated: boolean;
  }> {
    const cardId = event.data.card?.id;

    if (!cardId) return { projectsUpdated: 0, cacheInvalidated: false };

    // Invalidate cache entries for deleted card
    await cacheService.invalidateByPattern(`.*${cardId}.*`);
    await cacheService.invalidateProjects();

    // Notify subscribers
    await this.notifySubscribers(['card_deleted']);

    return { projectsUpdated: 0, cacheInvalidated: true };
  }

  /**
   * Handle card moved between lists
   */
  private async handleCardMoved(event: WebhookEvent): Promise<{
    projectsUpdated: number;
    cacheInvalidated: boolean;
  }> {
    const cardId = event.data.card?.id;

    if (!cardId) return { projectsUpdated: 0, cacheInvalidated: false };

    try {
      // Fetch updated card to get new list/status
      const card = await enhancedTrelloApi.getCard(cardId);
      const projects = enhancedTrelloApi.transformCardsToProjectsEnhanced([
        card,
      ]);

      if (projects.length > 0) {
        // Invalidate cache as status likely changed
        await cacheService.invalidateProjects();

        // Notify subscribers about status change
        await this.notifySubscribers(['status_changed']);

        return { projectsUpdated: 1, cacheInvalidated: true };
      }
    } catch (error) {
      console.warn('Failed to process card move:', error);
    }

    return { projectsUpdated: 0, cacheInvalidated: false };
  }

  /**
   * Handle card comments (low priority)
   */
  private async handleCardCommented(event: WebhookEvent): Promise<{
    projectsUpdated: number;
    cacheInvalidated: boolean;
  }> {
    // Comments don't affect our project data, so minimal processing
    console.info('Card comment received:', event.data.card?.id);

    return { projectsUpdated: 0, cacheInvalidated: false };
  }

  /**
   * Handle attachment added (low priority)
   */
  private async handleAttachmentAdded(event: WebhookEvent): Promise<{
    projectsUpdated: number;
    cacheInvalidated: boolean;
  }> {
    // Attachments don't affect our project data, so minimal processing
    console.info('Card attachment added:', event.data.card?.id);

    return { projectsUpdated: 0, cacheInvalidated: false };
  }

  /**
   * Handle checklist item updates (affects progress)
   */
  private async handleChecklistUpdated(event: WebhookEvent): Promise<{
    projectsUpdated: number;
    cacheInvalidated: boolean;
  }> {
    const cardId = event.data.card?.id;

    if (!cardId) return { projectsUpdated: 0, cacheInvalidated: false };

    try {
      // Fetch updated card to recalculate progress
      const card = await enhancedTrelloApi.getCard(cardId);
      const projects = enhancedTrelloApi.transformCardsToProjectsEnhanced([
        card,
      ]);

      if (projects.length > 0) {
        // Invalidate cache as progress changed
        await cacheService.invalidateByPattern(`.*${cardId}.*`);

        // Notify subscribers about progress change
        await this.notifySubscribers(['progress_changed']);

        return { projectsUpdated: 1, cacheInvalidated: true };
      }
    } catch (error) {
      console.warn('Failed to process checklist update:', error);
    }

    return { projectsUpdated: 0, cacheInvalidated: false };
  }

  /**
   * Handle list updates
   */
  private async handleListUpdated(event: WebhookEvent): Promise<{
    projectsUpdated: number;
    cacheInvalidated: boolean;
  }> {
    // List changes might affect status mapping
    await cacheService.invalidateByPattern('trello-board-lists');

    // Might need to refresh all projects if list names changed
    await cacheService.invalidateProjects();

    await this.notifySubscribers(['list_updated']);

    return { projectsUpdated: 0, cacheInvalidated: true };
  }

  /**
   * Handle list creation
   */
  private async handleListCreated(event: WebhookEvent): Promise<{
    projectsUpdated: number;
    cacheInvalidated: boolean;
  }> {
    // New list created, invalidate lists cache
    await cacheService.invalidateByPattern('trello-board-lists');

    await this.notifySubscribers(['list_created']);

    return { projectsUpdated: 0, cacheInvalidated: true };
  }

  /**
   * Detect what changed in a card update
   */
  private detectCardChanges(event: WebhookEvent): string[] {
    const changes: string[] = [];
    const old = event.data.old;
    const current = event.data.card;

    if (!old || !current) return changes;

    if (old.name !== current.name) changes.push('title_changed');
    if (old.desc !== current.desc) changes.push('description_changed');
    if (old.due !== current.due) changes.push('due_date_changed');
    if (old.closed !== current.closed) changes.push('archived_changed');
    if (old.pos !== undefined) changes.push('position_changed');

    return changes;
  }

  /**
   * Validate webhook event structure
   */
  private isValidEvent(event: WebhookEvent): boolean {
    return !!(
      event &&
      event.action &&
      event.action.type &&
      event.action.id &&
      event.data
    );
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(newTime: number): void {
    const totalProcessed =
      this.stats.successfulProcessed + this.stats.failedProcessed;

    if (totalProcessed === 1) {
      this.stats.averageProcessingTime = newTime;
    } else {
      this.stats.averageProcessingTime =
        (this.stats.averageProcessingTime * (totalProcessed - 1) + newTime) /
        totalProcessed;
    }
  }

  /**
   * Subscribe to webhook events
   */
  subscribe(callback: (projects: Project[]) => void): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers
   */
  private async notifySubscribers(changes?: string[]): Promise<void> {
    if (this.subscribers.size === 0) return;

    try {
      // Fetch fresh projects data
      const cards = await enhancedTrelloApi.getCachedBoardCards(10000); // 10 second cache
      const projects =
        enhancedTrelloApi.transformCardsToProjectsEnhanced(cards);

      // Notify all subscribers
      for (const callback of Array.from(this.subscribers)) {
        try {
          callback(projects);
        } catch (error) {
          console.warn('Error notifying webhook subscriber:', error);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch projects for webhook notification:', error);
    }
  }

  /**
   * Process queued events (for handling bursts)
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.size === 0) return;

    this.isProcessing = true;

    try {
      const events = Array.from(this.processingQueue.values());
      const batchSize = 5;

      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map(event => this.processWebhookEvent(event))
        );

        // Small delay between batches
        if (i + batchSize < events.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get webhook processing statistics
   */
  getStats(): WebhookStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      successfulProcessed: 0,
      failedProcessed: 0,
      averageProcessingTime: 0,
      eventTypes: {},
      lastProcessed: new Date().toISOString(),
    };
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    queueSize: number;
    successRate: number;
    averageProcessingTime: number;
    lastProcessed: string;
  } {
    const successRate =
      this.stats.totalProcessed > 0
        ? (this.stats.successfulProcessed / this.stats.totalProcessed) * 100
        : 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (successRate < 50 || this.processingQueue.size > 50) {
      status = 'unhealthy';
    } else if (
      successRate < 80 ||
      this.processingQueue.size > 20 ||
      this.stats.averageProcessingTime > 5000
    ) {
      status = 'degraded';
    }

    return {
      status,
      queueSize: this.processingQueue.size,
      successRate,
      averageProcessingTime: this.stats.averageProcessingTime,
      lastProcessed: this.stats.lastProcessed,
    };
  }
}

// Export singleton instance
export const webhookHandler = new WebhookHandler();
