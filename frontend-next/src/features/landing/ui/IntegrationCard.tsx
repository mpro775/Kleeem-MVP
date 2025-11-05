'use client';

// src/components/landing/IntegrationCard.tsx
import { Box, Typography, Paper, Chip } from "@mui/material";
import { styled } from "@mui/material/styles";
import { type IntegrationItem } from "@/features/landing/data/integrationsData";

const Card = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: "100%",
  minHeight: 250,
  borderRadius: theme.shape.borderRadius as number * 2,
  boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  position: "relative",
  "&:hover": {
    transform: "translateY(-8px)",
    boxShadow: "0 12px 28px rgba(0,0,0,0.1)",
  },
}));

export const IntegrationCard = ({ item }: { item: IntegrationItem }) => (
  <Card>
    {item.soon && (
      <Chip
        label="قريبًا"
        size="small"
        sx={{ position: "absolute", top: 12, right: 12 }}
      />
    )}
    <Box
      sx={{
        width: 72,
        height: 72,
        mb: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        component="img"
        src={item.iconImg}
        alt={item.title}
        sx={{
          maxWidth: "100%",
          maxHeight: "100%",
          transform: `scale(${item.scale || 1})`,
        }}
      />
    </Box>
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
      {item.title}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
      {item.desc}
    </Typography>
  </Card>
);
