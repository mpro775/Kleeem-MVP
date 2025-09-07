// src/common/constants/http-status.ts
import { HttpStatus } from '@nestjs/common';

/** رسائل HTTP الموحدة باللغة العربية */
export const HTTP_MESSAGES = {
  [HttpStatus.OK]: 'تمت العملية بنجاح',
  [HttpStatus.CREATED]: 'تم الإنشاء بنجاح',
  [HttpStatus.ACCEPTED]: 'تم قبول الطلب',
  [HttpStatus.NO_CONTENT]: 'لا يوجد محتوى',
  
  [HttpStatus.BAD_REQUEST]: 'طلب غير صحيح',
  [HttpStatus.UNAUTHORIZED]: 'غير مصرح لك بالوصول',
  [HttpStatus.FORBIDDEN]: 'ممنوع الوصول',
  [HttpStatus.NOT_FOUND]: 'المورد غير موجود',
  [HttpStatus.CONFLICT]: 'تعارض في البيانات',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'بيانات غير صالحة',
  [HttpStatus.TOO_MANY_REQUESTS]: 'عدد الطلبات كبير جداً',
  
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'خطأ في الخادم',
  [HttpStatus.BAD_GATEWAY]: 'خطأ في البوابة',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'الخدمة غير متاحة',
} as const;

export type HttpMessageKey = keyof typeof HTTP_MESSAGES;
