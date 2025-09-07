import { randomBytes, createHash } from 'crypto';

export function generateSecureToken(bytes = 32) {
  return randomBytes(bytes).toString('hex'); // 64-char hex
}
export function sha256(input: string) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
export function minutesFromNow(mins: number) {
  return new Date(Date.now() + mins * 60 * 1000);
}
