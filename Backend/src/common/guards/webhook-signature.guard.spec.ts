import * as crypto from 'crypto';

import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { ChannelProvider } from '../../modules/channels/schemas/channel.schema';

import {
  WebhookSignatureGuard,
  timingSafeEqStr,
} from './webhook-signature.guard';

import type { ChannelsRepository } from '../../modules/channels/repositories/channels.repository';

describe('WebhookSignatureGuard', () => {
  let guard: WebhookSignatureGuard;
  let channelsRepo: jest.Mocked<ChannelsRepository>;

  beforeEach(async () => {
    const mockChannelsRepo = {
      findByIdWithSecrets: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookSignatureGuard,
        {
          provide: 'ChannelsRepository',
          useValue: mockChannelsRepo,
        },
      ],
    }).compile();

    guard = module.get<WebhookSignatureGuard>(WebhookSignatureGuard);
    channelsRepo = module.get('ChannelsRepository');

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        baseUrl: '',
        path: '',
        params: {},
        headers: {},
        rawBody: Buffer.from('test-body'),
      };

      mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;
    });

    describe('Route detection', () => {
      it('should detect WhatsApp Cloud webhook route', async () => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/whatsapp_cloud/channel-id';
        mockRequest.params.channelId = 'channel-id';

        const body = JSON.stringify({ test: 'data' });
        mockRequest.rawBody = Buffer.from(body);

        // Create valid signature
        const hmac = crypto.createHmac('sha256', 'test-app-secret');
        hmac.update(body);
        const signature = hmac.digest('hex');
        mockRequest.headers['x-hub-signature-256'] = `sha256=${signature}`;

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_CLOUD,
          enabled: true,
          appSecretEnc: 'encrypted-secret',
        } as any);

        // Mock decryptSecret to return the app secret
        jest
          .spyOn(
            require('../../modules/channels/utils/secrets.util'),
            'decryptSecret',
          )
          .mockReturnValue('test-app-secret');

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should detect Telegram webhook route', async () => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/telegram/channel-id';
        mockRequest.params.channelId = 'channel-id';
        mockRequest.headers['x-telegram-bot-api-secret-token'] =
          'telegram-secret-token';

        // Set environment variable
        process.env.TELEGRAM_WEBHOOK_SECRET = 'telegram-secret-token';

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.TELEGRAM,
          enabled: true,
        } as any);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should detect WhatsApp QR webhook route', async () => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/whatsapp_qr/channel-id';
        mockRequest.params.channelId = 'channel-id';
        mockRequest.headers['x-evolution-apikey'] = 'evolution-api-key';

        // Set environment variable
        process.env.EVOLUTION_APIKEY = 'evolution-api-key';

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_QR,
          enabled: true,
        } as any);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should throw ForbiddenException for unknown webhook route', async () => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/unknown/channel-id';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Unknown webhook route'),
        );
      });

      it('should throw ForbiddenException when channelId is missing', async () => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/whatsapp_cloud/';
        // No channelId in params

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Unknown webhook route'),
        );
      });
    });

    describe('Channel validation', () => {
      beforeEach(() => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/whatsapp_cloud/channel-id';
        mockRequest.params.channelId = 'channel-id';
      });

      it('should throw ForbiddenException when channel not found', async () => {
        channelsRepo.findByIdWithSecrets.mockResolvedValue(null);

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Channel not available'),
        );
      });

      it('should throw ForbiddenException when channel is deleted', async () => {
        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_CLOUD,
          enabled: true,
          deletedAt: new Date(),
        } as any);

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Channel not available'),
        );
      });

      it('should throw ForbiddenException when channel is disabled', async () => {
        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_CLOUD,
          enabled: false,
        } as any);

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Channel not available'),
        );
      });

      it('should throw ForbiddenException when provider mismatch', async () => {
        // Route says WhatsApp Cloud but channel is Telegram
        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.TELEGRAM,
          enabled: true,
        } as any);

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Channel/provider mismatch'),
        );
      });
    });

    describe('WhatsApp Cloud signature verification', () => {
      beforeEach(() => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/whatsapp_cloud/channel-id';
        mockRequest.params.channelId = 'channel-id';

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_CLOUD,
          enabled: true,
          appSecretEnc: 'encrypted-secret',
        } as any);

        // Mock decryptSecret function
        jest
          .spyOn(
            require('../../modules/channels/utils/secrets.util'),
            'decryptSecret',
          )
          .mockReturnValue('test-app-secret');
      });

      it('should verify valid WhatsApp Cloud signature', async () => {
        const body = JSON.stringify({ test: 'data' });
        mockRequest.rawBody = Buffer.from(body);

        // Create valid signature
        const hmac = crypto.createHmac('sha256', 'test-app-secret');
        hmac.update(body);
        const signature = hmac.digest('hex');
        mockRequest.headers['x-hub-signature-256'] = `sha256=${signature}`;

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should reject invalid WhatsApp Cloud signature', async () => {
        mockRequest.rawBody = Buffer.from('test-body');
        mockRequest.headers['x-hub-signature-256'] = 'sha256=invalid-signature';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Signature verification failed'),
        );
      });

      it('should reject missing signature header', async () => {
        mockRequest.rawBody = Buffer.from('test-body');
        // No signature header

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Signature verification failed'),
        );
      });

      it('should reject malformed signature header', async () => {
        mockRequest.rawBody = Buffer.from('test-body');
        mockRequest.headers['x-hub-signature-256'] = 'invalid-format';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Signature verification failed'),
        );
      });

      it('should reject when channel has no app secret', async () => {
        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_CLOUD,
          enabled: true,
          appSecretEnc: null,
        } as any);

        mockRequest.rawBody = Buffer.from('test-body');
        mockRequest.headers['x-hub-signature-256'] = 'sha256=signature';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Signature verification failed'),
        );
      });

      it('should reject when rawBody is missing', async () => {
        mockRequest.rawBody = undefined;
        mockRequest.headers['x-hub-signature-256'] = 'sha256=signature';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Signature verification failed'),
        );
      });
    });

    describe('Telegram signature verification', () => {
      beforeEach(() => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/telegram/channel-id';
        mockRequest.params.channelId = 'channel-id';

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.TELEGRAM,
          enabled: true,
        } as any);

        process.env.TELEGRAM_WEBHOOK_SECRET = 'test-telegram-secret';
      });

      it('should verify valid Telegram signature', async () => {
        mockRequest.headers['x-telegram-bot-api-secret-token'] =
          'test-telegram-secret';

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should reject invalid Telegram signature', async () => {
        mockRequest.headers['x-telegram-bot-api-secret-token'] = 'wrong-secret';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Signature verification failed'),
        );
      });

      it('should reject missing Telegram secret token', async () => {
        // No secret token header

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Signature verification failed'),
        );
      });

      it('should handle missing TELEGRAM_WEBHOOK_SECRET env var', async () => {
        delete process.env.TELEGRAM_WEBHOOK_SECRET;
        mockRequest.headers['x-telegram-bot-api-secret-token'] = 'some-token';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Signature verification failed'),
        );

        // Restore env var
        process.env.TELEGRAM_WEBHOOK_SECRET = 'test-telegram-secret';
      });
    });

    describe('Evolution API signature verification', () => {
      beforeEach(() => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/whatsapp_qr/channel-id';
        mockRequest.params.channelId = 'channel-id';

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_QR,
          enabled: true,
        } as any);

        process.env.EVOLUTION_APIKEY = 'test-evolution-key';
      });

      it('should verify valid Evolution API key from x-evolution-apikey header', async () => {
        mockRequest.headers['x-evolution-apikey'] = 'test-evolution-key';

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should verify valid Evolution API key from apikey header', async () => {
        mockRequest.headers['apikey'] = 'test-evolution-key';

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should reject invalid Evolution API key', async () => {
        mockRequest.headers['x-evolution-apikey'] = 'wrong-key';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Signature verification failed'),
        );
      });

      it('should handle missing EVOLUTION_APIKEY env var', async () => {
        delete process.env.EVOLUTION_APIKEY;
        mockRequest.headers['x-evolution-apikey'] = 'some-key';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Signature verification failed'),
        );

        // Restore env var
        process.env.EVOLUTION_APIKEY = 'test-evolution-key';
      });

      it('should handle missing EVOLUTION_API_KEY env var', async () => {
        delete process.env.EVOLUTION_APIKEY;
        delete process.env.EVOLUTION_API_KEY;
        mockRequest.headers['x-evolution-apikey'] = 'some-key';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Signature verification failed'),
        );

        // Restore env var
        process.env.EVOLUTION_APIKEY = 'test-evolution-key';
      });
    });

    describe('Merchant and channel data attachment', () => {
      beforeEach(() => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/whatsapp_cloud/channel-id';
        mockRequest.params.channelId = 'channel-id';

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_CLOUD,
          enabled: true,
          merchantId: 'merchant-123',
        } as any);
      });

      it('should attach merchantId and channel to request', async () => {
        const body = JSON.stringify({ test: 'data' });
        mockRequest.rawBody = Buffer.from(body);

        // Create valid signature
        const hmac = crypto.createHmac('sha256', 'test-app-secret');
        hmac.update(body);
        const signature = hmac.digest('hex');
        mockRequest.headers['x-hub-signature-256'] = `sha256=${signature}`;

        // Mock decryptSecret
        jest
          .spyOn(
            require('../../modules/channels/utils/secrets.util'),
            'decryptSecret',
          )
          .mockReturnValue('test-app-secret');

        // Update channel with appSecretEnc
        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_CLOUD,
          enabled: true,
          merchantId: 'merchant-123',
          appSecretEnc: 'encrypted-secret',
        } as any);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(mockRequest.merchantId).toBe('merchant-123');
        expect(mockRequest.channel).toBeDefined();
        expect(mockRequest.channel._id).toBe('channel-id');
      });

      it('should handle string merchantId correctly', async () => {
        const body = JSON.stringify({ test: 'data' });
        mockRequest.rawBody = Buffer.from(body);

        // Create valid signature
        const hmac = crypto.createHmac('sha256', 'test-app-secret');
        hmac.update(body);
        const signature = hmac.digest('hex');
        mockRequest.headers['x-hub-signature-256'] = `sha256=${signature}`;

        // Mock decryptSecret
        jest
          .spyOn(
            require('../../modules/channels/utils/secrets.util'),
            'decryptSecret',
          )
          .mockReturnValue('test-app-secret');

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_CLOUD,
          enabled: true,
          merchantId: 'merchant-123',
          appSecretEnc: 'encrypted-secret',
        } as any);

        await guard.canActivate(mockContext);

        expect(mockRequest.merchantId).toBe('merchant-123');
      });
    });

    describe('Performance considerations', () => {
      it('should handle rapid successive calls', async () => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/whatsapp_cloud/channel-id';
        mockRequest.params.channelId = 'channel-id';
        mockRequest.rawBody = Buffer.from('test-body');

        // Create valid signature
        const hmac = crypto.createHmac('sha256', 'test-app-secret');
        hmac.update('test-body');
        const signature = hmac.digest('hex');
        mockRequest.headers['x-hub-signature-256'] = `sha256=${signature}`;

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_CLOUD,
          enabled: true,
          appSecretEnc: 'encrypted-secret',
        } as any);

        // Mock decryptSecret
        jest
          .spyOn(
            require('../../modules/channels/utils/secrets.util'),
            'decryptSecret',
          )
          .mockReturnValue('test-app-secret');

        const results: boolean[] = [];
        for (let i = 0; i < 100; i++) {
          results.push(await guard.canActivate(mockContext));
        }

        expect(results).toHaveLength(100);
        expect(results.every((result) => result === true)).toBe(true);
      });
    });

    describe('Guard properties and methods', () => {
      it('should be a proper guard implementation', () => {
        expect(guard).toBeInstanceOf(Object);
        expect(typeof guard.canActivate).toBe('function');
      });

      it('should have access to channelsRepo', () => {
        expect(guard['channelsRepo']).toBeDefined();
        expect(guard['channelsRepo']).toBeInstanceOf(Object);
      });
    });

    describe('Async behavior', () => {
      it('should return Promise<boolean>', async () => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/whatsapp_cloud/channel-id';
        mockRequest.params.channelId = 'channel-id';
        mockRequest.rawBody = Buffer.from('test-body');

        // Create valid signature
        const hmac = crypto.createHmac('sha256', 'test-app-secret');
        hmac.update('test-body');
        const signature = hmac.digest('hex');
        mockRequest.headers['x-hub-signature-256'] = `sha256=${signature}`;

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_CLOUD,
          enabled: true,
          appSecretEnc: 'encrypted-secret',
        } as any);

        // Mock decryptSecret
        jest
          .spyOn(
            require('../../modules/channels/utils/secrets.util'),
            'decryptSecret',
          )
          .mockReturnValue('test-app-secret');

        const result = guard.canActivate(mockContext);

        expect(result).toBeInstanceOf(Promise);

        const resolvedResult = await result;
        expect(resolvedResult).toBe(true);
      });

      it('should handle Promise rejection correctly', async () => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/unknown/channel-id';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Unknown webhook route'),
        );
      });
    });

    describe('Error message consistency', () => {
      it('should use consistent error messages for different failures', async () => {
        const scenarios = [
          {
            path: '/unknown/channel-id',
            expectedMessage: 'Unknown webhook route',
          },
          {
            path: '/whatsapp_cloud/channel-id',
            setup: () =>
              channelsRepo.findByIdWithSecrets.mockResolvedValue(null),
            expectedMessage: 'Channel not available',
          },
          {
            path: '/whatsapp_cloud/channel-id',
            setup: () =>
              channelsRepo.findByIdWithSecrets.mockResolvedValue({
                _id: 'channel-id',
                provider: ChannelProvider.TELEGRAM, // Wrong provider
                enabled: true,
              } as any),
            expectedMessage: 'Channel/provider mismatch',
          },
        ];

        for (const scenario of scenarios) {
          mockRequest.baseUrl = '/webhooks';
          mockRequest.path = scenario.path;
          mockRequest.params.channelId = 'channel-id';

          if (scenario.setup) {
            scenario.setup();
          }

          await expect(guard.canActivate(mockContext)).rejects.toThrow(
            new ForbiddenException(scenario.expectedMessage),
          );
        }
      });
    });

    describe('Edge cases', () => {
      it('should handle malformed request object', async () => {
        mockContext.switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => null),
        })) as any;

        await expect(guard.canActivate(mockContext)).rejects.toThrow();
      });

      it('should handle missing headers object', async () => {
        const requestWithoutHeaders = {
          baseUrl: '/webhooks',
          path: '/whatsapp_cloud/channel-id',
          params: { channelId: 'channel-id' },
          rawBody: Buffer.from('test'),
        };
        mockContext.switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => requestWithoutHeaders),
        })) as any;

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_CLOUD,
          enabled: true,
        } as any);

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Signature verification failed'),
        );
      });

      it('should handle missing params object', async () => {
        const requestWithoutParams = {
          baseUrl: '/webhooks',
          path: '/whatsapp_cloud/channel-id',
          headers: {},
          rawBody: Buffer.from('test'),
        };
        mockContext.switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => requestWithoutParams),
        })) as any;

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Unknown webhook route'),
        );
      });

      it('should handle empty rawBody', async () => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/whatsapp_cloud/channel-id';
        mockRequest.params.channelId = 'channel-id';
        mockRequest.rawBody = Buffer.from('');

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_CLOUD,
          enabled: true,
          appSecretEnc: 'encrypted-secret',
        } as any);

        jest
          .spyOn(
            require('../../modules/channels/utils/secrets.util'),
            'decryptSecret',
          )
          .mockReturnValue('test-app-secret');

        const hmac = crypto.createHmac('sha256', 'test-app-secret');
        hmac.update('');
        const signature = hmac.digest('hex');
        mockRequest.headers['x-hub-signature-256'] = `sha256=${signature}`;

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ForbiddenException('Signature verification failed'),
        );
      });

      it('should handle large rawBody', async () => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/whatsapp_cloud/channel-id';
        mockRequest.params.channelId = 'channel-id';

        const largeBody = 'x'.repeat(10000);
        mockRequest.rawBody = Buffer.from(largeBody);

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_CLOUD,
          enabled: true,
          appSecretEnc: 'encrypted-secret',
        } as any);

        jest
          .spyOn(
            require('../../modules/channels/utils/secrets.util'),
            'decryptSecret',
          )
          .mockReturnValue('test-app-secret');

        const hmac = crypto.createHmac('sha256', 'test-app-secret');
        hmac.update(largeBody);
        const signature = hmac.digest('hex');
        mockRequest.headers['x-hub-signature-256'] = `sha256=${signature}`;

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('Integration scenarios', () => {
      it('should work correctly in a typical WhatsApp webhook scenario', async () => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/whatsapp_cloud/channel-id';
        mockRequest.params.channelId = 'channel-id';

        const body = JSON.stringify({ object: 'whatsapp_business_account' });
        mockRequest.rawBody = Buffer.from(body);

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_CLOUD,
          enabled: true,
          appSecretEnc: 'encrypted-secret',
          merchantId: 'merchant-123',
        } as any);

        jest
          .spyOn(
            require('../../modules/channels/utils/secrets.util'),
            'decryptSecret',
          )
          .mockReturnValue('test-app-secret');

        const hmac = crypto.createHmac('sha256', 'test-app-secret');
        hmac.update(body);
        const signature = hmac.digest('hex');
        mockRequest.headers['x-hub-signature-256'] = `sha256=${signature}`;

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(mockRequest.merchantId).toBe('merchant-123');
        expect(mockRequest.channel).toBeDefined();
      });

      it('should handle Telegram webhook scenario', async () => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/telegram/channel-id';
        mockRequest.params.channelId = 'channel-id';

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.TELEGRAM,
          enabled: true,
          merchantId: 'merchant-123',
        } as any);

        process.env.TELEGRAM_WEBHOOK_SECRET = 'test-telegram-secret';
        mockRequest.headers['x-telegram-bot-api-secret-token'] =
          'test-telegram-secret';

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(mockRequest.merchantId).toBe('merchant-123');
      });

      it('should handle Evolution webhook scenario', async () => {
        mockRequest.baseUrl = '/webhooks';
        mockRequest.path = '/whatsapp_qr/channel-id';
        mockRequest.params.channelId = 'channel-id';

        channelsRepo.findByIdWithSecrets.mockResolvedValue({
          _id: 'channel-id',
          provider: ChannelProvider.WHATSAPP_QR,
          enabled: true,
          merchantId: 'merchant-123',
        } as any);

        process.env.EVOLUTION_APIKEY = 'test-evolution-key';
        mockRequest.headers['x-evolution-apikey'] = 'test-evolution-key';

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(mockRequest.merchantId).toBe('merchant-123');
      });
    });
  });

  describe('timingSafeEqStr function', () => {
    it('should return true for identical strings', () => {
      const result = timingSafeEqStr('test', 'test');

      expect(result).toBe(true);
    });

    it('should return false for different strings', () => {
      const result = timingSafeEqStr('test', 'different');

      expect(result).toBe(false);
    });

    it('should return false for different lengths', () => {
      const result = timingSafeEqStr('test', 'test-extra');

      expect(result).toBe(false);
    });

    it('should return false for null inputs', () => {
      const result1 = timingSafeEqStr(null as any, 'test');
      const result2 = timingSafeEqStr('test', null as any);
      const result3 = timingSafeEqStr(null as any, null as any);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });

    it('should return false for undefined inputs', () => {
      const result1 = timingSafeEqStr(undefined, 'test');
      const result2 = timingSafeEqStr('test', undefined);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });
});
