'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Fab,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTheme, useMediaQuery } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';

import ProductsActions from '@/features/merchant/products/components/ProductsActions';
import ProductsTable from '@/features/merchant/products/components/ProductsTable';
import AddProductDialog from '@/features/merchant/products/components/AddProductDialog';
import type { ProductResponse } from '@/features/merchant/products/types';
import { hasAnyCategory } from '@/features/merchant/categories/api';
import axiosInstance from '@/lib/axios';

/**
 * Get merchantId from authenticated user
 * Tries multiple sources: localStorage, sessionStorage, cookies
 */
function useMerchantId(): string {
  const [merchantId, setMerchantId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';

    // Try localStorage first
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.merchantId) {
          return user.merchantId;
        }
      }
    } catch (error) {
      console.warn('Failed to parse user from localStorage:', error);
    }

    // Try sessionStorage
    try {
      const sessionUser = sessionStorage.getItem('user');
      if (sessionUser) {
        const user = JSON.parse(sessionUser);
        if (user?.merchantId) {
          return user.merchantId;
        }
      }
    } catch (error) {
      console.warn('Failed to parse user from sessionStorage:', error);
    }

    return '';
  });

  useEffect(() => {
    // If no merchantId found in storage, try API
    if (!merchantId && typeof window !== 'undefined') {
      axiosInstance
        .get('/auth/me')
        .then((response) => {
          const user = response.data;
          if (user?.merchantId) {
            setMerchantId(user.merchantId);
            // Save to localStorage for future use
            localStorage.setItem('user', JSON.stringify(user));
          }
        })
        .catch((error) => {
          console.error('Failed to fetch user info:', error);
        });
    }
  }, [merchantId]);

  return merchantId;
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

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // CSV Import/Export
  const [csvImportDialog, setCsvImportDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<{
    success: number;
    failed: number;
    errors: { row: number; error: string }[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // CSV Export
  const handleExportCSV = async () => {
    try {
      const response = await axiosInstance.get('/products/export/csv', {
        params: { merchantId },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      enqueueSnackbar('تم تصدير المنتجات بنجاح', { variant: 'success' });
    } catch (error) {
      console.error('Export failed:', error);
      enqueueSnackbar('فشل تصدير المنتجات', { variant: 'error' });
    }
  };

  // CSV Import
  const handleImportCSV = async () => {
    if (!csvFile) {
      enqueueSnackbar('الرجاء اختيار ملف CSV', { variant: 'warning' });
      return;
    }

    setCsvLoading(true);
    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('merchantId', merchantId);

    try {
      const response = await axiosInstance.post(
        '/products/import/csv',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      setCsvResult(response.data);
      enqueueSnackbar(
        `تم استيراد ${response.data.success} منتج بنجاح`,
        { variant: 'success' }
      );
      setRefresh((r) => r + 1);
    } catch (error) {
      console.error('Import failed:', error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || 'فشل استيراد المنتجات';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setCsvLoading(false);
    }
  };

  // Download CSV Template
  const handleDownloadTemplate = async () => {
    try {
      const response = await axiosInstance.get('/products/export/csv/template', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'products-template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      enqueueSnackbar('تم تنزيل القالب بنجاح', { variant: 'success' });
    } catch (error) {
      console.error('Template download failed:', error);
      enqueueSnackbar('فشل تنزيل القالب', { variant: 'error' });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        enqueueSnackbar('الرجاء اختيار ملف CSV فقط', { variant: 'warning' });
        return;
      }
      setCsvFile(file);
    }
  };

  return (
    <Box
      position="relative"
      minHeight="100vh"
      sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f9fafb' }}
      dir="rtl"
    >
      {/* Header */}
      <Box mb={3}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          flexWrap="wrap"
          gap={1.5}
          mb={2}
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
              <Tooltip title="تصدير CSV">
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExportCSV}
                  size="small"
                >
                  تصدير
                </Button>
              </Tooltip>
              <Tooltip title="استيراد CSV">
                <Button
                  variant="outlined"
                  startIcon={<FileUploadIcon />}
                  onClick={() => setCsvImportDialog(true)}
                  size="small"
                >
                  استيراد
                </Button>
              </Tooltip>
              <ProductsActions onAddProduct={handleRequestAdd} />
            </Stack>
          ) : null}
        </Box>

        {/* Search & Filters */}
        {hasCategories && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="ابحث عن منتج..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <IconButton
                  onClick={() => setShowFilters(!showFilters)}
                  color={showFilters ? 'primary' : 'default'}
                  sx={{ display: { xs: 'flex', sm: 'none' } }}
                >
                  <FilterListIcon />
                </IconButton>
              </Stack>

              {(showFilters || !isSm) && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>نوع المنتج</InputLabel>
                    <Select
                      value={productTypeFilter}
                      label="نوع المنتج"
                      onChange={(e) => setProductTypeFilter(e.target.value)}
                    >
                      <MenuItem value="all">جميع الأنواع</MenuItem>
                      <MenuItem value="physical">منتج مادي</MenuItem>
                      <MenuItem value="digital">منتج رقمي</MenuItem>
                      <MenuItem value="service">خدمة</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>الحالة</InputLabel>
                    <Select
                      value={statusFilter}
                      label="الحالة"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">جميع الحالات</MenuItem>
                      <MenuItem value="draft">مسودة</MenuItem>
                      <MenuItem value="published">منشور</MenuItem>
                      <MenuItem value="scheduled">مجدول</MenuItem>
                      <MenuItem value="archived">مؤرشف</MenuItem>
                    </Select>
                  </FormControl>

                  <Tooltip title="تحديث">
                    <IconButton
                      onClick={() => setRefresh((r) => r + 1)}
                      color="primary"
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
            </Stack>
          </Paper>
        )}
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

      {/* CSV Import Dialog */}
      <Dialog
        open={csvImportDialog}
        onClose={() => {
          if (!csvLoading) {
            setCsvImportDialog(false);
            setCsvFile(null);
            setCsvResult(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>استيراد المنتجات من CSV</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              يمكنك استيراد المنتجات بشكل جماعي باستخدام ملف CSV. قم بتنزيل
              القالب أولاً لمعرفة التنسيق الصحيح.
            </Alert>

            <Button
              variant="outlined"
              onClick={handleDownloadTemplate}
              startIcon={<FileDownloadIcon />}
              fullWidth
            >
              تنزيل قالب CSV
            </Button>

            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                startIcon={<FileUploadIcon />}
                fullWidth
              >
                اختر ملف CSV
              </Button>
              {csvFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  الملف المختار: {csvFile.name}
                </Typography>
              )}
            </Box>

            {csvResult && (
              <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  نتائج الاستيراد:
                </Typography>
                <Stack spacing={1}>
                  <Chip
                    label={`نجح: ${csvResult.success}`}
                    color="success"
                    size="small"
                  />
                  <Chip
                    label={`فشل: ${csvResult.failed}`}
                    color="error"
                    size="small"
                  />
                  {csvResult.errors.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="error">
                        الأخطاء:
                      </Typography>
                      {csvResult.errors.slice(0, 5).map((err, idx) => (
                        <Typography key={idx} variant="caption" display="block">
                          - صف {err.row}: {err.error}
                        </Typography>
                      ))}
                      {csvResult.errors.length > 5 && (
                        <Typography variant="caption" color="text.secondary">
                          ... و {csvResult.errors.length - 5} أخطاء أخرى
                        </Typography>
                      )}
                    </Box>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCsvImportDialog(false);
              setCsvFile(null);
              setCsvResult(null);
            }}
            disabled={csvLoading}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleImportCSV}
            variant="contained"
            disabled={!csvFile || csvLoading}
            startIcon={csvLoading && <CircularProgress size={20} />}
          >
            {csvLoading ? 'جارٍ الاستيراد...' : 'استيراد'}
          </Button>
        </DialogActions>
      </Dialog>

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
