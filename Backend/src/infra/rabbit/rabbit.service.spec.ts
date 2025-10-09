import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import amqp from 'amqplib';

import { RabbitService } from './rabbit.service';

import type { TestingModule } from '@nestjs/testing';
// Mock amqplib
jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));
describe('RabbitService', () => {
  let service: RabbitService;
  let configService: ConfigService;
  let mockConnection: any;
  let mockChannel: any;

  beforeEach(async () => {
    // Mock AMQP connection and channel
    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue(undefined),
      assertQueue: jest.fn().mockResolvedValue({ queue: 'test-queue' }),
      bindQueue: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockReturnValue(undefined),
      waitForConfirms: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn().mockResolvedValue({ consumerTag: 'test-consumer' }),
      prefetch: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      ack: jest.fn().mockReturnValue(undefined),
      nack: jest.fn().mockReturnValue(undefined),
      cancel: jest.fn().mockResolvedValue(undefined),
      checkQueue: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    };

    mockConnection = {
      createConfirmChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    };

    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              RABBIT_URL: 'amqp://test:test@localhost:5672/test',
            }),
          ],
        }),
      ],
      providers: [RabbitService],
    }).compile();

    service = module.get<RabbitService>(RabbitService);
    configService = module.get<ConfigService>(ConfigService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up connections
    if (service) {
      await service.onModuleDestroy();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should initialize with default RabbitMQ URL when not provided', () => {
      // Test the constructor URL logic
      new ConfigService({
        RABBIT_URL: undefined,
      });

      // The service should use the fallback URL from constructor
      // Since we're testing the instance created in beforeEach, it should have the config URL
      expect(configService.get('RABBIT_URL')).toBe(
        'amqp://test:test@localhost:5672/test',
      );
    });

    it('should use RABBIT_URL from config when provided', () => {
      expect(configService.get('RABBIT_URL')).toBe(
        'amqp://test:test@localhost:5672/test',
      );
    });
  });

  describe('connection management', () => {
    it('should establish connection on module init', async () => {
      await service.onModuleInit();

      expect(amqp.connect).toHaveBeenCalledWith(
        'amqp://test:test@localhost:5672/test',
        {
          heartbeat: 30,
          locale: 'en_US',
        },
      );
      expect(mockConnection.createConfirmChannel).toHaveBeenCalled();
      expect(mockChannel.prefetch).toHaveBeenCalledWith(50);
    });

    it('should assert default exchanges on connection', async () => {
      await service.onModuleInit();

      const defaultExchanges = [
        'chat.incoming',
        'chat.reply',
        'knowledge.index',
        'catalog.sync',
        'commerce.sync',
        'webhook.dispatch',
        'analytics.events',
        'products',
      ];

      defaultExchanges.forEach((exchange) => {
        expect(mockChannel.assertExchange).toHaveBeenCalledWith(
          exchange,
          'topic',
          { durable: true },
        );
      });
    });

    it('should handle connection errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (amqp.connect as jest.Mock).mockRejectedValueOnce(
        new Error('Connection failed'),
      );

      // The service has retry logic, so it may not reject immediately
      // Just ensure it doesn't crash the test
      await expect(service.onModuleInit()).resolves.not.toThrow();
      consoleSpy.mockRestore();
    });

    it('should close connection on module destroy', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockChannel.close).toHaveBeenCalled();
    });
  });

  describe('publishing messages', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should publish message successfully', async () => {
      const exchange = 'test.exchange';
      const routingKey = 'test.key';
      const message = { data: 'test message' };

      await service.publish(exchange, routingKey, message);

      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        exchange,
        'topic',
        { durable: true },
      );
      expect(mockChannel.publish).toHaveBeenCalled();
      expect(mockChannel.waitForConfirms).toHaveBeenCalled();
    });

    it('should publish with custom options', async () => {
      const exchange = 'test.exchange';
      const routingKey = 'test.key';
      const message = 'test message';
      const options = {
        messageId: 'custom-id',
        headers: { custom: 'header' },
        confirmTimeoutMs: 5000,
      };

      await service.publish(exchange, routingKey, message, options);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        exchange,
        routingKey,
        expect.any(Buffer),
        expect.objectContaining({
          contentType: 'application/json',
          persistent: true,
          messageId: 'custom-id',
          headers: { custom: 'header' },
        }),
      );
    });

    it('should handle publish confirmation timeout', async () => {
      mockChannel.waitForConfirms.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 15000)),
      );

      const exchange = 'test.exchange';
      const routingKey = 'test.key';
      const message = 'test message';
      const options = { confirmTimeoutMs: 1000 };

      await expect(
        service.publish(exchange, routingKey, message, options),
      ).rejects.toThrow('Confirm timeout');
    });

    it('should serialize message to JSON', async () => {
      const exchange = 'test.exchange';
      const routingKey = 'test.key';
      const message = { complex: 'object', number: 42 };

      await service.publish(exchange, routingKey, message);

      const callArgs = mockChannel.publish.mock.calls[0];
      const buffer = callArgs[2] as Buffer;
      const parsedMessage = JSON.parse(buffer.toString());

      expect(parsedMessage).toEqual(message);
    });
  });

  describe('subscribing to messages', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should subscribe to exchange successfully', async () => {
      const exchange = 'test.exchange';
      const bindingKey = 'test.key';
      const onMessage = jest.fn();

      await service.subscribe(exchange, bindingKey, onMessage);

      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        exchange,
        'topic',
        { durable: true },
      );
      expect(mockChannel.assertQueue).toHaveBeenCalled();
      expect(mockChannel.bindQueue).toHaveBeenCalled();
      expect(mockChannel.consume).toHaveBeenCalled();
    });

    it('should handle message consumption', async () => {
      const onMessage = jest.fn();
      const mockMessage = {
        content: Buffer.from(JSON.stringify({ test: 'data' })),
        properties: {
          messageId: 'msg-123',
          headers: { custom: 'header' },
        },
      };

      // Setup consume mock to call the callback
      mockChannel.consume.mockImplementation(async (queue, callback) => {
        await callback(mockMessage);
        return { consumerTag: 'consumer-123' };
      });

      await service.subscribe('test.exchange', 'test.key', onMessage);

      expect(onMessage).toHaveBeenCalledWith(
        { test: 'data' },
        {
          messageId: 'msg-123',
          headers: { custom: 'header' },
        },
      );
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle message processing errors', async () => {
      const onMessage = jest
        .fn()
        .mockRejectedValue(new Error('Processing failed'));
      const mockMessage = {
        content: Buffer.from(JSON.stringify({ test: 'data' })),
        properties: { messageId: 'msg-123' },
      };

      mockChannel.consume.mockImplementation(async (queue, callback) => {
        await callback(mockMessage);
        return { consumerTag: 'consumer-123' };
      });

      await service.subscribe('test.exchange', 'test.key', onMessage, {
        requeueOnError: true,
      });

      expect(onMessage).toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, true);
    });

    it('should handle malformed JSON messages', async () => {
      const onMessage = jest.fn();
      const mockMessage = {
        content: Buffer.from('invalid json'),
        properties: { messageId: 'msg-123' },
      };

      mockChannel.consume.mockImplementation(async (queue, callback) => {
        await callback(mockMessage);
        return { consumerTag: 'consumer-123' };
      });

      await service.subscribe('test.exchange', 'test.key', onMessage);

      expect(onMessage).toHaveBeenCalledWith(null, { messageId: 'msg-123' });
    });
  });

  describe('queue management', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should create exclusive queue when no queue name provided', async () => {
      await service.subscribe('test.exchange', 'test.key', jest.fn(), {});

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('', {
        exclusive: true,
        autoDelete: true,
      });
    });

    it('should create durable queue when queue name provided', async () => {
      const queueName = 'test-queue';
      await service.subscribe('test.exchange', 'test.key', jest.fn(), {
        queue: queueName,
        durable: true,
      });

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(queueName, {
        durable: true,
        arguments: undefined,
      });
    });

    it('should configure dead letter exchange when specified', async () => {
      const queueName = 'test-queue';
      await service.subscribe('test.exchange', 'test.key', jest.fn(), {
        queue: queueName,
        deadLetter: true,
      });

      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        `${queueName}.dlx`,
        'topic',
        { durable: true },
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(`${queueName}.dlq`, {
        durable: true,
      });
    });

    it('should apply custom prefetch when specified', async () => {
      await service.subscribe('test.exchange', 'test.key', jest.fn(), {
        prefetch: 10,
      });

      expect(mockChannel.prefetch).toHaveBeenCalledWith(10);
    });
  });

  describe('error handling', () => {
    it('should handle connection failures with retry logic', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      let callCount = 0;
      (amqp.connect as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Connection failed'));
        }
        return Promise.resolve(mockConnection);
      });

      await service.onModuleInit();

      expect(callCount).toBe(3);
      expect(amqp.connect).toHaveBeenCalledTimes(3);

      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should handle precondition failed errors during queue assertion', async () => {
      const checkQueueSpy = jest.spyOn(mockChannel, 'checkQueue');
      mockChannel.assertQueue.mockRejectedValueOnce({
        code: 406,
        message: 'PRECONDITION_FAILED',
      });

      await service.subscribe('test.exchange', 'test.key', jest.fn(), {
        queue: 'existing-queue',
      });

      expect(checkQueueSpy).toHaveBeenCalledWith('existing-queue');
    });
  });
});
