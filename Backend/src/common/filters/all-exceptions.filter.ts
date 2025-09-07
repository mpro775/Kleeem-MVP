// src/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Logger } from '@nestjs/common';

/** فلتر استثناءات موحّد يعيد عقد أخطاء ثابت */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = (request as any)?.requestId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: any = {
      status,
      code: 'INTERNAL_ERROR',
      message: 'حدث خطأ غير متوقع، الرجاء المحاولة لاحقًا',
      requestId,
      timestamp: new Date().toISOString(),
    };

    // معالجة HttpException (يشمل DomainError و BusinessError)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      
      // لو الاستثناء أصلاً صيغ كعقد موحّد
      if (typeof res === 'object' && res !== null && 'code' in (res as any)) {
        payload = { 
          requestId, 
          status, 
          timestamp: new Date().toISOString(),
          ...(res as any) 
        };
      } else {
        payload = {
          status,
          code: 'HTTP_EXCEPTION',
          message: typeof res === 'string' ? res : (res as any)?.message ?? 'خطأ',
          requestId,
          timestamp: new Date().toISOString(),
        };
      }
    }
    // معالجة أخطاء MongoDB
    else if (exception && typeof exception === 'object' && 'name' in exception) {
      const mongoError = exception as any;
      
      switch (mongoError.name) {
        case 'ValidationError':
          status = HttpStatus.BAD_REQUEST;
          payload = {
            status,
            code: 'VALIDATION_ERROR',
            message: 'بيانات غير صحيحة',
            details: this.formatMongoValidationError(mongoError),
            requestId,
            timestamp: new Date().toISOString(),
          };
          break;
          
        case 'CastError':
          status = HttpStatus.BAD_REQUEST;
          payload = {
            status,
            code: 'INVALID_ID',
            message: 'معرف غير صحيح',
            details: { field: mongoError.path, value: mongoError.value },
            requestId,
            timestamp: new Date().toISOString(),
          };
          break;
          
        case 'MongoServerError':
          if (mongoError.code === 11000) {
            status = HttpStatus.CONFLICT;
            payload = {
              status,
              code: 'DUPLICATE_ENTRY',
              message: 'البيانات موجودة مسبقاً',
              details: { field: Object.keys(mongoError.keyPattern || {}) },
              requestId,
              timestamp: new Date().toISOString(),
            };
          } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            payload = {
              status,
              code: 'DATABASE_ERROR',
              message: 'خطأ في قاعدة البيانات',
              details: { code: mongoError.code },
              requestId,
              timestamp: new Date().toISOString(),
            };
          }
          break;
          
        default:
          // أخطاء MongoDB أخرى
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          payload = {
            status,
            code: 'DATABASE_ERROR',
            message: 'خطأ في قاعدة البيانات',
            details: { name: mongoError.name },
            requestId,
            timestamp: new Date().toISOString(),
          };
      }
    }
    // معالجة أخطاء Axios (HTTP requests)
    else if (exception && typeof exception === 'object' && 'isAxiosError' in exception) {
      const axiosError = exception as any;
      status = axiosError.response?.status || HttpStatus.BAD_GATEWAY;
      payload = {
        status,
        code: 'EXTERNAL_SERVICE_ERROR',
        message: 'خطأ في الخدمة الخارجية',
        details: {
          url: axiosError.config?.url,
          method: axiosError.config?.method,
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        },
        requestId,
        timestamp: new Date().toISOString(),
      };
    }
    // معالجة أخطاء JWT
    else if (exception && typeof exception === 'object' && 'name' in exception) {
      const jwtError = exception as any;
      if (jwtError.name === 'JsonWebTokenError') {
        status = HttpStatus.UNAUTHORIZED;
        payload = {
          status,
          code: 'INVALID_TOKEN',
          message: 'توكن غير صحيح',
          requestId,
          timestamp: new Date().toISOString(),
        };
      } else if (jwtError.name === 'TokenExpiredError') {
        status = HttpStatus.UNAUTHORIZED;
        payload = {
          status,
          code: 'TOKEN_EXPIRED',
          message: 'التوكن منتهي الصلاحية',
          requestId,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // تسجيل الخطأ
    this.logger.error(`Exception occurred: ${payload.code}`, {
      requestId,
      status,
      message: payload.message,
      url: request.url,
      method: request.method,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      exception: exception instanceof Error ? exception.stack : exception,
    });

    // إرسال الاستجابة
    response.status(status).json(payload);
  }

  private formatMongoValidationError(error: any): any {
    const details: any = {};
    
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        const fieldError = error.errors[key];
        details[key] = {
          message: fieldError.message,
          value: fieldError.value,
          kind: fieldError.kind,
        };
      });
    }
    
    return details;
  }
}
