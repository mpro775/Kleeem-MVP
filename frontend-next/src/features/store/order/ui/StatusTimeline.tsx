'use client';

import { Avatar, Box, Typography, useTheme } from "@mui/material";
import { CheckCircle } from "@mui/icons-material";

type Step = { label: string; active: boolean; date?: string; time?: string };

export default function StatusTimeline({ steps }: { steps: Step[] }) {
  const theme = useTheme();
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
        حالة الطلب
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          position: "relative",
          "&:before": {
            content: '""',
            position: "absolute",
            top: 20,
            left: { xs: 20, sm: "10%" },
            right: { xs: 20, sm: "10%" },
            height: 4,
            backgroundColor: theme.palette.grey[300],
            zIndex: 0,
          },
        }}
      >
        {steps.map((s, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: { xs: 4, sm: 0 },
              position: "relative",
              zIndex: 1,
              width: { sm: "25%" },
            }}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                mb: 1,
                backgroundColor: s.active
                  ? "var(--brand)"
                  : theme.palette.grey[300],
                color: s.active
                  ? "var(--on-brand)"
                  : theme.palette.text.primary,
              }}
            >
              {s.active ? <CheckCircle /> : i + 1}
            </Avatar>
            <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
              {s.label}
            </Typography>
            {s.active && (s.date || s.time) && (
              <Box sx={{ textAlign: "center" }}>
                {s.date && (
                  <Typography variant="body2" color="text.secondary">
                    {s.date}
                  </Typography>
                )}
                {s.time && (
                  <Typography variant="body2" color="text.secondary">
                    {s.time}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
