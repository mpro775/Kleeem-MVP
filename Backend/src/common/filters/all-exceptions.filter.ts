// src/common/filters/all-exceptions.filter.ts

// external (alphabetized)
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

// type-only imports
import {
  DUPLICATE_KEY_CODE,
  DEFAULT_HTTP_ERROR_CODE,
  HTTP_EXCEPTION_CODE,
  VALIDATION_ERROR_CODE,
  INVALID_ID_CODE,
  DB_ERROR_CODE,
  EXTERNAL_SERVICE_ERROR_CODE,
  INVALID_TOKEN_CODE,
  TOKEN_EXPIRED_CODE,
  DEFAULT_ERROR_MESSAGE,
} from './constants';

import type {
  AxiosLikeError,
  MongoValidationError,
  MongoCastError,
  MongoServerError,
  JwtErrorNames,
  ErrorPayload,
} from './typs';
import type { Request, Response } from 'express';
// -----------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isAxiosError(e: unknown): e is AxiosLikeError {
  return isObject(e) && (e as Partial<AxiosLikeError>).isAxiosError === true;
}

function hasName(e: unknown, name: string): e is Record<string, unknown> {
  return isObject(e) && e.name === name;
}

function isMongoValidationError(e: unknown): e is MongoValidationError {
  return hasName(e, 'ValidationError');
}

function isMongoCastError(e: unknown): e is MongoCastError {
  return hasName(e, 'CastError');
}

function isMongoServerError(e: unknown): e is MongoServerError {
  return hasName(e, 'MongoServerError');
}

function isJwtError(e: unknown, n: JwtErrorNames): boolean {
  return hasName(e, n);
}

// -----------------------------------------------------------------------------

