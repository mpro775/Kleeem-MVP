// test/e2e/auth/jwt-websocket.e2e.spec.ts
import { Test } from '@nestjs/testing';
import { io } from 'socket.io-client';
import request from 'supertest';

import { AppModule } from '../../../src/app.module';

import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import type { AddressInfo } from 'net';
import type { Socket } from 'socket.io-client';

describe('JWT & WebSocket E2E (H4)', () => {
  let app: INestApplication;
  let testUser: { email: string; password: string; userId?: string };
  let accessToken: string;
  let refreshToken: string;
  let wsClient: Socket;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    // استمع على منفذ عشوائي أثناء الاختبار للحصول على عنوان URL ثابت للـ WS
    await app.listen(0);
    const addr = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://localhost:${addr.port}`;

    // إعداد مستخدم اختبار
    testUser = {
      email: 'test@example.com',
      password: 'testpassword123',
    };
  });

  afterAll(async () => {
    if (wsClient?.connected) {
      wsClient.disconnect();
    }
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
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.status).toBe(200);

      // محاولة استخدام refresh token بعد logout → يجب أن تفشل
      const response2 = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(response2.status).toBe(401);
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
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(response.status).toBe(200);

      // محاولة استخدام refresh token → يجب أن تفشل
      const response2 = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: newRefreshToken })
        .expect(401);

      expect(response2.status).toBe(401);
    });
  });

  /**
   * ✅ H4: اختبار WS بـ token صالح/منتهي/مبطَل
   */
  describe('WebSocket Authentication', () => {
    let validAccessToken: string;

    beforeEach(async () => {
      // الحصول على token صالح
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      validAccessToken = loginResponse.body.accessToken;
    });

    it('should connect WebSocket with valid token', async () => {
      await new Promise<void>((resolve, reject) => {
        wsClient = io(`${baseUrl}/api/chat`, {
          auth: { token: validAccessToken },
          timeout: 5000,
        });

        wsClient.on('connect', () => {
          expect(wsClient.connected).toBe(true);
          resolve();
        });

        wsClient.on('connect_error', (error: Error) => {
          reject(new Error(`Connection failed: ${error.message}`));
        });
      });
    });

    it('should reject WebSocket with invalid token', async () => {
      await new Promise<void>((resolve, reject) => {
        wsClient = io(`${baseUrl}/api/chat`, {
          auth: { token: 'invalid-token-123' },
          timeout: 5000,
        });

        wsClient.on('connect', () => {
          reject(new Error('Should not connect with invalid token'));
        });

        wsClient.on('connect_error', (error: any) => {
          // أغلب الحالات ترجع connect_error مع 401
          expect(error?.message ?? '').toMatch(/unauthorized/i);
          resolve();
        });

        wsClient.on('error', (error: any) => {
          expect(String(error?.message ?? '')).toMatch(/unauthorized/i);
          resolve();
        });

        wsClient.on('disconnect', () => {
          // متوقع - قطع الاتصال بسبب token غير صالح
          resolve();
        });
      });
    });

    it('should reject WebSocket without token', async () => {
      await new Promise<void>((resolve, reject) => {
        wsClient = io(`${baseUrl}/api/chat`, {
          timeout: 5000,
        });

        wsClient.on('connect', () => {
          reject(new Error('Should not connect without token'));
        });

        wsClient.on('connect_error', (error: any) => {
          expect(String(error?.message ?? '')).toMatch(/unauthorized/i);
          resolve();
        });

        wsClient.on('error', (error: any) => {
          expect(String(error?.message ?? '')).toMatch(/unauthorized/i);
          resolve();
        });

        wsClient.on('disconnect', () => {
          // متوقع
          resolve();
        });
      });
    });

    it('should disconnect WebSocket when token is revoked', async () => {
      await new Promise<void>((resolve, reject) => {
        wsClient = io(`${baseUrl}/api/chat`, {
          auth: { token: validAccessToken },
          timeout: 5000,
        });

        wsClient.on('connect', async () => {
          try {
            // إبطال التوكن عبر logout-all
            await request(app.getHttpServer())
              .post('/api/auth/logout-all')
              .set('Authorization', `Bearer ${validAccessToken}`)
              .expect(200);

            // أي حدث بعد الإبطال يجب أن يؤدي لقطع الاتصال
            wsClient.emit('join', { sessionId: 'test-session' });
          } catch (error) {
            reject(error as Error);
          }
        });

        wsClient.on('disconnect', (reason) => {
          expect(wsClient.connected).toBe(false);
          expect(reason).toBeDefined();
          resolve(); // متوقع بعد إبطال التوكن
        });

        wsClient.on('error', (error) => {
          expect(error).toBeDefined();
          expect(wsClient.connected).toBe(false);
          resolve(); // أيضاً متوقع
        });

        // حماية من التعليق
        setTimeout(() => {
          reject(new Error('Timeout waiting for disconnect'));
        }, 10000);
      });
    });
  });
});
