import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';

import type { INestApplication } from '@nestjs/common';

// -----------------------------------------------------------------------------
// سلوك مرغوب:
// - غياب get/useGlobalFilters => خروج صامت (لا throw)
// - وجودهما ثم throw من أي منهما => نترك الخطأ يمر (الاختبارات تتوقعه)
// - قيمة null/undefined من get => نسجلها كما هي

export function configureFilters(app: INestApplication): void {
  const anyApp = app as unknown as {
    get?: (token: unknown) => unknown;
    useGlobalFilters?: (...filters: unknown[]) => void;
  };

  // إذا الواجهة غير مكتملة، لا تفعل شيئًا
  const hasGet = typeof anyApp?.get === 'function';
  const hasUseGlobal = typeof anyApp?.useGlobalFilters === 'function';
  if (!hasGet || !hasUseGlobal) {
    return;
  }

  // لا نستخدم try/catch هنا لأن الاختبارات تريد رؤية الأخطاء إن حدثت
  const filter = anyApp.get!(AllExceptionsFilter);
  anyApp.useGlobalFilters!(filter);
}
