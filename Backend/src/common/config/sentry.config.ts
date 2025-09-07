// src/common/config/sentry.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('sentry', () => ({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.APP_VERSION || '1.0.0',
  
  // إعدادات الأداء
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // إعدادات التطوير
  debug: process.env.NODE_ENV === 'development',
  
  // إعدادات الأمان
  beforeSend: (event: any, hint: any) => {
    // تصفية الأخطاء الحساسة
    if (event.exception) {
      const exception = event.exception.values?.[0];
      if (exception?.type === 'ValidationError') {
        return null; // لا نرسل أخطاء التحقق
      }
    }
    
    // إزالة البيانات الحساسة
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
      delete event.request.headers['x-api-key'];
    }
    
    return event;
  },
  
  // التاجات الافتراضية
  defaultTags: {
    service: 'kaleem-bot',
    version: process.env.APP_VERSION || '1.0.0',
  },
}));
