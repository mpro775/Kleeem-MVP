import { randomBytes, createHash } from 'crypto';

import { MS_PER_SECOND } from 'src/common/cache/constant';
import {
  PASSWORD_RESET_TOKEN_LENGTH,
  SECONDS_PER_MINUTE,
} from 'src/common/constants/common';

export function generateSecureToken(
  bytes = PASSWORD_RESET_TOKEN_LENGTH,
): string {
  return randomBytes(bytes).toString('hex');
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
