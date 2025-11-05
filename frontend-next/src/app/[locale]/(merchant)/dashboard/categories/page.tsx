'use client';

import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useState } from 'react';

const mockCategories = [
  { id: '1', name: 'إلكترونيات', productsCount: 45 },
  { id: '2', name: 'ملابس', productsCount: 120 },
  { id: '3', name: 'أثاث', productsCount: 30 },
];

export default function CategoriesPage() {
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          التصنيفات
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          إضافة تصنيف
        </Button>
      </Box>

      <Paper>
        <List>
          {mockCategories.map((category, index) => (
            <ListItem
              key={category.id}
              secondaryAction={
                <Box>
                  <IconButton size="small" color="primary">
                    <Edit />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <Delete />
                  </IconButton>
                </Box>
              }
              divider={index < mockCategories.length - 1}
            >
              <ListItemText
                primary={category.name}
                secondary={`${category.productsCount} منتج`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة تصنيف جديد</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="اسم التصنيف"
            margin="normal"
            autoFocus
          />
          <TextField
            fullWidth
            label="الوصف"
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => setOpen(false)}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

