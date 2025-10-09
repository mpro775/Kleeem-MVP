import { CreateKleemMissingResponseDto } from '../../dto/create-kleem-missing-response.dto';
import { CreateMissingResponseDto } from '../../dto/create-missing-response.dto';

describe('Analytics DTOs', () => {
  describe('CreateMissingResponseDto', () => {
    it('should be instantiable', () => {
      // Arrange & Act
      const dto = new CreateMissingResponseDto();

      // Assert
      expect(dto).toBeInstanceOf(CreateMissingResponseDto);
      expect(dto).toBeDefined();
    });

    it('should accept valid data assignment', () => {
      // Arrange
      const dto = new CreateMissingResponseDto();

      // Act
      dto.channel = 'whatsapp';
      dto.question = 'Test question';
      dto.botReply = 'Test reply';
      dto.type = 'missing_response';

      // Assert
      expect(dto.channel).toBe('whatsapp');
      expect(dto.question).toBe('Test question');
      expect(dto.botReply).toBe('Test reply');
      expect(dto.type).toBe('missing_response');
    });
  });

  describe('CreateKleemMissingResponseDto', () => {
    it('should be instantiable', () => {
      // Arrange & Act
      const dto = new CreateKleemMissingResponseDto();

      // Assert
      expect(dto).toBeInstanceOf(CreateKleemMissingResponseDto);
      expect(dto).toBeDefined();
    });

    it('should accept valid data assignment', () => {
      // Arrange
      const dto = new CreateKleemMissingResponseDto();

      // Act
      dto.channel = 'telegram';
      dto.question = 'Test question';
      dto.botReply = 'Test reply';
      dto.aiAnalysis = 'Test analysis';

      // Assert
      expect(dto.channel).toBe('telegram');
      expect(dto.question).toBe('Test question');
      expect(dto.botReply).toBe('Test reply');
      expect(dto.aiAnalysis).toBe('Test analysis');
    });
  });

  describe('DTO Compatibility', () => {
    it('should work with different channel values', () => {
      // Arrange
      const dto1 = new CreateMissingResponseDto();
      const dto2 = new CreateKleemMissingResponseDto();

      // Act
      dto1.channel = 'telegram';
      dto1.channel = 'whatsapp';
      dto1.channel = 'webchat';

      dto2.channel = 'telegram';
      dto2.channel = 'whatsapp';
      dto2.channel = 'webchat';

      // Assert
      expect(dto1.channel).toBe('webchat');
      expect(dto2.channel).toBe('webchat');
    });

    it('should handle boolean fields correctly', () => {
      // Arrange
      const dto = new CreateMissingResponseDto();

      // Act
      dto.resolved = true;
      dto.resolved = false;

      // Assert
      expect(dto.resolved).toBe(false);
    });

    it('should be compatible with different DTO types', () => {
      // Arrange & Act & Assert
      const dto1 = new CreateMissingResponseDto();
      const dto2 = new CreateKleemMissingResponseDto();

      expect(dto1).toBeInstanceOf(CreateMissingResponseDto);
      expect(dto2).toBeInstanceOf(CreateKleemMissingResponseDto);
      expect(dto1).not.toBeInstanceOf(CreateKleemMissingResponseDto);
      expect(dto2).not.toBeInstanceOf(CreateMissingResponseDto);
    });
  });
});
