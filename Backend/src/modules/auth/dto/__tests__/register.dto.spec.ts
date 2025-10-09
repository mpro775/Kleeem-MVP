import { validate } from 'class-validator';

import { RegisterDto } from '../register.dto';

describe('RegisterDto', () => {
  it('should validate a correct register DTO', async () => {
    // Arrange
    const dto = new RegisterDto();
    dto.email = 'user@example.com';
    dto.password = 'password123';
    dto.confirmPassword = 'password123';
    dto.name = 'أحمد محمد';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('should fail validation for invalid email', async () => {
    // Arrange
    const dto = new RegisterDto();
    dto.email = 'invalid-email';
    dto.password = 'password123';
    dto.confirmPassword = 'password123';
    dto.name = 'أحمد محمد';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });

  it('should fail validation for short password', async () => {
    // Arrange
    const dto = new RegisterDto();
    dto.email = 'user@example.com';
    dto.password = '123'; // Less than MIN_PASSWORD_LENGTH (6)
    dto.confirmPassword = '123';
    dto.name = 'أحمد محمد';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(2); // Both password and confirmPassword should fail
    expect(errors.some((e) => e.property === 'password')).toBe(true);
    expect(errors.some((e) => e.property === 'confirmPassword')).toBe(true);
  });

  it('should fail validation for mismatched passwords', async () => {
    // Arrange
    const dto = new RegisterDto();
    dto.email = 'user@example.com';
    dto.password = 'password123';
    dto.confirmPassword = 'differentPassword';
    dto.name = 'أحمد محمد';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('confirmPassword');
    expect(errors[0].constraints).toHaveProperty('Match');
  });

  it('should fail validation for missing required fields', async () => {
    // Arrange
    const dto = new RegisterDto();
    dto.email = '';
    dto.password = '';
    dto.confirmPassword = '';
    dto.name = '';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
    expect(errors.some((e) => e.property === 'confirmPassword')).toBe(true);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('should fail validation for short name', async () => {
    // Arrange
    const dto = new RegisterDto();
    dto.email = 'user@example.com';
    dto.password = 'password123';
    dto.confirmPassword = 'password123';
    dto.name = 'أح'; // Less than 3 characters

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('name');
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('should fail validation for empty name', async () => {
    // Arrange
    const dto = new RegisterDto();
    dto.email = 'user@example.com';
    dto.password = 'password123';
    dto.confirmPassword = 'password123';
    dto.name = '';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('name');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should handle Arabic names and emails', async () => {
    // Arrange
    const dto = new RegisterDto();
    dto.email = 'مستخدم@مثال.كوم';
    dto.password = 'كلمةمرور123';
    dto.confirmPassword = 'كلمةمرور123';
    dto.name = 'أحمد محمد علي';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('should handle password with special characters', async () => {
    // Arrange
    const dto = new RegisterDto();
    dto.email = 'user@example.com';
    dto.password = 'P@ssw0rd!123';
    dto.confirmPassword = 'P@ssw0rd!123';
    dto.name = 'أحمد محمد';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });
});
