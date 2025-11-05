'use client';

import { Box, Button, IconButton, useTheme, Badge } from "@mui/material";
import { ShoppingCart, FavoriteBorder, Share } from "@mui/icons-material";

export default function ActionBar({
  onAddToCart,
  canBuy = true,
}: {
  onAddToCart: () => void;
  canBuy?: boolean;
}) {
  const canAddToCart = canBuy;
  const theme = useTheme();
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 4 }}>
      <Button
        variant="contained"
        size="large"
        startIcon={<ShoppingCart />}
        onClick={onAddToCart}
        disabled={!canAddToCart}
        sx={{
          flex: 1,
          minWidth: 200,
          py: 1.5,
          borderRadius: 2,
          fontWeight: "bold",
          background: "var(--brand)",
          color: "var(--on-brand)",
          "&:hover": { background: "var(--brand-hover)" },
        }}
      >
        أضف إلى السلة
      </Button>

      <Button
        variant="outlined"
        size="large"
        startIcon={<FavoriteBorder />}
        disabled
        sx={{
          borderRadius: 2,
          fontWeight: "bold",
          background: "var(--brand)",
          color: "var(--on-brand)",
          opacity: 0.7,
          cursor: "not-allowed",
          position: "relative",
        }}
      >
        <Badge 
          badgeContent="قريباً" 
          color="warning"
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.6rem',
              height: 'auto',
              padding: '2px 6px',
              borderRadius: '10px',
              fontWeight: 'bold',
              position: 'absolute',
              top: '-8px',
              right: '-8px',
            }
          }}
        >
          <span>المفضلة</span>
        </Badge>
      </Button>

      <IconButton
        size="large"
        sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}
      >
        <Share />
      </IconButton>
    </Box>
  );
}
