import { randomInt, createHash } from 'crypto';

import {
  SECONDS_PER_MINUTE,
  VERIFICATION_CODE_LENGTH,
} from 'src/common/constants/common';

export function generateNumericCode(length = VERIFICATION_CODE_LENGTH): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(randomInt(min, max));
}

export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function minutesFromNow(mins: number): Date {
  return new Date(Date.now() + mins * SECONDS_PER_MINUTE);
}
