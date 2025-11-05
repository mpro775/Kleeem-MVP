'use client';

import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslations } from 'next-intl';

export default function AdminTemplatesPage() {
  const t = useTranslations('admin');

  const templates = [
    { _id: '1', name: 'Order Confirmation', type: 'email', isActive: true },
    { _id: '2', name: 'Welcome SMS', type: 'message', isActive: true },
    { _id: '3', name: 'Shipping Update', type: 'notification', isActive: false },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          {t('templates.title')}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          {t('templates.add')}
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {templates.map((template) => (
          <Grid key={template._id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Typography variant="h6" fontWeight={600}>
                    {template.name}
                  </Typography>
                  <Chip
                    label={template.isActive ? t('templates.active') : t('templates.inactive')}
                    color={template.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </Stack>
                <Chip label={template.type} size="small" variant="outlined" />
              </CardContent>
              <CardActions>
                <IconButton size="small" color="primary">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

