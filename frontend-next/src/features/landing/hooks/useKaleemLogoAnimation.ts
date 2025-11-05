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

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const root = rootRef.current;
    if (!svg || !root) return;

    // Move dur function inside effect to avoid dependency issues
    const dur = (d: number) => d / Math.max(0.001, speed);

    // استخدام gsap.context للتنظيف التلقائي والآمن
    const ctx = gsap.context(() => {
      // Basic fade-in animation for the SVG
      gsap.fromTo(svg, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: dur(0.6), ease: "power2.out" });

      // Float animation
      if (float) {
        gsap.to(svg, { y: -10, duration: dur(2.5), yoyo: true, repeat: -1, ease: "sine.inOut" });
      }

      // Hover boost effect
      if (hoverBoost) {
        const enter = () => gsap.to(root, { scale: 1.08, duration: 0.3, ease: "power2.out" });
        const leave = () => gsap.to(root, { scale: 1, duration: 0.4, ease: "power2.inOut" });
        root.addEventListener("mouseenter", enter);
        root.addEventListener("mouseleave", leave);
      }
    }, root); // تحديد النطاق لـ context

    return () => ctx.revert(); // دالة التنظيف التلقائية من GSAP
  }, [svgRef, rootRef, speed, float, hoverBoost]);
};