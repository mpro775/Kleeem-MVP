// src/widgets/onboarding/OnboardingLayout.tsx
import { Box, LinearProgress, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AuthLayout from "@/auth/AuthLayout";

type Props = {
  step?: number;         // رقم الخطوة الحالية (1-based)
  total?: number;        // إجمالي الخطوات
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
};

export default function OnboardingLayout({ step = 1, total = 3, title, subtitle, children }: Props) {
  const theme = useTheme();
  const value = Math.min(100, Math.max(0, (step / total) * 100));
  return (
    <AuthLayout title={title} subtitle={subtitle}>
      {/* مؤشر الخطوات */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1, fontWeight: 600 }}>
          {`الخطوة ${step} من ${total}`}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={value}
          sx={{
            height: 8,
            borderRadius: 999,
            "& .MuiLinearProgress-bar": {
              background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
            },
          }}
        />
      </Box>

      {children}
    </AuthLayout>
  );
}
