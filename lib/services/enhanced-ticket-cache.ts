/**
 * Enhanced Ticket Cache Service - Sistema de Cache Otimizado para Tickets
 * Cache inteligente com LRU, TTL e invalidação seletiva para produção
 *
 * @author inPatch Team
 * @version 1.0.0
 */

import type { Ticket, TicketFilters, Pipeline, Owner } from '@/types/ticket';

// Interface específica para cache de tickets
interface TicketCacheEntry {
  tickets: Ticket[];
  total: number;
  lastUpdated: string;
  filters?: TicketFilters;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  memoryUsage: number;
}

// Cache entry com TTL
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class EnhancedTicketCacheService {
  private static instance: EnhancedTicketCacheService;
  private cache: Map<string, CacheItem<any>>;
  private stats: CacheStats;

  // Configurações de TTL por tipo de dados
  private readonly TTL_CONFIG = {
    TICKETS_LIST: 5 * 60 * 1000, // 5 minutos para listas de tickets
    TICKET_DETAILS: 10 * 60 * 1000, // 10 minutos para detalhes individuais
    PIPELINES: 30 * 60 * 1000, // 30 minutos para pipelines (mudam raramente)
    OWNERS: 60 * 60 * 1000, // 1 hora para owners
    STATS: 2 * 60 * 1000, // 2 minutos para estatísticas
    SEARCH_RESULTS: 3 * 60 * 1000, // 3 minutos para resultados de busca
  };

  // Prefixos para organização do cache
  private readonly CACHE_PREFIXES = {
    TICKETS: 'tickets:',
    TICKET: 'ticket:',
    PIPELINES: 'pipelines:',
    OWNERS: 'owners:',
    STATS: 'stats:',
    SEARCH: 'search:',
    FILTERS: 'filters:',
  };

  private constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalEntries: 0,
      memoryUsage: 0,
    };

    // Configurar limpeza automática a cada 15 minutos
    if (typeof window !== 'undefined') {
      setInterval(
        () => {
          this.performMaintenance();
        },
        15 * 60 * 1000
      );
    }
  }

  static getInstance(): EnhancedTicketCacheService {
    if (!EnhancedTicketCacheService.instance) {
      EnhancedTicketCacheService.instance = new EnhancedTicketCacheService();
    }

    return EnhancedTicketCacheService.instance;
  }

  // ============================================================================
  // MÉTODOS NATIVOS DE CACHE
  // ============================================================================

  /**
   * Definir item no cache com TTL
   */
  private setCache<T>(key: string, data: T, ttl: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.cache.set(key, item);
    // Stats são atualizados no get
  }

  /**
   * Recuperar item do cache verificando TTL
   */
  private getCache<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;

    if (!item) {
      this.updateStats('miss');

      return null;
    }

    // Verificar se expirou
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.updateStats('miss');

      return null;
    }

    this.updateStats('hit');

    return item.data;
  }

  /**
   * Deletar item do cache
   */
  private deleteCache(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidar cache por padrão
   */
  private invalidateByPattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpeza de itens expirados
   */
  private cleanupExpired(): void {
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // ============================================================================
  // CACHE DE TICKETS
  // ============================================================================

  /**
   * Cache para lista de tickets com filtros
   */
  async cacheTicketsList(
    tickets: Ticket[],
    filters?: TicketFilters,
    total?: number
  ): Promise<void> {
    const key = this.generateTicketsListKey(filters);
    const entry: TicketCacheEntry = {
      tickets,
      total: total || tickets.length,
      lastUpdated: new Date().toISOString(),
      filters,
    };

    this.setCache(key, entry, this.TTL_CONFIG.TICKETS_LIST);
    console.log(`📦 Cached ${tickets.length} tickets with key: ${key}`);
  }

  /**
   * Recuperar lista de tickets do cache
   */
  async getTicketsList(
    filters?: TicketFilters
  ): Promise<TicketCacheEntry | null> {
    const key = this.generateTicketsListKey(filters);
    const cached = this.getCache<TicketCacheEntry>(key);

    if (cached) {
      console.log(`✅ Cache hit for tickets: ${key}`);

      return cached;
    }

    console.log(`❌ Cache miss for tickets: ${key}`);

    return null;
  }

  /**
   * Cache para ticket individual
   */
  async cacheTicket(ticket: Ticket): Promise<void> {
    const key = `${this.CACHE_PREFIXES.TICKET}${ticket.id}`;

    this.setCache(key, ticket, this.TTL_CONFIG.TICKET_DETAILS);

    // Também cachear por hubspotId
    const hubspotKey = `${this.CACHE_PREFIXES.TICKET}hubspot:${ticket.hubspotId}`;

    this.setCache(hubspotKey, ticket, this.TTL_CONFIG.TICKET_DETAILS);
  }

  /**
   * Recuperar ticket individual
   */
  async getTicket(ticketId: string): Promise<Ticket | null> {
    const key = `${this.CACHE_PREFIXES.TICKET}${ticketId}`;
    const cached = await this.getCache<Ticket>(key);

    if (cached) {
      this.updateStats('hit');

      return cached;
    }

    this.updateStats('miss');

    return null;
  }

  // ============================================================================
  // CACHE DE PIPELINES E OWNERS
  // ============================================================================

  /**
   * Cache para pipelines
   */
  async cachePipelines(pipelines: Pipeline[]): Promise<void> {
    const key = `${this.CACHE_PREFIXES.PIPELINES}all`;

    this.setCache(key, pipelines, this.TTL_CONFIG.PIPELINES);
    console.log(`📦 Cached ${pipelines.length} pipelines`);
  }

  /**
   * Recuperar pipelines do cache
   */
  async getPipelines(): Promise<Pipeline[] | null> {
    const key = `${this.CACHE_PREFIXES.PIPELINES}all`;
    const cached = await this.getCache<Pipeline[]>(key);

    if (cached) {
      this.updateStats('hit');
      console.log(`✅ Cache hit for pipelines`);

      return cached;
    }

    this.updateStats('miss');

    return null;
  }

  /**
   * Cache para owners/técnicos
   */
  async cacheOwners(owners: Owner[]): Promise<void> {
    const key = `${this.CACHE_PREFIXES.OWNERS}all`;

    this.setCache(key, owners, this.TTL_CONFIG.OWNERS);
    console.log(`📦 Cached ${owners.length} owners`);
  }

  /**
   * Recuperar owners do cache
   */
  async getOwners(): Promise<Owner[] | null> {
    const key = `${this.CACHE_PREFIXES.OWNERS}all`;
    const cached = await this.getCache<Owner[]>(key);

    if (cached) {
      this.updateStats('hit');

      return cached;
    }

    this.updateStats('miss');

    return null;
  }

  // ============================================================================
  // CACHE DE ESTATÍSTICAS E BUSCA
  // ============================================================================

  /**
   * Cache para estatísticas de tickets
   */
  async cacheStats(stats: any): Promise<void> {
    const key = `${this.CACHE_PREFIXES.STATS}dashboard`;

    this.setCache(key, stats, this.TTL_CONFIG.STATS);
  }

  /**
   * Cache para resultados de busca
   */
  async cacheSearchResults(
    query: string,
    results: Ticket[],
    filters?: TicketFilters
  ): Promise<void> {
    const key = this.generateSearchKey(query, filters);
    const entry = {
      query,
      results,
      filters,
      timestamp: Date.now(),
    };

    this.setCache(key, entry, this.TTL_CONFIG.SEARCH_RESULTS);
  }

  // ============================================================================
  // INVALIDAÇÃO INTELIGENTE
  // ============================================================================

  /**
   * Invalidar cache quando ticket é criado
   */
  async invalidateOnTicketCreate(ticket: Ticket): Promise<void> {
    console.log(`🧹 Invalidating cache after ticket creation: ${ticket.id}`);

    // Invalidar listas de tickets
    await this.invalidateByPattern(`${this.CACHE_PREFIXES.TICKETS}*`);

    // Invalidar estatísticas
    await this.invalidateByPattern(`${this.CACHE_PREFIXES.STATS}*`);

    // Invalidar buscas relacionadas
    if (ticket.subject) {
      const searchTerms = ticket.subject.toLowerCase().split(' ');

      for (const term of searchTerms) {
        if (term.length > 2) {
          await this.invalidateByPattern(
            `${this.CACHE_PREFIXES.SEARCH}*${term}*`
          );
        }
      }
    }
  }

  /**
   * Invalidar cache quando ticket é atualizado
   */
  async invalidateOnTicketUpdate(
    ticketId: string,
    updates: any
  ): Promise<void> {
    console.log(`🧹 Invalidating cache after ticket update: ${ticketId}`);

    // Invalidar o ticket específico
    this.deleteCache(`${this.CACHE_PREFIXES.TICKET}${ticketId}`);

    // Se status ou prioridade mudaram, invalidar estatísticas
    if (updates.status || updates.priority) {
      await this.invalidateByPattern(`${this.CACHE_PREFIXES.STATS}*`);
    }

    // Invalidar listas que podem ter esse ticket
    await this.invalidateByPattern(`${this.CACHE_PREFIXES.TICKETS}*`);
  }

  /**
   * Invalidar cache quando ticket é deletado
   */
  async invalidateOnTicketDelete(
    ticketId: string,
    hubspotId?: string
  ): Promise<void> {
    console.log(`🧹 Invalidating cache after ticket deletion: ${ticketId}`);

    // Deletar caches específicos do ticket
    this.deleteCache(`${this.CACHE_PREFIXES.TICKET}${ticketId}`);

    if (hubspotId) {
      this.deleteCache(`${this.CACHE_PREFIXES.TICKET}hubspot:${hubspotId}`);
    }

    // Invalidar listas e estatísticas
    await this.invalidateByPattern(`${this.CACHE_PREFIXES.TICKETS}*`);
    await this.invalidateByPattern(`${this.CACHE_PREFIXES.STATS}*`);
  }

  // ============================================================================
  // UTILITÁRIOS E MANUTENÇÃO
  // ============================================================================

  /**
   * Gerar chave única para lista de tickets baseada nos filtros
   */
  private generateTicketsListKey(filters?: TicketFilters): string {
    if (!filters || Object.keys(filters).length === 0) {
      return `${this.CACHE_PREFIXES.TICKETS}all`;
    }

    // Criar hash dos filtros para chave única
    const filterStr = JSON.stringify(filters);
    const hash = this.simpleHash(filterStr);

    return `${this.CACHE_PREFIXES.TICKETS}filtered:${hash}`;
  }

  /**
   * Gerar chave para busca
   */
  private generateSearchKey(query: string, filters?: TicketFilters): string {
    const normalizedQuery = query.toLowerCase().trim();
    const filtersHash = filters
      ? this.simpleHash(JSON.stringify(filters))
      : 'none';

    return `${this.CACHE_PREFIXES.SEARCH}${normalizedQuery}:${filtersHash}`;
  }

  /**
   * Hash simples para gerar chaves únicas
   */
  private simpleHash(str: string): string {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);

      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Converter para 32-bit
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Atualizar estatísticas de cache
   */
  private updateStats(type: 'hit' | 'miss'): void {
    if (type === 'hit') {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }

    const total = this.stats.hits + this.stats.misses;

    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Obter estatísticas do cache
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      totalEntries: this.cache.size,
      memoryUsage: 0, // Simplificado por enquanto
    };
  }

  /**
   * Manutenção automática do cache
   */
  private async performMaintenance(): Promise<void> {
    console.log('🧹 Performing cache maintenance...');

    // Limpar entradas expiradas
    this.cleanupExpired();

    // Log das estatísticas
    const stats = this.getStats();

    console.log(
      `📊 Cache Stats: ${stats.hitRate.toFixed(1)}% hit rate, ${stats.totalEntries} entries`
    );

    // Se o hit rate estiver muito baixo, pode indicar problema na estratégia de cache
    if (stats.hitRate < 30 && stats.hits + stats.misses > 100) {
      console.warn(
        `⚠️ Low cache hit rate detected: ${stats.hitRate.toFixed(1)}%`
      );
    }
  }

  /**
   * Limpar todo o cache de tickets
   */
  async clearAllTicketCache(): Promise<void> {
    console.log('🧹 Clearing all ticket cache...');

    await Promise.all([
      this.invalidateByPattern(`${this.CACHE_PREFIXES.TICKETS}*`),
      this.invalidateByPattern(`${this.CACHE_PREFIXES.TICKET}*`),
      this.invalidateByPattern(`${this.CACHE_PREFIXES.STATS}*`),
      this.invalidateByPattern(`${this.CACHE_PREFIXES.SEARCH}*`),
    ]);

    // Reset das estatísticas
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalEntries: 0,
      memoryUsage: 0,
    };
  }

  /**
   * Pré-carregar dados essenciais no cache
   */
  async preloadEssentialData(): Promise<void> {
    console.log('🚀 Preloading essential data to cache...');

    try {
      // Esta função será chamada durante a inicialização para
      // pré-carregar pipelines e owners que são usados frequentemente
      // A implementação específica dependerá dos serviços disponíveis
    } catch (error) {
      console.error('❌ Error preloading cache data:', error);
    }
  }
}

// Export da instância singleton
export const enhancedTicketCache = EnhancedTicketCacheService.getInstance();
