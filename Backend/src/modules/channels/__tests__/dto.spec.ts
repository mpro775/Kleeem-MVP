import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateChannelDto } from '../dto/create-channel.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { UpdateChannelDto } from '../dto/update-channel.dto';

describe('Channels DTOs', () => {
  describe('CreateChannelDto', () => {
    it('should validate a valid DTO', async () => {
      // Arrange
      const dto = plainToInstance(CreateChannelDto, {
        provider: 'telegram',
        merchantId: '507f1f77bcf86cd799439011',
        accountLabel: 'Test Channel',
        isDefault: true,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should fail validation when provider is missing', async () => {
      // Arrange
      const dto = plainToInstance(CreateChannelDto, {
        merchantId: '507f1f77bcf86cd799439011',
        accountLabel: 'Test Channel',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('provider');
    });

    it('should fail validation when merchantId is not a valid MongoDB ObjectId', async () => {
      // Arrange
      const dto = plainToInstance(CreateChannelDto, {
        provider: 'telegram',
        merchantId: 'invalid-id',
        accountLabel: 'Test Channel',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('merchantId');
    });

    it('should fail validation when accountLabel is too long', async () => {
      // Arrange
      const dto = plainToInstance(CreateChannelDto, {
        provider: 'telegram',
        merchantId: '507f1f77bcf86cd799439011',
        accountLabel: 'a'.repeat(101), // More than 100 characters
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('accountLabel');
    });

    it('should pass validation when accountLabel is within limits', async () => {
      // Arrange
      const dto = plainToInstance(CreateChannelDto, {
        provider: 'telegram',
        merchantId: '507f1f77bcf86cd799439011',
        accountLabel: 'a'.repeat(100), // Exactly 100 characters
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should pass validation when accountLabel is not provided', async () => {
      // Arrange
      const dto = plainToInstance(CreateChannelDto, {
        provider: 'telegram',
        merchantId: '507f1f77bcf86cd799439011',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should fail validation when isDefault is not boolean', async () => {
      // Arrange
      const dto = plainToInstance(CreateChannelDto, {
        provider: 'telegram',
        merchantId: '507f1f77bcf86cd799439011',
        isDefault: 'true', // String instead of boolean
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('isDefault');
    });
  });

  describe('UpdateChannelDto', () => {
    it('should validate a valid DTO', async () => {
      // Arrange
      const dto = plainToInstance(UpdateChannelDto, {
        accountLabel: 'Updated Channel',
        enabled: true,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should pass validation with empty object', async () => {
      // Arrange
      const dto = plainToInstance(UpdateChannelDto, {});

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should fail validation when accountLabel is too long', async () => {
      // Arrange
      const dto = plainToInstance(UpdateChannelDto, {
        accountLabel: 'a'.repeat(101),
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('accountLabel');
    });

    it('should fail validation when enabled is not boolean', async () => {
      // Arrange
      const dto = plainToInstance(UpdateChannelDto, {
        enabled: 'true', // String instead of boolean
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('enabled');
    });
  });

  describe('SendMessageDto', () => {
    it('should validate a valid DTO', async () => {
      // Arrange
      const dto = plainToInstance(SendMessageDto, {
        to: '123456789',
        text: 'Hello, world!',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should fail validation when to is missing', async () => {
      // Arrange
      const dto = plainToInstance(SendMessageDto, {
        text: 'Hello, world!',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('to');
    });

    it('should fail validation when text is missing', async () => {
      // Arrange
      const dto = plainToInstance(SendMessageDto, {
        to: '123456789',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('text');
    });

    it('should pass validation with very long text', async () => {
      // Arrange
      const dto = plainToInstance(SendMessageDto, {
        to: '123456789',
        text: 'a'.repeat(10000), // Very long text (no length limit in DTO)
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0); // Should pass as there are no length restrictions
    });

    it('should fail validation when to is not a string', async () => {
      // Arrange
      const dto = plainToInstance(SendMessageDto, {
        to: 123456789, // Number instead of string
        text: 'Hello, world!',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('to');
    });
  });
});
