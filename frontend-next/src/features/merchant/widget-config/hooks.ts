'use client';

import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import type { ChatWidgetSettings } from "./types";
import { fetchWidgetSettings } from "./api";

export function useWidgetSettings(merchantId: string) {
  const { enqueueSnackbar } = useSnackbar();
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
          const msg = e.response?.data?.message || e.message || "فشل تحميل إعدادات الودجة";
          enqueueSnackbar(msg, { variant: 'error' });
          setError(msg);
        }
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [merchantId, enqueueSnackbar]);

  return { data, loading, error };
}

