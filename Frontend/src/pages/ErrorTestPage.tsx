// src/pages/ErrorTestPage.tsx
import  { useState } from 'react';
import { 
  Button, 
  Stack, 
  Typography, 
  Paper, 
  TextField,
  Alert,
  Container 
} from '@mui/material';
import { 
  useErrorHandler, 
  AppError, 
  applyServerFieldErrors,
  errorLogger,
  ErrorDebugPanel, 
  type FieldErrors
} from '@/shared/errors';
import { useForm } from 'react-hook-form';

/**
 * صفحة اختبار نظام معالجة الأخطاء
 * يمكن الوصول إليها عبر: /error-test
 */
export default function ErrorTestPage() {
  const [loading, setLoading] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const { handleError } = useErrorHandler();
  const { register, handleSubmit, setError, formState: { errors } } = useForm();

  // محاكاة استدعاء API مع خطأ
  const simulateApiError = async () => {
    setLoading(true);
    try {
      // محاكاة تأخير
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // محاكاة خطأ في API
      throw new AppError({
        message: 'فشل في جلب البيانات من الخادم',
        code: 'API_500',
        status: 500,
        requestId: 'req-' + Date.now()
      });
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // محاكاة خطأ في الشبكة
  const simulateNetworkError = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      throw new AppError({
        message: 'تعذر الاتصال بالخادم',
        code: 'NETWORK_ERROR',
        status: 0
      });
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // محاكاة خطأ في التحقق من صحة البيانات
  const simulateValidationError = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockError = new AppError({
        message: 'بيانات غير صحيحة',
        code: 'VALIDATION_ERROR',
        status: 400,
        fields: {
          email: ['البريد الإلكتروني غير صحيح'],
          password: ['كلمة المرور قصيرة جداً']
        }
      });
      throw mockError;
    } catch (error: unknown) {
      if ((error as { fields?: FieldErrors }).fields) {
        applyServerFieldErrors((error as { fields?: FieldErrors }).fields, setError as any);
      } else {
        handleError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  // محاكاة خطأ في الصلاحيات
  const simulatePermissionError = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      throw new AppError({
        message: 'ليست لديك صلاحية لتنفيذ هذه العملية',
        code: 'FORBIDDEN',
        status: 403
      });
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // تسجيل خطأ مخصص
  const logCustomError = () => {
    try {
      throw new Error('خطأ مخصص للاختبار');
    } catch (error) {
      errorLogger.log(error as Error, {
        userId: 'test-user',
        action: 'custom-error-test',
        timestamp: new Date().toISOString()
      });
      
      handleError(new AppError({
        message: 'تم تسجيل خطأ مخصص',
        code: 'CUSTOM_ERROR'
      }));
    }
  };

  // معالجة إرسال النموذج
  const handleFormSubmit = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // محاكاة خطأ في الخادم
      throw new AppError({
        message: 'فشل في إرسال النموذج',
        code: 'SUBMISSION_ERROR',
        status: 422,
        fields: {
          email: ['البريد الإلكتروني مستخدم بالفعل'],
          name: ['الاسم مطلوب']
        }
      });
      } catch (error: unknown) {
      if ((error as { fields?: FieldErrors }).fields) {
        applyServerFieldErrors((error as { fields?: FieldErrors }).fields, setError as any);
      } else {
        handleError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4}>
        <Typography variant="h3" textAlign="center" fontWeight="bold">
          اختبار نظام معالجة الأخطاء
        </Typography>
        
        <Alert severity="info">
          هذه الصفحة مخصصة لاختبار نظام معالجة الأخطاء في التطبيق
        </Alert>

        {/* أزرار محاكاة الأخطاء */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" mb={3}>محاكاة أنواع مختلفة من الأخطاء</Typography>
          
          <Stack direction="row" spacing={2} flexWrap="wrap" gap={2}>
            <Button 
              variant="contained" 
              color="error"
              onClick={simulateApiError}
              disabled={loading}
            >
              خطأ في API (500)
            </Button>
            
            <Button 
              variant="contained" 
              color="warning"
              onClick={simulateNetworkError}
              disabled={loading}
            >
              خطأ في الشبكة
            </Button>
            
            <Button 
              variant="contained" 
              color="info"
              onClick={simulateValidationError}
              disabled={loading}
            >
              خطأ في التحقق من صحة البيانات
            </Button>
            
            <Button 
              variant="contained" 
              color="secondary"
              onClick={simulatePermissionError}
              disabled={loading}
            >
              خطأ في الصلاحيات (403)
            </Button>
            
            <Button 
              variant="outlined"
              onClick={logCustomError}
              disabled={loading}
            >
              تسجيل خطأ مخصص
            </Button>
            
            <Button 
              variant="outlined"
              onClick={() => setShowDebugPanel(true)}
            >
              عرض لوحة الأخطاء
            </Button>
          </Stack>
        </Paper>

        {/* نموذج اختبار */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" mb={3}>نموذج اختبار مع معالجة الأخطاء</Typography>
          
          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <Stack spacing={3}>
              <TextField
                {...register('name', { 
                  required: 'الاسم مطلوب',
                  minLength: {
                    value: 3,
                    message: 'الاسم يجب أن يكون 3 أحرف على الأقل'
                  }
                })}
                label="الاسم"
                error={!!errors.name}
                helperText={errors.name?.message as string}
                fullWidth
              />
              
              <TextField
                {...register('email', { 
                  required: 'البريد الإلكتروني مطلوب',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'بريد إلكتروني غير صحيح'
                  }
                })}
                label="البريد الإلكتروني"
                error={!!errors.email}
                helperText={errors.email?.message as string}
                fullWidth
              />
              
              <TextField
                {...register('password', { 
                  required: 'كلمة المرور مطلوبة',
                  minLength: {
                    value: 8,
                    message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
                  }
                })}
                label="كلمة المرور"
                type="password"
                error={!!errors.password}
                helperText={errors.password?.message as string}
                fullWidth
              />
              
              <Button 
                type="submit" 
                variant="contained"
                disabled={loading}
                fullWidth
                size="large"
              >
                {loading ? 'جاري الإرسال...' : 'إرسال النموذج'}
              </Button>
            </Stack>
          </form>
        </Paper>

        {/* معلومات إضافية */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" mb={3}>معلومات مهمة</Typography>
          
          <Stack spacing={2}>
            <Typography variant="body1">
              • <strong>AppError:</strong> فئة مخصصة لتمثيل الأخطاء مع معلومات إضافية
            </Typography>
            <Typography variant="body1">
              • <strong>handleError:</strong> دالة لعرض رسائل الأخطاء للمستخدم
            </Typography>
            <Typography variant="body1">
              • <strong>applyServerFieldErrors:</strong> تطبيق أخطاء الحقول على النماذج
            </Typography>
            <Typography variant="body1">
              • <strong>errorLogger:</strong> تسجيل الأخطاء مع بيانات إضافية
            </Typography>
            <Typography variant="body1">
              • <strong>Ctrl+Shift+E:</strong> فتح لوحة تحكم الأخطاء للمطورين
            </Typography>
            <Typography variant="body1">
              • <strong>NetworkErrorHandler:</strong> مراقبة حالة الاتصال بالشبكة
            </Typography>
          </Stack>
        </Paper>
      </Stack>

      {/* لوحة تحكم الأخطاء */}
      <ErrorDebugPanel 
        isOpen={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />
    </Container>
  );
}
