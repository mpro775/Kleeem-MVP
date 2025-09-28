import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

import type { INestApplication } from '@nestjs/common';

describe('CORS (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.CORS_ALLOW_ALL = 'false';
    process.env.CORS_ALLOW_EMPTY_ORIGIN = 'false';
    process.env.CORS_STATIC_ORIGINS =
      'https://docs.kaleem.ai,http://localhost:5173';
    process.env.CORS_ALLOW_SUBDOMAIN_BASE = 'kaleem-ai.com';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows allowed origin', async () => {
    const origin = 'https://docs.kaleem.ai';
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', origin);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
  });

  it('blocks disallowed origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('preflight ok', async () => {
    const origin = 'http://localhost:5173';
    const res = await request(app.getHttpServer())
      .options('/api/health')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'GET');
    expect([200, 204]).toContain(res.status);
  });
});
