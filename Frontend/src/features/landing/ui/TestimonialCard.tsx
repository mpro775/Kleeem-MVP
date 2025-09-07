// src/components/landing/TestimonialCard.tsx
import { Box, Typography, Avatar, Paper, styled } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import { type Testimonial } from "@/features/landing/data/testimonialsData";

const StyledPaper = styled(Paper)(({ theme }) => ({
  // ... (نفس كود StyledPaper من ملفك الأصلي)
  position: "relative",
  overflow: "hidden",
  borderRadius: 16,
  padding: theme.spacing(3),
  height: "100%",
  boxShadow:
    "0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.04)",
  transition: "transform 0.5s ease-out, opacity 0.5s ease-out", // إضافة transition
  // ... (بقية الستايل)
}));

interface Props {
  testimonial: Testimonial;
  scale: number; // قيمة حجم البطاقة
  opacity: number; // قيمة شفافية البطاقة
}

export const TestimonialCard = ({ testimonial, scale, opacity }: Props) => (
  <StyledPaper
    sx={{
      transform: `scale(${scale})`, // تطبيق الحجم
      opacity: opacity, // تطبيق الشفافية
    }}
  >
    <Box sx={{ mb: 2, display: "flex" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon
          key={i}
          sx={{ color: i < testimonial.rating ? "warning.main" : "grey.300" }}
        />
      ))}
    </Box>
    <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, flexGrow: 1 }}>
      {testimonial.comment}
    </Typography>
    <Box sx={{ display: "flex", alignItems: "center", mt: "auto", gap: 1.5 }}>
      <Avatar sx={{ bgcolor: "primary.main" }}>{testimonial.name[0]}</Avatar>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          {testimonial.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {testimonial.role}
        </Typography>
      </Box>
    </Box>
  </StyledPaper>
);
