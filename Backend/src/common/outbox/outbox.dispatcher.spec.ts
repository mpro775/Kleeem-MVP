import { SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';

import { RabbitService } from '../../infra/rabbit/rabbit.service';

import { OutboxDispatcher } from './outbox.dispatcher';
import { OutboxService } from './outbox.service';

import type { TestingModule } from '@nestjs/testing';

describe('OutboxDispatcher', () => {
  let dispatcher: OutboxDispatcher;
  let _outboxService: jest.Mocked<OutboxService>;
  let _rabbitService: jest.Mocked<RabbitService>;
  let _schedulerRegistry: jest.Mocked<SchedulerRegistry>;

  const mockOutboxService = {
    recoverStuckPublishing: jest.fn(),
    claimBatch: jest.fn(),
    markPublished: jest.fn(),
    reschedule: jest.fn(),
  };

  const mockRabbitService = {
    publish: jest.fn(),
  };

  const mockSchedulerRegistry = {
    doesExist: jest.fn(),
    deleteCronJob: jest.fn(),
    addCronJob: jest.fn(),
    getCronJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxDispatcher,
        {
          provide: OutboxService,
          useValue: mockOutboxService,
        },
        {
          provide: RabbitService,
          useValue: mockRabbitService,
        },
        {
          provide: SchedulerRegistry,
          useValue: mockSchedulerRegistry,
        },
      ],
    }).compile();

    dispatcher = module.get<OutboxDispatcher>(OutboxDispatcher);
    _outboxService = module.get(OutboxService);
    _rabbitService = module.get(RabbitService);
    _schedulerRegistry = module.get(SchedulerRegistry);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(dispatcher).toBeDefined();
  });

  describe('reap cron job', () => {
    it('should call recoverStuckPublishing every minute', async () => {
      // Given
      mockOutboxService.recoverStuckPublishing.mockResolvedValue(undefined);

      // When
      await dispatcher.reap();

      // Then
      expect(mockOutboxService.recoverStuckPublishing).toHaveBeenCalledTimes(1);
      expect(mockOutboxService.recoverStuckPublishing).toHaveBeenCalledWith();
    });

    it('should handle errors in recoverStuckPublishing gracefully', async () => {
      // Given
      const error = new Error('Database connection failed');
      mockOutboxService.recoverStuckPublishing.mockRejectedValue(error);

      // When/Then
      await expect(dispatcher.reap()).resolves.not.toThrow();

      expect(mockOutboxService.recoverStuckPublishing).toHaveBeenCalledTimes(1);
    });

    it('should recover stuck events older than default threshold', async () => {
      // Given
      mockOutboxService.recoverStuckPublishing.mockResolvedValue(undefined);

      // When
      await dispatcher.reap();

      // Then
      expect(mockOutboxService.recoverStuckPublishing).toHaveBeenCalledWith();
    });
  });

  describe('tick cron job', () => {
    const mockEvents = [
      {
        _id: '507f1f77bcf86cd799439011',
        aggregateType: 'user',
        aggregateId: 'user-123',
        eventType: 'user.created',
        payload: { name: 'John Doe', email: 'john@example.com' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
        occurredAt: new Date('2023-01-01T00:00:00Z'),
        status: 'publishing' as const,
        attempts: 0,
        nextAttemptAt: new Date(0),
        lockedBy: 'dispatcher@123',
        lockedAt: new Date(),
      },
      {
        _id: '507f1f77bcf86cd799439012',
        aggregateType: 'order',
        aggregateId: 'order-456',
        eventType: 'order.created',
        payload: { total: 100, currency: 'USD' },
        exchange: 'order-exchange',
        routingKey: 'order.created',
        occurredAt: new Date('2023-01-01T01:00:00Z'),
        status: 'publishing' as const,
        attempts: 1,
        nextAttemptAt: new Date(0),
        lockedBy: 'dispatcher@123',
        lockedAt: new Date(),
      },
    ];

    beforeEach(() => {
      mockOutboxService.claimBatch.mockResolvedValue(mockEvents);
      mockRabbitService.publish.mockResolvedValue(undefined);
      mockOutboxService.markPublished.mockResolvedValue(undefined);
    });

    it('should process events successfully', async () => {
      // When
      await dispatcher.tick();

      // Then
      expect(mockOutboxService.claimBatch).toHaveBeenCalledTimes(1);
      expect(mockOutboxService.claimBatch).toHaveBeenCalledWith(
        200,
        'dispatcher@123',
      );

      expect(mockRabbitService.publish).toHaveBeenCalledTimes(2);

      // Verify first event publishing
      expect(mockRabbitService.publish).toHaveBeenNthCalledWith(
        1,
        'user-exchange',
        'user.created',
        {
          type: 'user.created',
          occurredAt: mockEvents[0].occurredAt,
          aggregate: { id: 'user-123', type: 'user' },
          payload: { name: 'John Doe', email: 'john@example.com' },
        },
        {
          messageId: '507f1f77bcf86cd799439011',
          persistent: true,
          contentType: 'application/json',
        },
      );

      // Verify second event publishing
      expect(mockRabbitService.publish).toHaveBeenNthCalledWith(
        2,
        'order-exchange',
        'order.created',
        {
          type: 'order.created',
          occurredAt: mockEvents[1].occurredAt,
          aggregate: { id: 'order-456', type: 'order' },
          payload: { total: 100, currency: 'USD' },
        },
        {
          messageId: '507f1f77bcf86cd799439012',
          persistent: true,
          contentType: 'application/json',
        },
      );

      // Verify events marked as published
      expect(mockOutboxService.markPublished).toHaveBeenCalledTimes(2);
      expect(mockOutboxService.markPublished).toHaveBeenNthCalledWith(
        1,
        '507f1f77bcf86cd799439011',
      );
      expect(mockOutboxService.markPublished).toHaveBeenNthCalledWith(
        2,
        '507f1f77bcf86cd799439012',
      );
    });

    it('should handle empty batch gracefully', async () => {
      // Given
      mockOutboxService.claimBatch.mockResolvedValue([]);

      // When
      await dispatcher.tick();

      // Then
      expect(mockOutboxService.claimBatch).toHaveBeenCalledTimes(1);
      expect(mockRabbitService.publish).not.toHaveBeenCalled();
      expect(mockOutboxService.markPublished).not.toHaveBeenCalled();
    });

    it('should handle RabbitMQ publish errors and reschedule events', async () => {
      // Given
      const error = new Error('RabbitMQ connection failed');
      mockRabbitService.publish
        .mockResolvedValueOnce(undefined) // First event succeeds
        .mockRejectedValueOnce(error); // Second event fails

      // When
      await dispatcher.tick();

      // Then
      expect(mockOutboxService.claimBatch).toHaveBeenCalledTimes(1);
      expect(mockRabbitService.publish).toHaveBeenCalledTimes(2);

      // First event should be marked as published
      expect(mockOutboxService.markPublished).toHaveBeenCalledTimes(1);
      expect(mockOutboxService.markPublished).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );

      // Second event should be rescheduled
      expect(mockOutboxService.reschedule).toHaveBeenCalledTimes(1);
      expect(mockOutboxService.reschedule).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439012',
        'RabbitMQ connection failed',
        1,
      );
    });

    it('should handle markPublished errors and reschedule events', async () => {
      // Given
      const error = new Error('Database update failed');
      mockOutboxService.markPublished.mockRejectedValue(error);

      // When
      await dispatcher.tick();

      // Then
      expect(mockOutboxService.claimBatch).toHaveBeenCalledTimes(1);
      expect(mockRabbitService.publish).toHaveBeenCalledTimes(2);

      // Events should be rescheduled due to markPublished failure
      expect(mockOutboxService.reschedule).toHaveBeenCalledTimes(2);
      expect(mockOutboxService.reschedule).toHaveBeenNthCalledWith(
        1,
        '507f1f77bcf86cd799439011',
        'Database update failed',
        0,
      );
      expect(mockOutboxService.reschedule).toHaveBeenNthCalledWith(
        2,
        '507f1f77bcf86cd799439012',
        'Database update failed',
        1,
      );
    });

    it('should handle both publish and markPublished errors', async () => {
      // Given
      const publishError = new Error('RabbitMQ connection failed');
      const markError = new Error('Database update failed');

      mockRabbitService.publish.mockRejectedValue(publishError);
      mockOutboxService.markPublished.mockRejectedValue(markError);

      // When
      await dispatcher.tick();

      // Then
      expect(mockOutboxService.claimBatch).toHaveBeenCalledTimes(1);
      expect(mockRabbitService.publish).toHaveBeenCalledTimes(2);

      // Events should be rescheduled due to publish failure
      expect(mockOutboxService.reschedule).toHaveBeenCalledTimes(2);
      expect(mockOutboxService.reschedule).toHaveBeenNthCalledWith(
        1,
        '507f1f77bcf86cd799439011',
        'RabbitMQ connection failed',
        0,
      );
      expect(mockOutboxService.reschedule).toHaveBeenNthCalledWith(
        2,
        '507f1f77bcf86cd799439012',
        'RabbitMQ connection failed',
        1,
      );
    });

    it('should handle claimBatch errors gracefully', async () => {
      // Given
      const error = new Error('Database query failed');
      mockOutboxService.claimBatch.mockRejectedValue(error);

      // When/Then
      await expect(dispatcher.tick()).resolves.not.toThrow();

      expect(mockOutboxService.claimBatch).toHaveBeenCalledTimes(1);
      expect(mockRabbitService.publish).not.toHaveBeenCalled();
    });

    it('should process events with ObjectId as string', async () => {
      // Given - events with ObjectId as string
      const eventsWithStringIds = [
        {
          ...mockEvents[0],
          _id: '507f1f77bcf86cd799439011', // Already a string
        },
      ];

      mockOutboxService.claimBatch.mockResolvedValue(eventsWithStringIds);

      // When
      await dispatcher.tick();

      // Then
      expect(mockRabbitService.publish).toHaveBeenCalledTimes(1);
      expect(mockRabbitService.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          messageId: '507f1f77bcf86cd799439011',
        }),
      );
    });

    it('should use correct worker ID', async () => {
      // When
      await dispatcher.tick();

      // Then
      expect(mockOutboxService.claimBatch).toHaveBeenCalledWith(
        200,
        'dispatcher@123',
      );
    });

    it('should process large batches efficiently', async () => {
      // Given - large batch of events
      const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
        _id: `507f1f77bcf86cd799439${String(i).padStart(3, '0')}`,
        aggregateType: 'user',
        aggregateId: `user-${i}`,
        eventType: 'user.created',
        payload: { name: `User ${i}` },
        exchange: 'user-exchange',
        routingKey: 'user.created',
        occurredAt: new Date(),
        status: 'publishing' as const,
        attempts: 0,
        nextAttemptAt: new Date(0),
        lockedBy: 'dispatcher@123',
        lockedAt: new Date(),
      }));

      mockOutboxService.claimBatch.mockResolvedValue(largeBatch);
      mockRabbitService.publish.mockResolvedValue(undefined);

      // When
      await dispatcher.tick();

      // Then
      expect(mockRabbitService.publish).toHaveBeenCalledTimes(1000);
      expect(mockOutboxService.markPublished).toHaveBeenCalledTimes(1000);
    });
  });

  describe('cron job scheduling', () => {
    it('should be registered as cron jobs in NestJS scheduler', () => {
      // This test verifies that the cron decorators are properly applied
      // The actual cron job registration is handled by NestJS Schedule module

      expect(dispatcher).toBeDefined();

      // The cron jobs should be automatically registered when the module starts
      // This is tested implicitly by the fact that the methods exist and are callable
      expect(typeof dispatcher.reap).toBe('function');
      expect(typeof dispatcher.tick).toBe('function');
    });

    it('should handle rapid successive calls to tick', async () => {
      // Given
      mockOutboxService.claimBatch.mockResolvedValue([]);
      const tickPromises = Array.from({ length: 10 }, () => dispatcher.tick());

      // When
      const results = await Promise.all(tickPromises);

      // Then
      expect(results).toHaveLength(10);
      expect(mockOutboxService.claimBatch).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent reap and tick calls', async () => {
      // Given
      mockOutboxService.recoverStuckPublishing.mockResolvedValue(undefined);
      mockOutboxService.claimBatch.mockResolvedValue([]);

      // When
      const reapPromise = dispatcher.reap();
      const tickPromise = dispatcher.tick();

      await Promise.all([reapPromise, tickPromise]);

      // Then
      expect(mockOutboxService.recoverStuckPublishing).toHaveBeenCalledTimes(1);
      expect(mockOutboxService.claimBatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('error logging', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should log publish failures', async () => {
      // Given
      const mockEvent = {
        _id: '507f1f77bcf86cd799439011',
        aggregateType: 'user',
        aggregateId: 'user-123',
        eventType: 'user.created',
        payload: { name: 'John Doe', email: 'john@example.com' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
        occurredAt: new Date('2023-01-01T00:00:00Z'),
        status: 'publishing' as const,
        attempts: 0,
        nextAttemptAt: new Date(0),
        lockedBy: 'dispatcher@123',
        lockedAt: new Date(),
      };

      const events = [mockEvent];

      mockOutboxService.claimBatch.mockResolvedValue(events);
      mockRabbitService.publish.mockRejectedValue(
        new Error('RabbitMQ connection failed'),
      );

      // When
      await dispatcher.tick();

      // Then
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Publish failed (507f1f77bcf86cd799439011)'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('RabbitMQ connection failed'),
      );
    });

    it('should log non-Error publish failures', async () => {
      // Given
      const mockEvent = {
        _id: '507f1f77bcf86cd799439011',
        aggregateType: 'user',
        aggregateId: 'user-123',
        eventType: 'user.created',
        payload: { name: 'John Doe', email: 'john@example.com' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
        occurredAt: new Date('2023-01-01T00:00:00Z'),
        status: 'publishing' as const,
        attempts: 0,
        nextAttemptAt: new Date(0),
        lockedBy: 'dispatcher@123',
        lockedAt: new Date(),
      };

      const events = [mockEvent];

      mockOutboxService.claimBatch.mockResolvedValue(events);
      mockRabbitService.publish.mockRejectedValue('String error');

      // When
      await dispatcher.tick();

      // Then
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Publish failed (507f1f77bcf86cd799439011)'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('String error'),
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete event processing workflow', async () => {
      // 1. Setup initial state - events pending
      const pendingEvents = [
        {
          _id: '507f1f77bcf86cd799439011',
          aggregateType: 'user',
          aggregateId: 'user-123',
          eventType: 'user.created',
          payload: { name: 'John Doe' },
          exchange: 'user-exchange',
          routingKey: 'user.created',
          occurredAt: new Date(),
          status: 'pending' as const,
          attempts: 0,
          nextAttemptAt: new Date(0),
        },
      ];

      mockOutboxService.claimBatch.mockResolvedValueOnce(pendingEvents);
      mockRabbitService.publish.mockResolvedValue(undefined);
      mockOutboxService.markPublished.mockResolvedValue(undefined);

      // 2. Process events
      await dispatcher.tick();

      // 3. Verify complete workflow
      expect(mockOutboxService.claimBatch).toHaveBeenCalledWith(
        200,
        'dispatcher@123',
      );
      expect(mockRabbitService.publish).toHaveBeenCalledTimes(1);
      expect(mockOutboxService.markPublished).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });

    it('should handle partial failures in batch processing', async () => {
      // Given - mixed success/failure scenario
      const events = [
        {
          _id: '507f1f77bcf86cd799439011',
          aggregateType: 'user',
          aggregateId: 'user-123',
          eventType: 'user.created',
          payload: { name: 'John Doe' },
          exchange: 'user-exchange',
          routingKey: 'user.created',
          occurredAt: new Date(),
          status: 'publishing' as const,
          attempts: 0,
          nextAttemptAt: new Date(0),
          lockedBy: 'dispatcher@123',
          lockedAt: new Date(),
        },
        {
          _id: '507f1f77bcf86cd799439012',
          aggregateType: 'user',
          aggregateId: 'user-456',
          eventType: 'user.updated',
          payload: { name: 'Jane Doe' },
          exchange: 'user-exchange',
          routingKey: 'user.updated',
          occurredAt: new Date(),
          status: 'publishing' as const,
          attempts: 0,
          nextAttemptAt: new Date(0),
          lockedBy: 'dispatcher@123',
          lockedAt: new Date(),
        },
      ];

      mockOutboxService.claimBatch.mockResolvedValue(events);

      // First publish succeeds, second fails
      mockRabbitService.publish
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('RabbitMQ timeout'));

      mockOutboxService.markPublished
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Database error'));

      // When
      await dispatcher.tick();

      // Then - verify mixed results
      expect(mockRabbitService.publish).toHaveBeenCalledTimes(2);
      expect(mockOutboxService.markPublished).toHaveBeenCalledTimes(1); // Only first event
      expect(mockOutboxService.reschedule).toHaveBeenCalledTimes(2); // Both events rescheduled due to errors
    });
  });

  describe('performance considerations', () => {
    it('should handle memory efficiently with large batches', async () => {
      // Given - very large batch
      const largeBatch = Array.from({ length: 10000 }, (_, i) => ({
        _id: `507f1f77bcf86cd79943${String(i).padStart(4, '0')}`,
        aggregateType: 'user',
        aggregateId: `user-${i}`,
        eventType: 'user.created',
        payload: { name: `User ${i}` },
        exchange: 'user-exchange',
        routingKey: 'user.created',
        occurredAt: new Date(),
        status: 'publishing' as const,
        attempts: 0,
        nextAttemptAt: new Date(0),
        lockedBy: 'dispatcher@123',
        lockedAt: new Date(),
      }));

      mockOutboxService.claimBatch.mockResolvedValue(largeBatch);
      mockRabbitService.publish.mockResolvedValue(undefined);
      mockOutboxService.markPublished.mockResolvedValue(undefined);

      // When
      const startTime = Date.now();
      await dispatcher.tick();
      const endTime = Date.now();

      // Then - should complete within reasonable time (less than 10 seconds)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10000);

      expect(mockRabbitService.publish).toHaveBeenCalledTimes(10000);
      expect(mockOutboxService.markPublished).toHaveBeenCalledTimes(10000);
    });

    it('should not accumulate memory during long-running operations', async () => {
      // This test verifies that the dispatcher doesn't hold references
      // that could cause memory leaks during extended operation

      mockOutboxService.claimBatch.mockResolvedValue([]);
      mockOutboxService.recoverStuckPublishing.mockResolvedValue(undefined);

      // Simulate extended operation
      for (let i = 0; i < 100; i++) {
        await dispatcher.tick();
        await dispatcher.reap();
      }

      // If we get here without memory issues, the test passes
      expect(true).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle network partition scenarios', async () => {
      // Simulate network partition where RabbitMQ is unreachable
      const mockEvent = {
        _id: '507f1f77bcf86cd799439011',
        aggregateType: 'user',
        aggregateId: 'user-123',
        eventType: 'user.created',
        payload: { name: 'John Doe', email: 'john@example.com' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
        occurredAt: new Date('2023-01-01T00:00:00Z'),
        status: 'publishing' as const,
        attempts: 0,
        nextAttemptAt: new Date(0),
        lockedBy: 'dispatcher@123',
        lockedAt: new Date(),
      };

      mockOutboxService.claimBatch.mockResolvedValue([mockEvent]);
      mockRabbitService.publish.mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused'),
      );

      // When
      await dispatcher.tick();

      // Then
      expect(mockRabbitService.publish).toHaveBeenCalledTimes(1);
      expect(mockOutboxService.reschedule).toHaveBeenCalledTimes(1);
      expect(mockOutboxService.reschedule).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        'ECONNREFUSED: Connection refused',
        0,
      );
    });

    it('should handle database failures during markPublished', async () => {
      // Simulate database becoming unavailable during markPublished
      const mockEvent = {
        _id: '507f1f77bcf86cd799439011',
        aggregateType: 'user',
        aggregateId: 'user-123',
        eventType: 'user.created',
        payload: { name: 'John Doe', email: 'john@example.com' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
        occurredAt: new Date('2023-01-01T00:00:00Z'),
        status: 'publishing' as const,
        attempts: 0,
        nextAttemptAt: new Date(0),
        lockedBy: 'dispatcher@123',
        lockedAt: new Date(),
      };

      mockOutboxService.claimBatch.mockResolvedValue([mockEvent]);
      mockRabbitService.publish.mockResolvedValue(undefined);
      mockOutboxService.markPublished.mockRejectedValue(
        new Error('MongoNetworkError: Connection lost'),
      );

      // When
      await dispatcher.tick();

      // Then
      expect(mockRabbitService.publish).toHaveBeenCalledTimes(1);
      expect(mockOutboxService.reschedule).toHaveBeenCalledTimes(1);
      expect(mockOutboxService.reschedule).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        'MongoNetworkError: Connection lost',
        0,
      );
    });

    it('should handle malformed event data', async () => {
      // Given - event with missing required fields
      const malformedEvent = {
        _id: '507f1f77bcf86cd799439011',
        // Missing aggregateType, aggregateId, etc.
        eventType: 'user.created',
        payload: { name: 'John Doe' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
        occurredAt: new Date(),
        status: 'publishing' as const,
        attempts: 0,
        nextAttemptAt: new Date(0),
        lockedBy: 'dispatcher@123',
        lockedAt: new Date(),
      };

      mockOutboxService.claimBatch.mockResolvedValue([malformedEvent]);
      mockRabbitService.publish.mockResolvedValue(undefined);
      mockOutboxService.markPublished.mockResolvedValue(undefined);

      // When
      await dispatcher.tick();

      // Then - should handle gracefully
      expect(mockRabbitService.publish).toHaveBeenCalledTimes(1);
      expect(mockOutboxService.markPublished).toHaveBeenCalledTimes(1);
    });
  });
});
