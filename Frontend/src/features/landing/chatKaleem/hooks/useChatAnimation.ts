// src/hooks/useChatAnimation.ts
import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";

/**
 * خطاف مخصص لإدارة الحركات في قسم المحادثة التجريبية.
 * @param isChatLive - متغير الحالة الذي يفعل الانتقال.
 * @param refs - كائن يحتوي على مراجع (refs) للعناصر المراد تحريكها.
 */
export const useChatAnimation = (
  isChatLive: boolean,
  refs: {
    ctaRef: RefObject<HTMLElement>;
    chatWindowRef: RefObject<HTMLElement>;
    demoMessagesRef: RefObject<HTMLElement>;
    liveChatRef: RefObject<HTMLElement>;
  }
) => {
  useEffect(() => {
    // نتأكد من وجود كل المراجع
    const { ctaRef, chatWindowRef, demoMessagesRef, liveChatRef } = refs;
    if (
      !ctaRef.current ||
      !chatWindowRef.current ||
      !demoMessagesRef.current ||
      !liveChatRef.current
    ) {
      return;
    }

    // إعداد الحالة الأولية للعناصر (LiveChat يكون مخفيًا في البداية)
    gsap.set(liveChatRef.current, { autoAlpha: 0, y: 20 });

    // إنشاء التايملاين لتنظيم الحركات
    const tl = gsap.timeline({ paused: true });

    // تعريف الحركات
    tl.to(ctaRef.current, {
      autoAlpha: 0,
      x: 50,
      duration: 0.5,
      ease: "power2.in",
    })
      .to(
        chatWindowRef.current,
        { width: "100%", maxWidth: 520, duration: 0.6, ease: "power3.inOut" },
        "<"
      )
      .to(
        demoMessagesRef.current,
        { autoAlpha: 0, y: -30, duration: 0.4, ease: "power2.in" },
        "-=0.2"
      )
      .to(liveChatRef.current, {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        ease: "power3.out",
      });

    // تشغيل التايملاين عند تفعيل المحادثة الحية
    if (isChatLive) {
      tl.play();
    } else {
      // يمكن إضافة حركة عكسية هنا إذا أردت
      tl.reverse();
    }
  }, [isChatLive, refs]);
};
