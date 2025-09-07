// src/pages/kleemAdmin/Dashboard.tsx
import { Box, Paper, Typography } from "@mui/material";

export default function KleemDashboard() {
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Kleem Admin • Dashboard
      </Typography>
      <Paper sx={{ p: 2 }}>
        مرحباً 👋 هذه لوحة إحصائيات كليم (Placeholder).
      </Paper>
    </Box>
  );
}
