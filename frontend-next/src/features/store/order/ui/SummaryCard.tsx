'use client';

import { Box, Divider, Paper, Typography, useTheme } from "@mui/material";
import { sumItems, formatMoney } from "@/features/store/order/utils";
import type { OrderProduct } from "@/features/store/type";
import type { Currency } from "../../product/utils";

export default function SummaryCard({
  products,
  shipping = 0,
  discount = 0,
  currency = "SAR",
}: {
  products: OrderProduct[];
  shipping?: number;
  discount?: number;
  currency?: string;
}) {
  const theme = useTheme();
  const sub = sumItems(products);
  const total = Math.max(0, sub + shipping - discount);

  return (
    <Paper
      sx={{ p: 3, borderRadius: 3, backgroundColor: theme.palette.grey[50] }}
    >
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        ملخص الطلب
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography>المجموع الفرعي:</Typography>
          <Typography>{formatMoney(sub, currency as Currency)}</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography>رسوم الشحن:</Typography>
          <Typography>{formatMoney(shipping, currency as Currency)}</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography>الخصم:</Typography>
          <Typography>{formatMoney(discount, currency as Currency)}</Typography>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            الإجمالي النهائي:
          </Typography>
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{ color: "var(--brand)" }}
          >
            {formatMoney(total, currency as Currency)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
