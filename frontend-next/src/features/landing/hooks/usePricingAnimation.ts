// src/hooks/usePricingAnimation.ts
import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { pricingData } from "@/features/landing/data/pricingData"; // تأكد من المسار

gsap.registerPlugin(ScrollTrigger);

export const usePricingAnimation = (
  sectionRef: RefObject<HTMLElement>,
  billingCycle: "monthly" | "yearly"
) => {
  // 1. حركة الدخول عند التمرير (تنفذ مرة واحدة فقط)
  useEffect(() => {
    const sectionElement = sectionRef.current;
    if (!sectionElement) return;

    const ctx = gsap.context(() => {
      const title = sectionElement.querySelector(".pricing-title");
      const subtitle = sectionElement.querySelector(".pricing-subtitle");
      const switchToggle = sectionElement.querySelector(".pricing-switch");
      const cards = gsap.utils.toArray<HTMLElement>(".plan-card");

      gsap.set([title, subtitle, switchToggle, ...cards], {
        autoAlpha: 0,
        y: 50,
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionElement,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      });

      tl.to([title, subtitle], {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out",
      })
        .to(
          switchToggle,
          { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" },
          "-=0.5"
        )
        .to(
          cards,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.15,
            ease: "power3.out",
          },
          "-=0.5"
        );
    }, sectionRef);
    return () => ctx.revert();
  }, [sectionRef]);

  // 2. حركة التبديل بين الخطط (تنفذ عند كل تغيير لـ billingCycle)
  useEffect(() => {
    const sectionElement = sectionRef.current;
    if (!sectionElement) return;

    const cards = gsap.utils.toArray<HTMLElement>(".plan-card");
    const prices = gsap.utils.toArray<HTMLElement>(".plan-price");
    const newPrices = pricingData[billingCycle].map((p) => p.price);

    const tl = gsap.timeline();

    // حركة الخروج
    tl.to(cards, {
      opacity: 0,
      scale: 0.97,
      duration: 0.2,
      ease: "power2.in",
      stagger: 0.05,
    });

    // تحديث الأرقام أثناء اختفاء البطاقات
    prices.forEach((priceEl, index) => {
      tl.to(
        priceEl,
        {
          duration: 0.3,
          // هذه الخاصية تحرك الأرقام بشكل رائع
          textContent: newPrices[index],
          // تقريب الأرقام لتجنب الكسور العشرية
          roundProps: "textContent",
          ease: "power2.inOut",
        },
        "<"
      ); // "<" ابدأ مع الحركة السابقة
    });

    // حركة الدخول بالبيانات الجديدة
    tl.to(cards, {
      opacity: 1,
      scale: 1,
      duration: 0.3,
      ease: "power2.out",
      stagger: 0.05,
      // تأكد من أن البطاقة الأكثر شعبية تحافظ على حجمها
      onComplete: () => {
        cards.forEach((card, index) => {
          if (pricingData[billingCycle][index].popular) {
            gsap.to(card, { scale: 1.05, duration: 0.3 });
          }
        });
      },
    });
  }, [billingCycle, sectionRef]);
};
