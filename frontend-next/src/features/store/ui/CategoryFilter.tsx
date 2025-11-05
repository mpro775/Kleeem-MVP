'use client';

// components/store/CategoryFilter.tsx
import { Box, Button } from "@mui/material";
import type { Category } from "@/features/merchant/categories/type";
import { useTheme } from "@mui/material/styles";

type Props = {
  categories: Category[];
  activeCategory: string | null;
  onChange: (catId: string | null) => void;
};

export function CategoryFilter({ categories, activeCategory, onChange }: Props) {
  const theme = useTheme();
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Button
        variant={activeCategory ? "outlined" : "contained"}
        onClick={() => onChange(null)}
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 'bold',
          justifyContent: 'flex-start',
          background: "var(--brand)",
          color: activeCategory ? theme.palette.text.primary : 'white',
          '&:hover': {
            backgroundColor: activeCategory ? 'rgba(0, 0, 0, 0.04)' : theme.palette.primary.dark,
          },
          px: 3,
          py: 1.5,
          transition: 'all 0.3s ease'
        }}
      >
        جميع التصنيفات
      </Button>
      {categories.map((cat) => (
        <Button
          key={cat._id}
          variant={activeCategory === cat._id ? "contained" : "outlined"}
          onClick={() => onChange(cat._id)}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 'bold',
            justifyContent: 'flex-start',
            background: "var(--brand)",
            color: "var(--on-brand)",
            '&:hover': {
              background: "var(--brand)",
            },
            px: 3,
            py: 1.5,
            transition: 'all 0.3s ease'
          }}
        >
          {cat.name}
        </Button>
      ))}
    </Box>
  );
}