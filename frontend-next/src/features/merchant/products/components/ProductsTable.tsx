'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  CircularProgress,
  Box,
  IconButton,
  Stack,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { getMerchantProducts, deleteProduct } from '../api';
import type { ProductResponse } from '../types';
import { formatMoney } from '@/lib/utils/money';
import MobileProductsView from './MobileProductsView';
import { getCategoriesFlat } from '../../categories/api';
import type { Category } from '../../categories/types';
import { useSnackbar } from 'notistack';

interface ProductsTableProps {
  merchantId: string;
  onEdit?: (p: ProductResponse) => void;
  onRefresh?: () => void;
}

const hexFromBufferLike = (v: any): string | undefined => {
  const data = v?.buffer?.data ?? v?.data ?? (Array.isArray(v) ? v : undefined);
  if (!Array.isArray(data) || data.length !== 12) return;
  return Array.from(data)
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
};

// يستخرج id من string | object | buffer-like بدون رمي
const toIdString = (x: any): string | undefined => {
  if (!x) return;
  if (typeof x === 'string') return x;
  if (typeof x === 'object') {
    if (typeof x._id === 'string') return x._id;
    const fromBuf =
      hexFromBufferLike(x._id) ||
      hexFromBufferLike(x.id) ||
      hexFromBufferLike(x);
    if (fromBuf) return fromBuf;
    const maybe = x._id?.toString?.() ?? x.id?.toString?.() ?? x.toString?.();
    if (maybe && maybe !== '[object Object]') return String(maybe);
  }
  return;
};

function resolveCategory(p: any, map: Record<string, string>): string {
  // لو السيرفر مرّجع الاسم جاهزًا
  const explicit = p?.categoryName || p?.categoryLabel || p?.category?.name;
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();

  // جرّب إيجاد الـ id ومن ثم ترجمته إلى اسم
  const raw = p?.category ?? p?.categoryId ?? p?.category_id;
  const id = toIdString(raw);
  if (id && map[id]) return map[id];
  if (Array.isArray(p?.keywords) && p.keywords.length > 0)
    return String(p.keywords[0]);
  return 'غير محدد';
}

