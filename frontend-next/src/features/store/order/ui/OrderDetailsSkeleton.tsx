'use client';

import { Box, Paper, Skeleton } from "@mui/material";

export default function OrderDetailsSkeleton() {
  return (
    <Box sx={{ maxWidth: "md", mx: "auto", py: 4, px: { xs: 2, sm: 3 } }}>
      <Skeleton variant="rectangular" width={100} height={40} sx={{ mb: 3 }} />
      <Paper sx={{ borderRadius: 3, overflow: "hidden", mb: 4 }}>
        <Skeleton variant="rectangular" height={80} />
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4, mb: 4 }}>
            <Box sx={{ flex: 1, minWidth: 300 }}>
              <Skeleton variant="text" width="40%" height={30} sx={{ mb: 2 }} />
              <Skeleton
                variant="rectangular"
                height={120}
                sx={{ borderRadius: 2 }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 300 }}>
              <Skeleton variant="text" width="40%" height={30} sx={{ mb: 2 }} />
              <Skeleton
                variant="rectangular"
                height={120}
                sx={{ borderRadius: 2 }}
              />
            </Box>
          </Box>
          <Skeleton variant="rectangular" height={2} sx={{ mb: 3 }} />
          <Skeleton variant="text" width="40%" height={30} sx={{ mb: 3 }} />
          <Box
            sx={{
              backgroundColor: (t) => t.palette.grey[50],
              borderRadius: 3,
              p: 2,
              mb: 3,
            }}
          >
            {[...Array(3)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  py: 2,
                  borderBottom: i < 2 ? "1px solid #eee" : "none",
                }}
              >
                <Skeleton
                  variant="circular"
                  width={60}
                  height={60}
                  sx={{ mr: 2 }}
                />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" height={25} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="60%" height={20} />
                </Box>
              </Box>
            ))}
          </Box>
          <Skeleton
            variant="rectangular"
            height={180}
            sx={{ borderRadius: 3, mb: 4 }}
          />
          <Skeleton variant="text" width="40%" height={30} sx={{ mb: 3 }} />
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              mb: 5,
            }}
          >
            {[...Array(4)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  mb: { xs: 4, sm: 0 },
                  width: { sm: "25%" },
                }}
              >
                <Skeleton
                  variant="circular"
                  width={40}
                  height={40}
                  sx={{ mb: 1 }}
                />
                <Skeleton
                  variant="text"
                  width={80}
                  height={25}
                  sx={{ mb: 0.5 }}
                />
                <Skeleton variant="text" width={100} height={20} />
                <Skeleton variant="text" width={80} height={20} />
              </Box>
            ))}
          </Box>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Skeleton
              variant="rectangular"
              width={150}
              height={45}
              sx={{ borderRadius: 2 }}
            />
            <Skeleton
              variant="rectangular"
              width={150}
              height={45}
              sx={{ borderRadius: 2 }}
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
