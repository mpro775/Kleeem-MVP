// src/components/landing/FeatureCard.tsx
import { Box, Typography, Card, CardContent } from "@mui/material";

interface Feature {
  icon: React.ReactNode;
  title: string;
  desc: string;
  gradient: string;
}

interface Props {
  feature: Feature;
}

export const FeatureCard = ({ feature }: Props) => {
  return (
    <Card
      sx={{
        height: "100%",
        minHeight: 240,
        position: "relative",
        borderRadius: "20px",
        p: 3,
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        transition: "all 0.3s ease",
        overflow: "visible",
        border: "1px solid",
        borderColor: "divider",
        "&:hover": {
          transform: "translateY(-8px)",
          boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
          borderColor: "primary.light",
        },
      }}
    >
      <Box
        sx={{
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "10px",
          background: feature.gradient,
          borderTopLeftRadius: "20px",
          borderTopRightRadius: "20px",
        }}
      />
      <CardContent
        sx={{
          p: "0 !important",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "12px",
            background: feature.gradient,
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            flexShrink: 0,
            mb: 2,
          }}
        >
          {feature.icon}
        </Box>
        <Typography variant="h6" fontWeight="bold" color="primary.dark" mb={1}>
          {feature.title}
        </Typography>
        <Typography variant="body2" lineHeight={1.7}>
          {feature.desc}
        </Typography>
      </CardContent>
    </Card>
  );
};
