// src/shared/errors/useErrorHandler.ts
import { useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { AppError, ERROR_MESSAGES } from './AppError';
import { errorLogger } from './ErrorLogger';

interface ErrorHandlerOptions {
  showSnackbar?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
  onError?: (error: AppError) => void;
}

/** حارس نوع بسيط */
function isAppError(e: unknown): e is AppError {
  return !!e && typeof e === 'object' && 'message' in (e as any);
}

/** تطبيع أي unknown إلى AppError آمن */
function normalizeError(e: unknown, fallbackMessage: string): AppError {
  if (isAppError(e)) return e;
  if (e instanceof Error) {
    return new AppError({ message: e.message });
  }
  try {
    const msg =
      (typeof e === 'string' && e) ||
      (e && typeof (e as any).message === 'string' && (e as any).message) ||
      fallbackMessage;
    return new AppError({ message: String(msg || fallbackMessage) });
  } catch {
    return new AppError({ message: fallbackMessage });
  }
}

/** hook موحد لعرض/تسجيل الأخطاء مع خيارات مرنة */
export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    showSnackbar = true,
    logError = true,
    fallbackMessage = 'تعذر تنفيذ العملية',
    onError,
  } = options;

  const handleError = useCallback(
    (e: unknown) => {
      const err = normalizeError(e, fallbackMessage);

      // تسجيل الخطأ إذا كان مطلوباً
      if (logError) {
        // يمكنك تمرير meta إضافية هنا لو أحببت
        errorLogger.log(err, {
          status: (err as any).status,
          code: (err as any).code,
          requestId: (err as any).requestId,
        });
      }

      // عرض رسالة للمستخدم إذا كان مطلوباً
      if (showSnackbar) {
        const code = (err as any).code as string | undefined;
        const msg =
          (code && ERROR_MESSAGES[code]) ||
          err.message ||
          fallbackMessage;

        if (code === 'NETWORK_ERROR' || !navigator.onLine) {
          // منع تكرار توست الشبكة
          const toastId = 'NETWORK_ERROR_TOAST';
          if (!toast.isActive(toastId)) {
            toast.error(msg, {
              toastId,
              autoClose: false,
              closeOnClick: false,
              draggable: false,
              onClick: () => {
                // انقر لإعادة المحاولة
                window.location.reload();
              },
            });
          }
        } else {
          toast.error(msg, { autoClose: 6000 });
        }
      }

      // كولباك مخصص إن توفر
      if (onError) onError(err);

      return err;
    },
    [showSnackbar, logError, fallbackMessage, onError]
  );

  // أدوات إضافية موحدة
  const errorUtils = useMemo(
    () => ({
      handleError,
      logError: (error: Error | AppError, additionalData?: Record<string, any>) => {
        errorLogger.log(
          normalizeError(error, fallbackMessage),
          additionalData
        );
      },
      clearLogs: () => errorLogger.clearLogs(),
      getLogs: () => errorLogger.getLogs(),
      exportLogs: () => errorLogger.exportLogs(),
    }),
    [handleError, fallbackMessage]
  );

  return errorUtils;
}
