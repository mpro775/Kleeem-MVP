import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { AiAdminController } from '../ai.admin.controller';
import { GeminiService } from '../gemini.service';

describe('AiAdminController', () => {
  let controller: AiAdminController;
  let geminiService: jest.Mocked<GeminiService>;

  const mockGeminiService = {
    checkHealth: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [AiAdminController],
      providers: [
        {
          provide: GeminiService,
          useValue: mockGeminiService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AiAdminController>(AiAdminController);
    geminiService = module.get(GeminiService);
  });

  describe('GET admin/ai/health', () => {
    it('should return health result from GeminiService', async () => {
      mockGeminiService.checkHealth.mockResolvedValue({ ok: true });
      const result = await controller.getHealth();
      expect(result).toEqual({ ok: true });
      expect(geminiService.checkHealth).toHaveBeenCalledTimes(1);
    });

    it('should return ok: false and message when Gemini is unhealthy', async () => {
      mockGeminiService.checkHealth.mockResolvedValue({
        ok: false,
        message: 'Network error',
      });
      const result = await controller.getHealth();
      expect(result).toEqual({ ok: false, message: 'Network error' });
    });
  });
});
