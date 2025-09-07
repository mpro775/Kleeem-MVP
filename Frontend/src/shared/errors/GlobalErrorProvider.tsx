// src/shared/errors/GlobalErrorProvider.tsx
import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import { AppError, ERROR_MESSAGES } from './AppError';
import { errorLogger } from './ErrorLogger';
import { NetworkErrorHandler } from './NetworkErrorHandler';

interface ErrorContextType {
  handleError: (error: unknown) => AppError;
  logError: (error: Error | AppError, additionalData?: Record<string, any>) => void;
  clearLogs: () => void;
  getLogs: () => any[];
  exportLogs: () => string;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface GlobalErrorProviderProps {
  children: ReactNode;
  showNetworkHandler?: boolean;
  defaultErrorMessage?: string;
}

export function GlobalErrorProvider({ 
  children, 
  showNetworkHandler = true,
  defaultErrorMessage = 'حدث خطأ غير متوقع'
}: GlobalErrorProviderProps) {

  const handleError = useCallback((e: unknown) => {
    const err = e as AppError;
    
    // تسجيل الخطأ
    errorLogger.log(err);
    
    // عرض رسالة للمستخدم
    const msg = (err?.code && ERROR_MESSAGES[err.code]) || err?.message || defaultErrorMessage;
    
    if (err?.code === 'NETWORK_ERROR') {
      toast.error(msg, {
        autoClose: false,
        closeButton: () => (
          <button onClick={() => window.location.reload()}>
            إعادة المحاولة
          </button>
        )
      });
    } else {
      toast.error(msg, {
        autoClose: 6000
      });
    }

    return err;
  }, [defaultErrorMessage]);

  const logError = useCallback((error: Error | AppError, additionalData?: Record<string, any>) => {
    errorLogger.log(error, additionalData);
  }, []);

  const clearLogs = useCallback(() => {
    errorLogger.clearLogs();
  }, []);

  const getLogs = useCallback(() => {
    return errorLogger.getLogs();
  }, []);

  const exportLogs = useCallback(() => {
    return errorLogger.exportLogs();
  }, []);

  const contextValue: ErrorContextType = {
    handleError,
    logError,
    clearLogs,
    getLogs,
    exportLogs
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {showNetworkHandler && <NetworkErrorHandler />}
      {children}
    </ErrorContext.Provider>
  );
}

export function useGlobalError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider');
  }
  return context;
}
