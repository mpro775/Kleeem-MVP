// src/shared/errors/SentryIntegration.ts
import * as Sentry from '@sentry/react';

// استنتاج نوع خيارات React Sentry من init
type ReactSentryOptions = Parameters<typeof Sentry.init>[0];

// واجهة الإعدادات لدينا، لكن حقولها مأخوذة من خيارات Sentry نفسها
export interface SentryConfig {
  dsn: string;
  environment?: ReactSentryOptions['environment'];
  release?: ReactSentryOptions['release'];
  debug?: ReactSentryOptions['debug'];
  tracesSampleRate?: ReactSentryOptions['tracesSampleRate'];
  integrations?: ReactSentryOptions['integrations'];
  beforeSend?: ReactSentryOptions['beforeSend'];
  beforeBreadcrumb?: ReactSentryOptions['beforeBreadcrumb'];
}

class SentryIntegration {
  private isInitialized = false;

  init(config: SentryConfig): void {
    if (this.isInitialized) {
      console.warn('Sentry already initialized');
      return;
    }

    try {
      Sentry.init({
        dsn: config.dsn,
        environment: config.environment ?? 'development',
        release: config.release ?? '1.0.0',
        debug: config.debug ?? false,
        tracesSampleRate: config.tracesSampleRate ?? 0.1,
        integrations: config.integrations,
        beforeSend: config.beforeSend ?? this.defaultBeforeSend,
        beforeBreadcrumb: config.beforeBreadcrumb ?? this.defaultBeforeBreadcrumb,

        attachStacktrace: true,
        normalizeDepth: 3,

        ignoreErrors: [
          'Network Error',
          'Failed to fetch',
          'Request timeout',
          'Connection refused',
          'Script error.',
          'ResizeObserver loop limit exceeded',
          'ResizeObserver loop completed with undelivered notifications',
          'React does not recognize the',
          'Warning: ReactDOM.render is deprecated',
          'Extension context invalidated',
          'Extension context invalidated.',
        ],
        denyUrls: [/localhost/, /127\.0\.0\.1/, /chrome-extension/, /moz-extension/, /safari-extension/],
      });

      this.isInitialized = true;
      console.log('✅ Sentry initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Sentry:', error);
    }
  }

  captureException(error: Error | string, context?: Record<string, unknown>): void {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }
    try {
      if (context) Sentry.setContext('error_context', context);
      Sentry.captureException(error);
    } catch (err) {
      console.error('Failed to capture exception in Sentry:', err);
    }
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'error', context?: Record<string, unknown>): void {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }
    try {
      if (context) Sentry.setContext('message_context', context);
      Sentry.captureMessage(message, level);
    } catch (err) {
      console.error('Failed to capture message in Sentry:', err);
    }
  }

  setUser(user: Sentry.User): void {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }
    try {
      Sentry.setUser(user);
    } catch (err) {
      console.error('Failed to set user in Sentry:', err);
    }
  }

  setTag(key: string, value: string): void {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }
    try {
      Sentry.setTag(key, value);
    } catch (err) {
      console.error('Failed to set tag in Sentry:', err);
    }
  }

  setContext(name: string, context: Record<string, unknown>): void {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }
    try {
      Sentry.setContext(name, context);
    } catch (err) {
      console.error('Failed to set context in Sentry:', err);
    }
  }

  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }
    try {
      Sentry.addBreadcrumb(breadcrumb);
    } catch (err) {
      console.error('Failed to add breadcrumb in Sentry:', err);
    }
  }

  close(): void {
    if (!this.isInitialized) return;
    try {
      Sentry.close();
      this.isInitialized = false;
      console.log('Sentry closed');
    } catch (err) {
      console.error('Failed to close Sentry:', err);
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getSessionId(): string | null {
    if (!this.isInitialized) return null;
    try {
      return `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    } catch {
      return null;
    }
  }

  // نجعل التواقيع مطابقة تمامًا لأنواع ReactSentryOptions
  private defaultBeforeSend: NonNullable<ReactSentryOptions['beforeSend']> = (event /*, hint */) => {
    const val = event.exception?.values?.[0]?.value ?? '';
    if (typeof val === 'string') {
      if (val.includes('Network Error')) return null;
      if (val.includes('React does not recognize')) return null;
    }
    event.tags = { ...event.tags, source: 'kaleem-error-system', timestamp: new Date().toISOString() };
    return event;
  };

  private defaultBeforeBreadcrumb: NonNullable<ReactSentryOptions['beforeBreadcrumb']> = (breadcrumb /*, hint */) => {
    if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') return null;
    breadcrumb.data = { ...(breadcrumb.data as Record<string, unknown> | undefined), timestamp: new Date().toISOString() };
    return breadcrumb;
  };
}

export const sentryIntegration = new SentryIntegration();
export { Sentry };
export const SentryErrorBoundary = Sentry.ErrorBoundary;
export const SentryProfiler = Sentry.Profiler;
