import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { ChatGateway } from '../chat.gateway';

import type { TestingModule } from '@nestjs/testing';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let jwtService: jest.Mocked<JwtService>;
  let cacheManager: jest.Mocked<any>;

  beforeEach(async () => {
    const mockJwtService = {
      verify: jest.fn(),
    } as any;

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: 'websocket_active_connections',
          useValue: { inc: jest.fn(), dec: jest.fn() },
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    jwtService = module.get(JwtService);
    cacheManager = module.get(CACHE_MANAGER);

    // Mock logger
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);

    // Mock server
    (gateway as any).server = {
      adapter: { createAdapter: jest.fn() },
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
  });

  describe('onModuleInit', () => {
    it('should initialize Redis adapter', async () => {
      const mockAdapter = { createAdapter: jest.fn() };
      const mockServer = {
        adapter: mockAdapter,
      };

      (gateway as any).server = mockServer;

      // Mock environment
      const originalEnv = process.env;
      process.env.REDIS_URL = 'redis://test:6379';

      // Mock Redis clients
      const mockPub = { connect: jest.fn().mockResolvedValue(undefined) };
      const mockSub = {
        duplicate: jest
          .fn()
          .mockReturnValue({ connect: jest.fn().mockResolvedValue(undefined) }),
      };

      const createClientMock = jest
        .fn()
        .mockReturnValueOnce(mockPub)
        .mockReturnValueOnce(mockSub);

      jest.doMock('redis', () => ({
        createClient: createClientMock,
      }));

      await gateway.onModuleInit();

      expect(createClientMock).toHaveBeenCalledWith({
        url: 'redis://test:6379',
      });
      expect(mockPub.connect).toHaveBeenCalled();
      expect(mockSub.duplicate).toHaveBeenCalled();
      expect(mockAdapter.createAdapter).toHaveBeenCalledWith(mockPub, mockSub);

      // Restore env
      process.env = originalEnv;
    });
  });

  describe('handleConnection', () => {
    let mockClient: any;
    let mockSocket: any;

    beforeEach(() => {
      mockClient = {
        id: 'test-client-id',
        handshake: {
          query: {},
          headers: {},
        },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      mockSocket = {
        inc: jest.fn(),
      };

      (gateway as any).wsGauge = mockSocket;
      jest
        .spyOn(gateway as any, 'authenticateWsClient')
        .mockResolvedValue(true);
    });

    it('should handle successful connection with session and merchant', async () => {
      mockClient.handshake.query = {
        sessionId: 'session123',
        role: 'user',
        merchantId: 'merchant456',
      };

      await gateway.handleConnection(mockClient);

      expect(gateway['authenticateWsClient']).toHaveBeenCalledWith(mockClient);
      expect(mockClient.join).toHaveBeenCalledWith('session123');
      expect(mockClient.join).toHaveBeenCalledWith('merchant:merchant456');
      expect(mockSocket.inc).toHaveBeenCalledWith({ namespace: 'chat' });
    });

    it('should handle connection with admin role', async () => {
      mockClient.handshake.query = {
        sessionId: 'session123',
        role: 'admin',
        merchantId: 'merchant456',
      };

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('admin');
      expect(mockClient.join).toHaveBeenCalledWith('agents');
    });

    it('should handle failed authentication', async () => {
      jest
        .spyOn(gateway as any, 'authenticateWsClient')
        .mockResolvedValue(false);

      await gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Unauthorized',
      });
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockSocket.inc).not.toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      jest
        .spyOn(gateway as any, 'authenticateWsClient')
        .mockRejectedValue(new Error('Auth failed'));

      await gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Connection failed',
      });
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should handle disconnection and clean up rate limiting', () => {
      const mockClient = { id: 'test-client-id' } as any;
      const mockSocket = { dec: jest.fn() };

      (gateway as any).wsGauge = mockSocket;
      (gateway as any).messageRates = new Map([
        ['test-client-id', { count: 5, resetTime: Date.now() + 1000 }],
      ]);

      gateway.handleDisconnect(mockClient);

      expect((gateway as any).messageRates.has('test-client-id')).toBe(false);
      expect(mockSocket.dec).toHaveBeenCalledWith({ namespace: 'chat' });
    });
  });

  describe('authenticateWsClient', () => {
    it('should authenticate with valid JWT token from auth.token', async () => {
      const mockClient = {
        handshake: {
          auth: { token: 'valid.jwt.token' },
        },
        data: {} as any,
      };

      jwtService.verify.mockReturnValue({
        jti: 'jti123',
        userId: 'user123',
        role: 'user',
        merchantId: 'merchant123',
      });

      cacheManager.get.mockResolvedValue(null); // not blacklisted

      const result = await (gateway as any).authenticateWsClient(mockClient);

      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith(
        'valid.jwt.token',
        (gateway as any).jwtVerifyOptions,
      );
      expect(cacheManager.get).toHaveBeenCalledWith('bl:jti123');
      expect(mockClient.data.user).toEqual({
        userId: 'user123',
        role: 'user',
        merchantId: 'merchant123',
        jti: 'jti123',
      });
    });

    it('should authenticate with token from query', async () => {
      const mockClient = {
        handshake: {
          query: { token: 'query.jwt.token' },
        },
        data: {},
      };

      jwtService.verify.mockReturnValue({
        jti: 'jti456',
        userId: 'user456',
        role: 'admin',
      });

      cacheManager.get.mockResolvedValue(null);

      const result = await (gateway as any).authenticateWsClient(mockClient);

      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith(
        'query.jwt.token',
        (gateway as any).jwtVerifyOptions,
      );
    });

    it('should authenticate with token from authorization header', async () => {
      const mockClient = {
        handshake: {
          headers: { authorization: 'Bearer header.jwt.token' },
        },
        data: {},
      };

      jwtService.verify.mockReturnValue({
        jti: 'jti789',
        userId: 'user789',
        role: 'agent',
      });

      cacheManager.get.mockResolvedValue(null);

      const result = await (gateway as any).authenticateWsClient(mockClient);

      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith(
        'header.jwt.token',
        (gateway as any).jwtVerifyOptions,
      );
    });

    it('should reject when no token provided', async () => {
      const mockClient = {
        handshake: {
          auth: {},
          query: {},
          headers: {},
        },
      };

      const result = await (gateway as any).authenticateWsClient(mockClient);

      expect(result).toBe(false);
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('should reject when JWT payload is invalid', async () => {
      const mockClient = {
        handshake: {
          auth: { token: 'invalid.jwt.token' },
        },
      };

      jwtService.verify.mockReturnValue({ invalid: 'payload' });

      const result = await (gateway as any).authenticateWsClient(mockClient);

      expect(result).toBe(false);
    });

    it('should reject when token is blacklisted', async () => {
      const mockClient = {
        handshake: {
          auth: { token: 'blacklisted.jwt.token' },
        },
      };

      jwtService.verify.mockReturnValue({
        jti: 'jti123',
        userId: 'user123',
        role: 'user',
      });

      cacheManager.get.mockResolvedValue('blacklisted');

      const result = await (gateway as any).authenticateWsClient(mockClient);

      expect(result).toBe(false);
      expect(cacheManager.get).toHaveBeenCalledWith('bl:jti123');
    });

    it('should reject when JWT verification fails', async () => {
      const mockClient = {
        handshake: {
          auth: { token: 'invalid.jwt.token' },
        },
      };

      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await (gateway as any).authenticateWsClient(mockClient);

      expect(result).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow first message in window', () => {
      const clientId = 'client123';
      const now = Date.now();

      jest.spyOn(Date, 'now').mockReturnValue(now);

      const result = (gateway as any).checkRateLimit(clientId);

      expect(result).toBe(true);
      expect((gateway as any).messageRates.get(clientId)).toEqual({
        count: 1,
        resetTime: now + 600000, // 10 minutes
      });
    });

    it('should allow message within rate limit', () => {
      const clientId = 'client123';
      const now = Date.now();

      (gateway as any).messageRates.set(clientId, {
        count: 5,
        resetTime: now + 10000,
      });

      const result = (gateway as any).checkRateLimit(clientId);

      expect(result).toBe(true);
      expect((gateway as any).messageRates.get(clientId).count).toBe(6);
    });

    it('should reset window when expired', () => {
      const clientId = 'client123';
      const pastTime = Date.now() - 10000;
      const now = Date.now();

      (gateway as any).messageRates.set(clientId, {
        count: 10,
        resetTime: pastTime,
      });

      jest.spyOn(Date, 'now').mockReturnValue(now);

      const result = (gateway as any).checkRateLimit(clientId);

      expect(result).toBe(true);
      expect((gateway as any).messageRates.get(clientId)).toEqual({
        count: 1,
        resetTime: now + 600000,
      });
    });

    it('should reject when rate limit exceeded', () => {
      const clientId = 'client123';
      const now = Date.now();

      (gateway as any).messageRates.set(clientId, {
        count: 10, // at limit
        resetTime: now + 10000,
      });

      const result = (gateway as any).checkRateLimit(clientId);

      expect(result).toBe(false);
      expect((gateway as any).messageRates.get(clientId).count).toBe(10); // unchanged
    });
  });

  describe('handleRateLimitExceeded', () => {
    it('should emit rate limit warning and disconnect if severely exceeded', () => {
      const mockClient = {
        id: 'client123',
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      (gateway as any).messageRates.set('client123', {
        count: 25, // exceeds RATE_LIMIT_MAX * RATE_LIMIT_DISCONNECT_MULTIPLIER
        resetTime: Date.now() + 10000,
      });

      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      (gateway as any).handleRateLimitExceeded(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('rate_limit_exceeded', {
        message: 'تم تجاوز حد الرسائل المسموح، الرجاء الإبطاء',
        retryAfter: 600, // 10 minutes in seconds
      });
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });

    it('should emit rate limit warning without disconnect for moderate violation', () => {
      const mockClient = {
        id: 'client123',
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      (gateway as any).messageRates.set('client123', {
        count: 12, // exceeds RATE_LIMIT_MAX but not disconnect threshold
        resetTime: Date.now() + 10000,
      });

      (gateway as any).handleRateLimitExceeded(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('rate_limit_exceeded', {
        message: 'تم تجاوز حد الرسائل المسموح، الرجاء الإبطاء',
        retryAfter: 600,
      });
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('onJoin', () => {
    it('should join rooms successfully', () => {
      const mockClient = {
        id: 'client123',
        join: jest.fn(),
      } as any;

      const payload = {
        sessionId: 'session123',
        merchantId: 'merchant456',
        rooms: ['room1', 'room2'],
      };

      jest.spyOn(gateway as any, 'checkRateLimit').mockReturnValue(true);

      const result = gateway.onJoin(payload, mockClient);

      expect(gateway['checkRateLimit']).toHaveBeenCalledWith('client123');
      expect(mockClient.join).toHaveBeenCalledWith('session123');
      expect(mockClient.join).toHaveBeenCalledWith('merchant:merchant456');
      expect(mockClient.join).toHaveBeenCalledWith('room1');
      expect(mockClient.join).toHaveBeenCalledWith('room2');
      expect(result).toEqual({ ok: true });
    });

    it('should handle rate limit exceeded', () => {
      const mockClient = {
        id: 'client123',
        join: jest.fn(),
      } as any;

      const payload = { sessionId: 'session123' };

      jest.spyOn(gateway as any, 'checkRateLimit').mockReturnValue(false);
      jest
        .spyOn(gateway as any, 'handleRateLimitExceeded')
        .mockImplementation(() => undefined);

      const result = gateway.onJoin(payload, mockClient);

      expect(gateway['checkRateLimit']).toHaveBeenCalledWith('client123');
      expect(gateway['handleRateLimitExceeded']).toHaveBeenCalledWith(
        mockClient,
      );
      expect(result).toEqual({ error: 'Rate limit exceeded' });
      expect(mockClient.join).not.toHaveBeenCalled();
    });
  });

  describe('onLeave', () => {
    it('should leave rooms successfully', () => {
      const mockClient = {
        id: 'client123',
        leave: jest.fn(),
      } as any;

      const payload = {
        sessionId: 'session123',
        merchantId: 'merchant456',
        rooms: ['room1', 'room2'],
      };

      jest.spyOn(gateway as any, 'checkRateLimit').mockReturnValue(true);

      const result = gateway.onLeave(payload, mockClient);

      expect(gateway['checkRateLimit']).toHaveBeenCalledWith('client123');
      expect(mockClient.leave).toHaveBeenCalledWith('session123');
      expect(mockClient.leave).toHaveBeenCalledWith('merchant:merchant456');
      expect(mockClient.leave).toHaveBeenCalledWith('room1');
      expect(mockClient.leave).toHaveBeenCalledWith('room2');
      expect(result).toEqual({ ok: true });
    });
  });

  describe('onTyping', () => {
    it('should broadcast typing event', () => {
      const mockClient = {
        id: 'client123',
      } as any;

      const payload = {
        sessionId: 'session123',
        role: 'agent',
      };

      jest.spyOn(gateway as any, 'checkRateLimit').mockReturnValue(true);

      gateway.onTyping(payload, mockClient);

      expect(gateway['checkRateLimit']).toHaveBeenCalledWith('client123');
      expect((gateway as any).server.to).toHaveBeenCalledWith('session123');
      expect((gateway as any).server.emit).toHaveBeenCalledWith('typing', {
        sessionId: 'session123',
        role: 'agent',
      });
    });

    it('should default to user role when role not specified', () => {
      const mockClient = {
        id: 'client123',
      } as any;

      const payload = {
        sessionId: 'session123',
      };

      jest.spyOn(gateway as any, 'checkRateLimit').mockReturnValue(true);

      gateway.onTyping(payload, mockClient);

      expect((gateway as any).server.emit).toHaveBeenCalledWith('typing', {
        sessionId: 'session123',
        role: 'user',
      });
    });

    it('should skip broadcasting when rate limited', () => {
      const mockClient = {
        id: 'client123',
      } as any;

      const payload = {
        sessionId: 'session123',
      };

      jest.spyOn(gateway as any, 'checkRateLimit').mockReturnValue(false);

      gateway.onTyping(payload, mockClient);

      expect((gateway as any).server.to).not.toHaveBeenCalled();
      expect((gateway as any).server.emit).not.toHaveBeenCalled();
    });

    it('should skip broadcasting when sessionId not provided', () => {
      const mockClient = {
        id: 'client123',
      } as any;

      const payload = {};

      jest.spyOn(gateway as any, 'checkRateLimit').mockReturnValue(true);

      gateway.onTyping(payload, mockClient);

      expect((gateway as any).server.to).not.toHaveBeenCalled();
      expect((gateway as any).server.emit).not.toHaveBeenCalled();
    });
  });

  describe('sendMessageToSession', () => {
    it('should send message to session and broadcast to admin', () => {
      const message = {
        id: 'msg123',
        text: 'Hello world',
        role: 'user' as const,
        merchantId: 'merchant123',
        timestamp: new Date(),
      };

      gateway.sendMessageToSession('session123', message);

      expect((gateway as any).server.to).toHaveBeenNthCalledWith(
        1,
        'session123',
      );
      expect((gateway as any).server.emit).toHaveBeenNthCalledWith(
        1,
        'message',
        message,
      );

      expect((gateway as any).server.to).toHaveBeenNthCalledWith(2, 'admin');
      expect((gateway as any).server.emit).toHaveBeenNthCalledWith(
        2,
        'admin_new_message',
        {
          sessionId: 'session123',
          message,
        },
      );
    });

    it('should broadcast to merchant room when merchantId provided', () => {
      const message = {
        id: 'msg123',
        text: 'Hello world',
        role: 'bot' as const,
        merchantId: 'merchant123',
        timestamp: new Date(),
      };

      gateway.sendMessageToSession('session123', message);

      expect((gateway as any).server.to).toHaveBeenNthCalledWith(
        3,
        'merchant:merchant123',
      );
      expect((gateway as any).server.emit).toHaveBeenNthCalledWith(
        3,
        'message',
        {
          sessionId: 'session123',
          ...message,
        },
      );
    });

    it('should skip merchant broadcast when merchantId not provided', () => {
      const message = {
        id: 'msg123',
        text: 'Hello world',
        role: 'user' as const,
        timestamp: new Date(),
      };

      gateway.sendMessageToSession('session123', message);

      // Should only call server.to twice (session and admin)
      expect((gateway as any).server.to).toHaveBeenCalledTimes(2);
      expect((gateway as any).server.emit).toHaveBeenCalledTimes(2);
    });
  });
});
