import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { EvolutionService } from '../evolution.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock uuid
jest.mock('uuid');
const mockedUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('EvolutionService', () => {
  let service: EvolutionService;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvolutionService],
    }).compile();

    service = module.get<EvolutionService>(EvolutionService);

    // Mock Logger methods
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHeaders', () => {
    it('should return correct headers', () => {
      const headers = (service as any).getHeaders();

      expect(headers).toEqual({
        apikey: 'any-secret-key',
        'Content-Type': 'application/json',
        accept: 'application/json',
      });
    });
  });

  describe('ensureFreshInstance', () => {
    const instanceName = 'test-instance';
    const mockToken = 'mock-uuid-token';
    const mockQr = 'base64-qr-code';

    beforeEach(() => {
      mockedUuidv4.mockReturnValue(mockToken as any);
    });

    it('should delete existing instance and create new one successfully', async () => {
      // Mock existing instance
      mockedAxios.get.mockResolvedValueOnce({
        data: { instance: { instanceId: 'existing-id' } },
      });

      // Mock successful deletion
      mockedAxios.delete.mockResolvedValueOnce({
        data: {
          status: 'SUCCESS',
          error: false,
          response: { message: 'Instance deleted' },
        },
      });

      // Mock successful creation
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          qrcode: { base64: mockQr },
          instance: { instanceId: 'new-instance-id' },
        },
      });

      const result = await service.ensureFreshInstance(instanceName);

      expect(result).toEqual({
        qr: mockQr,
        token: mockToken,
      });

      expect((mockedAxios as any).get).toHaveBeenCalledWith(
        `http://31.97.155.167:8080/instance/fetchInstances?instanceName=${instanceName}`,
        { headers: expect.any(Object) },
      );

      expect((mockedAxios as any).delete).toHaveBeenCalledWith(
        `http://31.97.155.167:8080/instance/delete/${instanceName}`,
        { headers: expect.any(Object) },
      );

      expect((mockedAxios as any).post).toHaveBeenCalledWith(
        'http://31.97.155.167:8080/instance/create',
        { instanceName, token: mockToken, qrcode: true },
        { headers: expect.any(Object) },
      );
    });

    it('should create new instance when existing instance not found', async () => {
      // Mock 404 error for non-existent instance
      const notFoundError = {
        response: { status: 404 },
      };
      mockedAxios.get.mockRejectedValueOnce(notFoundError);

      // Mock successful creation
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          qrcode: { base64: mockQr },
          instance: { instanceId: 'new-instance-id' },
        },
      });

      const result = await service.ensureFreshInstance(instanceName);

      expect(result).toEqual({
        qr: mockQr,
        token: mockToken,
      });

      expect((mockedAxios as any).delete).not.toHaveBeenCalled();
    });

    it('should throw error when getStatus fails with non-404 error', async () => {
      const serverError = {
        response: { status: 500 },
        message: 'Server error',
      };
      (mockedAxios as any).get.mockRejectedValueOnce(serverError);

      await expect(service.ensureFreshInstance(instanceName)).rejects.toEqual(
        serverError,
      );
    });
  });

  describe('deleteInstance', () => {
    const instanceName = 'test-instance';

    it('should delete instance successfully', async () => {
      const mockResponse = {
        status: 'SUCCESS',
        error: false,
        response: { message: 'Instance deleted successfully' },
      };

      (mockedAxios as any).delete.mockResolvedValueOnce({ data: mockResponse });

      const result = await service.deleteInstance(instanceName);

      expect(result).toEqual(mockResponse);
      expect((mockedAxios as any).delete).toHaveBeenCalledWith(
        `http://31.97.155.167:8080/instance/delete/${instanceName}`,
        { headers: expect.any(Object) },
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        `Instance ${instanceName} deleted successfully.`,
      );
    });

    it('should return default response for 404 error', async () => {
      const notFoundError = {
        response: { status: 404, data: 'Not found' },
        message: 'Instance not found',
      };

      (mockedAxios as any).delete.mockRejectedValueOnce(notFoundError);

      const result = await service.deleteInstance(instanceName);

      expect(result).toEqual({
        status: 'NOT_FOUND',
        error: true,
        response: { message: 'Instance not found' },
      });
    });

    it('should throw error for non-404 errors', async () => {
      const serverError = {
        response: { status: 500, data: 'Server error' },
        message: 'Internal server error',
      };

      (mockedAxios as any).delete.mockRejectedValueOnce(serverError);

      await expect(service.deleteInstance(instanceName)).rejects.toEqual(
        serverError,
      );
    });
  });

  describe('startSession', () => {
    const instanceName = 'test-instance';
    const token = 'test-token';

    it('should start session successfully', async () => {
      const mockResponse = {
        qrcode: { base64: 'base64-qr-code' },
        instance: { instanceId: 'new-instance-id' },
      };

      (mockedAxios as any).post.mockResolvedValueOnce({ data: mockResponse });

      const result = await service.startSession(instanceName, token);

      expect(result).toEqual({
        qr: 'base64-qr-code',
        token,
        instanceId: 'new-instance-id',
      });

      expect((mockedAxios as any).post).toHaveBeenCalledWith(
        'http://31.97.155.167:8080/instance/create',
        { instanceName, token, qrcode: true },
        { headers: expect.any(Object) },
      );
    });

    it('should handle missing qrcode in response', async () => {
      const mockResponse = {
        instance: { instanceId: 'new-instance-id' },
      };

      (mockedAxios as any).post.mockResolvedValueOnce({ data: mockResponse });

      const result = await service.startSession(instanceName, token);

      expect(result).toEqual({
        qr: '',
        token,
        instanceId: 'new-instance-id',
      });
    });

    it('should throw error when request fails', async () => {
      const error = {
        response: { data: 'Creation failed' },
        message: 'Request failed',
      };

      (mockedAxios as any).post.mockRejectedValueOnce(error);

      await expect(service.startSession(instanceName, token)).rejects.toEqual(
        error,
      );
    });
  });

  describe('getStatus', () => {
    const instanceName = 'test-instance';

    it('should get instance status successfully', async () => {
      const mockInstance = {
        instanceId: 'test-id',
        status: 'open',
        connected: true,
      };

      (mockedAxios as any).get.mockResolvedValueOnce({
        data: { instance: mockInstance },
      });

      const result = await service.getStatus(instanceName);

      expect(result).toEqual(mockInstance);
      expect((mockedAxios as any).get).toHaveBeenCalledWith(
        `http://31.97.155.167:8080/instance/fetchInstances?instanceName=${instanceName}`,
        { headers: expect.any(Object) },
      );
    });

    it('should throw error when request fails', async () => {
      const error = {
        response: { data: 'Instance not found' },
        message: 'Request failed',
      };

      (mockedAxios as any).get.mockRejectedValueOnce(error);

      await expect(service.getStatus(instanceName)).rejects.toEqual(error);
    });
  });

  describe('sendMessage', () => {
    const instanceName = 'test-instance';
    const to = '966501234567';
    const message = 'Hello, World!';

    it('should send message successfully', async () => {
      const mockResponse = {
        success: true,
        messageId: 'msg-123',
      };

      (mockedAxios as any).post.mockResolvedValueOnce({ data: mockResponse });

      const result = await service.sendMessage(instanceName, to, message);

      expect(result).toEqual(mockResponse);
      expect((mockedAxios as any).post).toHaveBeenCalledWith(
        'http://31.97.155.167:8080/message/sendText',
        { instanceName, to, message },
        { headers: expect.any(Object) },
      );
    });

    it('should throw error when sending fails', async () => {
      const error = {
        response: { data: 'Send failed' },
        message: 'Request failed',
      };

      (mockedAxios as any).post.mockRejectedValueOnce(error);

      await expect(
        service.sendMessage(instanceName, to, message),
      ).rejects.toEqual(error);
    });
  });

  describe('setWebhook', () => {
    const instanceName = 'test-instance';
    const url = 'https://example.com/webhook';

    it('should set webhook with default parameters', async () => {
      const mockResponse = {
        webhook: {
          instanceName,
          webhook: {
            url,
            webhook_by_events: true,
            webhook_base64: true,
            events: ['MESSAGES_UPSERT'],
            enabled: true,
          },
        },
      };

      (mockedAxios as any).post.mockResolvedValueOnce({ data: mockResponse });

      const result = await service.setWebhook(instanceName, url);

      expect(result).toEqual(mockResponse);
      expect((mockedAxios as any).post).toHaveBeenCalledWith(
        `http://31.97.155.167:8080/webhook/set/${instanceName}`,
        {
          url,
          events: ['MESSAGES_UPSERT'],
          webhook_by_events: true,
          webhook_base64: true,
        },
        { headers: expect.any(Object) },
      );
    });

    it('should set webhook with custom parameters', async () => {
      const customEvents = ['MESSAGES_UPSERT', 'MESSAGES_UPDATE'];
      const mockResponse = { success: true };

      (mockedAxios as any).post.mockResolvedValueOnce({ data: mockResponse });

      await service.setWebhook(instanceName, url, customEvents, false, false);

      expect((mockedAxios as any).post).toHaveBeenCalledWith(
        `http://31.97.155.167:8080/webhook/set/${instanceName}`,
        {
          url,
          events: customEvents,
          webhook_by_events: false,
          webhook_base64: false,
        },
        { headers: expect.any(Object) },
      );
    });

    it('should throw error when webhook setup fails', async () => {
      const error = {
        response: { data: 'Webhook setup failed' },
        message: 'Request failed',
      };

      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(service.setWebhook(instanceName, url)).rejects.toEqual(
        error,
      );
    });
  });

  describe('updateWebhook', () => {
    const instanceName = 'test-instance';
    const webhookUrl = 'https://example.com/webhook';

    it('should call setWebhook with correct parameters', async () => {
      const mockResponse = { success: true };
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const setWebhookSpy = jest.spyOn(service, 'setWebhook');

      await service.updateWebhook(instanceName, webhookUrl);

      expect(setWebhookSpy).toHaveBeenCalledWith(
        instanceName,
        webhookUrl,
        ['MESSAGES_UPSERT'],
        false,
        false,
      );
    });

    it('should call setWebhook with custom parameters', async () => {
      const customEvents = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'];
      const mockResponse = { success: true };
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const setWebhookSpy = jest.spyOn(service, 'setWebhook');

      await service.updateWebhook(
        instanceName,
        webhookUrl,
        customEvents,
        true,
        true,
      );

      expect(setWebhookSpy).toHaveBeenCalledWith(
        instanceName,
        webhookUrl,
        customEvents,
        true,
        true,
      );
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