/** فلتر استثناءات موحّد يعيد عقد أخطاء ثابت */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId;
    const timestamp = new Date().toISOString();

    // مسار 1: HttpException (يشمل أخطائك المخصصة إن ورثت منها)
    if (exception instanceof HttpException) {
      const payload = this.handleHttpException(exception, requestId, timestamp);
      this.logError(payload, request, exception);
      response.status(payload.status).json(payload);
      return;
    }

    // مسار 2: أخطاء Mongo
    if (
      isMongoValidationError(exception) ||
      isMongoCastError(exception) ||
      isMongoServerError(exception)
    ) {
      const payload = this.handleMongoError(exception, requestId, timestamp);
      this.logError(payload, request, exception);
      response.status(payload.status).json(payload);
      return;
    }

    // مسار 3: Axios errors
    if (isAxiosError(exception)) {
      const payload = this.handleAxiosError(exception, requestId, timestamp);
      this.logError(payload, request, exception);
      response.status(payload.status).json(payload);
      return;
    }

    // مسار 4: JWT errors
    if (
      isJwtError(exception, 'JsonWebTokenError') ||
      isJwtError(exception, 'TokenExpiredError')
    ) {
      const payload = this.handleJwtError(exception, requestId, timestamp);
      this.logError(payload, request, exception);
      response.status(payload.status).json(payload);
      return;
    }

    // مسار 5: افتراضي
    const fallback: ErrorPayload = {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: DEFAULT_HTTP_ERROR_CODE,
      message: DEFAULT_ERROR_MESSAGE,
      requestId,
      timestamp,
    };
    this.logError(fallback, request, exception);
    response.status(fallback.status).json(fallback);
  }

  // --------------------------- Handlers --------------------------------------

  private handleHttpException(
    exception: HttpException,
    requestId: string | undefined,
    timestamp: string,
  ): ErrorPayload {
    const status = exception.getStatus();
    const res = exception.getResponse();

    // إذا كان الرد أصلاً بصيغة payload قياسي يحوي code
    if (isObject(res) && 'code' in res) {
      const base: Omit<ErrorPayload, 'status' | 'code' | 'message'> = {
        requestId,
        timestamp,
      };
      const obj = res;
      return {
        status,
        code:
          typeof obj.code === 'string' || typeof obj.code === 'number'
            ? String(obj.code)
            : HTTP_EXCEPTION_CODE,
        message: typeof obj.message === 'string' ? obj.message : 'خطأ',
        ...base,
        details: obj.details as Record<string, unknown> | undefined,
      };
    }

    return {
      status,
      code: HTTP_EXCEPTION_CODE,
      message: typeof res === 'string' ? res : 'خطأ',
      requestId,
      timestamp,
    };
  }

  private handleMongoError(
    exception: MongoValidationError | MongoCastError | MongoServerError,
    requestId: string | undefined,
    timestamp: string,
  ): ErrorPayload {
    if (isMongoValidationError(exception)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: VALIDATION_ERROR_CODE,
        message: 'بيانات غير صحيحة',
        details: this.formatMongoValidationError(exception),
        requestId,
        timestamp,
      };
    }

    if (isMongoCastError(exception)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: INVALID_ID_CODE,
        message: 'معرف غير صحيح',
        details: { field: exception.path, value: exception.value },
        requestId,
        timestamp,
      };
    }

    // MongoServerError
    if (
      typeof exception.code === 'number' &&
      exception.code === DUPLICATE_KEY_CODE
    ) {
      return {
        status: HttpStatus.CONFLICT,
        code: 'DUPLICATE_ENTRY',
        message: 'البيانات موجودة مسبقاً',
        details: { field: Object.keys(exception.keyPattern ?? {}) },
        requestId,
        timestamp,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: DB_ERROR_CODE,
      message: 'خطأ في قاعدة البيانات',
      details: { code: exception.code },
      requestId,
      timestamp,
    };
  }

  private handleAxiosError(
    exception: AxiosLikeError,
    requestId: string | undefined,
    timestamp: string,
  ): ErrorPayload {
    const status = exception.response?.status ?? HttpStatus.BAD_GATEWAY;
    return {
      status,
      code: EXTERNAL_SERVICE_ERROR_CODE,
      message: 'خطأ في الخدمة الخارجية',
      details: {
        url: exception.config?.url,
        method: exception.config?.method,
        status: exception.response?.status,
        data: exception.response?.data,
      },
      requestId,
      timestamp,
    };
  }

  private handleJwtError(
    exception: unknown,
    requestId: string | undefined,
    timestamp: string,
  ): ErrorPayload {
    if (hasName(exception, 'JsonWebTokenError')) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        code: INVALID_TOKEN_CODE,
        message: 'توكن غير صحيح',
        requestId,
        timestamp,
      };
    }
    // TokenExpiredError
    return {
      status: HttpStatus.UNAUTHORIZED,
      code: TOKEN_EXPIRED_CODE,
      message: 'التوكن منتهي الصلاحية',
      requestId,
      timestamp,
    };
  }

  // --------------------------- Logging & Utils -------------------------------

  private logError(
    payload: ErrorPayload,
    request: Request,
    exception: unknown,
  ): void {
    const meta = {
      requestId: payload.requestId,
      status: payload.status,
      code: payload.code,
      message: payload.message,
      url: request.url,
      method: request.method,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      exception:
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : exception,
    };
    // تجنب تمرير كائن كوسيط ثاني (قد يفرض `any`)، ندمج في النص
    this.logger.error(
      `Exception occurred: ${payload.code} ${JSON.stringify(meta)}`,
    );
  }

  private formatMongoValidationError(
    error: MongoValidationError,
  ): Record<string, { message: string; value?: unknown; kind?: string }> {
    const details: Record<
      string,
      { message: string; value?: unknown; kind?: string }
    > = {};

    const errs = error.errors ?? {};
    for (const key of Object.keys(errs)) {
      const fieldError = errs[key];
      if (!fieldError) continue;
      details[key] = {
        message: fieldError.message,
        value: fieldError.value,
        kind: fieldError.kind,
      };
    }

    return details;
  }
}
