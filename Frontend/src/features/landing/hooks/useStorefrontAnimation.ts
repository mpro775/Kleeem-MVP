// src/hooks/useStorefrontAnimation.ts
import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const useStorefrontAnimation = (sectionRef: RefObject<HTMLElement>) => {
  useEffect(() => {
    const sectionElement = sectionRef.current;
    if (!sectionElement) return;

    const ctx = gsap.context(() => {
      // اختيار العناصر الرئيسية
      const title = sectionElement.querySelector(".storefront-title");
      const subtitle = sectionElement.querySelector(".storefront-subtitle");
      const mainCards = gsap.utils.toArray<HTMLElement>(
        ".storefront-main-card"
      );
      const howItWorksCard = sectionElement.querySelector(
        ".storefront-how-it-works"
      );

      // اختيار العناصر الداخلية للتحريك المتتابع
      const featureDetails = gsap.utils.toArray<HTMLElement>(
        ".feature-detail-item"
      );
      const pills = gsap.utils.toArray<HTMLElement>(".pill-item");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionElement,
          start: "top 70%", // تبدأ الحركة عندما يظهر 30% من القسم
          toggleActions: "play none none none",
        },
      });

      // 1. حركة العنوان الرئيسي والفرعي
      tl.from([title, subtitle], {
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.2,
      });

      // 2. حركة "الكشف الزجاجي" للبطاقتين الرئيسيتين
      tl.from(
        mainCards,
        {
          opacity: 0,
          y: 50,
          scale: 0.98,
          filter: "blur(8px)", // نبدأ بتأثير ضبابي
          duration: 1,
          stagger: 0.2,
          ease: "power3.out",
        },
        "-=0.5"
      );

      // 3. حركة المحتوى الداخلي (قائمة الميزات والحبوب)
      tl.from(
        featureDetails,
        {
          opacity: 0,
          x: -20, // تنزلق من اليسار
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
        },
        "-=0.5"
      ) // تبدأ قبل انتهاء حركة البطاقات بقليل
        .from(
          pills,
          {
            opacity: 0,
            scale: 0.8,
            duration: 0.4,
            stagger: 0.1,
            ease: "back.out(1.7)",
          },
          "<"
        ); // "<" تبدأ مع الحركة السابقة (قائمة الميزات)

      // 4. حركة البطاقة السفلية "كيف يعمل"
      tl.from(
        howItWorksCard,
        {
          opacity: 0,
          y: 50,
          duration: 0.8,
          ease: "power3.out",
        },
        "-=0.8"
      );
    }, sectionElement);

    return () => ctx.revert();
  }, [sectionRef]);
};
