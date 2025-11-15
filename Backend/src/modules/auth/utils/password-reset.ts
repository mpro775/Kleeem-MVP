import { randomBytes, createHash } from 'crypto';

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
  const milliseconds = mins * SECONDS_PER_MINUTE * 1000; // Convert to milliseconds
  const futureTime = now + milliseconds;
  console.log(`[DEBUG] password-reset minutesFromNow(${mins}): now=${new Date(now)}, future=${new Date(futureTime)}, diff=${milliseconds}ms`);
  return new Date(futureTime);
}
