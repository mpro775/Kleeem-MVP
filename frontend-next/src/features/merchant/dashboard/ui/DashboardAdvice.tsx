'use client';

import { Paper, Box, Typography } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
export default function DashboardAdvice() {
  return (
    <Paper sx={{ mt: 4, p: 3, borderRadius: 3, background: "#f6f6f6", display: "flex", alignItems: "center", gap: 2 }}>
      <InfoIcon color="primary" sx={{ fontSize: 40 }} />
      <Box>
        <Typography variant="body1" fontWeight="bold">
          نصائح لتحسين أداء متجرك
        </Typography>
        <Typography variant="body2" color="text.secondary">
          بناءً على تحليل بياناتك، نوصي بزيادة التركيز على المنتجات الأعلى
          تفاعلاً وتحسين الكلمات المفتاحية لزيادة ظهور متجرك في نتائج البحث.
        </Typography>
      </Box>
    </Paper>
  );
}
