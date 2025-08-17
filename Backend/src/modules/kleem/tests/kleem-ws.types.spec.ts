import {
  KleemRole,
  KleemAdminRole,
  KleemWsMessage,
  UserMessagePayload,
  TypingPayload,
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
} from '../ws/kleem-ws.types';

describe('Kleem WebSocket Types', () => {
  describe('KleemRole', () => {
    it('should have valid role values', () => {
      const userRole: KleemRole = 'user';
      const botRole: KleemRole = 'bot';

      expect(userRole).toBe('user');
      expect(botRole).toBe('bot');
    });

    it('should be assignable to string', () => {
      const role: KleemRole = 'user';
      const roleAsString: string = role;

      expect(roleAsString).toBe('user');
    });
  });

  describe('KleemAdminRole', () => {
    it('should have valid admin role values', () => {
      const adminRole: KleemAdminRole = 'admin';
      const agentRole: KleemAdminRole = 'agent';
      const guestRole: KleemAdminRole = 'guest';

      expect(adminRole).toBe('admin');
      expect(agentRole).toBe('agent');
      expect(guestRole).toBe('guest');
    });

    it('should be assignable to string', () => {
      const role: KleemAdminRole = 'admin';
      const roleAsString: string = role;

      expect(roleAsString).toBe('admin');
    });
  });

  describe('KleemWsMessage', () => {
    it('should create valid message with required fields', () => {
      const message: KleemWsMessage = {
        role: 'user',
        text: 'مرحباً، كيف يمكنني المساعدة؟',
      };

      expect(message.role).toBe('user');
      expect(message.text).toBe('مرحباً، كيف يمكنني المساعدة؟');
      expect(message.msgIdx).toBeUndefined();
      expect(message.metadata).toBeUndefined();
      expect(message.timestamp).toBeUndefined();
    });

    it('should create valid message with all fields', () => {
      const message: KleemWsMessage = {
        role: 'bot',
        text: 'أهلاً بك! كيف يمكنني مساعدتك اليوم؟',
        msgIdx: 1,
        metadata: {
          source: 'knowledge_base',
          confidence: 0.95,
        },
        timestamp: '2024-01-01T00:00:00Z',
      };

      expect(message.role).toBe('bot');
      expect(message.text).toBe('أهلاً بك! كيف يمكنني مساعدتك اليوم؟');
      expect(message.msgIdx).toBe(1);
      expect(message.metadata).toEqual({
        source: 'knowledge_base',
        confidence: 0.95,
      });
      expect(message.timestamp).toBe('2024-01-01T00:00:00Z');
    });

    it('should handle user messages', () => {
      const userMessage: KleemWsMessage = {
        role: 'user',
        text: 'أريد معرفة المزيد عن خدماتكم',
        metadata: {
          platform: 'web',
          userAgent: 'Mozilla/5.0',
        },
      };

      expect(userMessage.role).toBe('user');
      expect(userMessage.text).toBe('أريد معرفة المزيد عن خدماتكم');
      expect(userMessage.metadata).toHaveProperty('platform', 'web');
      expect(userMessage.metadata).toHaveProperty('userAgent', 'Mozilla/5.0');
    });

    it('should handle bot messages with index', () => {
      const botMessage: KleemWsMessage = {
        role: 'bot',
        text: 'يسعدني أن أساعدك! نحن نقدم خدمات الذكاء الاصطناعي',
        msgIdx: 3,
        timestamp: new Date().toISOString(),
      };

      expect(botMessage.role).toBe('bot');
      expect(botMessage.msgIdx).toBe(3);
      expect(botMessage.timestamp).toBeDefined();
    });

    it('should handle empty metadata', () => {
      const message: KleemWsMessage = {
        role: 'user',
        text: 'رسالة بدون metadata',
        metadata: {},
      };

      expect(message.metadata).toEqual({});
    });

    it('should handle complex metadata', () => {
      const message: KleemWsMessage = {
        role: 'bot',
        text: 'رد معقد',
        metadata: {
          processing: {
            duration: 150,
            model: 'gpt-4',
            tokens: 45,
          },
          context: {
            sessionLength: 5,
            userProfile: {
              language: 'ar',
              region: 'SA',
            },
          },
          features: ['rag', 'intent_detection', 'cta_analysis'],
        },
      };

      expect(message.metadata).toHaveProperty('processing');
      expect(message.metadata).toHaveProperty('context');
      expect(message.metadata).toHaveProperty('features');
      expect((message.metadata as any).features).toHaveLength(3);
    });

    it('should handle Arabic and English text', () => {
      const arabicMessage: KleemWsMessage = {
        role: 'user',
        text: 'مرحباً، أريد الاستفسار عن الأسعار والباقات المتوفرة',
      };

      const englishMessage: KleemWsMessage = {
        role: 'bot',
        text: 'Hello! I can help you with pricing and available packages.',
      };

      const mixedMessage: KleemWsMessage = {
        role: 'user',
        text: 'Hello مرحباً، I need مساعدة with my account',
      };

      expect(arabicMessage.text).toContain('مرحباً');
      expect(englishMessage.text).toContain('Hello');
      expect(mixedMessage.text).toContain('Hello');
      expect(mixedMessage.text).toContain('مرحباً');
    });

    it('should handle special characters and emojis', () => {
      const messageWithEmojis: KleemWsMessage = {
        role: 'bot',
        text: 'مرحباً 👋 كيف يمكنني مساعدتك اليوم؟ 😊',
        metadata: {
          hasEmojis: true,
        },
      };

      expect(messageWithEmojis.text).toContain('👋');
      expect(messageWithEmojis.text).toContain('😊');
      expect((messageWithEmojis.metadata as any).hasEmojis).toBe(true);
    });
  });

  describe('UserMessagePayload', () => {
    it('should create valid payload with required fields', () => {
      const payload: UserMessagePayload = {
        sessionId: 'session-123',
        text: 'مرحباً',
      };

      expect(payload.sessionId).toBe('session-123');
      expect(payload.text).toBe('مرحباً');
      expect(payload.metadata).toBeUndefined();
    });

    it('should create valid payload with metadata', () => {
      const payload: UserMessagePayload = {
        sessionId: 'session-456',
        text: 'أريد المساعدة',
        metadata: {
          platform: 'mobile',
          device: 'iPhone',
          timestamp: Date.now(),
        },
      };

      expect(payload.sessionId).toBe('session-456');
      expect(payload.text).toBe('أريد المساعدة');
      expect(payload.metadata).toHaveProperty('platform', 'mobile');
      expect(payload.metadata).toHaveProperty('device', 'iPhone');
      expect(payload.metadata).toHaveProperty('timestamp');
    });

    it('should handle long session IDs', () => {
      const longSessionId = 'session-' + 'a'.repeat(100);
      const payload: UserMessagePayload = {
        sessionId: longSessionId,
        text: 'test message',
      };

      expect(payload.sessionId).toBe(longSessionId);
      expect(payload.sessionId.length).toBe(108); // 'session-' + 100 'a's
    });

    it('should handle empty text', () => {
      const payload: UserMessagePayload = {
        sessionId: 'session-empty',
        text: '',
      };

      expect(payload.text).toBe('');
    });

    it('should handle complex metadata structures', () => {
      const payload: UserMessagePayload = {
        sessionId: 'session-complex',
        text: 'Complex metadata test',
        metadata: {
          user: {
            id: 'user-123',
            preferences: {
              language: 'ar',
              theme: 'dark',
              notifications: true,
            },
          },
          session: {
            startTime: '2024-01-01T00:00:00Z',
            messageCount: 5,
            lastActivity: '2024-01-01T00:05:00Z',
          },
          device: {
            type: 'mobile',
            os: 'iOS',
            version: '17.0',
            screenSize: {
              width: 390,
              height: 844,
            },
          },
        },
      };

      expect(payload.metadata).toHaveProperty('user');
      expect(payload.metadata).toHaveProperty('session');
      expect(payload.metadata).toHaveProperty('device');
      expect((payload.metadata as any).user.preferences.language).toBe('ar');
      expect((payload.metadata as any).device.screenSize.width).toBe(390);
    });
  });

  describe('TypingPayload', () => {
    it('should create valid typing payload', () => {
      const payload: TypingPayload = {
        sessionId: 'session-typing',
        role: 'user',
      };

      expect(payload.sessionId).toBe('session-typing');
      expect(payload.role).toBe('user');
    });

    it('should handle bot typing', () => {
      const payload: TypingPayload = {
        sessionId: 'session-bot-typing',
        role: 'bot',
      };

      expect(payload.sessionId).toBe('session-bot-typing');
      expect(payload.role).toBe('bot');
    });

    it('should be assignable from role types', () => {
      const userRole: KleemRole = 'user';
      const botRole: KleemRole = 'bot';

      const userTyping: TypingPayload = {
        sessionId: 'session-1',
        role: userRole,
      };

      const botTyping: TypingPayload = {
        sessionId: 'session-2',
        role: botRole,
      };

      expect(userTyping.role).toBe('user');
      expect(botTyping.role).toBe('bot');
    });
  });

  describe('ServerToClientEvents', () => {
    it('should define bot_reply event correctly', () => {
      // This is a compile-time test to ensure the interface is correct
      const events: ServerToClientEvents = {
        bot_reply: {
          role: 'bot',
          text: 'رد من البوت',
          msgIdx: 1,
        },
        message: {
          role: 'user',
          text: 'رسالة عامة',
        },
        typing: {
          sessionId: 'session-123',
          role: 'user',
        },
        admin_new_message: {
          sessionId: 'session-456',
          message: {
            role: 'user',
            text: 'رسالة جديدة للمشرف',
          },
        },
      };

      expect(events.bot_reply.role).toBe('bot');
      expect(events.bot_reply.text).toBe('رد من البوت');
      expect(events.bot_reply.msgIdx).toBe(1);

      expect(events.message.role).toBe('user');
      expect(events.message.text).toBe('رسالة عامة');

      expect(events.typing.sessionId).toBe('session-123');
      expect(events.typing.role).toBe('user');

      expect(events.admin_new_message.sessionId).toBe('session-456');
      expect(events.admin_new_message.message.role).toBe('user');
      expect(events.admin_new_message.message.text).toBe('رسالة جديدة للمشرف');
    });

    it('should handle all event types correctly', () => {
      const botReply: ServerToClientEvents['bot_reply'] = {
        role: 'bot',
        text: 'إجابة البوت',
        msgIdx: 2,
        metadata: { confidence: 0.9 },
        timestamp: '2024-01-01T00:00:00Z',
      };

      const generalMessage: ServerToClientEvents['message'] = {
        role: 'user',
        text: 'رسالة المستخدم',
      };

      const typingIndicator: ServerToClientEvents['typing'] = {
        sessionId: 'session-typing',
        role: 'bot',
      };

      const adminNotification: ServerToClientEvents['admin_new_message'] = {
        sessionId: 'session-admin',
        message: {
          role: 'bot',
          text: 'إشعار للمشرف',
          msgIdx: 5,
        },
      };

      expect(botReply.role).toBe('bot');
      expect(generalMessage.role).toBe('user');
      expect(typingIndicator.role).toBe('bot');
      expect(adminNotification.message.role).toBe('bot');
    });
  });

  describe('ClientToServerEvents', () => {
    it('should define user_message event correctly', () => {
      const userMessage: ClientToServerEvents['user_message'] = {
        sessionId: 'session-user',
        text: 'رسالة من المستخدم',
        metadata: {
          platform: 'web',
        },
      };

      expect(userMessage.sessionId).toBe('session-user');
      expect(userMessage.text).toBe('رسالة من المستخدم');
      expect(userMessage.metadata).toHaveProperty('platform', 'web');
    });

    it('should define typing event correctly', () => {
      const typing: ClientToServerEvents['typing'] = {
        sessionId: 'session-typing',
        role: 'user',
      };

      expect(typing.sessionId).toBe('session-typing');
      expect(typing.role).toBe('user');
    });

    it('should define join event correctly', () => {
      const join: ClientToServerEvents['join'] = {
        sessionId: 'session-join',
        role: 'admin',
        token: 'auth-token-123',
      };

      expect(join).toHaveProperty('sessionId', 'session-join');
      expect(join).toHaveProperty('role', 'admin');
      expect(join).toHaveProperty('token', 'auth-token-123');
    });

    it('should handle optional join fields', () => {
      const minimalJoin: ClientToServerEvents['join'] = {
        sessionId: 'session-minimal',
      };

      const partialJoin: ClientToServerEvents['join'] = {
        sessionId: 'session-partial',
        role: 'guest',
      };

      expect(minimalJoin.sessionId).toBe('session-minimal');
      expect(minimalJoin.role).toBeUndefined();
      expect(minimalJoin.token).toBeUndefined();

      expect(partialJoin.sessionId).toBe('session-partial');
      expect(partialJoin.role).toBe('guest');
      expect(partialJoin.token).toBeUndefined();
    });

    it('should handle all admin roles in join event', () => {
      const adminJoin: ClientToServerEvents['join'] = {
        sessionId: 'session-admin',
        role: 'admin',
      };

      const agentJoin: ClientToServerEvents['join'] = {
        sessionId: 'session-agent',
        role: 'agent',
      };

      const guestJoin: ClientToServerEvents['join'] = {
        sessionId: 'session-guest',
        role: 'guest',
      };

      expect(adminJoin.role).toBe('admin');
      expect(agentJoin.role).toBe('agent');
      expect(guestJoin.role).toBe('guest');
    });
  });

  describe('SocketData', () => {
    it('should create valid socket data with all fields', () => {
      const socketData: SocketData = {
        sessionId: 'socket-session-123',
        role: 'admin',
      };

      expect(socketData.sessionId).toBe('socket-session-123');
      expect(socketData.role).toBe('admin');
    });

    it('should create valid socket data with optional fields', () => {
      const minimalSocketData: SocketData = {};

      const partialSocketData: SocketData = {
        sessionId: 'partial-session',
      };

      const roleOnlySocketData: SocketData = {
        role: 'agent',
      };

      expect(minimalSocketData.sessionId).toBeUndefined();
      expect(minimalSocketData.role).toBeUndefined();

      expect(partialSocketData.sessionId).toBe('partial-session');
      expect(partialSocketData.role).toBeUndefined();

      expect(roleOnlySocketData.sessionId).toBeUndefined();
      expect(roleOnlySocketData.role).toBe('agent');
    });

    it('should handle all admin role types', () => {
      const adminData: SocketData = { role: 'admin' };
      const agentData: SocketData = { role: 'agent' };
      const guestData: SocketData = { role: 'guest' };

      expect(adminData.role).toBe('admin');
      expect(agentData.role).toBe('agent');
      expect(guestData.role).toBe('guest');
    });
  });

  describe('Type Compatibility and Integration', () => {
    it('should allow KleemRole in TypingPayload', () => {
      const role: KleemRole = 'user';
      const payload: TypingPayload = {
        sessionId: 'test',
        role,
      };

      expect(payload.role).toBe('user');
    });

    it('should allow KleemWsMessage in ServerToClientEvents', () => {
      const message: KleemWsMessage = {
        role: 'bot',
        text: 'Test message',
      };

      const events: Partial<ServerToClientEvents> = {
        bot_reply: message,
        message,
      };

      expect(events.bot_reply).toBe(message);
      expect(events.message).toBe(message);
    });

    it('should allow UserMessagePayload in ClientToServerEvents', () => {
      const userMessage: UserMessagePayload = {
        sessionId: 'test',
        text: 'User message',
      };

      const events: Partial<ClientToServerEvents> = {
        user_message: userMessage,
      };

      expect(events.user_message).toBe(userMessage);
    });

    it('should handle nested message structures', () => {
      const wsMessage: KleemWsMessage = {
        role: 'user',
        text: 'Nested test',
      };

      const adminEvent: ServerToClientEvents['admin_new_message'] = {
        sessionId: 'admin-session',
        message: wsMessage,
      };

      expect(adminEvent.message.role).toBe('user');
      expect(adminEvent.message.text).toBe('Nested test');
    });

    it('should maintain type safety across interfaces', () => {
      // This test ensures that all types work together correctly
      const sessionId = 'type-safety-test';

      // Create client event
      const clientMessage: ClientToServerEvents['user_message'] = {
        sessionId,
        text: 'Test message from client',
        metadata: { source: 'web' },
      };

      // Create server response
      const serverMessage: ServerToClientEvents['bot_reply'] = {
        role: 'bot',
        text: 'Response from server',
        msgIdx: 1,
      };

      // Create admin notification
      const adminNotification: ServerToClientEvents['admin_new_message'] = {
        sessionId,
        message: {
          role: 'user',
          text: clientMessage.text,
          metadata: clientMessage.metadata,
        },
      };

      // Verify all types work together
      expect(clientMessage.sessionId).toBe(sessionId);
      expect(serverMessage.role).toBe('bot');
      expect(adminNotification.sessionId).toBe(sessionId);
      expect(adminNotification.message.text).toBe(clientMessage.text);
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle complete chat flow types', () => {
      // User joins
      const joinEvent: ClientToServerEvents['join'] = {
        sessionId: 'chat-flow-session',
        role: 'guest',
      };

      // User starts typing
      const startTyping: ClientToServerEvents['typing'] = {
        sessionId: 'chat-flow-session',
        role: 'user',
      };

      // User sends message
      const userMessage: ClientToServerEvents['user_message'] = {
        sessionId: 'chat-flow-session',
        text: 'مرحباً، أحتاج مساعدة',
        metadata: {
          platform: 'web',
          timestamp: Date.now(),
        },
      };

      // Bot responds
      const botResponse: ServerToClientEvents['bot_reply'] = {
        role: 'bot',
        text: 'أهلاً بك! كيف يمكنني مساعدتك؟',
        msgIdx: 1,
        timestamp: new Date().toISOString(),
      };

      // Admin gets notified
      const adminNotif: ServerToClientEvents['admin_new_message'] = {
        sessionId: 'chat-flow-session',
        message: {
          role: 'user',
          text: userMessage.text,
          metadata: userMessage.metadata,
        },
      };

      // Verify flow
      expect(joinEvent.sessionId).toBe('chat-flow-session');
      expect(startTyping.role).toBe('user');
      expect(userMessage.text).toContain('مرحباً');
      expect(botResponse.role).toBe('bot');
      expect(adminNotif.message.text).toBe(userMessage.text);
    });

    it('should handle multilingual content', () => {
      const multilingualMessage: KleemWsMessage = {
        role: 'user',
        text: 'Hello مرحباً Bonjour こんにちは',
        metadata: {
          languages: ['en', 'ar', 'fr', 'ja'],
          detectedLanguage: 'mixed',
        },
      };

      expect(multilingualMessage.text).toContain('Hello');
      expect(multilingualMessage.text).toContain('مرحباً');
      expect(multilingualMessage.text).toContain('Bonjour');
      expect(multilingualMessage.text).toContain('こんにちは');
      expect((multilingualMessage.metadata as any).languages).toHaveLength(4);
    });

    it('should handle error scenarios in types', () => {
      const errorMessage: KleemWsMessage = {
        role: 'bot',
        text: 'عذراً، حدث خطأ في النظام',
        metadata: {
          error: {
            code: 'SYSTEM_ERROR',
            message: 'Internal server error',
            timestamp: Date.now(),
          },
          retry: true,
        },
      };

      expect(errorMessage.text).toContain('عذراً');
      expect((errorMessage.metadata as any).error.code).toBe('SYSTEM_ERROR');
      expect((errorMessage.metadata as any).retry).toBe(true);
    });
  });
});
