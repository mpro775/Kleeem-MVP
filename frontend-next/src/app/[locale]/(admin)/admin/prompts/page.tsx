'use client';

import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslations } from 'next-intl';

export default function AdminPromptsPage() {
  const t = useTranslations('admin');

  // Mock data
  const prompts = [
    { _id: '1', name: 'Welcome Message', category: 'Greeting', isActive: true },
    { _id: '2', name: 'Product Inquiry', category: 'Sales', isActive: true },
    { _id: '3', name: 'Support Response', category: 'Support', isActive: false },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          {t('prompts.title')}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          {t('prompts.add')}
        </Button>
      </Stack>

      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('prompts.name')}</TableCell>
              <TableCell>{t('prompts.category')}</TableCell>
              <TableCell>{t('prompts.status')}</TableCell>
              <TableCell align="right">{t('prompts.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {prompts.map((prompt) => (
              <TableRow key={prompt._id} hover>
                <TableCell>{prompt.name}</TableCell>
                <TableCell>{prompt.category}</TableCell>
                <TableCell>
                  <Chip
                    label={prompt.isActive ? t('prompts.active') : t('prompts.inactive')}
                    color={prompt.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="primary">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

