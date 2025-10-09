import { validate } from 'class-validator';

import { LoginDto } from '../login.dto';

describe('LoginDto', () => {
  it('should validate a correct login DTO', async () => {
    // Arrange
    const dto = new LoginDto();
    dto.email = 'user@example.com';
    dto.password = 'password123';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('should fail validation for invalid email', async () => {
    // Arrange
    const dto = new LoginDto();
    dto.email = 'invalid-email';
    dto.password = 'password123';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });

  it('should fail validation for missing email', async () => {
    // Arrange
    const dto = new LoginDto();
    dto.email = '';
    dto.password = 'password123';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });

  it('should fail validation for missing password', async () => {
    // Arrange
    const dto = new LoginDto();
    dto.email = 'user@example.com';
    dto.password = '';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('password');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('should fail validation for non-string password', async () => {
    // Arrange
    const dto = new LoginDto();
    dto.email = 'user@example.com';
    (dto as any).password = 123456;

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('password');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('should handle Arabic email addresses', async () => {
    // Arrange
    const dto = new LoginDto();
    dto.email = 'مستخدم@مثال.كوم';
    dto.password = 'password123';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });
});
