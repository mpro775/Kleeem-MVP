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
import CampaignIcon from '@mui/icons-material/Campaign';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useState } from 'react';
import { Promotion } from '../../coupons/types';
import { CountdownTimer } from '../../coupons/components/CountdownTimer';

interface PromotionCardProps {
  promotion: Promotion;
  onEdit?: (promotion: Promotion) => void;
  onDelete?: (promotion: Promotion) => void;
  onToggleStatus?: (promotion: Promotion) => void;
}

export function PromotionCard({
  promotion,
  onEdit,
  onDelete,
  onToggleStatus,
}: PromotionCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const isExpired = new Date(promotion.endDate) < new Date();

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage':
        return `خصم ${promotion.discountValue}%`;
      case 'fixed_amount':
        return `خصم ${promotion.discountValue} ريال`;
      case 'cart_threshold':
        return `خصم ${promotion.discountValue}% عند ${promotion.minCartAmount} ريال`;
      default:
        return type;
    }
  };

  const getApplyToLabel = (applyTo: string) => {
    switch (applyTo) {
      case 'all':
        return 'جميع المنتجات';
      case 'categories':
        return `${promotion.categoryIds?.length || 0} فئة`;
      case 'products':
        return `${promotion.productIds?.length || 0} منتج`;
      default:
        return applyTo;
    }
  };

  const getStatusChip = () => {
    if (isExpired) {
      return <Chip label="منتهي" size="small" color="error" />;
    }
    if (!promotion.isActive) {
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
                  onEdit(promotion);
                  handleMenuClose();
                }}
              >
                تعديل
              </MenuItem>
            )}
            {onToggleStatus && (
              <MenuItem
                onClick={() => {
                  onToggleStatus(promotion);
                  handleMenuClose();
                }}
              >
                {promotion.isActive ? 'تعطيل' : 'تفعيل'}
              </MenuItem>
            )}
            {onDelete && (
              <MenuItem
                onClick={() => {
                  onDelete(promotion);
                  handleMenuClose();
                }}
                sx={{ color: 'error.main' }}
              >
                حذف
              </MenuItem>
            )}
          </Menu>
        </Box>

        {/* الاسم والحالة */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CampaignIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {promotion.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {getStatusChip()}
            <Chip
              label={`أولوية ${promotion.priority}`}
              size="small"
              color="default"
              icon={<TrendingUpIcon />}
            />
          </Box>
        </Stack>

        {/* الوصف */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, minHeight: 40 }}
        >
          {promotion.description}
        </Typography>

        {/* نوع الخصم */}
        <Chip
          label={getTypeLabel(promotion.type)}
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
              {new Date(promotion.startDate).toLocaleDateString('ar-SA')} -{' '}
              {new Date(promotion.endDate).toLocaleDateString('ar-SA')}
            </Typography>
          </Box>

          {/* عداد تنازلي */}
          {!isExpired &&
            promotion.isActive &&
            promotion.countdownTimer && (
              <CountdownTimer endDate={promotion.endDate} />
            )}

          {/* الاستخدامات */}
          <Typography variant="caption" color="text.secondary">
            استخدم {promotion.usageCount}
            {promotion.usageLimit ? ` من ${promotion.usageLimit}` : ''} مرة
          </Typography>

          {/* الحد الأدنى للسلة */}
          {promotion.minCartAmount && (
            <Typography variant="caption" color="text.secondary">
              الحد الأدنى للسلة: {promotion.minCartAmount} ريال
            </Typography>
          )}

          {/* الحد الأقصى للخصم */}
          {promotion.maxDiscountAmount && (
            <Typography variant="caption" color="text.secondary">
              الحد الأقصى للخصم: {promotion.maxDiscountAmount} ريال
            </Typography>
          )}

          {/* نطاق التطبيق */}
          <Typography variant="caption" color="primary">
            ✓ {getApplyToLabel(promotion.applyTo)}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

