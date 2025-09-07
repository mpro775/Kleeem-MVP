// src/features/support/components/ContactMethodCard.tsx
import { Paper, Typography, Box, Button } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

interface Props {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
}

export const ContactMethodCard = ({ icon, title, subtitle, href }: Props) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.5,
      borderRadius: 3,
      border: "1px solid",
      borderColor: "divider",
      display: "flex",
      alignItems: "center",
      gap: 2,
    }}
  >
    <Box aria-hidden>{icon}</Box>
    <Box sx={{ flex: 1 }}>
      <Typography fontWeight={700}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Box>
    <Button
      component="a"
      href={href}
      target="_blank"
      rel="noopener"
      variant="contained"
      endIcon={<OpenInNewIcon />}
    >
      تواصل
    </Button>
  </Paper>
);
