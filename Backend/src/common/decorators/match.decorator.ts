// src/common/decorators/match.decorator.ts

import { registerDecorator, ValidatorConstraint } from 'class-validator';

import type {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'match', async: false })
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints as unknown as readonly [
      string,
    ];
    const relatedObject = args.object as Record<string, unknown>;
    const relatedValue = relatedObject[relatedPropertyName];
    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints as unknown as readonly [
      string,
    ];
    return `حقل ${args.property} يجب أن يطابق ${relatedPropertyName}`;
  }
}

export function Match(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string): void => {
    registerDecorator({
      target: target.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: MatchConstraint,
    });
  };
}
