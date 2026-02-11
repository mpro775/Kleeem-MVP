import { ConfigService } from '@nestjs/config';

import { GeminiService } from '../gemini.service';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: mockGenerateContent,
    }),
  })),
}));

describe('GeminiService', () => {
  const mockInstructionsService = {
    create: jest.fn(),
  } as any;

  let configService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    } as any;
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  function createService(): GeminiService {
    return new GeminiService(mockInstructionsService, configService);
  }

  describe('checkHealth', () => {
    it('should return ok: false when GOOGLE_GEMINI_API_KEY is not set', async () => {
      (configService.get as jest.Mock).mockReturnValue(undefined);
      process.env.GOOGLE_GEMINI_API_KEY = '';
      const service = createService();
      const result = await service.checkHealth();
      expect(result).toEqual({ ok: false, message: 'GOOGLE_GEMINI_API_KEY is not set' });
    });

    it('should return ok: true when Gemini responds with text', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => 'pong' },
      });
      const service = createService();
      const result = await service.checkHealth();
      expect(result).toEqual({ ok: true });
      expect(mockGenerateContent).toHaveBeenCalledWith('ping');
    });

    it('should return ok: false when Gemini throws', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Network error'));
      const service = createService();
      const result = await service.checkHealth();
      expect(result.ok).toBe(false);
      expect(result.message).toBe('Network error');
    });

    it('should return ok: false when response has no text', async () => {
      mockGenerateContent.mockResolvedValueOnce({ response: {} });
      const service = createService();
      const result = await service.checkHealth();
      expect(result).toEqual({ ok: false, message: 'No response from Gemini' });
    });
  });

  describe('generateAndSaveInstructionFromBadReply', () => {
    it('should generate instruction, save via instructionsService, and return result', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => 'لا تكرر هذا الرد' },
      });
      mockInstructionsService.create.mockResolvedValueOnce({ _id: '123' });
      const service = createService();
      const result = await service.generateAndSaveInstructionFromBadReply(
        'رد سيء',
        'merchant-1',
      );
      expect(result).toEqual({ instruction: 'لا تكرر هذا الرد', saved: true });
      expect(mockInstructionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantId: 'merchant-1',
          instruction: 'لا تكرر هذا الرد',
          relatedReplies: ['رد سيء'],
          type: 'auto',
        }),
      );
    });
  });
});
