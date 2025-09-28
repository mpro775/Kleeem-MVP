import { validate } from 'class-validator';

import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';

describe('Auth DTOs', () => {
  describe('RegisterDto', () => {
    it('should be defined', () => {
      expect(RegisterDto).toBeDefined();
    });

    it('should validate required fields', async () => {
      const dto = new RegisterDto();
      dto.email = 'test@example.com';
      dto.password = 'password123';
      dto.confirmPassword = 'password123';
      dto.name = 'Test User';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for invalid email', async () => {
      const dto = new RegisterDto();
      dto.email = 'invalid-email';
      dto.password = 'password123';
      dto.confirmPassword = 'password123';
      dto.name = 'Test User';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should fail validation for short password', async () => {
      const dto = new RegisterDto();
      dto.email = 'test@example.com';
      dto.password = '123';
      dto.confirmPassword = '123';
      dto.name = 'Test User';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('should fail validation for mismatched passwords', async () => {
      const dto = new RegisterDto();
      dto.email = 'test@example.com';
      dto.password = 'password123';
      dto.confirmPassword = 'different123';
      dto.name = 'Test User';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('LoginDto', () => {
    it('should be defined', () => {
      expect(LoginDto).toBeDefined();
    });

    it('should validate required fields', async () => {
      const dto = new LoginDto();
      dto.email = 'test@example.com';
      dto.password = 'password123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for invalid email', async () => {
      const dto = new LoginDto();
      dto.email = 'invalid-email';
      dto.password = 'password123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should fail validation for empty password', async () => {
      const dto = new LoginDto();
      dto.email = 'test@example.com';
      dto.password = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });
  });
});
