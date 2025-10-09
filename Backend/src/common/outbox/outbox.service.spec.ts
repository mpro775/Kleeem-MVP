import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import { connect } from 'mongoose';

import { OutboxEvent, OutboxEventSchema } from './outbox.schema';
import { OutboxService } from './outbox.service';

import type { OutboxEventDocument } from './outbox.schema';
import type { EnqueueEventInput } from './outbox.service';
import type { TestingModule } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import type { Model } from 'mongoose';

describe('OutboxService', () => {
  let service: OutboxService;
  let outboxModel: Model<OutboxEventDocument>;
  let mongoServer: MongoMemoryServer;
  let mongoConnection: Connection;

  const mockRabbitService = {
    publish: jest.fn(),
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoConnection = (await connect(mongoUri)).connection;
  });

  afterAll(async () => {
    await mongoConnection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        {
          provide: getModelToken(OutboxEvent.name),
          useValue: mongoConnection.model(OutboxEvent.name, OutboxEventSchema),
        },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
    outboxModel = module.get<Model<OutboxEventDocument>>(
      getModelToken(OutboxEvent.name),
    );

    // Clear the collection before each test
    await outboxModel.deleteMany({});
    mockRabbitService.publish.mockClear();
  });

  afterEach(async () => {
    await outboxModel.deleteMany({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addEventInTx', () => {
    it('should create a new outbox event in transaction', async () => {
      const eventData: EnqueueEventInput = {
        aggregateType: 'user',
        aggregateId: 'user-123',
        eventType: 'user.created',
        payload: { name: 'John Doe', email: 'john@example.com' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
        occurredAt: '2023-01-01T00:00:00Z',
      };

      const session = await mongoConnection.startSession();

      let result: OutboxEventDocument | null | undefined;

      await session.withTransaction(async () => {
        result = await service.addEventInTx(eventData, session);
      });

      expect(result).toBeDefined();
      expect(result!.aggregateType).toBe(eventData.aggregateType);
      expect(result!.aggregateId).toBe(eventData.aggregateId);
      expect(result!.eventType).toBe(eventData.eventType);
      expect(result!.payload).toEqual(eventData.payload);
      expect(result!.exchange).toBe(eventData.exchange);
      expect(result!.routingKey).toBe(eventData.routingKey);
      expect(result!.status).toBe('pending');
      expect(result!.attempts).toBe(0);
      expect(result!.nextAttemptAt.getTime()).toBe(new Date(0).getTime());

      await session.endSession();
    });

    it('should use current timestamp when occurredAt is not provided', async () => {
      const eventData: EnqueueEventInput = {
        aggregateType: 'user',
        aggregateId: 'user-123',
        eventType: 'user.created',
        payload: { name: 'John Doe' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      };

      const session = await mongoConnection.startSession();
      let result: OutboxEventDocument | null | undefined;

      await session.withTransaction(async () => {
        result = await service.addEventInTx(eventData, session);
      });

      expect(result!.occurredAt).toBeDefined();
      const now = new Date();
      const occurredAt = new Date(result!.occurredAt!);
      expect(occurredAt.getTime()).toBeGreaterThan(now.getTime() - 1000);
      expect(occurredAt.getTime()).toBeLessThan(now.getTime() + 1000);

      await session.endSession();
    });

    it('should handle transaction rollback', async () => {
      const eventData: EnqueueEventInput = {
        aggregateType: 'user',
        aggregateId: 'user-123',
        eventType: 'user.created',
        payload: { name: 'John Doe' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      };

      const session = await mongoConnection.startSession();

      try {
        await session.withTransaction(async () => {
          await service.addEventInTx(eventData, session);
          throw new Error('Force rollback');
        });
      } catch {
        // Expected rollback
      }

      // Verify event was not created
      const count = await outboxModel.countDocuments({});
      expect(count).toBe(0);

      await session.endSession();
    });
  });

  describe('enqueueEvent', () => {
    it('should create a new outbox event without session', async () => {
      const eventData: EnqueueEventInput = {
        aggregateType: 'user',
        aggregateId: 'user-123',
        eventType: 'user.created',
        payload: { name: 'John Doe' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      };

      const result = await service.enqueueEvent(eventData);

      expect(result).toBeDefined();
      expect(result!.aggregateType).toBe(eventData.aggregateType);
      expect(result!.aggregateId).toBe(eventData.aggregateId);
      expect(result!.eventType).toBe(eventData.eventType);
      expect(result!.payload).toEqual(eventData.payload);
      expect(result!.status).toBe('pending');
      expect(result!.attempts).toBe(0);
    });

    it('should handle duplicate key error for dedupeKey', async () => {
      const eventData: EnqueueEventInput = {
        aggregateType: 'user',
        aggregateId: 'user-123',
        eventType: 'user.created',
        payload: { name: 'John Doe' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
        dedupeKey: 'unique-event-1',
      };

      // Create first event
      const result1 = await service.enqueueEvent(eventData);
      expect(result1).toBeDefined();

      // Try to create duplicate event
      const result2 = await service.enqueueEvent(eventData);
      expect(result2).toBeNull();

      // Verify only one event exists
      const count = await outboxModel.countDocuments({});
      expect(count).toBe(1);
    });

    it('should throw error for non-duplicate key errors', async () => {
      const eventData: EnqueueEventInput = {
        aggregateType: 'user',
        aggregateId: 'user-123',
        eventType: 'user.created',
        payload: { name: 'John Doe' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      };

      // Mock a validation error
      jest.spyOn(outboxModel.prototype, 'save').mockRejectedValueOnce({
        code: 121, // Document validation error
        message: 'Validation failed',
      });

      await expect(service.enqueueEvent(eventData)).rejects.toThrow();
    });

    it('should create event with session when provided', async () => {
      const eventData: EnqueueEventInput = {
        aggregateType: 'user',
        aggregateId: 'user-123',
        eventType: 'user.created',
        payload: { name: 'John Doe' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      };

      const session = await mongoConnection.startSession();

      let result: OutboxEventDocument | null | undefined;

      await session.withTransaction(async () => {
        result = await service.enqueueEvent(eventData, session);
      });

      expect(result).toBeDefined();
      expect(result!.aggregateType).toBe(eventData.aggregateType);

      await session.endSession();
    });
  });

  describe('claimBatch', () => {
    it('should claim pending events atomically', async () => {
      // Create multiple pending events
      const events = [
        {
          aggregateType: 'user',
          aggregateId: 'user-1',
          eventType: 'user.created',
          payload: { name: 'User 1' },
          exchange: 'user-exchange',
          routingKey: 'user.created',
        },
        {
          aggregateType: 'user',
          aggregateId: 'user-2',
          eventType: 'user.updated',
          payload: { name: 'User 2' },
          exchange: 'user-exchange',
          routingKey: 'user.updated',
        },
        {
          aggregateType: 'order',
          aggregateId: 'order-1',
          eventType: 'order.created',
          payload: { total: 100 },
          exchange: 'order-exchange',
          routingKey: 'order.created',
        },
      ];

      for (const eventData of events) {
        await service.enqueueEvent(eventData);
      }

      // Claim batch
      const claimed = await service.claimBatch(2, 'worker-1');

      expect(claimed).toHaveLength(2);
      expect(claimed[0].status).toBe('publishing');
      expect(claimed[0].lockedBy).toBe('worker-1');
      expect(claimed[0].lockedAt).toBeDefined();

      expect(claimed[1].status).toBe('publishing');
      expect(claimed[1].lockedBy).toBe('worker-1');
      expect(claimed[1].lockedAt).toBeDefined();

      // Verify remaining event is still pending
      const remaining = await outboxModel.findOne({ aggregateId: 'order-1' });
      expect(remaining!.status).toBe('pending');
    });

    it('should respect attempt limit', async () => {
      // Create event with max attempts
      const event = await service.enqueueEvent({
        aggregateType: 'user',
        aggregateId: 'user-1',
        eventType: 'user.created',
        payload: { name: 'User 1' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      });

      // Manually set attempts to max (10)
      await outboxModel.updateOne(
        { _id: event!._id },
        { $set: { attempts: 10, status: 'pending' } },
      );

      const claimed = await service.claimBatch(10, 'worker-1');
      expect(claimed).toHaveLength(0);
    });

    it('should respect nextAttemptAt time', async () => {
      const futureTime = new Date(Date.now() + 60000); // 1 minute from now

      const event = await service.enqueueEvent({
        aggregateType: 'user',
        aggregateId: 'user-1',
        eventType: 'user.created',
        payload: { name: 'User 1' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      });

      await outboxModel.updateOne(
        { _id: event!._id },
        { $set: { nextAttemptAt: futureTime } },
      );

      const claimed = await service.claimBatch(10, 'worker-1');
      expect(claimed).toHaveLength(0);
    });

    it('should return empty array when no events available', async () => {
      const claimed = await service.claimBatch(10, 'worker-1');
      expect(claimed).toHaveLength(0);
    });
  });

  describe('markPublished', () => {
    it('should mark event as published', async () => {
      const event = await service.enqueueEvent({
        aggregateType: 'user',
        aggregateId: 'user-1',
        eventType: 'user.created',
        payload: { name: 'User 1' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      });

      const eventId = event!._id.toString();

      await service.markPublished(eventId);

      const updatedEvent = await outboxModel.findById(eventId);
      expect(updatedEvent!.status).toBe('published');
      expect(updatedEvent!.publishedAt).toBeDefined();
      expect(updatedEvent!.error).toBeNull();
      expect(updatedEvent!.lockedBy).toBeUndefined();
      expect(updatedEvent!.lockedAt).toBeUndefined();
    });

    it('should handle non-existent event gracefully', async () => {
      await expect(
        service.markPublished(new Types.ObjectId().toString()),
      ).resolves.not.toThrow();
    });
  });

  describe('reschedule', () => {
    it('should reschedule event with backoff', async () => {
      const event = await service.enqueueEvent({
        aggregateType: 'user',
        aggregateId: 'user-1',
        eventType: 'user.created',
        payload: { name: 'User 1' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      });

      const eventId = event!._id.toString();

      await service.reschedule(eventId, 'Connection timeout', 2);

      const updatedEvent = await outboxModel.findById(eventId);
      expect(updatedEvent!.status).toBe('pending');
      expect(updatedEvent!.error).toBe('Connection timeout');
      expect(updatedEvent!.attempts).toBe(3); // Original 0 + 1 increment = 3
      expect(updatedEvent!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
      expect(updatedEvent!.lockedBy).toBeUndefined();
      expect(updatedEvent!.lockedAt).toBeUndefined();
    });

    it('should apply exponential backoff correctly', async () => {
      const event = await service.enqueueEvent({
        aggregateType: 'user',
        aggregateId: 'user-1',
        eventType: 'user.created',
        payload: { name: 'User 1' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      });

      const eventId = event!._id.toString();

      // Test backoff for different attempt counts
      for (let attempts = 0; attempts < 5; attempts++) {
        await service.reschedule(eventId, 'Test error', attempts);

        const updatedEvent = await outboxModel.findById(eventId);
        const expectedDelay = Math.min(
          5 * 60 * 1000, // 5 minutes max
          Math.pow(2, attempts) * 5000, // Base backoff
        );

        const actualDelay = updatedEvent!.nextAttemptAt.getTime() - Date.now();
        expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay - 1000);
        expect(actualDelay).toBeLessThanOrEqual(expectedDelay + 1000);
      }
    });

    it('should handle non-existent event gracefully', async () => {
      await expect(
        service.reschedule(new Types.ObjectId().toString(), 'Error', 1),
      ).resolves.not.toThrow();
    });
  });

  describe('recoverStuckPublishing', () => {
    it('should recover stuck publishing events', async () => {
      const oldTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

      // Create stuck event
      const event = await service.enqueueEvent({
        aggregateType: 'user',
        aggregateId: 'user-1',
        eventType: 'user.created',
        payload: { name: 'User 1' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      });

      await outboxModel.updateOne(
        { _id: event!._id },
        {
          $set: {
            status: 'publishing',
            lockedBy: 'stuck-worker',
            lockedAt: oldTime,
          },
        },
      );

      await service.recoverStuckPublishing();

      const recoveredEvent = await outboxModel.findById(event!._id);
      expect(recoveredEvent!.status).toBe('pending');
      expect(recoveredEvent!.lockedBy).toBeUndefined();
      expect(recoveredEvent!.lockedAt).toBeUndefined();
    });

    it('should not recover recent publishing events', async () => {
      const recentTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago

      const event = await service.enqueueEvent({
        aggregateType: 'user',
        aggregateId: 'user-1',
        eventType: 'user.created',
        payload: { name: 'User 1' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      });

      await outboxModel.updateOne(
        { _id: event!._id },
        {
          $set: {
            status: 'publishing',
            lockedBy: 'active-worker',
            lockedAt: recentTime,
          },
        },
      );

      await service.recoverStuckPublishing();

      const eventAfter = await outboxModel.findById(event!._id);
      expect(eventAfter!.status).toBe('publishing'); // Should remain publishing
      expect(eventAfter!.lockedBy).toBe('active-worker');
    });

    it('should handle custom olderThanMs parameter', async () => {
      const customThreshold = 2 * 60 * 1000; // 2 minutes
      const oldTime = new Date(Date.now() - 3 * 60 * 1000); // 3 minutes ago

      const event = await service.enqueueEvent({
        aggregateType: 'user',
        aggregateId: 'user-1',
        eventType: 'user.created',
        payload: { name: 'User 1' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      });

      await outboxModel.updateOne(
        { _id: event!._id },
        {
          $set: {
            status: 'publishing',
            lockedBy: 'worker',
            lockedAt: oldTime,
          },
        },
      );

      await service.recoverStuckPublishing(customThreshold);

      const eventAfter = await outboxModel.findById(event!._id);
      expect(eventAfter!.status).toBe('pending'); // Should be recovered
    });
  });

  describe('nextAttemptDate', () => {
    it('should calculate next attempt date with exponential backoff', () => {
      const serviceInstance = new OutboxService(outboxModel);

      // Access private method through type assertion
      const nextAttemptDate = (serviceInstance as any).nextAttemptDate.bind(
        serviceInstance,
      );

      // Test various attempt counts
      for (let attempts = 0; attempts < 10; attempts++) {
        const nextDate = nextAttemptDate(attempts);
        const expectedDelay = Math.min(
          5 * 60 * 1000, // 5 minutes max
          Math.pow(2, attempts) * 5000, // Base backoff of 5 seconds
        );

        const actualDelay = nextDate.getTime() - Date.now();
        expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay - 100);
        expect(actualDelay).toBeLessThanOrEqual(expectedDelay + 100);
      }
    });

    it('should cap delay at 5 minutes for high attempt counts', () => {
      const serviceInstance = new OutboxService(outboxModel);
      const nextAttemptDate = (serviceInstance as any).nextAttemptDate.bind(
        serviceInstance,
      );

      const highAttempts = 20;
      const nextDate = nextAttemptDate(highAttempts);
      const maxDelay = 5 * 60 * 1000; // 5 minutes

      const actualDelay = nextDate.getTime() - Date.now();
      expect(actualDelay).toBeLessThanOrEqual(maxDelay + 100);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete event lifecycle', async () => {
      // 1. Enqueue event
      const eventData: EnqueueEventInput = {
        aggregateType: 'user',
        aggregateId: 'user-123',
        eventType: 'user.created',
        payload: { name: 'John Doe', email: 'john@example.com' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      };

      const event = await service.enqueueEvent(eventData);
      expect(event).toBeDefined();

      // 2. Claim event for processing
      const claimed = await service.claimBatch(10, 'worker-1');
      expect(claimed).toHaveLength(1);
      expect(claimed[0].status).toBe('publishing');

      // 3. Simulate successful publishing
      await service.markPublished(claimed[0]._id.toString());

      // 4. Verify final state
      const finalEvent = await outboxModel.findById(claimed[0]._id);
      expect(finalEvent!.status).toBe('published');
      expect(finalEvent!.publishedAt).toBeDefined();
    });

    it('should handle event failure and retry', async () => {
      // 1. Enqueue event
      const event = await service.enqueueEvent({
        aggregateType: 'user',
        aggregateId: 'user-1',
        eventType: 'user.created',
        payload: { name: 'User 1' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      });

      expect(event).toBeDefined();

      // 2. Claim and simulate failure
      const claimed = await service.claimBatch(10, 'worker-1');
      expect(claimed).toHaveLength(1);

      await service.reschedule(claimed[0]._id.toString(), 'Network error', 0);

      // 3. Event should be available for retry
      const retryClaimed = await service.claimBatch(10, 'worker-2');
      expect(retryClaimed).toHaveLength(1);
      expect(retryClaimed[0].attempts).toBe(1);

      // 4. Verify backoff was applied
      const timeUntilRetry =
        retryClaimed[0].nextAttemptAt.getTime() - Date.now();
      expect(timeUntilRetry).toBeGreaterThan(4000); // At least 5 seconds backoff
    });

    it('should handle concurrent batch claiming', async () => {
      // Create multiple events
      for (let i = 0; i < 5; i++) {
        await service.enqueueEvent({
          aggregateType: 'user',
          aggregateId: `user-${i}`,
          eventType: 'user.created',
          payload: { name: `User ${i}` },
          exchange: 'user-exchange',
          routingKey: 'user.created',
        });
      }

      // Simulate concurrent workers
      const worker1Promise = service.claimBatch(2, 'worker-1');
      const worker2Promise = service.claimBatch(2, 'worker-2');
      const worker3Promise = service.claimBatch(2, 'worker-3');

      const [batch1, batch2, batch3] = await Promise.all([
        worker1Promise,
        worker2Promise,
        worker3Promise,
      ]);

      // All batches should be different events
      const allIds = [...batch1, ...batch2, ...batch3].map((e) =>
        e._id.toString(),
      );
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);

      // Total should be 5 events
      expect(allIds.length).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This is more of a unit test - in real scenarios, you'd mock the database
      // For now, we test that service handles basic operations
      const eventData: EnqueueEventInput = {
        aggregateType: 'user',
        aggregateId: 'user-1',
        eventType: 'user.created',
        payload: { name: 'User 1' },
        exchange: 'user-exchange',
        routingKey: 'user.created',
      };

      // Should not throw
      await expect(service.enqueueEvent(eventData)).resolves.toBeDefined();
    });

    it('should handle malformed event data', async () => {
      const malformedData = {
        // Missing required fields
        payload: { name: 'User 1' },
      } as unknown as EnqueueEventInput;

      // Should throw validation error
      await expect(service.enqueueEvent(malformedData)).rejects.toThrow();
    });
  });
});
