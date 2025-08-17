// src/modules/merchants/services/prompt-preview.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import * as Handlebars from 'handlebars';

@Injectable()
export class PromptPreviewService {
  /**
   * يعيد النص بعد استبدال المتغيّرات التجريبية في القالب الخام
   * ويتحقق أنّ الناتج فعلاً سلسلة نصّية
   */
  preview(rawTemplate: string, testVars: Record<string, string>): string {
    // احصل على دالة التحويل مع نوع صريح
    const tpl: Handlebars.TemplateDelegate = Handlebars.compile(rawTemplate);

    // نفّذ القالب مع testVars
    const output: unknown = tpl(testVars);

    // تحقق أنّ الناتج سلسلة نصّية
    if (typeof output !== 'string') {
      throw new BadRequestException(
        'PromptPreviewService: compiled template did not return a string',
      );
    }

    return output;
  }
}
