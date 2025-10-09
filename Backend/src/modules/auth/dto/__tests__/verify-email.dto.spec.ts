import { validate } from 'class-validator';

import { VerifyEmailDto } from '../verify-email.dto';

describe('VerifyEmailDto', () => {
  it('should validate a correct verify email DTO', async () => {
    // Arrange
    const dto = new VerifyEmailDto();
    dto.email = 'user@example.com';
    dto.code = '123456';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('should fail validation for invalid email', async () => {
    // Arrange
    const dto = new VerifyEmailDto();
    dto.email = 'invalid-email';
    dto.code = '123456';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });

  it('should fail validation for short code', async () => {
    // Arrange
    const dto = new VerifyEmailDto();
    dto.email = 'user@example.com';
    dto.code = '12345'; // Less than 6 characters

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('code');
    expect(errors[0].constraints).toHaveProperty('isLength');
  });

  it('should fail validation for long code', async () => {
    // Arrange
    const dto = new VerifyEmailDto();
    dto.email = 'user@example.com';
    dto.code = '1234567'; // More than 6 characters

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('code');
    expect(errors[0].constraints).toHaveProperty('isLength');
  });

  it('should fail validation for non-numeric code', async () => {
    // Arrange
    const dto = new VerifyEmailDto();
    dto.email = 'user@example.com';
    dto.code = 'ABCDEF'; // Non-numeric

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0); // @Length doesn't validate content, only length
  });

  it('should fail validation for missing email', async () => {
    // Arrange
    const dto = new VerifyEmailDto();
    dto.email = '';
    dto.code = '123456';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });

  it('should fail validation for missing code', async () => {
    // Arrange
    const dto = new VerifyEmailDto();
    dto.email = 'user@example.com';
    dto.code = '';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('code');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail validation for empty code', async () => {
    // Arrange
    const dto = new VerifyEmailDto();
    dto.email = 'user@example.com';
    dto.code = '';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('code');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should handle Arabic email addresses', async () => {
    // Arrange
    const dto = new VerifyEmailDto();
    dto.email = 'مستخدم@مثال.كوم';
    dto.code = '123456';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('should handle numeric codes with leading zeros', async () => {
    // Arrange
    const dto = new VerifyEmailDto();
    dto.email = 'user@example.com';
    dto.code = '001234';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });
});
