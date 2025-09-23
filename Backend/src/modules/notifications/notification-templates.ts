// src/modules/notifications/notification-templates.ts
export type TemplateKey =
  | 'faq.updated'
  | 'faq.deleted'
  | 'embeddings.completed'
  | 'embeddings.failed'
  | 'knowledge.urls.queued'
  | 'embeddings.batch.completed'
  | 'missingResponses.stats';

export function buildNotification(key: TemplateKey): {
  title: string;
  body: string;
} {
  switch (key) {
    case 'faq.updated':
      return {
        title: 'تم تحديث سؤال شائع',
        body: 'تم تحديث السؤال/الجواب بنجاح.',
      };
    case 'faq.deleted':
      return {
        title: 'تم حذف سؤال/جواب نهائيًا',
        body: 'تم حذف العنصر ولن يظهر في النتائج.',
      };
    // ... أكمل الباقي لو رغبت
    default:
      return { title: 'إشعار', body: '' };
  }
}
