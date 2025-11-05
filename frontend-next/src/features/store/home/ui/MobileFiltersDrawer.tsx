'use client';

// =========================
// File: src/features/store/ui/MobileFiltersDrawer.tsx
// =========================
import { Box, Drawer } from "@mui/material";
import { CategoryFilter } from "@/features/store/ui/CategoryFilter";
import type { Category } from "../types";

export function MobileFiltersDrawer({ open, onClose, categories, activeCategory, onChange }: { open: boolean; onClose: () => void; categories: Category[]; activeCategory: string | null; onChange: (id: string | null) => void; }) {
  return (
    <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}>
      <Box sx={{ p: 2 }}>
        <CategoryFilter categories={categories} activeCategory={activeCategory} onChange={onChange} />
      </Box>
    </Drawer>
  );
}
