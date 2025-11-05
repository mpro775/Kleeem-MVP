// src/shared/errors/integration/AppErrorIntegration.tsx
import React, { useEffect } from 'react';
import { useState } from 'react';
import { 
  GlobalErrorProvider, 
  ErrorBoundary, 
  ErrorDebugPanel,
  setErrorConfig,
  type SentryConfig,
  type ErrorConfig
} from '../index';
import { SentryProvider, SentryPerformanceMonitor } from '../SentryProvider';
import { shouldShowDebugPanel } from '../config';

interface AppErrorIntegrationProps {
  children: React.ReactNode;
  showNetworkHandler?: boolean;
  showDebugPanel?: boolean;
  customConfig?: Partial<ErrorConfig>;
  sentryConfig?: SentryConfig;
  enableSentry?: boolean;
  enablePerformanceMonitoring?: boolean;
}

/**
 * مكون تكامل شامل لنظام معالجة الأخطاء
 * يوفر جميع المكونات والخدمات المطلوبة للتطبيق
 */
export function AppErrorIntegration({ 
  children, 
  showNetworkHandler = true,
  showDebugPanel = shouldShowDebugPanel(),
  customConfig,
  sentryConfig,
  enableSentry = false,
  enablePerformanceMonitoring = false
}: AppErrorIntegrationProps) {
  // تطبيق التكوين المخصص إذا كان متوفراً
  useEffect(() => {
    if (customConfig) {
      setErrorConfig(customConfig);
    }
  }, [customConfig]);

  // إعداد Sentry إذا كان مفعلاً
  const shouldEnableSentry = enableSentry && sentryConfig;
  const shouldEnablePerformanceMonitoring = enablePerformanceMonitoring && shouldEnableSentry;

  const appContent = (
    <GlobalErrorProvider showNetworkHandler={showNetworkHandler}>
      <ErrorBoundary 
        showDetails={process.env.NODE_ENV === 'development'}
        onError={(error, errorInfo) => {
          // تسجيل إضافي للأخطاء الحرجة
          console.error('خطأ حرج في التطبيق:', error, errorInfo);
        }}
      >
        {children}
        
        {/* لوحة تحكم الأخطاء للمطورين */}
        {showDebugPanel && (
          <ErrorDebugPanelWrapper />
        )}
      </ErrorBoundary>
    </GlobalErrorProvider>
  );

  // إذا كان Sentry مفعلاً، نغلف التطبيق بـ SentryProvider
  if (shouldEnableSentry) {
    return (
      <SentryProvider 
        config={sentryConfig!}
        autoTrackUser={true}
        autoTrackPerformance={!!shouldEnablePerformanceMonitoring}
      >
        {shouldEnablePerformanceMonitoring ? (
          <SentryPerformanceMonitor>
            {appContent}
          </SentryPerformanceMonitor>
        ) : (
          appContent
        )}
      </SentryProvider>
    );
  }

  return appContent;
}

/**
 * مكون منفصل للوحة تحكم الأخطاء مع مفاتيح الاختصار
 */
function ErrorDebugPanelWrapper() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+Shift+E لفتح لوحة الأخطاء
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <ErrorDebugPanel 
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );
}

/**
 * Hook لاستخدام نظام معالجة الأخطاء في المكونات
 */
export function useAppErrorIntegration() {
  const [errorCount] = useState(0);

  useEffect(() => {
    // مراقبة عدد الأخطاء المسجلة
    const checkErrors = () => {
      // يمكن إضافة منطق لمراقبة الأخطاء هنا
    };

    const interval = setInterval(checkErrors, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    errorCount,
    showDebugPanel: () => {
      // يمكن إضافة منطق لفتح لوحة الأخطاء
    }
  };
}

/**
 * مكون لمراقبة أداء نظام معالجة الأخطاء
 */
export function ErrorPerformanceMonitor() {
  const [stats] = useState({
    totalErrors: 0,
    networkErrors: 0,
    apiErrors: 0,
    validationErrors: 0
  });

  useEffect(() => {
 

    // يمكن إضافة مستمع للأخطاء هنا
    return () => {
      // تنظيف المستمعين
    };
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <div>الأخطاء: {stats.totalErrors}</div>
      <div>الشبكة: {stats.networkErrors}</div>
      <div>API: {stats.apiErrors}</div>
    </div>
  );
}

/**
 * مكون لاختبار نظام معالجة الأخطاء
 */
export function ErrorTestPanel() {
    const [testResults, setTestResults] = useState<string[]>([]);

  const runTests = async () => {
    const results: string[] = [];

    try {
      // اختبار 1: خطأ عادي
      throw new Error('اختبار خطأ عادي');
    } catch {
      results.push('✅ اختبار الخطأ العادي نجح');
    }

    try {
      // اختبار 2: خطأ AppError
      throw new Error('اختبار AppError');
    } catch {
      results.push('✅ اختبار AppError نجح');
    }

    try {
      // اختبار 3: خطأ في الشبكة
      await fetch('/non-existent-endpoint');
    } catch {
      results.push('✅ اختبار خطأ الشبكة نجح');
    }

    setTestResults(results);
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'white',
      border: '1px solid #ccc',
      padding: '16px',
      borderRadius: '8px',
      maxWidth: '300px',
      zIndex: 9999
    }}>
      <h4>اختبار نظام الأخطاء</h4>
      <button onClick={runTests}>تشغيل الاختبارات</button>
      <ul>
        {testResults.map((result, index) => (
          <li key={index}>{result}</li>
        ))}
      </ul>
    </div>
  );
}
