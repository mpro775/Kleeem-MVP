'use client';

import { Chip } from '@mui/material';
import { LocalOffer, CardGiftcard, Inventory } from '@mui/icons-material';

interface OfferBadgeProps {
  offer: {
    type: string;
    enabled: boolean;
    discountValue?: number;
    buyQuantity?: number;
    getQuantity?: number;
    quantityThreshold?: number;
    quantityDiscount?: number;
  };
}

export function OfferBadge({ offer }: OfferBadgeProps) {
  if (!offer?.enabled) return null;

  const getOfferText = () => {
    switch (offer.type) {
      case 'percentage':
        return `خصم ${offer.discountValue}%`;

      case 'fixed_amount':
        return `خصم ${offer.discountValue} ريال`;

      case 'buy_x_get_y':
        return `اشتري ${offer.buyQuantity} واحصل على ${offer.getQuantity} مجاناً`;

      case 'quantity_based':
        return `اشتري ${offer.quantityThreshold} واحصل على خصم ${offer.quantityDiscount}%`;

      default:
        return 'عرض خاص';
    }
  };

  const getIcon = () => {
    switch (offer.type) {
      case 'buy_x_get_y':
        return <CardGiftcard fontSize="small" />;
      case 'quantity_based':
        return <Inventory fontSize="small" />;
      default:
        return <LocalOffer fontSize="small" />;
    }
  };

  return (
    <Chip
      icon={getIcon()}
      label={getOfferText()}
      color="error"
      size="small"
      sx={{
        fontWeight: 'bold',
        animation: 'pulse 2s infinite',
        '@keyframes pulse': {
          '0%, 100%': {
            opacity: 1,
          },
          '50%': {
            opacity: 0.8,
          },
        },
      }}
    />
  );
}

