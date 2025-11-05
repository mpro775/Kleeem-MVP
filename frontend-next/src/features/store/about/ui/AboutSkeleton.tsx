'use client';

import { Box, Skeleton } from "@mui/material";

export default function AboutSkeleton() {
  return (
    <Box
      sx={{ maxWidth: "lg", mx: "auto", py: 4, px: { xs: 2, sm: 3, md: 4 } }}
    >
      <Box sx={{ mb: 3 }}>
        <Skeleton
          variant="rectangular"
          width={100}
          height={40}
          sx={{ mb: 2, borderRadius: 1 }}
        />
        <Skeleton
          variant="rectangular"
          height={250}
          sx={{ borderRadius: 3, mb: 4 }}
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 4,
          mb: 4,
        }}
      >
        <Skeleton
          variant="rectangular"
          height={300}
          sx={{ flex: 1, borderRadius: 3 }}
        />
        <Skeleton
          variant="rectangular"
          height={300}
          sx={{ flex: 1, borderRadius: 3 }}
        />
      </Box>

      <Skeleton
        variant="rectangular"
        height={200}
        sx={{ borderRadius: 3, mb: 4 }}
      />

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 4 }}>
        {[...Array(4)].map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={200}
            sx={{
              width: {
                xs: "100%",
                sm: "calc(50% - 12px)",
                md: "calc(25% - 12px)",
              },
              borderRadius: 3,
            }}
          />
        ))}
      </Box>

      <Box sx={{ mt: 4, textAlign: "center" }}>
        <Skeleton
          variant="rectangular"
          width={200}
          height={50}
          sx={{ borderRadius: 2, mx: "auto" }}
        />
      </Box>
    </Box>
  );
}
