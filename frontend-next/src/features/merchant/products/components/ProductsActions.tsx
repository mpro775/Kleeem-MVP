'use client';

import { Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface ProductsActionsProps {
  onAddProduct?: () => void;
}

export default function ProductsActions({
  onAddProduct,
}: ProductsActionsProps) {
  return (
    <Stack direction="row" spacing={2}>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onAddProduct}>
        إضافة منتج جديد
      </Button>
    </Stack>
  );
}

