// =========================
// File: src/features/store/ui/SidebarCategories.tsx
// =========================
import { Box, Typography } from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { CategoryFilter } from "@/features/store/ui/CategoryFilter";
import type { Category } from "../types";

export function SidebarCategories({
  categories,
  activeCategory,
  onChange,
}: {
  categories: Category[];
  activeCategory: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <Box
      sx={{
        width: 250,
        flexShrink: 0,
        backgroundColor: "white",
        borderRadius: 3,
        boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
        p: 3,
        height: "fit-content",
        position: "sticky",
        top: 20,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          fontWeight: "bold",
          color: "var(--brand)",
        }}
      >
        <StorefrontIcon sx={{ mr: 1 }} /> التصنيفات
      </Typography>
      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onChange={onChange}
      />
    </Box>
  );
}
