'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useRouter } from 'next/navigation';
import { useCoupons, useCouponStats, useDeleteCoupon, useToggleCouponStatus } from '@/features/merchant/coupons';
import { CouponCard } from '@/features/merchant/coupons/components/CouponCard';
import { CouponStats } from '@/features/merchant/coupons/components/CouponStats';
import { Coupon } from '@/features/merchant/coupons/types';
import { useAuth } from '@/lib/hooks/auth';

export default function CouponsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const merchantId = user?.merchantId || '';

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);

  // Queries
  const { data: couponsData, isLoading } = useCoupons({
    merchantId,
    status: statusFilter,
    search: searchQuery,
  });

  const { data: stats, isLoading: statsLoading } = useCouponStats(merchantId);

  // Mutations
  const deleteMutation = useDeleteCoupon();
  const toggleStatusMutation = useToggleCouponStatus();

  const handleCreateCoupon = () => {
    router.push(`/ar/dashboard/coupons/create`);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    router.push(`/ar/dashboard/coupons/edit/${coupon._id}`);
  };

  const handleDeleteCoupon = (coupon: Coupon) => {
    setCouponToDelete(coupon);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (couponToDelete) {
      await deleteMutation.mutateAsync(couponToDelete._id);
      setDeleteDialogOpen(false);
      setCouponToDelete(null);
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    await toggleStatusMutation.mutateAsync({
      id: coupon._id,
      isActive: !coupon.isActive,
    });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* العنوان */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            إدارة الكوبونات
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateCoupon}
            size="large"
          >
            إنشاء كوبون جديد
          </Button>
        </Box>

        {/* الإحصائيات */}
        <CouponStats stats={stats} isLoading={statsLoading} />
      </Box>

      {/* الفلاتر */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
          }}
        >
          {/* التبويبات */}
          <Tabs
            value={statusFilter}
            onChange={(_, value) => setStatusFilter(value)}
            sx={{ flexShrink: 0 }}
          >
            <Tab label="الكل" value="all" />
            <Tab label="النشطة" value="active" />
            <Tab label="المنتهية" value="expired" />
          </Tabs>

          {/* البحث */}
          <TextField
            placeholder="ابحث عن كوبون..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      {/* قائمة الكوبونات */}
      {isLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={300} />
            </Grid>
          ))}
        </Grid>
      ) : couponsData?.coupons && couponsData.coupons.length > 0 ? (
        <Grid container spacing={3}>
          {couponsData.coupons.map((coupon) => (
            <Grid item xs={12} sm={6} md={4} key={coupon._id}>
              <CouponCard
                coupon={coupon}
                onEdit={handleEditCoupon}
                onDelete={handleDeleteCoupon}
                onToggleStatus={handleToggleStatus}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mt: 4 }}>
          لا توجد كوبونات {statusFilter !== 'all' ? statusFilter === 'active' ? 'نشطة' : 'منتهية' : ''} حالياً.
          {statusFilter === 'all' && (
            <>
              {' '}
              <Button onClick={handleCreateCoupon}>إنشاء أول كوبون</Button>
            </>
          )}
        </Alert>
      )}

      {/* حوار الحذف */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف الكوبون &quot;{couponToDelete?.code}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

