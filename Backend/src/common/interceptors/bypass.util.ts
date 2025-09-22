// src/common/interceptors/bypass.util.ts
import type { Request } from 'express';

/**
 * Request paths/methods/agents to bypass for metrics/logging/tracing.
 * الفكرة: قلّل الضوضاء (noise) واحفظ الكارديناليتي.
 */
const EXACT_PATHS = [
  '/metrics',
  '/health',
  '/api/health',
  '/ready',
  '/live',
  '/favicon.ico',
  '/robots.txt',
];

const PREFIX_PATHS = [
  '/swagger', // /swagger, /swagger-json, /swagger-ui...
  '/docs', // أي توثيق
  '/.well-known', // ملفات ACME/إلخ
];

const BYPASS_METHODS = ['HEAD', 'OPTIONS']; // preflight & lightweight probes

// user agents شائعة للفحوصات/المراقبة
const UA_BYPASS_REGEX =
  /(kube-probe|ELB-HealthChecker|Prometheus|Alertmanager|Grafana|BlackboxExporter)/i;

// دعم تخصيص المسارات عبر ENV (قيمة مفصولة بفواصل إلى Regex)
function getEnvRegexes(): RegExp[] {
  const raw = process.env.METRICS_BYPASS_PATHS; // مثال: ^/public/|^/uploads/|^/assets/
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pat) => {
      try {
        return new RegExp(pat);
      } catch {
        return null;
      }
    })
    .filter((r): r is RegExp => !!r);
}

const ENV_REGEXES = getEnvRegexes();

export function shouldBypass(req: Request | any): boolean {
  const method = (req?.method || '').toUpperCase();
  if (BYPASS_METHODS.includes(method)) return true;

  const ua: string = req?.headers?.['user-agent'] || '';
  if (UA_BYPASS_REGEX.test(ua)) return true;

  const url = (req?.originalUrl || req?.url || '').split('?')[0] || '/';

  // مطابقات دقيقة
  if (EXACT_PATHS.includes(url)) return true;

  // مطابقات مسبوق-بـ
  if (PREFIX_PATHS.some((p) => url === p || url.startsWith(p + '/')))
    return true;

  // مخصّصة من ENV (Regex)
  if (ENV_REGEXES.some((re) => re.test(url))) return true;

  // خيار يدوي للتجاوز عبر هيدر داخلي
  const headerBypass = req?.headers?.['x-metrics-bypass'];
  if (headerBypass === '1' || headerBypass === 'true') return true;

  return false;
}
