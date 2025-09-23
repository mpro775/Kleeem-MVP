// src/common/interceptors/bypass.util.ts

interface BypassRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  originalUrl?: string;
  url?: string;
}

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

function shouldBypassByMethod(req: BypassRequest): boolean {
  const method = (req?.method || '').toUpperCase();
  return BYPASS_METHODS.includes(method);
}

function shouldBypassByUserAgent(req: BypassRequest): boolean {
  const ua = req?.headers?.['user-agent'];
  const uaStr = Array.isArray(ua) ? ua[0] : ua || '';
  return UA_BYPASS_REGEX.test(uaStr);
}

function shouldBypassByUrl(url: string): boolean {
  // مطابقات دقيقة
  if (EXACT_PATHS.includes(url)) return true;

  // مطابقات مسبوق-بـ
  if (PREFIX_PATHS.some((p) => url === p || url.startsWith(p + '/'))) {
    return true;
  }

  // مخصّصة من ENV (Regex)
  return ENV_REGEXES.some((re) => re.test(url));
}

function shouldBypassByHeader(req: BypassRequest): boolean {
  const headerBypass = req?.headers?.['x-metrics-bypass'];
  const headerValue = Array.isArray(headerBypass)
    ? headerBypass[0]
    : headerBypass;
  return headerValue === '1' || headerValue === 'true';
}

export function shouldBypass(req: BypassRequest): boolean {
  if (shouldBypassByMethod(req)) return true;
  if (shouldBypassByUserAgent(req)) return true;

  const url = (req?.originalUrl || req?.url || '').split('?')[0] || '/';
  if (shouldBypassByUrl(url)) return true;
  if (shouldBypassByHeader(req)) return true;

  return false;
}
