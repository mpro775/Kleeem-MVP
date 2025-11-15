// src/hooks/useStepsAnimation.ts
import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

export const useStepsAnimation = (sectionRef: RefObject<HTMLElement>) => {
  useEffect(() => {
    const sectionElement = sectionRef.current;
    if (!sectionElement) return;

    const ctx = gsap.context(() => {
      // ✅ استخدم selector محلي داخل القسم
      const q = gsap.utils.selector(sectionElement);

      const title = q(".steps-title")[0] as HTMLElement | undefined;
      const subtitle = q(".steps-subtitle")[0] as HTMLElement | undefined;
      const steps = q(".step-box-item") as HTMLElement[];
      const cards = steps.map((s) =>
        s.querySelector(".step-box-animated")
      ) as HTMLElement[];
      const connectors = steps
        .map((s) => s.querySelector(".connector-line"))
        .filter(Boolean) as HTMLElement[];

      if (!title || !subtitle || cards.length === 0) return;

      // ✅ ثبّت الحالة الابتدائية بدل from() لتفادي immediateRender
      gsap.set([title, subtitle], { opacity: 0, y: 50 });
      gsap.set(cards, { opacity: 0, y: 60, scale: 0.9 });
      gsap.set(connectors, { scaleX: 0, transformOrigin: "left center" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionElement,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none none", // مرّة واحدة
          // markers: true, // للتشخيص
        },
      });

      // عناوين
      tl.to([title, subtitle], {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.2,
      });

      // البطاقات + الخطوط
      cards.forEach((card, i) => {
        tl.to(
          card,
          { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power4.out" },
          ">-0.4"
        );
        const line = connectors[i];
        if (line) {
          tl.to(line, { scaleX: 1, duration: 0.7, ease: "power2.inOut" }, "<");
        }
      });

      // أحياناً مفيد بعد التحميل/الصور
      ScrollTrigger.refresh();
    }, sectionElement);

    return () => ctx.revert();
  }, [sectionRef]);
};
