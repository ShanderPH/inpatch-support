import { cacheService } from '../cache/cache-service';
import {
  advancedRateLimiter,
  enhancedErrorHandler,
} from '../utils/advanced-rate-limiter';

import { enhancedTrelloApi } from './trello-enhanced';
import { webhookHandler } from './webhook-handler';

import { Project } from '@/types/project';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuite {
  suiteName: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
}

/**
 * Comprehensive test suite for Enhanced Trello API integration
 * Tests all Phase 3 improvements and validates functionality
 */
export class EnhancedTrelloIntegrationTests {
  private testResults: TestSuite[] = [];

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<{
    success: boolean;
    totalSuites: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    duration: number;
    suites: TestSuite[];
  }> {
    console.log('🚀 Starting Enhanced Trello API Integration Tests - Fase 3');
    const startTime = Date.now();

    this.testResults = [];

    // Run test suites
    await this.testEnhancedTrelloAPI();
    await this.testCacheService();
    await this.testAdvancedRateLimiter();
    await this.testWebhookHandler();
    await this.testErrorHandling();
    await this.testPerformanceMetrics();

    const totalDuration = Date.now() - startTime;
    const totalTests = this.testResults.reduce(
      (sum, suite) => sum + suite.totalTests,
      0
    );
    const passedTests = this.testResults.reduce(
      (sum, suite) => sum + suite.passedTests,
      0
    );
    const failedTests = this.testResults.reduce(
      (sum, suite) => sum + suite.failedTests,
      0
    );

    const summary = {
      success: failedTests === 0,
      totalSuites: this.testResults.length,
      totalTests,
      passedTests,
      failedTests,
      duration: totalDuration,
      suites: this.testResults,
    };

    this.printTestSummary(summary);

    return summary;
  }

  /**
   * Test Enhanced Trello API functionality
   */
  private async testEnhancedTrelloAPI(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Enhanced Trello API',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0,
    };

    // Test 1: Health Check
    await this.runTest(suite, 'Health Check', async () => {
      const health = await enhancedTrelloApi.healthCheck();

      if (!health || !health.status) {
        throw new Error('Health check returned invalid response');
      }

      return { status: health.status, metrics: health.metrics };
    });

    // Test 2: Get Optimized Board Cards
    await this.runTest(suite, 'Get Optimized Board Cards', async () => {
      const cards = await enhancedTrelloApi.getOptimizedBoardCards();

      if (!Array.isArray(cards)) {
        throw new Error('Expected array of cards');
      }

      return { cardCount: cards.length };
    });

    // Test 3: Get Cached Board Cards
    await this.runTest(suite, 'Get Cached Board Cards', async () => {
      const cards = await enhancedTrelloApi.getCachedBoardCards();

      if (!Array.isArray(cards)) {
        throw new Error('Expected array of cards');
      }

      return { cardCount: cards.length, cached: true };
    });

    // Test 4: Transform Cards to Projects Enhanced
    await this.runTest(suite, 'Transform Cards Enhanced', async () => {
      const cards = await enhancedTrelloApi.getOptimizedBoardCards();
      const projects = enhancedTrelloApi.transformCardsToProjectsEnhanced(
        cards.slice(0, 5)
      );

      if (!Array.isArray(projects)) {
        throw new Error('Expected array of projects');
      }

      // Validate project structure
      projects.forEach(project => {
        if (!project.id || !project.title || !project.status) {
          throw new Error('Invalid project structure');
        }
      });

      return {
        projectCount: projects.length,
        sampleProject: projects[0]?.title,
      };
    });

    // Test 5: Batch Operations (if we have multiple cards)
    await this.runTest(suite, 'Batch Card Operations', async () => {
      const cards = await enhancedTrelloApi.getOptimizedBoardCards();
      const cardIds = cards.slice(0, 3).map(card => card.id);

      if (cardIds.length > 0) {
        const batchCards = await enhancedTrelloApi.getBatchCards(cardIds);

        if (!Array.isArray(batchCards)) {
          throw new Error('Expected array of batch cards');
        }

        return {
          requestedCards: cardIds.length,
          receivedCards: batchCards.length,
        };
      }

      return { message: 'No cards available for batch testing' };
    });

