// test/e2e/auth/jwt-websocket.e2e.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../../../src/app.module';

describe('JWT & WebSocket E2E (H4)', () => {
  let app: INestApplication;
  let testUser: { email: string; password: string; userId?: string };
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // إعداد مستخدم اختبار
    testUser = {
      email: 'test@example.com',
      password: 'testpassword123',
    };
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * ✅ H4: اختبار login → access+refresh
   */
  describe('JWT Authentication Flow', () => {
    it('should login and return access + refresh tokens', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('refreshToken');
      expect(loginResponse.body).toHaveProperty('user');

      // حفظ التوكنات للاختبارات التالية
      accessToken = loginResponse.body.accessToken;
      refreshToken = loginResponse.body.refreshToken;
      testUser.userId = loginResponse.body.user.id;
    });

    /**
     * ✅ H4: اختبار refresh (تدوير) ثم إعادة استخدام القديم → 401
     */
    it('should rotate tokens and invalidate old refresh token', async () => {
      const oldRefreshToken = refreshToken;

      // تدوير التوكنات
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');

      // حفظ التوكنات الجديدة
      const newAccessToken = refreshResponse.body.accessToken;
      const newRefreshToken = refreshResponse.body.refreshToken;

      // محاولة استخدام الـ refresh token القديم → يجب أن تفشل
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);

      // التحقق من أن التوكنات الجديدة تعمل
      await request(app.getHttpServer())
        .get('/api/auth/profile') // أو أي endpoint محمي
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      // تحديث للاختبارات التالية
      accessToken = newAccessToken;
      refreshToken = newRefreshToken;
    });

    /**
     * ✅ H4: اختبار logout/logout-all → refresh يفقد الصلاحية
     */
    it('should invalidate refresh token on logout', async () => {
      // تسجيل الخروج
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // محاولة استخدام refresh token بعد logout → يجب أن تفشل
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should logout from all devices', async () => {
      // تسجيل دخول جديد
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      const newAccessToken = loginResponse.body.accessToken;
      const newRefreshToken = loginResponse.body.refreshToken;

      // تسجيل خروج من جميع الأجهزة
      await request(app.getHttpServer())
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      // محاولة استخدام refresh token → يجب أن تفشل
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: newRefreshToken })
        .expect(401);
    });
  });

  /**
   * ✅ H4: اختبار WS بـ token صالح/منتهي/مبطَل
   */
  describe('WebSocket Authentication', () => {
    let validAccessToken: string;
    let wsClient: Socket;

    beforeEach(async () => {
      // الحصول على token صالح
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      validAccessToken = loginResponse.body.accessToken;
    });

    afterEach(() => {
      if (wsClient?.connected) {
        wsClient.disconnect();
      }
    });

    it('should connect WebSocket with valid token', (done) => {
      wsClient = io(`http://localhost:${app.get('PORT') || 3000}/api/chat`, {
        auth: { token: validAccessToken },
        timeout: 5000,
      });

      wsClient.on('connect', () => {
        expect(wsClient.connected).toBe(true);
        done();
      });

      wsClient.on('connect_error', (error) => {
        done(new Error(`Connection failed: ${error.message}`));
      });
    });

    it('should reject WebSocket with invalid token', (done) => {
      wsClient = io(`http://localhost:${app.get('PORT') || 3000}/api/chat`, {
        auth: { token: 'invalid-token-123' },
        timeout: 5000,
      });

      wsClient.on('connect', () => {
        done(new Error('Should not connect with invalid token'));
      });

      wsClient.on('error', (error) => {
        expect(error.message).toBe('Unauthorized');
        done();
      });

      wsClient.on('disconnect', () => {
        // متوقع - قطع الاتصال بسبب token غير صالح
        done();
      });
    });

    it('should reject WebSocket without token', (done) => {
      wsClient = io(`http://localhost:${app.get('PORT') || 3000}/api/chat`, {
        timeout: 5000,
      });

      wsClient.on('connect', () => {
        done(new Error('Should not connect without token'));
      });

      wsClient.on('error', (error) => {
        expect(error.message).toBe('Unauthorized');
        done();
      });

      wsClient.on('disconnect', () => {
        // متوقع
        done();
      });
    });

    it('should disconnect WebSocket when token is revoked', async () => {
      return new Promise<void>((resolve, reject) => {
        wsClient = io(`http://localhost:${app.get('PORT') || 3000}/api/chat`, {
          auth: { token: validAccessToken },
          timeout: 5000,
        });

        wsClient.on('connect', async () => {
          try {
            // إبطال التوكن عبر logout
            await request(app.getHttpServer())
              .post('/api/auth/logout-all')
              .set('Authorization', `Bearer ${validAccessToken}`)
              .expect(200);

            // محاولة إرسال رسالة → يجب قطع الاتصال
            wsClient.emit('join', { sessionId: 'test-session' });
          } catch (error) {
            reject(error);
          }
        });

        wsClient.on('disconnect', () => {
          resolve(); // متوقع بعد إبطال التوكن
        });

        wsClient.on('error', () => {
          resolve(); // أيضاً متوقع
        });

        setTimeout(() => {
          reject(new Error('Timeout waiting for disconnect'));
        }, 10000);
      });
    });
  });

  /**
   * اختبارات أمان WebSocket متقدمة
   */
  describe('WebSocket Security Features', () => {
    it('should enforce rate limiting on WebSocket messages', (done) => {
      wsClient = io(`http://localhost:${app.get('PORT') || 3000}/api/chat`, {
        auth: { token: validAccessToken },
      });

      wsClient.on('connect', () => {
        // إرسال رسائل كثيرة بسرعة
        for (let i = 0; i < 15; i++) {
          wsClient.emit('join', { sessionId: `test-session-${i}` });
        }
      });

      wsClient.on('rate_limit_exceeded', (data) => {
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('retryAfter');
        done();
      });

      wsClient.on('disconnect', () => {
        // قد يقطع الاتصال بسبب التجاوز المفرط
        done();
      });

      setTimeout(() => {
        done(new Error('Should have received rate limit exceeded event'));
      }, 5000);
    });
  });
});
