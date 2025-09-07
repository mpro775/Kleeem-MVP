// src/shared/errors/__tests__/ErrorSystem.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastContainer } from 'react-toastify';
import { 
  AppError, 
  ErrorBoundary, 
  useErrorHandler, 
  GlobalErrorProvider,
  NetworkErrorHandler,
  errorLogger,
  applyServerFieldErrors,
  setErrorConfig,
  defaultErrorConfig
} from '../index';

// مكون تجريبي يحدث خطأ
function BuggyComponent({ shouldError = false }: { shouldError?: boolean }) {
  if (shouldError) {
    throw new Error('خطأ تجريبي');
  }
  return <div>مكون طبيعي</div>;
}

// مكون يستخدم useErrorHandler
function TestComponent() {
  const { handleError } = useErrorHandler();
  
  const triggerError = () => {
    handleError(new AppError({ message: 'خطأ تجريبي' }));
  };
  
  return (
    <button onClick={triggerError}>
      إحداث خطأ
    </button>
  );
}

// مكون مع ErrorBoundary
function TestErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}

// Wrapper للمكونات
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalErrorProvider>
        {children}
      </GlobalErrorProvider>
      <ToastContainer />
    </>
  );
}

describe('نظام معالجة الأخطاء', () => {
  beforeEach(() => {
    // إعادة تعيين التكوين
    setErrorConfig(defaultErrorConfig);
    // مسح الأخطاء المسجلة
    errorLogger.clearLogs();
  });

  describe('AppError', () => {
    it('يجب إنشاء خطأ مع الرسالة المطلوبة', () => {
      const error = new AppError({ message: 'خطأ تجريبي' });
      expect(error.message).toBe('خطأ تجريبي');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });

    it('يجب إنشاء خطأ مع خصائص إضافية', () => {
      const error = new AppError({
        message: 'خطأ تجريبي',
        code: 'TEST_ERROR',
        status: 500,
        requestId: 'req-123'
      });
      
      expect(error.code).toBe('TEST_ERROR');
      expect(error.status).toBe(500);
      expect(error.requestId).toBe('req-123');
    });
  });

  describe('ErrorBoundary', () => {
    it('يجب عرض المكون الطبيعي عندما لا يوجد خطأ', () => {
      render(
        <TestErrorBoundary>
          <BuggyComponent />
        </TestErrorBoundary>
      );
      
      expect(screen.getByText('مكون طبيعي')).toBeInTheDocument();
    });

    it('يجب عرض رسالة خطأ عندما يحدث خطأ', () => {
      render(
        <TestErrorBoundary>
          <BuggyComponent shouldError={true} />
        </TestErrorBoundary>
      );
      
      expect(screen.getByText('حدث خطأ غير متوقع')).toBeInTheDocument();
    });

    it('يجب استدعاء onError callback', () => {
      const onError = jest.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <BuggyComponent shouldError={true} />
        </ErrorBoundary>
      );
      
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('useErrorHandler', () => {
    it('يجب معالجة الخطأ وعرض رسالة', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('إحداث خطأ'));
      
      await waitFor(() => {
        expect(screen.getByText('خطأ تجريبي')).toBeInTheDocument();
      });
    });

    it('يجب تسجيل الخطأ', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('إحداث خطأ'));
      
      const logs = errorLogger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toBe('خطأ تجريبي');
    });
  });

  describe('applyServerFieldErrors', () => {
    it('يجب تطبيق أخطاء الحقول على النموذج', () => {
      const setError = jest.fn();
      const fields = {
        email: ['البريد الإلكتروني غير صحيح'],
        password: ['كلمة المرور قصيرة جداً']
      };
      
      applyServerFieldErrors(fields, setError);
      
      expect(setError).toHaveBeenCalledWith('email', {
        type: 'server',
        message: 'البريد الإلكتروني غير صحيح'
      });
      
      expect(setError).toHaveBeenCalledWith('password', {
        type: 'server',
        message: 'كلمة المرور قصيرة جداً'
      });
    });

    it('يجب تجاهل الحقول الفارغة', () => {
      const setError = jest.fn();
      
      applyServerFieldErrors(undefined, setError);
      
      expect(setError).not.toHaveBeenCalled();
    });
  });

  describe('errorLogger', () => {
    it('يجب تسجيل الأخطاء', () => {
      const error = new AppError({ message: 'خطأ تجريبي' });
      errorLogger.log(error);
      
      const logs = errorLogger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('خطأ تجريبي');
    });

    it('يجب مسح الأخطاء', () => {
      const error = new AppError({ message: 'خطأ تجريبي' });
      errorLogger.log(error);
      
      expect(errorLogger.getLogs().length).toBe(1);
      
      errorLogger.clearLogs();
      expect(errorLogger.getLogs().length).toBe(0);
    });

    it('يجب تصدير الأخطاء كـ JSON', () => {
      const error = new AppError({ message: 'خطأ تجريبي' });
      errorLogger.log(error);
      
      const jsonData = errorLogger.exportLogs();
      const parsed = JSON.parse(jsonData);
      
      expect(parsed).toBeInstanceOf(Array);
      expect(parsed[0].message).toBe('خطأ تجريبي');
    });

    it('يجب تسجيل أخطاء API', () => {
      const mockResponse = new Response('', {
        status: 500,
        headers: { 'x-request-id': 'req-123' }
      });
      
      errorLogger.logApiError(mockResponse, { data: 'test' });
      
      const logs = errorLogger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe(500);
      expect(logs[0].requestId).toBe('req-123');
    });

    it('يجب تسجيل أخطاء الشبكة', () => {
      const networkError = new Error('Network error');
      errorLogger.logNetworkError(networkError);
      
      const logs = errorLogger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].code).toBe('NETWORK_ERROR');
    });
  });

  describe('NetworkErrorHandler', () => {
    it('يجب عدم عرض أي شيء عندما تكون الشبكة متصلة', () => {
      // محاكاة حالة الاتصال
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      render(<NetworkErrorHandler />);
      
      expect(screen.queryByText('لا يوجد اتصال بالإنترنت')).not.toBeInTheDocument();
    });

    it('يجب عرض رسالة عندما تنقطع الشبكة', () => {
      // محاكاة حالة عدم الاتصال
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      render(<NetworkErrorHandler />);
      
      expect(screen.getByText('لا يوجد اتصال بالإنترنت')).toBeInTheDocument();
    });
  });

  describe('التكوين', () => {
    it('يجب تطبيق التكوين المخصص', () => {
      const customConfig = {
        maxLogs: 50,
        customMessages: {
          TEST_ERROR: 'خطأ تجريبي مخصص'
        }
      };
      
      setErrorConfig(customConfig);
      
      // التحقق من أن التكوين تم تطبيقه
      // (هذا يتطلب إضافة دالة للحصول على التكوين الحالي)
    });
  });
});
