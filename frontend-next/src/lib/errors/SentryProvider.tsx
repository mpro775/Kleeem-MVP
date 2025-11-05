// src/shared/errors/SentryProvider.tsx
import React, { createContext, useEffect, useState } from 'react';
import { useSentry } from './sentryHooks';
import { sentryIntegration, type SentryConfig } from './SentryIntegration';
import { useAuth } from '@/contexts/AuthContext';
import type { SeverityLevel } from '@sentry/react';

interface SentryContextType {
  isReady: boolean;
  setUser: (user: { [key: string]: unknown; id?: string | undefined; email?: string | undefined; username?: string | undefined; }) => void;
  setTag: (key: string, value: string) => void;
  setContext: (name: string, context: Record<string, unknown>) => void;
  addBreadcrumb: (breadcrumb: unknown) => void;
  captureException: (error: Error | string, context?: Record<string, unknown>) => void;
  captureMessage: (message: string, level?: unknown, context?: Record<string, unknown>) => void;
}

export const SentryContext = createContext<SentryContextType | null>(null);

interface SentryProviderProps {
  children: React.ReactNode;
  config: SentryConfig;
  autoTrackUser?: boolean;
  autoTrackPerformance?: boolean;
}

export function SentryProvider({ 
  children, 
  config, 
  autoTrackUser = true,
  autoTrackPerformance = true 
}: SentryProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const { user } = useAuth();

  // تهيئة Sentry
  useEffect(() => {
    const initializeSentry = async () => {
      try {
        await sentryIntegration.init(config);
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize Sentry:', error);
      }
    };
    
    initializeSentry();
  }, [config]);

  // تتبع المستخدم تلقائياً
  useEffect(() => {
    if (isReady && autoTrackUser && user) {
      sentryIntegration.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
        merchantId: user.merchantId,
        role: user.role,
      });

      // إضافة tags مفيدة
      sentryIntegration.setTag('user_role', user.role || 'unknown');
      sentryIntegration.setTag('merchant_id', user.merchantId || 'none');
      sentryIntegration.setTag('environment', config.environment || 'development');
    }
  }, [isReady, autoTrackUser, user, config.environment]);

  // تتبع الأداء تلقائياً
  useEffect(() => {
    if (isReady && autoTrackPerformance) {
      // تتبع تحميل الصفحة
      const trackPageLoad = () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          sentryIntegration.addBreadcrumb({
            message: 'Page loaded',
            category: 'performance',
            level: 'info',
            data: {
              loadTime: navigation.loadEventEnd - navigation.loadEventStart,
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
              url: window.location.href,
            }
          });
        }
      };

      // تتبع الأخطاء غير المعالجة
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        sentryIntegration.captureException(event.reason, {
          type: 'unhandled_rejection',
          url: window.location.href,
        });
      };

      const handleError = (event: ErrorEvent) => {
        sentryIntegration.captureException(event.error, {
          type: 'unhandled_error',
          url: window.location.href,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      };

      // إضافة event listeners
      window.addEventListener('load', trackPageLoad);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('error', handleError);

      return () => {
        window.removeEventListener('load', trackPageLoad);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('error', handleError);
      };
    }
  }, [isReady, autoTrackPerformance]);

  const contextValue: SentryContextType = {
    isReady,
    setUser: (user) => sentryIntegration.setUser(user),
    setTag: (key, value) => sentryIntegration.setTag(key, value),
    setContext: (name, context) => sentryIntegration.setContext(name, context),
    addBreadcrumb: (breadcrumb) => sentryIntegration.addBreadcrumb(breadcrumb as { message: string; category?: string | undefined; level?: SeverityLevel | undefined; data?: Record<string, unknown> | undefined; }),
    captureException: (error, context) => sentryIntegration.captureException(error, context),
    captureMessage: (message, level, context) => sentryIntegration.captureMessage(message, level as SeverityLevel, context),
  };

  return (
    <SentryContext.Provider value={contextValue}>
      {children}
    </SentryContext.Provider>
  );
}


// مكون لمراقبة الأداء
export function SentryPerformanceMonitor({ children }: { children: React.ReactNode }) {
  const { addBreadcrumb } = useSentry();

  useEffect(() => {
    // مراقبة تغييرات المسار
    const handleRouteChange = () => {
      addBreadcrumb({
        message: 'Route changed',
        category: 'navigation',
        level: 'info',
        data: {
          from: document.referrer,
          to: window.location.href,
          timestamp: new Date().toISOString(),
        }
      });
    };

    // مراقبة النقرات المهمة
    const handleImportantClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        addBreadcrumb({
          message: 'Button clicked',
          category: 'ui',
          level: 'info',
          data: {
            buttonText: target.textContent?.trim(),
            buttonType: (target as HTMLButtonElement).type,
            url: window.location.href,
          }
        });
      }
    };

    // مراقبة النماذج
    const handleFormSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement;
      addBreadcrumb({
        message: 'Form submitted',
        category: 'ui',
        level: 'info',
        data: {
          formAction: form.action,
          formMethod: form.method,
          formId: form.id,
          url: window.location.href,
        }
      });
    };

    // إضافة event listeners
    window.addEventListener('popstate', handleRouteChange);
    document.addEventListener('click', handleImportantClick);
    document.addEventListener('submit', handleFormSubmit);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      document.removeEventListener('click', handleImportantClick);
      document.removeEventListener('submit', handleFormSubmit);
    };
  }, [addBreadcrumb]);

  return <>{children}</>;
}

// مكون لمراقبة الأخطاء في المكونات
export function SentryComponentMonitor({ 
  children, 
  componentName 
}: { 
  children: React.ReactNode;
  componentName: string;
}) {
  const { addBreadcrumb } = useSentry();

  useEffect(() => {
    addBreadcrumb({
      message: `Component ${componentName} mounted`,
      category: 'component',
      level: 'info',
      data: {
        componentName,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }
    });

    return () => {
      addBreadcrumb({
        message: `Component ${componentName} unmounted`,
        category: 'component',
        level: 'info',
        data: {
          componentName,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }
      });
    };
  }, [componentName, addBreadcrumb]);

  return <>{children}</>;
}
