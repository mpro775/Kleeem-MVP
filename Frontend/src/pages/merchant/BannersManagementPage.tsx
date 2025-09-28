// src/pages/storefront/BannersManagementPage.tsx
import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
} from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { useErrorHandler } from "@/shared/errors";
import BannersEditor from "@/features/store/ui/BannersEditor";
import type {
  Banner,
  Storefront,
} from "@/features/mechant/storefront-theme/type";
import {
  getStorefrontInfo,
  updateStorefrontInfo,
} from "@/features/mechant/storefront-theme/api";

const MAX_BANNERS = 5;

export default function BannersManagementPage() {
  const { user } = useAuth();
  const { handleError } = useErrorHandler();
  const merchantId = user?.merchantId ?? "";

  const [storefront, setStorefront] = useState<Storefront | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (!merchantId) return;
    getStorefrontInfo(merchantId)
      .then((data) => {
        console.log("Storefront data loaded:", data);
        // تأكد من أن البيانات صحيحة
        if (data && typeof data === "object") {
          setStorefront(data);
        } else {
          console.error("Invalid storefront data:", data);
        }
      })
      .catch((error) => {
        handleError(error);
        console.error("Error loading storefront data:", error);
      });
  }, [merchantId]);

  const handleSaveBanners = async (banners: Banner[]) => {
    if (!merchantId) return;

    console.log("Saving banners:", banners);

    // تأكد من أن البانرات مصفوفة صحيحة
    const validBanners = Array.isArray(banners) ? banners : [];

    const normalized = validBanners
      .slice(0, MAX_BANNERS)
      .map((b, i) => ({ ...b, order: i, active: b.active ?? true }));

    try {
      setSaveLoading(true);
      const updated = await updateStorefrontInfo(merchantId, {
        banners: normalized,
      });
      console.log("Updated storefront:", updated);
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
      setSnackbar({
        open: true,
        message: "تم حفظ البنرات بنجاح",
        severity: "success",
      });
    } catch (e: any) {
      handleError(e);
      console.error("Error saving banners:", e);
      setSnackbar({
        open: true,
        message: e?.response?.data?.message || "فشل حفظ البنرات",
        severity: "error",
      });
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

  // تأكد من وجود البانرات
  const banners = Array.isArray(storefront.banners) ? storefront.banners : [];
  console.log("Current banners:", banners);

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

      {/* عرض البانرات الحالية للتشخيص */}
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
          gap={2} mb={3}
        >
          {banners.map((banner, idx) => (
            <Paper key={idx} sx={{ p: 2, borderRadius: 2 }}>
              <img src={banner.image} alt={banner.text} style={{ width: "100%", borderRadius: 8 }} />
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
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Paper>
  );
}