export default function ProductsTable({
  merchantId,
  onEdit,
  onRefresh,
}: ProductsTableProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));

  // خريطة id→name
  const catNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of categories) {
      const id =
        (typeof c._id === 'string' && c._id) ||
        hexFromBufferLike(c._id) ||
        (c._id?.toString?.() && c._id.toString() !== '[object Object]'
          ? c._id.toString()
          : undefined);
      if (id) m[id] = c.name;
    }
    return m;
  }, [categories]);

  const handleError = (error: unknown) => {
    const message =
      (error as { message?: string })?.message || 'حدث خطأ غير متوقع';
    enqueueSnackbar(message, { variant: 'error' });
  };

  const load = () => {
    if (!merchantId) {
      setProducts([]);
      return;
    }

    setLoading(true);
    setError(null);
    getMerchantProducts(merchantId)
      .then((data) => {
        setProducts(data || []);
      })
      .catch((error) => {
        setError('حدث خطأ أثناء جلب المنتجات');
        handleError(error);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (merchantId) {
      load();
      // Load categories
      getCategoriesFlat(merchantId)
        .then(setCategories)
        .catch(() => setCategories([]));
    } else {
      setProducts([]);
      setCategories([]);
    }
  }, [merchantId]);

  const handleDelete = async (id: string) => {
    const sure = window.confirm('هل تريد حذف هذا المنتج؟ لا يمكن التراجع.');
    if (!sure) return;
    try {
      await deleteProduct(id);
      enqueueSnackbar('تم حذف المنتج بنجاح', { variant: 'success' });
      onRefresh?.();
      load();
    } catch (error) {
      handleError(error);
    }
  };

  if (loading)
    return (
      <Box py={4} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  if (error) return <Typography color="error">{error}</Typography>;

  if (!products || products.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          {merchantId ? 'لا توجد منتجات بعد.' : 'يرجى تسجيل الدخول أولاً.'}
        </Typography>
      </Paper>
    );
  }

  if (isSm) {
    return (
      <MobileProductsView
        products={products}
        onEdit={onEdit}
        onDelete={async (id) => {
          await handleDelete(id);
          onRefresh?.();
        }}
      />
    );
  }

  return (
    <TableContainer component={Paper} sx={{ p: 0, overflowX: 'auto' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>الصورة</TableCell>
            <TableCell>الاسم</TableCell>
            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
              الفئة
            </TableCell>
            <TableCell>السعر</TableCell>
            <TableCell>الحالة</TableCell>
            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
              المصدر
            </TableCell>
            <TableCell align="center">إجراءات</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {Array.isArray(products) &&
            products.map((p) => {
              const price = typeof p.price === 'number' ? p.price : 0;
              const priceEffective =
                typeof p.priceEffective === 'number' ? p.priceEffective : price;
              const hasActiveOffer = Boolean(
                p.hasActiveOffer && p.offer?.enabled
              );

              const money = formatMoney(
                hasActiveOffer ? priceEffective : price,
                p.currency || 'SAR'
              );
              const oldMoney =
                hasActiveOffer && p.offer?.oldPrice != null
                  ? formatMoney(p.offer.oldPrice, p.currency || 'SAR')
                  : null;

              const offerChip = hasActiveOffer ? (
                <Tooltip title="عرض نشط">
                  <Chip
                    icon={<LocalOfferIcon />}
                    label="عرض"
                    color="warning"
                    size="small"
                    sx={{ mr: 1 }}
                  />
                </Tooltip>
              ) : null;

              return (
                <TableRow key={p._id} hover>
                  <TableCell>
                    {p.images && p.images.length > 0 && p.images[0] ? (
                      <Avatar
                        src={p.images[0]}
                        variant="rounded"
                        sx={{ width: 48, height: 48 }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.setAttribute(
                            'style',
                            'display: block'
                          );
                        }}
                      />
                    ) : null}
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 48,
                        height: 48,
                        display:
                          p.images && p.images.length > 0 && p.images[0]
                            ? 'none'
                            : 'flex',
                      }}
                    >
                      {p.name && p.name.length > 0 ? p.name[0] : '?'}
                    </Avatar>
                  </TableCell>

                  <TableCell sx={{ maxWidth: 320 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography
                        fontWeight={600}
                        noWrap
                        title={p.name || 'منتج بدون اسم'}
                      >
                        {p.name || 'منتج بدون اسم'}
                      </Typography>
                      {offerChip}
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: { xs: 'none', sm: '-webkit-box' },
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {p.description || 'لا يوجد وصف'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {resolveCategory(p, catNameById)}
                  </TableCell>

                  <TableCell>
                    {hasActiveOffer && oldMoney ? (
                      <Stack spacing={0}>
                        <Typography
                          sx={{ textDecoration: 'line-through' }}
                          color="text.secondary"
                        >
                          {oldMoney}
                        </Typography>
                        <Typography fontWeight={700}>{money}</Typography>
                      </Stack>
                    ) : (
                      <Typography>{money}</Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={p.isAvailable ? 'متوفر' : 'غير متوفر'}
                      color={p.isAvailable ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>

                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Chip
                      label={
                        p.source === 'manual'
                          ? 'يدوي'
                          : p.source === 'api'
                            ? 'API'
                            : p.source === 'scraper'
                              ? 'رابط'
                              : p.source || 'غير محدد'
                      }
                      size="small"
                    />
                  </TableCell>

                  <TableCell align="center">
                    <IconButton onClick={() => onEdit?.(p)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(p._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          {(!Array.isArray(products) || products.length === 0) && (
            <TableRow>
              <TableCell
                colSpan={7}
                align="center"
                sx={{ py: 4, opacity: 0.7 }}
              >
                لا توجد منتجات لعرضها
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

