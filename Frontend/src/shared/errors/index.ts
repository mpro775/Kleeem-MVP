// src/shared/errors/index.ts
export { AppError, ERROR_MESSAGES, type FieldErrors } from './AppError';
export { ErrorBoundary } from './ErrorBoundary';
export { applyServerFieldErrors } from './fieldErrorHelpers';
export { useErrorHandler } from './useErrorHandler';
export { NetworkErrorHandler } from './NetworkErrorHandler';
export { ErrorFallback } from './ErrorFallback';
export { errorLogger, type ErrorLogData } from './ErrorLogger';
export { GlobalErrorProvider, useGlobalError } from './GlobalErrorProvider';
export { ErrorDebugPanel } from './ErrorDebugPanel';
export { ErrorToast } from './ErrorToast';

// Sentry Integration
export { 
  sentryIntegration, 
  SentryErrorBoundary, 
  SentryProfiler,
  type SentryConfig 
} from './SentryIntegration';
export { 
  SentryProvider, 
  SentryPerformanceMonitor, 
  SentryComponentMonitor,
  useSentry 
} from './SentryProvider';

// التكوين
export { 
  defaultErrorConfig, 
  createErrorConfig, 
  getErrorConfig, 
  setErrorConfig,
  type ErrorConfig 
} from './config';

// التكامل
export { 
  AppErrorIntegration,
  useAppErrorIntegration,
  ErrorPerformanceMonitor,
  ErrorTestPanel
} from './integration/AppErrorIntegration';


