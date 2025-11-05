// src/hooks/useComparisonAnimation.ts
import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const useComparisonAnimation = (sectionRef: RefObject<HTMLElement>) => {
  useEffect(() => {
    const sectionElement = sectionRef.current;
    if (!sectionElement) return;

    const ctx = gsap.context(() => {
      // اختيار العناصر التي سنحركها
      const title = sectionElement.querySelector(".comparison-title");
      const beforeItems = gsap.utils.toArray<HTMLElement>(".before-item");
      const afterItems = gsap.utils.toArray<HTMLElement>(".after-item");

      // إخفاء العناصر في البداية
      gsap.set([title, ...beforeItems, ...afterItems], { opacity: 0, y: 30 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionElement,
          start: "top 75%",
          toggleActions: "play none none none",
        },
      });

      // 1. حركة العنوان
      tl.to(title, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
      });

      // 2. حركة قائمة "قبل" (المشكلة)
      tl.to(
        beforeItems,
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.15, // تظهر واحدة تلو الأخرى
          ease: "power2.out",
        },
        "-=0.5"
      ); // تبدأ قبل انتهاء حركة العنوان بقليل

      // 3. حركة قائمة "بعد" (الحل) بحركة أقوى وأكثر حيوية
      tl.to(
        afterItems,
        {
          opacity: 1,
          y: 0,
          scale: 1, // سنستخدم scale لجعلها تبدو أكثر بروزًا
          duration: 0.7,
          stagger: 0.15,
          ease: "back.out(1.7)", // حركة bouncy مميزة
        },
        "-=0.5"
      ); // تبدأ في نفس وقت ظهور القائمة الأولى تقريبًا لتأثير المقارنة المباشرة
    }, sectionElement);

    return () => ctx.revert();
  }, [sectionRef]);
};
