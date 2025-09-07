import * as crypto from 'crypto';
import * as fs from 'fs';

let KEY: Buffer | null = null;

function resolveKey(): Buffer | null {
  // 1) دعم ملف سر اختياري
  const file = process.env.SECRETS_KEY_FILE?.trim();
  if (file) {
    try {
      const buf = fs.readFileSync(file);
      if (buf.length === 32) return buf;
      // لو الملف نصّي، اشتق منه مفتاح 32 بايت
      return crypto.scryptSync(buf.toString('utf8'), 'kaleem-secrets', 32);
    } catch {
      /* تجاهل */
    }
  }

  // 2) من env
  const v = process.env.SECRETS_KEY?.trim();
  if (!v) return null;

  // جرّب Base64
  try {
    const b64 = Buffer.from(v, 'base64');
    if (b64.length === 32) return b64;
  } catch {
    /* ignore */
  }

  // جرّب Hex
  if (/^[0-9a-fA-F]{64}$/.test(v)) {
    return Buffer.from(v, 'hex');
  }

  // 3) آخر حل: اشتق من النص (scrypt) لمفتاح 32 بايت
  return crypto.scryptSync(v, 'kaleem-secrets', 32);
}

function ensureKey() {
  if (!KEY) KEY = resolveKey();

  if (!KEY) {
    if (process.env.NODE_ENV !== 'production') {
      // مفتاح تطوير فقط — سيتلف التشفير عند إعادة التشغيل (مقبول لبيئة dev)
      KEY = crypto.scryptSync('local-dev-key', 'kaleem-secrets', 32);
    } else {
      throw new Error(
        'SECRETS_KEY not set (or invalid). Set SECRETS_KEY or SECRETS_KEY_FILE.',
      );
    }
  }
}

export function encryptSecret(plain: string): string {
  ensureKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY!, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(encBase64: string): string {
  ensureKey();
  const raw = Buffer.from(encBase64, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY!, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}

export function hashSecret(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}
