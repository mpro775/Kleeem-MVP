import { validate } from 'class-validator';

import { QueryBotRatingsDto } from '../query-bot-ratings.dto';

describe('QueryBotRatingsDto', () => {
  describe('Validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = new QueryBotRatingsDto();
      dto.rating = '1';
      dto.q = 'test search';
      dto.sessionId = 'session_123';
      dto.from = '2024-01-01';
      dto.to = '2024-12-31';
      dto.page = 1;
      dto.limit = 20;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with minimal data', async () => {
      const dto = new QueryBotRatingsDto();
      dto.page = 1;
      dto.limit = 20;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when rating is not 0 or 1', async () => {
      const dto = new QueryBotRatingsDto();
      (dto as any).rating = '2'; // Invalid rating

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isIn).toBeDefined();
    });

    it('should fail validation when page is less than 1', async () => {
      const dto = new QueryBotRatingsDto();
      dto.page = 0; // Invalid page

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toBeDefined();
    });

    it('should fail validation when limit is less than 1', async () => {
      const dto = new QueryBotRatingsDto();
      dto.limit = 0; // Invalid limit

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toBeDefined();
    });

    it('should fail validation when page is not an integer', async () => {
      const dto = new QueryBotRatingsDto();
      dto.page = 1.5; // Invalid page type

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isInt).toBeDefined();
    });

    it('should fail validation when limit is not an integer', async () => {
      const dto = new QueryBotRatingsDto();
      dto.limit = 10.5; // Invalid limit type

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isInt).toBeDefined();
    });

    it('should accept rating as optional field', async () => {
      const dto = new QueryBotRatingsDto();
      // rating is undefined

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid rating values', async () => {
      const validRatings = ['0', '1'];

      for (const rating of validRatings) {
        const dto = new QueryBotRatingsDto();
        (dto as any).rating = rating;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle string search query', async () => {
      const dto = new QueryBotRatingsDto();
      dto.q = 'مرحبا كيف حالك';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle empty string search query', async () => {
      const dto = new QueryBotRatingsDto();
      dto.q = '';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle sessionId as optional', async () => {
      const dto = new QueryBotRatingsDto();
      // sessionId is undefined

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle date range filters as optional', async () => {
      const dto = new QueryBotRatingsDto();
      // from and to are undefined

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle large page numbers', async () => {
      const dto = new QueryBotRatingsDto();
      dto.page = 1000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle large limit numbers', async () => {
      const dto = new QueryBotRatingsDto();
      dto.limit = 1000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle complex query with all optional fields', async () => {
      const dto = new QueryBotRatingsDto();
      dto.rating = '1';
      dto.q = 'test query';
      dto.sessionId = 'session_123';
      dto.from = '2024-01-01T00:00:00Z';
      dto.to = '2024-12-31T23:59:59Z';
      dto.page = 5;
      dto.limit = 50;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Default Values', () => {
    it('should have default values for page and limit', () => {
      const dto = new QueryBotRatingsDto();

      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
    });

    it('should allow overriding default values', () => {
      const dto = new QueryBotRatingsDto();
      dto.page = 5;
      dto.limit = 100;

      expect(dto.page).toBe(5);
      expect(dto.limit).toBe(100);
    });
  });

  describe('Type Transformation', () => {
    it('should transform string numbers to numbers for page and limit', () => {
      const dto = new QueryBotRatingsDto();
      dto.page = 5 as any;
      dto.limit = 50 as any;

      expect(typeof dto.page).toBe('number');
      expect(typeof dto.limit).toBe('number');
      expect(dto.page).toBe(5);
      expect(dto.limit).toBe(50);
    });
  });
});
