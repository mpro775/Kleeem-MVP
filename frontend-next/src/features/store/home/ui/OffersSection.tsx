'use client';

// =========================
// File: src/features/store/ui/OffersSection.tsx
// =========================
import { Box, Button, Typography } from "@mui/material";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { ProductGrid } from "@/features/store/ui/ProductGrid";
import type { ProductResponse } from "../types";

export function OffersSection({
  offers,
  onOpenAll,
  onOpenProduct,
  onAddToCart,
}: {
  offers: ProductResponse[];
  onOpenAll: () => void;
  onOpenProduct: (p: ProductResponse) => void;
  onAddToCart: (p: ProductResponse) => void;
  slug?: string;
}) {
  if (!offers?.length) return null;
  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        borderRadius: 3,
        boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
        p: 2,
        mb: 4,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 2,
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            display: "flex",
            alignItems: "center",
            fontWeight: "bold",
            color: "var(--brand)",
          }}
        >
          <LocalOfferIcon sx={{ mr: 1 }} /> عروضنا
        </Typography>
        <Button variant="text" onClick={onOpenAll}>
          عرض كل العروض
        </Button>
      </Box>
      <ProductGrid
        products={offers.slice(0, 8)}
        onAddToCart={onAddToCart}
        onOpen={onOpenProduct}
      />
    </Box>
  );
}
