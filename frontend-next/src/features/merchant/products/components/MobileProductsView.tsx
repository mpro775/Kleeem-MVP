'use client';

import React from 'react';
import {
  Paper,
  Stack,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Box,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import type { ProductResponse } from '../types';
import { formatMoney } from '@/lib/utils/money';
import { toDisplayString } from '@/lib/utils/text';

type Props = {
  products: ProductResponse[];
  onEdit?: (p: ProductResponse) => void;
  onDelete?: (id: string) => void;
};

export default function MobileProductsView({
  products,
  onEdit,
  onDelete,
}: Props) {
  if (!products?.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">لا توجد منتجات بعد</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.25}>
      {products.map((p) => {
        const img = p.images?.[0];
        const hasActiveOffer = Boolean(p.hasActiveOffer && p.offer?.enabled);
        const price = typeof p.price === 'number' ? p.price : 0;
        const priceEffective =
          typeof p.priceEffective === 'number' ? p.priceEffective : price;
        const money = formatMoney(
          hasActiveOffer ? priceEffective : price,
          p.currency || 'SAR'
        );
        const oldMoney =
          hasActiveOffer && p.offer?.oldPrice != null
            ? formatMoney(p.offer.oldPrice, p.currency || 'SAR')
            : null;

        return (
          <Paper key={p._id} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
            <Stack spacing={1}>
              {/* الصف الأعلى: صورة + اسم + حالة/عرض */}
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Avatar
                  src={img || undefined}
                  variant="rounded"
                  sx={{ width: 48, height: 48 }}
                >
                  {p.name?.[0] ?? '?'}
                </Avatar>

                <Box flex={1} minWidth={0}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      noWrap
                      title={p.name || 'منتج بدون اسم'}
                    >
                      {p.name || 'منتج بدون اسم'}
                    </Typography>
                    {hasActiveOffer && (
                      <Chip
                        size="small"
                        color="warning"
                        icon={<LocalOfferIcon />}
                        label="عرض"
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                  </Stack>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    title={
                      p.category ? toDisplayString(p.category) : 'غير محدد'
                    }
                  >
                    {p.category ? toDisplayString(p.category) : 'غير محدد'}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={0.25}>
                  <Tooltip title="تعديل">
                    <IconButton size="small" onClick={() => onEdit?.(p)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onDelete?.(p._id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              {/* السعر + التوفّر + المصدر */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack spacing={0}>
                  {hasActiveOffer && oldMoney ? (
                    <>
                      <Typography
                        variant="body2"
                        sx={{ textDecoration: 'line-through' }}
                        color="text.secondary"
                      >
                        {oldMoney}
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {money}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" fontWeight={700}>
                      {money}
                    </Typography>
                  )}
                </Stack>

                <Stack direction="row" spacing={0.5}>
                  <Chip
                    size="small"
                    label={p.isAvailable ? 'متوفر' : 'غير متوفر'}
                    color={p.isAvailable ? 'success' : 'error'}
                  />
                  <Chip
                    size="small"
                    label={
                      p.source === 'manual'
                        ? 'يدوي'
                        : p.source === 'api'
                          ? 'API'
                          : p.source === 'scraper'
                            ? 'رابط'
                            : p.source || 'غير محدد'
                    }
                  />
                </Stack>
              </Stack>

              {/* وصف مختصر */}
              {p.description && (
                <>
                  <Divider />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {p.description}
                  </Typography>
                </>
              )}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}

