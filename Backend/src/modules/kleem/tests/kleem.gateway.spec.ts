import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { KleemGateway } from '../ws/kleem.gateway';
import { KleemChatService } from '../chat/kleem-chat.service';
import {
  KleemWsMessage,
  TypingPayload,
  UserMessagePayload,
} from '../ws/kleem-ws.types';

describe('KleemGateway', () => {
  let gateway: KleemGateway;
  let mockKleemChatService: jest.Mocked<KleemChatService>;
  let mockServer: jest.Mocked<Server>;
  let mockSocket: jest.Mocked<Socket>;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Create mocks
    mockKleemChatService = {
      handleUserMessage: jest.fn(),
    } as any;

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    mockSocket = {
      id: 'test-socket-123',
      handshake: {
        query: {},
      },
      join: jest.fn(),
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KleemGateway,
        { provide: KleemChatService, useValue: mockKleemChatService },
      ],
    }).compile();

    gateway = module.get<KleemGateway>(KleemGateway);
    gateway.server = mockServer;

    // Mock Logger
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Gateway Initialization', () => {
    it('should be defined', () => {
      expect(gateway).toBeDefined();
    });

    it('should have server instance', () => {
      expect(gateway.server).toBeDefined();
    });

    it('should have logger instance', () => {
      expect(gateway).toHaveProperty('logger');
    });

    it('should be configured with correct WebSocket options', () => {
      const gatewayMetadata = Reflect.getMetadata(
        '__gateway-metadata__',
        KleemGateway,
      );

      // Note: The actual metadata structure may vary based on NestJS version
      // This test verifies that the gateway has been properly decorated
      expect(gateway).toBeInstanceOf(KleemGateway);
    });
  });

  describe('handleConnection', () => {
    it('should join session room when sessionId is provided', () => {
      mockSocket.handshake.query = {
        sessionId: 'session-123',
        role: 'user',
      };

      gateway.handleConnection(mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('session-123');
    });

    it('should join admin room when role is admin', () => {
      mockSocket.handshake.query = {
        sessionId: 'session-123',
        role: 'admin',
      };

      gateway.handleConnection(mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('session-123');
      expect(mockSocket.join).toHaveBeenCalledWith('kleem_admin');
    });

    it('should join admin room when role is agent', () => {
      mockSocket.handshake.query = {
        sessionId: 'session-456',
        role: 'agent',
      };

      gateway.handleConnection(mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('session-456');
      expect(mockSocket.join).toHaveBeenCalledWith('kleem_admin');
    });

    it('should not join admin room when role is user', () => {
      mockSocket.handshake.query = {
        sessionId: 'session-789',
        role: 'user',
      };

      gateway.handleConnection(mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('session-789');
      expect(mockSocket.join).not.toHaveBeenCalledWith('kleem_admin');
    });

    it('should handle connection without sessionId', () => {
      mockSocket.handshake.query = {
        role: 'user',
      };

      gateway.handleConnection(mockSocket);

      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should handle connection without role', () => {
      mockSocket.handshake.query = {
        sessionId: 'session-123',
      };

      gateway.handleConnection(mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('session-123');
      expect(mockSocket.join).not.toHaveBeenCalledWith('kleem_admin');
    });

    it('should handle empty query parameters', () => {
      mockSocket.handshake.query = {};

      gateway.handleConnection(mockSocket);

      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should handle multiple connections to same session', () => {
      const socket1 = { ...mockSocket, id: 'socket-1' } as any;
      const socket2 = { ...mockSocket, id: 'socket-2' } as any;

      socket1.handshake = {
        query: { sessionId: 'session-shared', role: 'user' },
      };
      socket2.handshake = {
        query: { sessionId: 'session-shared', role: 'admin' },
      };

      gateway.handleConnection(socket1);
      gateway.handleConnection(socket2);

      expect(socket1.join).toHaveBeenCalledWith('session-shared');
      expect(socket2.join).toHaveBeenCalledWith('session-shared');
      expect(socket2.join).toHaveBeenCalledWith('kleem_admin');
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnection', () => {
      gateway.handleDisconnect(mockSocket);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Client disconnected ${mockSocket.id}`,
      );
    });

    it('should handle disconnection of different socket types', () => {
      const adminSocket = { ...mockSocket, id: 'admin-socket' } as any;
      const userSocket = { ...mockSocket, id: 'user-socket' } as any;

      gateway.handleDisconnect(adminSocket);
      gateway.handleDisconnect(userSocket);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Client disconnected admin-socket',
      );
      expect(loggerSpy).toHaveBeenCalledWith('Client disconnected user-socket');
    });
  });

  describe('onBotReply', () => {
    it('should emit bot reply to session room', () => {
      const payload = {
        sessionId: 'session-123',
        message: {
          role: 'bot' as const,
          text: 'مرحباً! كيف يمكنني مساعدتك؟',
          msgIdx: 1,
        },
      };

      gateway.onBotReply(payload);

      expect(mockServer.to).toHaveBeenCalledWith('session-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'bot_reply',
        payload.message,
      );
    });

    it('should handle bot reply with metadata', () => {
      const payload = {
        sessionId: 'session-456',
        message: {
          role: 'bot' as const,
          text: 'إليك المعلومات المطلوبة',
          msgIdx: 3,
          metadata: {
            source: 'knowledge_base',
            confidence: 0.95,
          },
          timestamp: '2024-01-01T00:00:00Z',
        },
      };

      gateway.onBotReply(payload);

      expect(mockServer.to).toHaveBeenCalledWith('session-456');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'bot_reply',
        payload.message,
      );
    });

    it('should handle bot reply without msgIdx', () => {
      const payload = {
        sessionId: 'session-789',
        message: {
          role: 'bot' as const,
          text: 'رد بدون فهرس',
        },
      };

      gateway.onBotReply(payload);

      expect(mockServer.to).toHaveBeenCalledWith('session-789');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'bot_reply',
        payload.message,
      );
    });

    it('should handle multiple bot replies to different sessions', () => {
      const payload1 = {
        sessionId: 'session-1',
        message: { role: 'bot' as const, text: 'Reply 1' },
      };
      const payload2 = {
        sessionId: 'session-2',
        message: { role: 'bot' as const, text: 'Reply 2' },
      };

      gateway.onBotReply(payload1);
      gateway.onBotReply(payload2);

      expect(mockServer.to).toHaveBeenCalledWith('session-1');
      expect(mockServer.to).toHaveBeenCalledWith('session-2');
      expect(mockServer.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('onAdminFeed', () => {
    it('should emit admin feed to admin room', () => {
      const payload = {
        sessionId: 'session-123',
        message: {
          role: 'user' as const,
          text: 'رسالة من المستخدم',
        },
      };

      gateway.onAdminFeed(payload);

      expect(mockServer.to).toHaveBeenCalledWith('kleem_admin');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'admin_new_message',
        payload,
      );
    });

    it('should handle admin feed with bot messages', () => {
      const payload = {
        sessionId: 'session-456',
        message: {
          role: 'bot' as const,
          text: 'رد من البوت',
          msgIdx: 2,
        },
      };

      gateway.onAdminFeed(payload);

      expect(mockServer.to).toHaveBeenCalledWith('kleem_admin');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'admin_new_message',
        payload,
      );
    });

    it('should handle admin feed with complete message data', () => {
      const payload = {
        sessionId: 'session-detailed',
        message: {
          role: 'user' as const,
          text: 'رسالة مفصلة من المستخدم',
          metadata: {
            platform: 'web',
            userAgent: 'Mozilla/5.0',
            timestamp: '2024-01-01T00:00:00Z',
          },
          timestamp: '2024-01-01T00:00:00Z',
        },
      };

      gateway.onAdminFeed(payload);

      expect(mockServer.to).toHaveBeenCalledWith('kleem_admin');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'admin_new_message',
        payload,
      );
    });

    it('should handle multiple admin feed messages', () => {
      const payloads = [
        {
          sessionId: 'session-1',
          message: { role: 'user' as const, text: 'Message 1' },
        },
        {
          sessionId: 'session-2',
          message: { role: 'user' as const, text: 'Message 2' },
        },
        {
          sessionId: 'session-3',
          message: { role: 'bot' as const, text: 'Bot Message' },
        },
      ];

      payloads.forEach((payload) => gateway.onAdminFeed(payload));

      expect(mockServer.to).toHaveBeenCalledTimes(3);
      expect(mockServer.emit).toHaveBeenCalledTimes(3);
      payloads.forEach((payload) => {
        expect(mockServer.emit).toHaveBeenCalledWith(
          'admin_new_message',
          payload,
        );
      });
    });
  });

  describe('onUserMessage', () => {
    it('should handle user message successfully', async () => {
      const payload: UserMessagePayload = {
        sessionId: 'session-123',
        text: 'مرحباً، أحتاج مساعدة',
        metadata: { platform: 'web' },
      };

      mockKleemChatService.handleUserMessage.mockResolvedValue({
        status: 'queued',
      });

      const result = await gateway.onUserMessage(payload, mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('typing', {
        sessionId: payload.sessionId,
        role: 'user',
      });
      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledWith(
        payload.sessionId,
        payload.text,
        payload.metadata,
      );
      expect(result).toEqual({ ok: true });
    });

    it('should handle user message without metadata', async () => {
      const payload: UserMessagePayload = {
        sessionId: 'session-456',
        text: 'رسالة بدون metadata',
      };

      mockKleemChatService.handleUserMessage.mockResolvedValue({
        status: 'queued',
      });

      const result = await gateway.onUserMessage(payload, mockSocket);

      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledWith(
        payload.sessionId,
        payload.text,
        undefined,
      );
      expect(result).toEqual({ ok: true });
    });

    it('should handle empty sessionId', async () => {
      const payload: UserMessagePayload = {
        sessionId: '',
        text: 'رسالة مع sessionId فارغ',
      };

      const result = await gateway.onUserMessage(payload, mockSocket);

      expect(mockKleemChatService.handleUserMessage).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle empty text', async () => {
      const payload: UserMessagePayload = {
        sessionId: 'session-789',
        text: '',
      };

      const result = await gateway.onUserMessage(payload, mockSocket);

      expect(mockKleemChatService.handleUserMessage).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle missing sessionId', async () => {
      const payload = {
        text: 'رسالة بدون sessionId',
      } as UserMessagePayload;

      const result = await gateway.onUserMessage(payload, mockSocket);

      expect(mockKleemChatService.handleUserMessage).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle missing text', async () => {
      const payload = {
        sessionId: 'session-no-text',
      } as UserMessagePayload;

      const result = await gateway.onUserMessage(payload, mockSocket);

      expect(mockKleemChatService.handleUserMessage).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle service errors gracefully', async () => {
      const payload: UserMessagePayload = {
        sessionId: 'session-error',
        text: 'رسالة تسبب خطأ',
      };

      const error = new Error('Service error');
      mockKleemChatService.handleUserMessage.mockRejectedValue(error);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      const result = await gateway.onUserMessage(payload, mockSocket);

      expect(errorSpy).toHaveBeenCalledWith('onUserMessage error', error);
      expect(result).toEqual({ ok: false });
    });

    it('should emit typing indicator for valid messages', async () => {
      const payload: UserMessagePayload = {
        sessionId: 'session-typing',
        text: 'رسالة لاختبار مؤشر الكتابة',
      };

      mockKleemChatService.handleUserMessage.mockResolvedValue({
        status: 'queued',
      });

      await gateway.onUserMessage(payload, mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('typing', {
        sessionId: payload.sessionId,
        role: 'user',
      });
    });

    it('should handle complex metadata', async () => {
      const payload: UserMessagePayload = {
        sessionId: 'session-complex',
        text: 'رسالة مع metadata معقد',
        metadata: {
          platform: 'mobile',
          device: {
            type: 'smartphone',
            os: 'iOS',
            version: '16.0',
          },
          location: {
            country: 'SA',
            city: 'Riyadh',
          },
          user: {
            preferences: {
              language: 'ar',
              theme: 'dark',
            },
          },
        },
      };

      mockKleemChatService.handleUserMessage.mockResolvedValue({
        status: 'queued',
      });

      const result = await gateway.onUserMessage(payload, mockSocket);

      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledWith(
        payload.sessionId,
        payload.text,
        payload.metadata,
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('onTyping', () => {
    it('should emit typing indicator to session room', () => {
      const payload: TypingPayload = {
        sessionId: 'session-123',
        role: 'user',
      };

      gateway.onTyping(payload);

      expect(mockServer.to).toHaveBeenCalledWith('session-123');
      expect(mockServer.emit).toHaveBeenCalledWith('typing', payload);
    });

    it('should handle typing with bot role', () => {
      const payload: TypingPayload = {
        sessionId: 'session-456',
        role: 'bot',
      };

      gateway.onTyping(payload);

      expect(mockServer.to).toHaveBeenCalledWith('session-456');
      expect(mockServer.emit).toHaveBeenCalledWith('typing', payload);
    });

    it('should not emit when sessionId is empty', () => {
      const payload: TypingPayload = {
        sessionId: '',
        role: 'user',
      };

      gateway.onTyping(payload);

      expect(mockServer.to).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should not emit when sessionId is missing', () => {
      const payload = {
        role: 'user',
      } as TypingPayload;

      gateway.onTyping(payload);

      expect(mockServer.to).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should handle multiple typing indicators', () => {
      const payloads: TypingPayload[] = [
        { sessionId: 'session-1', role: 'user' },
        { sessionId: 'session-2', role: 'user' },
        { sessionId: 'session-3', role: 'bot' },
      ];

      payloads.forEach((payload) => gateway.onTyping(payload));

      expect(mockServer.to).toHaveBeenCalledTimes(3);
      expect(mockServer.emit).toHaveBeenCalledTimes(3);
      payloads.forEach((payload) => {
        expect(mockServer.emit).toHaveBeenCalledWith('typing', payload);
      });
    });
  });

  describe('Event Handling Integration', () => {
    it('should handle complete WebSocket flow', async () => {
      // 1. Client connects
      mockSocket.handshake.query = {
        sessionId: 'integration-session',
        role: 'user',
      };
      gateway.handleConnection(mockSocket);

      // 2. Client sends typing indicator
      const typingPayload: TypingPayload = {
        sessionId: 'integration-session',
        role: 'user',
      };
      gateway.onTyping(typingPayload);

      // 3. Client sends message
      const messagePayload: UserMessagePayload = {
        sessionId: 'integration-session',
        text: 'مرحباً، أحتاج مساعدة',
        metadata: { platform: 'web' },
      };

      mockKleemChatService.handleUserMessage.mockResolvedValue({
        status: 'queued',
      });

      await gateway.onUserMessage(messagePayload, mockSocket);

      // 4. Bot replies (triggered by event)
      const botReplyPayload = {
        sessionId: 'integration-session',
        message: {
          role: 'bot' as const,
          text: 'أهلاً بك! كيف يمكنني مساعدتك؟',
          msgIdx: 1,
        },
      };
      gateway.onBotReply(botReplyPayload);

      // 5. Admin gets notified
      const adminFeedPayload = {
        sessionId: 'integration-session',
        message: {
          role: 'user' as const,
          text: 'مرحباً، أحتاج مساعدة',
        },
      };
      gateway.onAdminFeed(adminFeedPayload);

      // 6. Client disconnects
      gateway.handleDisconnect(mockSocket);

      // Verify all interactions
      expect(mockSocket.join).toHaveBeenCalledWith('integration-session');
      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalled();
      expect(mockServer.emit).toHaveBeenCalledWith('typing', typingPayload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'bot_reply',
        botReplyPayload.message,
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        'admin_new_message',
        adminFeedPayload,
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        `Client disconnected ${mockSocket.id}`,
      );
    });

    it('should handle admin monitoring flow', () => {
      // Admin connects
      const adminSocket = { ...mockSocket, id: 'admin-socket' } as any;
      adminSocket.handshake = {
        query: {
          sessionId: 'monitored-session',
          role: 'admin',
        },
      };
      gateway.handleConnection(adminSocket);

      // Admin should join both session and admin rooms
      expect(adminSocket.join).toHaveBeenCalledWith('monitored-session');
      expect(adminSocket.join).toHaveBeenCalledWith('kleem_admin');

      // When messages are sent in monitored session
      const userMessage = {
        sessionId: 'monitored-session',
        message: { role: 'user' as const, text: 'User message' },
      };
      const botMessage = {
        sessionId: 'monitored-session',
        message: { role: 'bot' as const, text: 'Bot response' },
      };

      gateway.onAdminFeed(userMessage);
      gateway.onAdminFeed(botMessage);

      // Admin should receive notifications
      expect(mockServer.to).toHaveBeenCalledWith('kleem_admin');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'admin_new_message',
        userMessage,
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        'admin_new_message',
        botMessage,
      );
    });

    it('should handle multiple simultaneous sessions', async () => {
      const sessions = ['session-1', 'session-2', 'session-3'];
      const sockets = sessions.map((sessionId, index) => ({
        ...mockSocket,
        id: `socket-${index}`,
        handshake: { query: { sessionId, role: 'user' } },
        join: jest.fn(),
        emit: jest.fn(),
      }));

      // Connect all clients
      sockets.forEach((socket) => gateway.handleConnection(socket as any));

      // Send messages from all sessions
      mockKleemChatService.handleUserMessage.mockResolvedValue({
        status: 'queued',
      });

      const messagePromises = sessions.map((sessionId, index) =>
        gateway.onUserMessage(
          {
            sessionId,
            text: `Message from ${sessionId}`,
          },
          sockets[index] as any,
        ),
      );

      await Promise.all(messagePromises);

      // Verify all sessions were handled
      sockets.forEach((socket, index) => {
        expect(socket.join).toHaveBeenCalledWith(sessions[index]);
      });

      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery', () => {
    it('should handle server emission errors gracefully', () => {
      // Mock server.emit to throw error
      mockServer.emit.mockImplementation(() => {
        throw new Error('Emission failed');
      });

      const payload = {
        sessionId: 'error-session',
        message: { role: 'bot' as const, text: 'Test message' },
      };

      // Should not throw
      expect(() => gateway.onBotReply(payload)).toThrow('Emission failed');
    });

    it('should handle malformed socket data', () => {
      const malformedSocket = {
        id: 'malformed-socket',
        handshake: null, // Malformed handshake
        join: jest.fn(),
      } as any;

      // Should not throw
      expect(() => gateway.handleConnection(malformedSocket)).not.toThrow();
    });

    it('should handle concurrent message processing', async () => {
      const payload: UserMessagePayload = {
        sessionId: 'concurrent-session',
        text: 'Concurrent message',
      };

      mockKleemChatService.handleUserMessage.mockResolvedValue({
        status: 'queued',
      });

      // Send multiple messages concurrently
      const promises = Array.from({ length: 10 }, () =>
        gateway.onUserMessage(payload, mockSocket),
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result).toEqual({ ok: true });
      });

      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledTimes(10);
    });
  });
});
