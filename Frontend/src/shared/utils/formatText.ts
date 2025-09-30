// يضيف سطر جديد بعد نهاية الجملة + ينظف المسافات
export function autoLineBreaks(input: string): string {
    if (!input) return '';
    let t = input
      .replace(/\s+/g, ' ')        // توحيد المسافات
      .replace(/\s*\n\s*/g, '\n')  // الحفاظ على الأسطر الموجودة
      .trim();
  
    // سطر جديد بعد نهاية الجملة (عربي/إنجليزي)
    t = t.replace(/([.!؟…]+)(\s)(?=\S)/g, '$1\n');
  
    // سطر جديد قبل عناصر مرقمة مثل: 1. 2) ...
    t = t.replace(/(^|\s)(\d+[.)]\s+)/g, '\n$2');
  
    // إزالة تكرار الأسطر
    t = t.replace(/\n{2,}/g, '\n');
  
    return t;
  }
  