'use client';

/**
 * Customer Details Page
 * @description Detailed view of a specific customer
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Button,
  Grid,
  Avatar,
  Divider,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import {
  Person,
  Email,
  Phone,
  ShoppingCart,
  AttachMoney,
  Edit,
  Block,
  CheckCircle,
  Add,
  Close,
} from '@mui/icons-material';
import { useParams } from 'next/navigation';

// Mock customer data - will be replaced with API call
const mockCustomer = {
  _id: '1',
  name: 'أحمد محمد',
  emailLower: 'ahmed@example.com',
  phoneNormalized: '+966501234567',
  signupSource: 'otp' as const,
  tags: ['VIP', 'loyal'],
  isBlocked: false,
  lastSeenAt: '2024-01-15T10:30:00Z',
  marketingConsent: true,
  stats: {
    totalOrders: 5,
    totalSpend: 1250.50,
    lastOrderId: 'order123',
  },
  createdAt: '2024-01-01T08:00:00Z',
  metadata: {
    notes: 'عميل VIP مهم',
  },
};

export default function CustomerDetailsPage() {
  const t = useTranslations('customers');
  const theme = useTheme();
  const params = useParams();
  const customerId = params.id as string;

  const [customer] = useState(mockCustomer);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleBlockToggle = async () => {
    // TODO: Implement block/unblock API call
    console.log('Toggle block status');
  };

  const handleAddTag = async () => {
    if (newTag.trim()) {
      // TODO: Implement add tag API call
      console.log('Add tag:', newTag);
      setNewTag('');
      setTagDialogOpen(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    // TODO: Implement remove tag API call
    console.log('Remove tag:', tag);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ width: 64, height: 64, bgcolor: theme.palette.primary.main }}>
          <Person sx={{ fontSize: 32 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold' }}>
            {customer.name}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={customer.signupSource === 'otp' ? 'OTP' : 'طلب'}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={customer.isBlocked ? 'محظور' : 'نشط'}
              size="small"
              color={customer.isBlocked ? 'error' : 'success'}
              variant="outlined"
            />
          </Stack>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => setEditDialogOpen(true)}
          >
            تعديل
          </Button>
          <Button
            variant={customer.isBlocked ? 'contained' : 'outlined'}
            color={customer.isBlocked ? 'success' : 'error'}
            startIcon={customer.isBlocked ? <CheckCircle /> : <Block />}
            onClick={handleBlockToggle}
          >
            {customer.isBlocked ? 'إلغاء الحظر' : 'حظر'}
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* Customer Info */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              معلومات العميل
            </Typography>

            <Stack spacing={3}>
              {/* Contact Info */}
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
                  معلومات التواصل
                </Typography>
                <Stack spacing={2}>
                  {customer.emailLower && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Email color="action" />
                      <Typography>{customer.emailLower}</Typography>
                    </Box>
                  )}
                  {customer.phoneNormalized && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Phone color="action" />
                      <Typography>{customer.phoneNormalized}</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Tags */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    التاجات
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => setTagDialogOpen(true)}
                  >
                    إضافة تاج
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {customer.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>

              <Divider />

              {/* Additional Info */}
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
                  معلومات إضافية
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>تاريخ التسجيل:</strong> {formatDate(customer.createdAt)}
                  </Typography>
                  {customer.lastSeenAt && (
                    <Typography variant="body2">
                      <strong>آخر ظهور:</strong> {formatDate(customer.lastSeenAt)}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    <strong>موافقة التسويق:</strong> {customer.marketingConsent ? 'نعم' : 'لا'}
                  </Typography>
                  {customer.metadata?.notes && (
                    <Typography variant="body2">
                      <strong>ملاحظات:</strong> {customer.metadata.notes}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Stats Sidebar */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Orders Stats */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <ShoppingCart color="primary" />
                  <Typography variant="h6">الطلبات</Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {customer.stats.totalOrders}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  إجمالي الطلبات
                </Typography>
              </CardContent>
            </Card>

            {/* Spend Stats */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <AttachMoney color="primary" />
                  <Typography variant="h6">الإنفاق</Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {formatCurrency(customer.stats.totalSpend)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  إجمالي الإنفاق
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Edit Customer Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تعديل بيانات العميل</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              label="الاسم"
              defaultValue={customer.name}
              fullWidth
            />
            <TextField
              label="البريد الإلكتروني"
              defaultValue={customer.emailLower}
              fullWidth
            />
            <TextField
              label="رقم الهاتف"
              defaultValue={customer.phoneNormalized}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>مصدر التسجيل</InputLabel>
              <Select defaultValue={customer.signupSource}>
                <MenuItem value="otp">OTP</MenuItem>
                <MenuItem value="order">طلب</MenuItem>
                <MenuItem value="lead">Lead</MenuItem>
                <MenuItem value="manual">يدوي</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained">حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog
        open={tagDialogOpen}
        onClose={() => setTagDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>إضافة تاج</DialogTitle>
        <DialogContent>
          <TextField
            label="اسم التاج"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAddTag}>إضافة</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
