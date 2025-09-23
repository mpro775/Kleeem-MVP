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
  return new Date(Date.now() + mins * SECONDS_PER_MINUTE);
}
