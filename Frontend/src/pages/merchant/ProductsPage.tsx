// src/pages/merchant/ProductsPage.tsx
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Fab,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import { useTheme, useMediaQuery } from "@mui/material";
import { useNavigate } from "react-router-dom";

import ProductsActions from "@/features/mechant/products/ui/ProductsActions";
import ProductsTable from "@/features/mechant/products/ui/ProductsTable";
import AddProductDialog from "@/features/mechant/products/ui/AddProductDialog";
import EditProductDialog from "@/features/mechant/products/ui/EditProductDialog";
import { useAuth } from "@/context/AuthContext";
import type { ProductResponse } from "@/features/mechant/products/type";

import { hasAnyCategory } from "@/features/mechant/categories/api";

export default function ProductsPage() {
  const { user } = useAuth();
  const merchantId = user?.merchantId ?? "";

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [editing, setEditing] = useState<ProductResponse | null>(null);
  const [refresh, setRefresh] = useState(0);

  const [hasCategories, setHasCategories] = useState<boolean | null>(null);
  const [catError, setCatError] = useState<string | null>(null);

  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  const categoriesPath = "/dashboard/categories"; // غيره حسب الراوتر عندك

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCatError(null);
        const ok = await hasAnyCategory(merchantId);
        if (!cancelled) setHasCategories(ok);
      } catch (e: any) {
        if (!cancelled) {
          setHasCategories(false);
          setCatError(
            e?.response?.data?.message || e?.message || "تعذر التحقق من الفئات"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [merchantId, refresh]);

  const handleRequestAdd = () => {
    if (!hasCategories) {
      navigate(categoriesPath);
      return;
    }
    setOpenAddDialog(true);
  };

  return (
    <Box
      position="relative"
      minHeight="100vh"
      sx={{ p: { xs: 2, md: 4 }, bgcolor: "#f9fafb" }}
      dir="rtl"
    >
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        flexWrap="wrap"
        gap={1.5}
        mb={3}
      >
        <Typography variant="h5" fontWeight={800}>
          إدارة المنتجات
        </Typography>
        {hasCategories ? (
          <Stack
            direction="row"
            spacing={1.5}
            flexWrap="wrap"
            sx={{ display: { xs: "none", sm: "flex" } }}
          >
            <ProductsActions onAddProduct={handleRequestAdd} />
          </Stack>
        ) : null}
      </Box>

      {/* حالة التحقق / عدم وجود فئات */}
      {hasCategories === null ? (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <CircularProgress size={20} />
            <Typography>جارٍ التحقق من الفئات…</Typography>
          </Stack>
        </Paper>
      ) : !hasCategories ? (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            mb: 3,
            borderRadius: 2,
            border: "1px dashed",
            borderColor: "warning.light",
            bgcolor: "warning.50",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.5} alignItems="center" flex={1}>
              <CategoryRoundedIcon
                sx={{ fontSize: 28, color: "warning.main" }}
              />
              <Box>
                <Typography fontWeight={800}>
                  لا يمكنك إضافة منتجات قبل إنشاء فئة واحدة على الأقل
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  يرجى إضافة فئات أولًا، ثم عُد لإضافة المنتجات.
                  {catError ? ` — ملاحظة: ${catError}` : ""}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="warning"
                onClick={() => navigate(categoriesPath)}
              >
                اذهب إلى صفحة الفئات
              </Button>
              <Button
                variant="outlined"
                onClick={() => setRefresh((r) => r + 1)}
              >
                إعادة الفحص
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      {/* الجدول */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, md: 3 },
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ overflowX: "auto" }}>
          <ProductsTable
            merchantId={merchantId}
            key={refresh}
            onEdit={(p) => setEditing(p)}
            onRefresh={() => setRefresh((r) => r + 1)}
          />
        </Box>
      </Paper>

      {/* زر عائم للموبايل — يظهر فقط لو عندك فئات */}
      {isSm && hasCategories && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={handleRequestAdd}
          sx={{
            position: "fixed",
            bottom: 16,
            insetInlineEnd: 16,
            zIndex: (t) => t.zIndex.tooltip + 1,
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Dialogs */}
      <AddProductDialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        merchantId={merchantId}
        onProductAdded={() => setRefresh((r) => r + 1)}
      />
      <EditProductDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        product={editing}
        onUpdated={() => setRefresh((r) => r + 1)}
      />
    </Box>
  );
}
