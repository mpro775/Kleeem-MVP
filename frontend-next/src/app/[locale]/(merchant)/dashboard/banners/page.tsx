'use client';

import { useEffect, useState } from "react";
import { Box, Paper, CircularProgress, Snackbar, Alert, Chip } from "@mui/material";
import Typography from "@mui/material/Typography";
import { useSnackbar } from "notistack";
import BannersEditor from "@/features/store/ui/BannersEditor";
import type { Banner } from "@/features/store/types";
import Image from "next/image";

// Storefront API
import axiosInstance from "@/lib/axios";
import { API_BASE } from "@/lib/config";

interface Storefront {
  _id: string;
  merchantId: string;
  banners?: Banner[];
}

async function getStorefrontInfo(merchantId: string): Promise<Storefront> {
  const { data } = await axiosInstance.get(`${API_BASE}/storefronts/by-merchant/${merchantId}`);
  return data;
}

async function updateStorefrontInfo(merchantId: string, payload: Partial<Storefront>): Promise<Storefront> {
  const { data } = await axiosInstance.patch(`${API_BASE}/storefronts/by-merchant/${merchantId}`, payload);
  return data;
}

const MAX_BANNERS = 5;

function useMerchantId(): string {
  if (typeof window === 'undefined') return '';
  const userStr = localStorage.getItem('user');
  if (!userStr) return '';
  try {
    const user = JSON.parse(userStr);
    return user?.merchantId || '';
  } catch {
    return '';
  }
}

export default function BannersManagementPage() {
  const { enqueueSnackbar } = useSnackbar();
  const merchantId = useMerchantId();

  const [storefront, setStorefront] = useState<Storefront | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [snackbarState, setSnackbarState] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (!merchantId) return;
    getStorefrontInfo(merchantId)
      .then((data) => {
        if (data && typeof data === "object") {
          setStorefront(data);
        }
      })
      .catch((error) => {
        enqueueSnackbar(error.message || 'فشل تحميل البيانات', { variant: 'error' });
      });
  }, [merchantId, enqueueSnackbar]);

  const handleSaveBanners = async (banners: Banner[]) => {
    if (!merchantId) return;

    const validBanners = Array.isArray(banners) ? banners : [];
    const normalized = validBanners
      .slice(0, MAX_BANNERS)
      .map((b, i) => ({ ...b, order: i, active: b.active ?? true }));

    try {
      setSaveLoading(true);
      const updated = await updateStorefrontInfo(merchantId, {
        banners: normalized,
      });
      setStorefront((prev) =>
        prev
          ? {
              ...prev,
              banners: Array.isArray(updated.banners)
                ? updated.banners
                : normalized,
            }
          : prev
      );
      setSnackbarState({
        open: true,
        message: "تم حفظ البنرات بنجاح",
        severity: "success",
      });
      enqueueSnackbar("تم حفظ البنرات بنجاح", { variant: 'success' });
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = error?.response?.data?.message || error?.message || "فشل حفظ البنرات";
      setSnackbarState({
        open: true,
        message: msg,
        severity: "error",
      });
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaveLoading(false);
    }
  };

  if (!storefront) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  const banners = Array.isArray(storefront.banners) ? storefront.banners : [];

  return (
    <Paper sx={{ 
      p: { xs: 2, md: 4 }, 
      maxWidth: "1200px", 
      width: "100%", 
      mx: "auto", 
      my: 4, 
      borderRadius: 3 
    }}>
      <Typography 
        variant="h6" 
        fontWeight="bold" 
        mb={2}
        sx={{
          fontSize: { xs: '1.25rem', md: '1.5rem' }
        }}
      >
        إدارة البانرات الإعلانية
      </Typography> 
      <Typography color="text.secondary" mb={2}>
        يمكنك هنا إضافة وتعديل البنرات التي تظهر في أعلى المتجر.
      </Typography>

      <Box mb={3} p={2} bgcolor="grey.100" borderRadius={1}>
        <Typography variant="h6" mb={2}>
          البانرات الحالية:
        </Typography>
        {banners.length === 0 ? (
          <Typography color="text.secondary">لا توجد بانرات</Typography>
        ) : (
          <Box 
            display="grid" 
            gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" }} 
            gap={2} 
            mb={3}
          >
            {banners.map((banner, idx) => (
              <Paper key={idx} sx={{ p: 2, borderRadius: 2 }}>
                {banner.image && (
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      pt: "56.25%",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      src={banner.image}
                      alt={banner.text || "Banner"}
                      fill
                      sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                      style={{ objectFit: "cover" }}
                    />
                  </Box>
                )}
                <Typography mt={1} fontWeight={600}>{banner.text || "بدون نص"}</Typography>
                <Chip size="small" label={banner.active ? "مفعل" : "غير مفعل"} color={banner.active ? "success" : "default"} />
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      <BannersEditor
        merchantId={merchantId}
        banners={banners}
        onChange={handleSaveBanners}
        loading={saveLoading}
      />

      <Snackbar
        open={snackbarState.open}
        autoHideDuration={3000}
        onClose={() => setSnackbarState((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbarState.severity}>{snackbarState.message}</Alert>
      </Snackbar>
    </Paper>
  );
}
