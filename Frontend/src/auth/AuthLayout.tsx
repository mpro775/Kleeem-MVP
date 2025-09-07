// src/widgets/auth/AuthLayout.tsx
import { Box, Container, Paper } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";
import bgShape from "@/assets/bg-shape.png";

type Props = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md";
};

export default function AuthLayout({
  title,
  subtitle,
  children,
  maxWidth = "sm",
}: Props) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
        overflow: "hidden",
        py: 8,
      }}
    >
      {/* زخارف */}
      <Box
        component="img"
        src={bgShape}
        alt=""
        aria-hidden
        sx={{
          position: "absolute",
          top: { xs: -60, md: -80 },
          left: { xs: -60, md: -80 },
          width: { xs: 160, md: 300 },
          opacity: 0.18,
          zIndex: 0,
        }}
      />
      <Box
        component="img"
        src={bgShape}
        alt=""
        aria-hidden
        sx={{
          position: "absolute",
          bottom: { xs: -80, md: -100 },
          right: { xs: -60, md: -100 },
          width: { xs: 200, md: 400 },
          opacity: 0.12,
          transform: "rotate(180deg)",
          zIndex: 0,
        }}
      />

      <Container maxWidth={maxWidth} sx={{ position: "relative", zIndex: 2 }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Paper elevation={8} sx={{ borderRadius: 4, overflow: "hidden" }}>
            <Box
              sx={{
                height: 4,
                background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              }}
            />
            <Box sx={{ p: 4 }}>
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Box
                  component="img"
                  src={logo}
                  alt="Kleem"
                  sx={{ maxWidth: 140, mb: 1 }}
                />
                {title}
                {subtitle}
              </Box>
              {children}
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
}
