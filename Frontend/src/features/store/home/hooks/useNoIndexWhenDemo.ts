// =========================
// File: src/features/store/hooks/useNoIndexWhenDemo.ts
// =========================
import { useEffect } from "react";

export function useNoIndexWhenDemo(isDemo: boolean) {
  useEffect(() => {
    if (!isDemo) return;
    document.title = "متجر تجريبي — Kleem";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, [isDemo]);
}
