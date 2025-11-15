# وحدة الذكاء الاصطناعي (AI Module)

توفر هذه الوحدة تكاملًا مع خدمة **Google Gemini** لإنتاج تعليمات تلقائية عند اكتشاف ردود غير مرضية من المساعد الذكي، ثم حفظ تلك التعليمات في قاعدة البيانات عبر `InstructionsService`.

## المتطلبات المسبقة
- مشروع NestJS مُعد مسبقًا.
- تفعيل خدمة Google Generative AI والحصول على مفتاح API صالح.
- إعداد قاعدة البيانات والوحدات اللازمة لـ `InstructionsService`.

## الإعداد
1. خزّن مفتاح Google Gemini في متغير بيئي مثل `GOOGLE_GEMINI_API_KEY`.
2. حدّث `GeminiService` لاستخدام المتغير البيئي بدل المفتاح الثابت داخل الكود إن لم يكن ذلك قد تم بالفعل.
3. تأكد من استيراد `AiModule` في الوحدات التي تحتاج إلى استهلاك الخدمة.

## الاستخدام
يمكن حقن `GeminiService` في أي مكوّن أو خدمة ضمن NestJS:

```typescript
import { GeminiService } from 'src/modules/ai/gemini.service';

@Injectable()
export class SomeService {
  constructor(private readonly geminiService: GeminiService) {}

  async handleBadReply(reply: string, merchantId: string) {
    const result =
      await this.geminiService.generateAndSaveInstructionFromBadReply(
        reply,
        merchantId,
      );
    // استخدم التوجيه الناتج حسب الحاجة
    return result;
  }
}
```

## ما الذي تفعله الخدمة؟
- توليد توجيه مختصر (15 كلمة أو أقل) لتجنّب تكرار رد غير مرضٍ.
- حفظ التوجيه الناتج في قاعدة البيانات مع ربطه بالرد الأصلي.
- تسجيل الأخطاء المحتملة سواء عند الاتصال بـ Gemini أو عند استخلاص النص.

## الاختبارات
- راجع مجلد `__tests__/` داخل الوحدة لإضافة أو تشغيل الاختبارات الخاصة بـ `GeminiService`.

## ملاحظات أمان
- تجنّب تخزين مفاتيح API داخل المستودع. استخدم المتغيرات البيئية أو خدمات إدارة الأسرار.
- راقب سجلات الخدمة للتأكد من معالجة الأخطاء والردود المشترطة بشكل صحيح.