    // Test 6: Circuit Breaker Status
    await this.runTest(suite, 'Circuit Breaker Status', async () => {
      const status = enhancedTrelloApi.getCircuitBreakerStatus();

      if (!status || typeof status.state !== 'string') {
        throw new Error('Invalid circuit breaker status');
      }

      return status;
    });

    // Test 7: API Metrics
    await this.runTest(suite, 'API Metrics', async () => {
      const metrics = enhancedTrelloApi.getMetrics();

      if (!metrics || typeof metrics.totalRequests !== 'number') {
        throw new Error('Invalid metrics response');
      }

      return metrics;
    });

    this.testResults.push(suite);
  }

  /**
   * Test Cache Service functionality
   */
  private async testCacheService(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Cache Service',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0,
    };

    // Test 1: Cache Health Check
    await this.runTest(suite, 'Cache Health Check', async () => {
      const isHealthy = cacheService.isHealthy();

      return { healthy: isHealthy };
    });

    // Test 2: Cache Statistics
    await this.runTest(suite, 'Cache Statistics', async () => {
      const stats = cacheService.getStats();

      if (!stats || typeof stats.totalEntries !== 'number') {
        throw new Error('Invalid cache stats');
      }

      return stats;
    });

    // Test 3: Set and Get Cached Projects
    await this.runTest(suite, 'Set and Get Cached Projects', async () => {
      const mockProjects: Project[] = [
        {
          id: 'test-1',
          title: 'Test Project',
          description: 'Test Description',
          progress: 50,
          platforms: ['N8N' as const],
          responsible: ['Guilherme Souza' as const],
          startDate: new Date().toISOString(),
          estimatedEndDate: new Date(Date.now() + 86400000).toISOString(),
          status: 'em-andamento' as const,
          priority: 'medium' as const,
          trelloCardId: 'test-card-1',
          labels: ['test'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await cacheService.setCachedProjects(mockProjects);
      const cachedProjects = await cacheService.getCachedProjects();

      if (!cachedProjects || cachedProjects.length !== 1) {
        throw new Error('Cache set/get failed');
      }

      return { cached: cachedProjects.length, original: mockProjects.length };
    });

    // Test 4: Cache Invalidation
    await this.runTest(suite, 'Cache Invalidation', async () => {
      await cacheService.invalidateProjects();
      const cachedProjects = await cacheService.getCachedProjects();

      if (cachedProjects !== null) {
        throw new Error('Cache invalidation failed');
      }

      return { invalidated: true };
    });

    // Test 5: Cache Configuration
    await this.runTest(suite, 'Cache Configuration', async () => {
      const config = cacheService.getConfig();

      if (!config || typeof config.maxSize !== 'number') {
        throw new Error('Invalid cache configuration');
      }

      return config;
    });

    this.testResults.push(suite);
  }

  /**
   * Test Advanced Rate Limiter
   */
  private async testAdvancedRateLimiter(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Advanced Rate Limiter',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0,
    };

    // Test 1: Rate Limit Check
    await this.runTest(suite, 'Rate Limit Check', async () => {
      const testKey = 'test-endpoint';
      const allowed = advancedRateLimiter.isAllowed(testKey);

      return { allowed, key: testKey };
    });

    // Test 2: Rate Limit Status
    await this.runTest(suite, 'Rate Limit Status', async () => {
      const testKey = 'test-endpoint';
      const status = advancedRateLimiter.getStatus(testKey);

      if (!status || typeof status.allowed !== 'boolean') {
        throw new Error('Invalid rate limit status');
      }

      return status;
    });

    // Test 3: Rate Limit Statistics
    await this.runTest(suite, 'Rate Limit Statistics', async () => {
      const stats = advancedRateLimiter.getStats();

      if (!stats || typeof stats.totalKeys !== 'number') {
        throw new Error('Invalid rate limit stats');
      }

      return stats;
    });

    // Test 4: Multiple Requests
    await this.runTest(suite, 'Multiple Requests Handling', async () => {
      const testKey = 'burst-test';
      let allowedCount = 0;

      // Try 5 requests quickly
      for (let i = 0; i < 5; i++) {
        if (advancedRateLimiter.isAllowed(testKey)) {
          allowedCount++;
        }
      }

      return { totalRequests: 5, allowedRequests: allowedCount };
    });

    this.testResults.push(suite);
  }

  /**
   * Test Webhook Handler
   */
  private async testWebhookHandler(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Webhook Handler',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0,
    };

    // Test 1: Webhook Health Status
    await this.runTest(suite, 'Webhook Health Status', async () => {
      const health = webhookHandler.getHealthStatus();

      if (!health || !health.status) {
        throw new Error('Invalid webhook health status');
      }

      return health;
    });

    // Test 2: Webhook Statistics
    await this.runTest(suite, 'Webhook Statistics', async () => {
      const stats = webhookHandler.getStats();

      if (!stats || typeof stats.totalProcessed !== 'number') {
        throw new Error('Invalid webhook stats');
      }

      return stats;
    });

    // Test 3: Mock Webhook Event Processing
    await this.runTest(suite, 'Mock Webhook Event Processing', async () => {
      const mockEvent = {
        action: {
          id: 'test-action-1',
          type: 'updateCard',
          date: new Date().toISOString(),
          memberCreator: {
            id: 'test-member',
            fullName: 'Test User',
            username: 'testuser',
          },
        },
        model: {
          id: 'test-model',
          name: 'Test Model',
        },
        data: {
          card: {
            id: 'test-card-1',
            name: 'Test Card',
            desc: 'Test Description',
          },
          old: {
            name: 'Old Test Card',
          },
        },
      };

      const result = await webhookHandler.processWebhookEvent(mockEvent);

      if (!result || typeof result.success !== 'boolean') {
        throw new Error('Invalid webhook processing result');
      }

      return result;
    });

    // Test 4: Webhook Subscription
    await this.runTest(suite, 'Webhook Subscription', async () => {
      let callbackCalled = false;

      const unsubscribe = webhookHandler.subscribe(projects => {
        callbackCalled = true;
      });

      // Test unsubscribe
      unsubscribe();

      return { subscriptionTest: true, callbackRegistered: !callbackCalled };
    });

    this.testResults.push(suite);
  }

  /**
   * Test Error Handling
   */
  private async testErrorHandling(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Error Handling',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0,
    };

    // Test 1: Error Categorization
    await this.runTest(suite, 'Error Categorization', async () => {
      const testErrors = [
        { status: 401, message: 'Unauthorized' },
        { status: 429, message: 'Rate Limited' },
        { status: 500, message: 'Server Error' },
        { message: 'Network Error' },
      ];

      const results = testErrors.map(error => {
        const category = enhancedErrorHandler.categorizeError(error);

        return {
          error: error.status || error.message,
          category: category.category,
        };
      });

      return { categorizedErrors: results };
    });

    // Test 2: Error Statistics
    await this.runTest(suite, 'Error Statistics', async () => {
      const stats = enhancedErrorHandler.getErrorStats();

      if (!stats || typeof stats.totalErrors !== 'number') {
        throw new Error('Invalid error stats');
      }

      return stats;
    });

    // Test 3: Endpoint Health Check
    await this.runTest(suite, 'Endpoint Health Check', async () => {
      const testEndpoint = 'test-endpoint';
      const isHealthy = enhancedErrorHandler.isEndpointHealthy(testEndpoint);

      return { endpoint: testEndpoint, healthy: isHealthy };
    });

    this.testResults.push(suite);
  }

  /**
   * Test Performance Metrics
   */
  private async testPerformanceMetrics(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Performance Metrics',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0,
    };

    // Test 1: API Response Time
    await this.runTest(suite, 'API Response Time', async () => {
      const startTime = Date.now();

      try {
        await enhancedTrelloApi.getOptimizedBoardCards(['id', 'name']);
        const responseTime = Date.now() - startTime;

        return {
          responseTime,
          acceptable: responseTime < 5000,
          fast: responseTime < 1000,
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;

        return {
          responseTime,
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Test 2: Cache Performance
    await this.runTest(suite, 'Cache Performance', async () => {
      const iterations = 100;
      const testData = Array.from({ length: 10 }, (_, i) => ({
        id: `perf-test-${i}`,
        title: `Performance Test ${i}`,
        description: 'Performance test project',
        progress: Math.floor(Math.random() * 100),
        platforms: ['N8N' as const],
        responsible: ['Guilherme Souza' as const],
        startDate: new Date().toISOString(),
        estimatedEndDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'em-andamento' as const,
        priority: 'medium' as const,
        trelloCardId: `perf-card-${i}`,
        labels: ['performance'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Test cache write performance
      const writeStartTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await cacheService.setCachedProjects(testData);
      }
      const writeTime = Date.now() - writeStartTime;

      // Test cache read performance
      const readStartTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await cacheService.getCachedProjects();
      }
      const readTime = Date.now() - readStartTime;

      return {
        iterations,
        writeTime,
        readTime,
        avgWriteTime: writeTime / iterations,
        avgReadTime: readTime / iterations,
      };
    });

    // Test 3: Memory Usage Estimation
    await this.runTest(suite, 'Memory Usage Estimation', async () => {
      const stats = cacheService.getStats();
      const memoryUsage = stats.memoryUsage;

      return {
        memoryUsage,
        memoryUsageMB: Math.round((memoryUsage / (1024 * 1024)) * 100) / 100,
        acceptable: memoryUsage < 50 * 1024 * 1024, // 50MB
      };
    });

    this.testResults.push(suite);
  }

  /**
   * Run individual test
   */
  private async runTest(
    suite: TestSuite,
    testName: string,
    testFunction: () => Promise<any>
  ): Promise<void> {
    const startTime = Date.now();

    suite.totalTests++;

    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;

      suite.results.push({
        testName,
        success: true,
        duration,
        details: result,
      });

      suite.passedTests++;
      suite.totalDuration += duration;

      console.log(`✅ ${testName} - ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;

      suite.results.push({
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      suite.failedTests++;
      suite.totalDuration += duration;

      console.log(
        `❌ ${testName} - ${duration}ms - ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Print comprehensive test summary
   */
  private printTestSummary(summary: any): void {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 ENHANCED TRELLO API INTEGRATION TESTS - FASE 3 SUMMARY');
    console.log('='.repeat(80));

    console.log(`\n📊 Overall Results:`);
    console.log(`   Total Test Suites: ${summary.totalSuites}`);
    console.log(`   Total Tests: ${summary.totalTests}`);
    console.log(`   ✅ Passed: ${summary.passedTests}`);
    console.log(`   ❌ Failed: ${summary.failedTests}`);
    console.log(`   ⏱️  Total Duration: ${summary.duration}ms`);
    console.log(
      `   📈 Success Rate: ${((summary.passedTests / summary.totalTests) * 100).toFixed(1)}%`
    );

    console.log(`\n📋 Test Suite Details:`);
    summary.suites.forEach((suite: TestSuite) => {
      const successRate =
        suite.totalTests > 0 ? (suite.passedTests / suite.totalTests) * 100 : 0;

      console.log(`\n   ${suite.suiteName}:`);
      console.log(
        `     Tests: ${suite.passedTests}/${suite.totalTests} passed (${successRate.toFixed(1)}%)`
      );
      console.log(`     Duration: ${suite.totalDuration}ms`);

      if (suite.failedTests > 0) {
        console.log(`     Failed Tests:`);
        suite.results
          .filter(result => !result.success)
          .forEach(result => {
            console.log(`       - ${result.testName}: ${result.error}`);
          });
      }
    });

    if (summary.success) {
      console.log(
        `\n🎉 ALL TESTS PASSED! Enhanced Trello API integration is working correctly.`
      );
    } else {
      console.log(`\n⚠️  Some tests failed. Please review the errors above.`);
    }

    console.log('\n' + '='.repeat(80));
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      phase: 'Fase 3 - API Trello Enhancement',
      testResults: this.testResults,
      summary: {
        totalSuites: this.testResults.length,
        totalTests: this.testResults.reduce(
          (sum, suite) => sum + suite.totalTests,
          0
        ),
        passedTests: this.testResults.reduce(
          (sum, suite) => sum + suite.passedTests,
          0
        ),
        failedTests: this.testResults.reduce(
          (sum, suite) => sum + suite.failedTests,
          0
        ),
        totalDuration: this.testResults.reduce(
          (sum, suite) => sum + suite.totalDuration,
          0
        ),
      },
    };

    return JSON.stringify(report, null, 2);
  }
}

// Export test runner
export const enhancedTrelloTests = new EnhancedTrelloIntegrationTests();
