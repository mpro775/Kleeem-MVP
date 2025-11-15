// src/hooks/useKaleemLogoAnimation.ts
import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';

interface AnimationOptions {
  speed?: number;
  float?: boolean;
  hoverBoost?: boolean;
}

export const useKaleemLogoAnimation = (
  svgRef: RefObject<SVGSVGElement | null>,
  rootRef: RefObject<HTMLDivElement | null>,
  options: AnimationOptions = {}
) => {
  const { speed = 1, float = true, hoverBoost = true } = options;
  const dur = (d: number) => d / Math.max(0.001, speed);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const root = rootRef.current;
    if (!svg || !root) return;

    // استخدام gsap.context للتنظيف التلقائي والآمن
    const ctx = gsap.context(() => {
      // الآن نستخدم Selectors مباشرة وآمنة 100%
      const antenna = svg.querySelector("#antenna");
      const shadow = svg.querySelector("#shadow");
      const eyes = gsap.utils.toArray<SVGElement>('#eye_left, #eye_right');

      gsap.fromTo(svg, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: dur(0.6), ease: "power2.out" });

      if (float) {
        gsap.to(svg, { y: -6, duration: dur(1.8), yoyo: true, repeat: -1, ease: "sine.inOut" });
        if (shadow) {
          gsap.to(shadow, { scaleX: 1.06, opacity: 0.8, duration: dur(1.8), yoyo: true, repeat: -1, ease: "sine.inOut" });
        }
      }
      
      if (antenna) {
        gsap.set(antenna, { transformOrigin: '50% 100%' }); // تحديد مركز الدوران أسفل العنصر
        gsap.to(antenna, { rotation: 2, duration: dur(1.5), yoyo: true, repeat: -1, ease: "sine.inOut" });
      }

      if (eyes.length > 0) {
        const blink = () => {
          gsap.to(eyes, {
            scaleY: 0.1, duration: dur(0.08), yoyo: true, repeat: 1,
            transformOrigin: "50% 50%",
            onComplete: () => gsap.delayedCall(gsap.utils.random(1.5, 3.5), blink) as unknown as void
          });
        };
        gsap.delayedCall(1, blink);
      }

      if (hoverBoost) {
        const enter = () => gsap.to(root, { scale: 1.05, duration: 0.2 });
        const leave = () => gsap.to(root, { scale: 1, duration: 0.3 });
        root.addEventListener("mouseenter", enter);
        root.addEventListener("mouseleave", leave);
      }
    }, root); // تحديد النطاق لـ context

    return () => ctx.revert(); // دالة التنظيف التلقائية من GSAP
  }, [svgRef, rootRef, speed, float, hoverBoost, dur]);
};