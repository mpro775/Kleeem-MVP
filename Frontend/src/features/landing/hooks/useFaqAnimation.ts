// src/hooks/useFaqAnimation.ts
import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// تسجيل إضافة ScrollTrigger مرة واحدة في المشروع (عادة في ملف الإعداد الرئيسي)
// لكن للتأكد، سنضيفها هنا أيضًا
gsap.registerPlugin(ScrollTrigger);

/**
 * خطاف مخصص لتطبيق تأثير الظهور المتتابع على قسم الأسئلة الشائعة.
 * @param sectionRef - مرجع (ref) للعنصر الحاوي للقسم بأكمله.
 */
export const useFaqAnimation = (sectionRef: RefObject<HTMLElement>) => {
  useEffect(() => {
    const sectionElement = sectionRef.current;
    if (!sectionElement) return;

    // استخدام gsap.context لتسهيل عملية التنظيف (cleanup)
    const ctx = gsap.context(() => {
      // 1. اختيار جميع العناصر التي سنقوم بتحريكها باستخدام classNames
      const title = sectionElement.querySelector(".faq-title");
      const subtitle = sectionElement.querySelector(".faq-subtitle");
      const accordions = gsap.utils.toArray<HTMLElement>(".faq-accordion-item");
      const ctaBox = sectionElement.querySelector(".faq-cta");

      // 2. إخفاء العناصر في البداية لتجهيزها للحركة
      gsap.set([title, subtitle, ...accordions, ctaBox], { opacity: 0, y: 40 });

      // 3. إنشاء تايملاين (Timeline) لتنظيم الحركات بشكل متسلسل
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionElement,
          start: "top 80%", // تبدأ الحركة عندما يصل أعلى العنصر إلى 80% من الشاشة
          toggleActions: "play none none none", // تشغيل الحركة مرة واحدة فقط
        },
      });

      // 4. إضافة الحركات إلى الـ Timeline
      tl.to(title, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" })
        .to(
          subtitle,
          { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
          "-=0.6"
        ) // يبدأ بعد 0.6 ثانية من بداية حركة العنوان
        .to(
          accordions,
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.1, // هذا هو السر! التأخير بين ظهور كل عنصر
          },
          "-=0.5"
        )
        .to(
          ctaBox,
          { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
          "-=0.5"
        );
    }, sectionElement);

    // دالة التنظيف لإزالة كل الحركات
    return () => ctx.revert();
  }, [sectionRef]);
};
