// src/hooks/useStaggeredAnimation.ts
import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";

/**
 * خطاف مخصص لتطبيق تأثير الظهور المتتابع (stagger) على العناصر الفرعية داخل حاوية.
 * @param ref - مرجع (ref) للعنصر الحاوي (e.g., h2, p).
 * @param delay - مدة الانتظار قبل بدء الحركة بالثواني (اختياري).
 */
export const useStaggeredAnimation = (
  ref: RefObject<HTMLElement>,
  delay: number = 0.5
) => {
  useEffect(() => {
    // نتأكد أن العنصر موجود في الصفحة
    const element = ref.current;
    if (!element) return;

    // نستهدف كل العناصر الفرعية (الكلمات) التي ستكون داخل وسوم <span>
    const childElements = Array.from(element.children);

    // نخفي العناصر في البداية ونجهزها للتحريك
    gsap.set(childElements, { opacity: 0, y: 30 });

    // نبدأ التحريك بعد فترة تأخير بسيطة
    const timeline = gsap.timeline({ delay });

    timeline.to(childElements, {
      opacity: 1, // إظهار الكلمات
      y: 0, // تحريكها للأعلى إلى مكانها الطبيعي
      duration: 0.8, // مدة الحركة لكل كلمة
      ease: "power3.out", // نوع الحركة لجعلها سلسة
      stagger: 0.1, // المدة الزمنية بين ظهور كل كلمة والأخرى
    });

    // يمكننا إعادة الـ timeline إذا أردنا التحكم بها من الخارج
    // return () => timeline.kill(); // تنظيف عند إزالة المكون
  }, [ref, delay]);
};
