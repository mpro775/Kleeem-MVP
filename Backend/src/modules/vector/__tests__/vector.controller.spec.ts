import { BadRequestException } from '@nestjs/common';

import { VectorController } from '../vector.controller';

// Mock heavy or irrelevant imports to avoid dragging their implementations into coverage
jest.mock('src/common/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class {},
}));
jest.mock('src/common/guards/service-token.guard', () => ({
  ServiceTokenGuard: class {},
}));
jest.mock('src/common/guards/idempotency.guard', () => ({
  IdempotencyGuard: class {},
}));
jest.mock('../../../common/services/translation.service', () => ({
  TranslationService: class {},
}));
jest.mock('../../../common/decorators/public.decorator', () => ({
  Public: () => () => {},
}));

describe('VectorController (unit)', () => {
  const makeController = (overrides: Partial<any> = {}) => {
    const vector = {
      querySimilarProducts: jest.fn(),
      unifiedSemanticSearch: jest.fn(),
      ...overrides,
    } as any;
    const translationService = {} as any;
    return {
      controller: new VectorController(vector, translationService),
      vector,
    };
  };

  describe('POST /vector/products', () => {
    it('returns recommendations on success', async () => {
      const recs = [{ id: '1' }, { id: '2' }];
      const { controller, vector } = makeController({
        querySimilarProducts: jest.fn().mockResolvedValue(recs),
      });

      const res = await controller.semanticSProducts({
        text: 'shoes',
        merchantId: 'm1',
        topK: 2,
      } as any);

      expect(vector.querySimilarProducts).toHaveBeenCalledWith(
        'shoes',
        'm1',
        2,
      );
      expect(res.success).toBe(true);
      expect(res.data.count).toBe(2);
      expect(res.data.recommendations).toEqual(recs);
    });

    it('throws BadRequestException on failure', async () => {
      const { controller, vector } = makeController({
        querySimilarProducts: jest.fn().mockRejectedValue(new Error('boom')),
      });

      await expect(
        controller.semanticSProducts({
          text: 'q',
          merchantId: 'm',
          topK: 1,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(vector.querySimilarProducts).toHaveBeenCalled();
    });

    it('handles non-Error exceptions gracefully', async () => {
      const { controller, vector } = makeController({
        querySimilarProducts: jest.fn().mockRejectedValue('string error'),
      });

      await expect(
        controller.semanticSProducts({
          text: 'test',
          merchantId: 'm1',
          topK: 2,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(vector.querySimilarProducts).toHaveBeenCalled();
    });
  });

  describe('GET /vector/products', () => {
    it('rejects when text or merchantId missing', async () => {
      const { controller } = makeController();
      await expect(
        controller.semanticSearchProductsByQuery('', 'm1', 5),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        controller.semanticSearchProductsByQuery('q', '', 5),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when topK out of range', async () => {
      const { controller } = makeController();
      await expect(
        controller.semanticSearchProductsByQuery('q', 'm1', 0),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        controller.semanticSearchProductsByQuery('q', 'm1', 11),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns results on success', async () => {
      const recs = [{ id: 'A' }];
      const { controller, vector } = makeController({
        querySimilarProducts: jest.fn().mockResolvedValue(recs),
      });

      const res = await controller.semanticSearchProductsByQuery(
        'phone',
        'm2',
        3,
      );

      expect(vector.querySimilarProducts).toHaveBeenCalledWith(
        'phone',
        'm2',
        3,
      );
      expect(res.success).toBe(true);
      expect(res.data.count).toBe(1);
      expect(res.data.recommendations).toEqual(recs);
    });

    it('wraps errors in BadRequestException', async () => {
      const { controller } = makeController({
        querySimilarProducts: jest.fn().mockRejectedValue(new Error('fail')),
      });

      await expect(
        controller.semanticSearchProductsByQuery('x', 'm', 5),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('handles non-Error exceptions in GET endpoint', async () => {
      const { controller } = makeController({
        querySimilarProducts: jest.fn().mockRejectedValue(null),
      });

      await expect(
        controller.semanticSearchProductsByQuery('test', 'm1', 3),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('POST /vector/unified-search', () => {
    it('rejects when merchantId or query missing', async () => {
      const { controller } = makeController();
      await expect(
        controller.unifiedSearch('', 'q', 5 as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        controller.unifiedSearch('m', '', 5 as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns results on success and coerces topK', async () => {
      const results = [{ type: 'faq', score: 1, data: {} }];
      const { controller, vector } = makeController({
        unifiedSemanticSearch: jest.fn().mockResolvedValue(results),
      });

      const res = await controller.unifiedSearch('m1', 'query', 100 as any);
      expect(vector.unifiedSemanticSearch).toHaveBeenCalledWith(
        'query',
        'm1',
        20,
      );
      expect(res.success).toBe(true);
      expect(res.data.results).toEqual(results);
      expect(res.data.count).toBe(1);
    });

    it('coerces topK to minimum value', async () => {
      const results = [];
      const { controller, vector } = makeController({
        unifiedSemanticSearch: jest.fn().mockResolvedValue(results),
      });

      await controller.unifiedSearch('m1', 'query', 0 as any);
      expect(vector.unifiedSemanticSearch).toHaveBeenCalledWith(
        'query',
        'm1',
        5, // 0 is falsy, so it defaults to 5
      );
    });

    it('coerces invalid topK to default', async () => {
      const results = [];
      const { controller, vector } = makeController({
        unifiedSemanticSearch: jest.fn().mockResolvedValue(results),
      });

      await controller.unifiedSearch('m1', 'query', 'invalid' as any);
      expect(vector.unifiedSemanticSearch).toHaveBeenCalledWith(
        'query',
        'm1',
        5,
      );
    });

    it('wraps errors in BadRequestException', async () => {
      const { controller } = makeController({
        unifiedSemanticSearch: jest.fn().mockRejectedValue(new Error('nope')),
      });
      await expect(
        controller.unifiedSearch('m', 'q', 5 as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('handles non-Error exceptions in unified search', async () => {
      const { controller } = makeController({
        unifiedSemanticSearch: jest.fn().mockRejectedValue(undefined),
      });
      await expect(
        controller.unifiedSearch('m1', 'query', 5 as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
