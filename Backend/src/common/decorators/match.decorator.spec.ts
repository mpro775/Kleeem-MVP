import { validate } from 'class-validator';

import { Match, MatchConstraint } from './match.decorator';

describe('MatchDecorator', () => {
  describe('MatchConstraint', () => {
    let constraint: MatchConstraint;

    beforeEach(() => {
      constraint = new MatchConstraint();
    });

    it('should be defined', () => {
      expect(MatchConstraint).toBeDefined();
      expect(constraint).toBeInstanceOf(MatchConstraint);
    });

    describe('validate', () => {
      it('should return true when values match', () => {
        const object = { password: 'test123', confirmPassword: 'test123' };
        const args = {
          property: 'confirmPassword',
          object,
          constraints: ['password'],
        } as any;

        const result = constraint.validate('test123', args);

        expect(result).toBe(true);
      });

      it('should return false when values do not match', () => {
        const object = { password: 'test123', confirmPassword: 'different' };
        const args = {
          property: 'confirmPassword',
          object,
          constraints: ['password'],
        } as any;

        const result = constraint.validate('different', args);

        expect(result).toBe(false);
      });

      it('should handle string comparisons', () => {
        const testCases = [
          {
            password: 'password123',
            confirmPassword: 'password123',
            expected: true,
          },
          {
            password: 'password123',
            confirmPassword: 'Password123',
            expected: false,
          },
          { password: '', confirmPassword: '', expected: true },
          { password: 'test', confirmPassword: 'test', expected: true },
        ];

        testCases.forEach(({ password, confirmPassword, expected }) => {
          const object = { password, confirmPassword };
          const args = {
            property: 'confirmPassword',
            object,
            constraints: ['password'],
          } as any;

          const result = constraint.validate(confirmPassword, args);
          expect(result).toBe(expected);
        });
      });

      it('should handle number comparisons', () => {
        const object = { code: 12345, confirmCode: 12345 };
        const args = {
          property: 'confirmCode',
          object,
          constraints: ['code'],
        } as any;

        const result = constraint.validate(12345, args);

        expect(result).toBe(true);
      });

      it('should handle boolean comparisons', () => {
        const object = { agree: true, confirmAgree: true };
        const args = {
          property: 'confirmAgree',
          object,
          constraints: ['agree'],
        } as any;

        const result = constraint.validate(true, args);

        expect(result).toBe(true);
      });

      it('should return false for different types', () => {
        const object = { value: '123', numberValue: 123 };
        const args = {
          property: 'numberValue',
          object,
          constraints: ['value'],
        } as any;

        const result = constraint.validate(123, args);

        expect(result).toBe(false);
      });

      it('should handle null values', () => {
        const object = { value1: null, value2: null };
        const args = {
          property: 'value2',
          object,
          constraints: ['value1'],
        } as any;

        const result = constraint.validate(null, args);

        expect(result).toBe(true);
      });

      it('should handle undefined values', () => {
        const object = { value1: undefined, value2: undefined };
        const args = {
          property: 'value2',
          object,
          constraints: ['value1'],
        } as any;

        const result = constraint.validate(undefined, args);

        expect(result).toBe(true);
      });

      it('should return false when related property does not exist', () => {
        const object = { confirmPassword: 'test123' };
        const args = {
          property: 'confirmPassword',
          object,
          constraints: ['password'],
        } as any;

        const result = constraint.validate('test123', args);

        expect(result).toBe(false);
      });

      it('should handle complex objects', () => {
        const address1 = { street: 'Main St', city: 'NYC' };
        const address2 = { street: 'Main St', city: 'NYC' };
        const object = { address1, address2 };
        const args = {
          property: 'address2',
          object,
          constraints: ['address1'],
        } as any;

        const result = constraint.validate(address2, args);

        // Objects are compared by reference, so different instances should not match
        expect(result).toBe(false);
      });
    });

    describe('defaultMessage', () => {
      it('should return correct Arabic error message', () => {
        const args = {
          property: 'confirmPassword',
          constraints: ['password'],
        } as any;

        const message = constraint.defaultMessage(args);

        expect(message).toBe('حقل confirmPassword يجب أن يطابق password');
      });

      it('should handle different property names', () => {
        const testCases = [
          {
            property: 'confirmEmail',
            relatedProperty: 'email',
            expected: 'حقل confirmEmail يجب أن يطابق email',
          },
          {
            property: 'repeatPassword',
            relatedProperty: 'password',
            expected: 'حقل repeatPassword يجب أن يطابق password',
          },
          {
            property: 'verifyCode',
            relatedProperty: 'code',
            expected: 'حقل verifyCode يجب أن يطابق code',
          },
        ];

        testCases.forEach(({ property, relatedProperty, expected }) => {
          const args = {
            property,
            constraints: [relatedProperty],
          } as any;

          const message = constraint.defaultMessage(args);
          expect(message).toBe(expected);
        });
      });
    });
  });

  describe('Match decorator', () => {
    it('should be defined', () => {
      expect(Match).toBeDefined();
    });

    it('should return a property decorator function', () => {
      const decorator = Match('password');
      expect(typeof decorator).toBe('function');
    });

    describe('integration with class-validator', () => {
      class TestDto {
        password?: string;

        @Match('password')
        confirmPassword?: string;
      }

      it('should validate matching passwords successfully', async () => {
        const dto = new TestDto();
        dto.password = 'test123';
        dto.confirmPassword = 'test123';

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });

      it('should fail validation when passwords do not match', async () => {
        const dto = new TestDto();
        dto.password = 'test123';
        dto.confirmPassword = 'different';

        const errors = await validate(dto);

        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('confirmPassword');
        expect(errors[0].constraints).toHaveProperty('match');
        expect(errors[0].constraints!.match).toBe(
          'حقل confirmPassword يجب أن يطابق password',
        );
      });

      it('should handle validation options', async () => {
        class TestDtoWithOptions {
          email?: string;

          @Match('email', {
            message: 'كلمة المرور يجب أن تتطابق',
          })
          confirmEmail?: string;
        }

        const dto = new TestDtoWithOptions();
        dto.email = 'test@example.com';
        dto.confirmEmail = 'different@example.com';

        const errors = await validate(dto);

        expect(errors).toHaveLength(1);
        expect(errors[0].constraints!.match).toBe('كلمة المرور يجب أن تتطابق');
      });

      it('should work with different property types', async () => {
        class TestDtoTypes {
          code?: number;

          @Match('code')
          confirmCode?: number;
        }

        const dto = new TestDtoTypes();
        dto.code = 12345;
        dto.confirmCode = 12345;

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should fail with different property types', async () => {
        class TestDtoTypes {
          code?: string;

          @Match('code')
          confirmCode?: number;
        }

        const dto = new TestDtoTypes();
        dto.code = '12345';
        dto.confirmCode = 12345;

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
      });
    });

    // Decorator registration is tested indirectly through integration tests above
  });

  describe('real-world usage scenarios', () => {
    it('should work for user registration with password confirmation', async () => {
      class RegisterUserDto {
        email?: string;
        password?: string;

        @Match('password')
        confirmPassword?: string;
      }

      const dto = new RegisterUserDto();
      dto.email = 'user@example.com';
      dto.password = 'securePassword123';
      dto.confirmPassword = 'securePassword123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should work for email verification', async () => {
      class VerifyEmailDto {
        email?: string;

        @Match('email')
        confirmEmail?: string;
      }

      const dto = new VerifyEmailDto();
      dto.email = 'test@example.com';
      dto.confirmEmail = 'test@example.com';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should work for code verification', async () => {
      class VerifyCodeDto {
        verificationCode?: string;

        @Match('verificationCode')
        confirmCode?: string;
      }

      const dto = new VerifyCodeDto();
      dto.verificationCode = '123456';
      dto.confirmCode = '123456';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle empty strings correctly', async () => {
      class TestDto {
        field1?: string;

        @Match('field1')
        field2?: string;
      }

      const dto = new TestDto();
      dto.field1 = '';
      dto.field2 = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with whitespace differences', async () => {
      class TestDto {
        field1?: string;

        @Match('field1')
        field2?: string;
      }

      const dto = new TestDto();
      dto.field1 = 'test';
      dto.field2 = ' test '; // has spaces

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });
  });
});
