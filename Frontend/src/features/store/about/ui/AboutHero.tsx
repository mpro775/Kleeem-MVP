import { Box, Paper, Avatar, Typography } from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import type { MerchantInfo } from "../type";

type Props = { merchant: MerchantInfo };

export default function AboutHero({ merchant }: Props) {
  return (
    <Paper
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        background:
          "linear-gradient(135deg, var(--brand-hover) 0%, var(--brand) 100%)",
        color: "var(--on-brand)",
        p: { xs: 3, md: 5 },
        mb: 4,
        position: "relative",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top right, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%)",
        }}
      />
      <Box sx={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          {merchant.logoUrl ? (
            <Avatar
              src={merchant.logoUrl}
              alt={merchant.name}
              sx={{
                width: 120,
                height: 120,
                border: "4px solid rgba(255,255,255,0.3)",
                boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
              }}
            />
          ) : (
            <Avatar
              sx={{
                width: 120,
                height: 120,
                bgcolor: "var(--on-brand)",
                color: "var(--brand)",
              }}
            >
              <StorefrontIcon sx={{ fontSize: 60 }} />
            </Avatar>
          )}
        </Box>

        <Typography
          variant="h3"
          fontWeight="bold"
          sx={{
            mb: 2,
            textShadow: "0 2px 4px rgba(0,0,0,0.2)",
            fontSize: { xs: "2rem", md: "2.5rem" },
          }}
        >
          {merchant.name}
        </Typography>

        <Typography
          variant="h6"
          sx={{
            opacity: 0.95,
            maxWidth: 800,
            mx: "auto",
            fontSize: { xs: "1rem", md: "1.25rem" },
          }}
        >
          {merchant.businessDescription ||
            "متجرك الإلكتروني الموثوق لتجربة تسوق استثنائية"}
        </Typography>
      </Box>
    </Paper>
  );
}
