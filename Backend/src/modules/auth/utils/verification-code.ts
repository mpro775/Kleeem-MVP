import { randomInt, createHash } from 'crypto';

export function generateNumericCode(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(randomInt(min, max));
}

export function sha256(input: string) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function minutesFromNow(mins: number) {
  return new Date(Date.now() + mins * 60 * 1000);
}
