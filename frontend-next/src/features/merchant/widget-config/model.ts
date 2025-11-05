// src/features/widget-config/hooks.ts
import { useEffect, useState } from "react";
import { useErrorHandler } from "@/lib/errors";
import type { ChatWidgetSettings } from "./types";
import { fetchWidgetSettings } from "./api";

export function useWidgetSettings(merchantId: string) {
  const { handleError } = useErrorHandler();
  const [data, setData] = useState<ChatWidgetSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(!!merchantId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!merchantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchWidgetSettings(merchantId)
      .then(d => { if (mounted) setData(d); })
      .catch((e) => {
        if (mounted) {
          handleError(e);
          setError("فشل تحميل إعدادات الودجة");
        }
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [merchantId]);

  return { data, loading, error };
}
