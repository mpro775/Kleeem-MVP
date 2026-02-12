import { randomInt, createHash } from 'crypto';

import {
  MS_PER_SECOND,
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
  const now = Date.now();
  const milliseconds = mins * SECONDS_PER_MINUTE * MS_PER_SECOND; // Convert to milliseconds
  const futureTime = now + milliseconds;

  return new Date(futureTime);
}
