'use client';

import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PeopleIcon from '@mui/icons-material/People';
import { useState } from 'react';
import { Coupon } from '../types';
import { CountdownTimer } from './CountdownTimer';

interface CouponCardProps {
  coupon: Coupon;
  onEdit?: (coupon: Coupon) => void;
  onDelete?: (coupon: Coupon) => void;
  onToggleStatus?: (coupon: Coupon) => void;
}

export function CouponCard({
  coupon,
  onEdit,
  onDelete,
  onToggleStatus,
}: CouponCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const isExpired = new Date(coupon.endDate) < new Date();

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage':
        return `خصم ${coupon.value}%`;
      case 'fixed_amount':
        return `خصم ${coupon.value} ريال`;
      case 'free_shipping':
        return 'شحن مجاني';
      default:
        return type;
    }
  };

  const getStatusChip = () => {
    if (isExpired) {
      return <Chip label="منتهي" size="small" color="error" />;
    }
    if (!coupon.isActive) {
      return <Chip label="معطل" size="small" color="default" />;
    }
    return <Chip label="نشط" size="small" color="success" />;
  };

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <CardContent>
        {/* الإجراءات */}
        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            {onEdit && (
              <MenuItem
                onClick={() => {
                  onEdit(coupon);
                  handleMenuClose();
                }}
              >
                تعديل
              </MenuItem>
            )}
            {onToggleStatus && (
              <MenuItem
                onClick={() => {
                  onToggleStatus(coupon);
                  handleMenuClose();
                }}
              >
                {coupon.isActive ? 'تعطيل' : 'تفعيل'}
              </MenuItem>
            )}
            {onDelete && (
              <MenuItem
                onClick={() => {
                  onDelete(coupon);
                  handleMenuClose();
                }}
                sx={{ color: 'error.main' }}
              >
                حذف
              </MenuItem>
            )}
          </Menu>
        </Box>

        {/* الكود والحالة */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalOfferIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {coupon.code}
            </Typography>
          </Box>
          {getStatusChip()}
        </Stack>

        {/* الوصف */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, minHeight: 40 }}
        >
          {coupon.description}
        </Typography>

        {/* نوع الخصم */}
        <Chip
          label={getTypeLabel(coupon.type)}
          color="primary"
          variant="outlined"
          sx={{ mb: 2 }}
        />

        {/* معلومات إضافية */}
        <Stack spacing={1}>
          {/* التواريخ */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarTodayIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {new Date(coupon.startDate).toLocaleDateString('ar-SA')} -{' '}
              {new Date(coupon.endDate).toLocaleDateString('ar-SA')}
            </Typography>
          </Box>

          {/* عداد تنازلي */}
          {!isExpired && coupon.isActive && (
            <CountdownTimer endDate={coupon.endDate} />
          )}

          {/* الاستخدامات */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PeopleIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              استخدم {coupon.usageCount}
              {coupon.usageLimit ? ` من ${coupon.usageLimit}` : ''} مرة
            </Typography>
          </Box>

          {/* الحد الأدنى للطلب */}
          {coupon.minOrderAmount && (
            <Typography variant="caption" color="text.secondary">
              الحد الأدنى: {coupon.minOrderAmount} ريال
            </Typography>
          )}

          {/* الحد الأقصى للخصم */}
          {coupon.maxDiscountAmount && (
            <Typography variant="caption" color="text.secondary">
              الحد الأقصى للخصم: {coupon.maxDiscountAmount} ريال
            </Typography>
          )}

          {/* نطاق التطبيق */}
          <Typography variant="caption" color="primary">
            {coupon.storeWide
              ? '✓ يطبق على كامل المتجر'
              : coupon.products?.length
              ? `✓ ${coupon.products.length} منتج`
              : coupon.categories?.length
              ? `✓ ${coupon.categories.length} فئة`
              : ''}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

