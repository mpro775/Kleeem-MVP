'use client';

import { Box, Paper, Skeleton, Typography, useTheme } from "@mui/material";

export default function RelatedSkeleton() {
  const theme = useTheme();
  return (
    <>
      <Typography
        variant="h5"
        fontWeight="bold"
        sx={{ mb: 3, color: "var(--brand)" }}
      >
        منتجات قد تعجبك
      </Typography>
      <Box sx={{ display: "flex", gap: 3, overflowX: "auto", py: 1, pb: 3 }}>
        {[...Array(4)].map((_, i) => (
          <Paper
            key={i}
            sx={{
              minWidth: 250,
              borderRadius: 3,
              overflow: "hidden",
              boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
            }}
          >
            <Box
              sx={{
                height: 180,
                backgroundColor: theme.palette.grey[200],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Skeleton variant="rectangular" width={120} height={120} />
            </Box>
            <Box sx={{ p: 2 }}>
              <Typography fontWeight="bold" sx={{ mb: 1 }}>
                <Skeleton variant="text" width="80%" />
              </Typography>
              <Typography sx={{ color: "var(--brand)", fontWeight: "bold" }}>
                <Skeleton variant="text" width="40%" />
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>
    </>
  );
}
