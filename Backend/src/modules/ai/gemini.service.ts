import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InstructionsService } from '../instructions/instructions.service';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private logger = new Logger(GeminiService.name);

  constructor(
    private instructionsService: InstructionsService,
    private configService: ConfigService,
  ) {
    const apiKey =
      this.configService.get<string>('GOOGLE_GEMINI_API_KEY') ||
      process.env.GOOGLE_GEMINI_API_KEY ||
      'AIzaSyAFLWfWKrZpG6c4-uYYqgeYnLtvk3PijSU';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async checkHealth(): Promise<{ ok: boolean; message?: string }> {
    const apiKey =
      this.configService.get<string>('GOOGLE_GEMINI_API_KEY') ||
      process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      return { ok: false, message: 'GOOGLE_GEMINI_API_KEY is not set' };
    }
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent('ping');
      if (result?.response?.text()) {
        return { ok: true };
      }
      return { ok: false, message: 'No response from Gemini' };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Gemini API error';
      this.logger.warn('Gemini health check failed', { error: message });
      return { ok: false, message };
    }
  }
  async generateAndSaveInstructionFromBadReply(
    badReply: string,
    merchantId?: string,
  ): Promise<{ instruction: string; saved: boolean }> {
    const instruction = await this.generateInstructionFromBadReply(badReply);

    // احفظ التوجيه في قاعدة البيانات
    await this.instructionsService.create({
      merchantId: merchantId ?? '',
      instruction,
      relatedReplies: [badReply],
      type: 'auto',
    });

    return { instruction, saved: true };
  }
  async generateInstructionFromBadReply(text: string): Promise<string> {
    const prompt = `
    الرد التالي تم تقييمه سلبيًا من قبل التاجر: "${text}".
    صِغ توجيهًا مختصرًا جدًا (سطر واحد فقط، 15 كلمة أو أقل، لا تشرح السبب) لمنع مساعد الذكاء الاصطناعي من تكرار هذا الخطأ.
    `;

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
      });
      const result = await model.generateContent(prompt);

      if (result && result.response) {
        try {
          const output = result.response.text();
          if (typeof output === 'string') {
            return output.trim();
          } else {
            this.logger.error('Gemini output is not a string:', output);
            return 'تعذر استخراج التوجيه (الناتج ليس نصًا)';
          }
        } catch (err) {
          this.logger.error('Gemini text() error:', err);
          return 'تعذر استخراج التوجيه (محتوى محظور أو مرفوض)';
        }
      }
      return 'تعذر الحصول على رد من النموذج';
    } catch (error) {
      this.logger.error('Gemini API error:', error);
      return 'تعذر الاتصال بخدمة الذكاء الاصطناعي';
    }
  }
}
