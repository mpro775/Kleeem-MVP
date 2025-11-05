'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Fab,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import { useTheme, useMediaQuery } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';

import ProductsActions from '@/features/merchant/products/components/ProductsActions';
import ProductsTable from '@/features/merchant/products/components/ProductsTable';
import AddProductDialog from '@/features/merchant/products/components/AddProductDialog';
import type { ProductResponse } from '@/features/merchant/products/types';
import { hasAnyCategory } from '@/features/merchant/categories/api';

// TODO: Get merchantId from auth context/API
// For now, using a placeholder
function useMerchantId(): string {
  // This should come from your auth system
  // For now, return empty string or get from localStorage/cookies
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user?.merchantId || '';
      } catch {
        return '';
      }
    }
  }
  return '';
}

export default function ProductsPage() {
  const t = useTranslations('products');
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const merchantId = useMerchantId();

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [editing, setEditing] = useState<ProductResponse | null>(null);
  const [refresh, setRefresh] = useState(0);

  const [hasCategories, setHasCategories] = useState<boolean | null>(null);
  const [catError, setCatError] = useState<string | null>(null);

  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));

  const categoriesPath = '/ar/dashboard/categories'; // TODO: Use locale from params

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!merchantId) {
        setHasCategories(false);
        return;
      }
      try {
        setCatError(null);
        const ok = await hasAnyCategory(merchantId);
        if (!cancelled) setHasCategories(ok);
      } catch (e: unknown) {
        if (!cancelled) {
          setHasCategories(false);
          const error =
            (e as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ||
            (e as { message?: string })?.message ||
            'تعذر التحقق من الفئات';
          setCatError(error);
          enqueueSnackbar(error, { variant: 'error' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [merchantId, refresh, enqueueSnackbar]);

  const handleRequestAdd = () => {
    if (!hasCategories) {
      router.push(categoriesPath);
      return;
    }
    setOpenAddDialog(true);
  };

  return (
    <Box
      position="relative"
      minHeight="100vh"
      sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f9fafb' }}
      dir="rtl"
    >
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        flexWrap="wrap"
        gap={1.5}
        mb={3}
      >
        <Typography variant="h5" fontWeight={800}>
          {t('title')}
        </Typography>
        {hasCategories ? (
          <Stack
            direction="row"
            spacing={1.5}
            flexWrap="wrap"
            sx={{ display: { xs: 'none', sm: 'flex' } }}
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
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
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
            border: '1px dashed',
            borderColor: 'warning.light',
            bgcolor: 'warning.50',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.5} alignItems="center" flex={1}>
              <CategoryRoundedIcon
                sx={{ fontSize: 28, color: 'warning.main' }}
              />
              <Box>
                <Typography fontWeight={800}>
                  لا يمكنك إضافة منتجات قبل إنشاء فئة واحدة على الأقل
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  يرجى إضافة فئات أولًا، ثم عُد لإضافة المنتجات.
                  {catError ? ` — ملاحظة: ${catError}` : ''}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="warning"
                onClick={() => router.push(categoriesPath)}
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
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ overflowX: 'auto' }}>
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
            position: 'fixed',
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
        onProductAdded={() => {
          setRefresh((r) => r + 1);
          enqueueSnackbar('تمت إضافة المنتج بنجاح', { variant: 'success' });
        }}
      />
      {/* TODO: Add EditProductDialog when ready */}
      {editing && (
        <Paper
          sx={{
            p: 2,
            mt: 2,
            bgcolor: 'info.light',
            color: 'info.contrastText',
          }}
        >
          <Typography>
            تعديل المنتج: {editing.name} (سيتم إضافة EditProductDialog قريباً)
          </Typography>
          <Button onClick={() => setEditing(null)} sx={{ mt: 1 }}>
            إغلاق
          </Button>
        </Paper>
      )}
    </Box>
  );
}
