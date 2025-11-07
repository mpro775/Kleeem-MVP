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
import {
  usePromotions,
  usePromotionStats,
  useDeletePromotion,
  useTogglePromotionStatus,
} from '@/features/merchant/promotions';
import { PromotionCard } from '@/features/merchant/promotions/components/PromotionCard';
import { PromotionStats } from '@/features/merchant/promotions/components/PromotionStats';
import { Promotion } from '@/features/merchant/coupons/types';
import { useAuth } from '@/lib/hooks/auth';

export default function PromotionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const merchantId = user?.merchantId || '';

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(null);

  // Queries
  const { data: promotionsData, isLoading } = usePromotions({
    merchantId,
    status: statusFilter,
    search: searchQuery,
  });

  const { data: stats, isLoading: statsLoading } = usePromotionStats(merchantId);

  // Mutations
  const deleteMutation = useDeletePromotion();
  const toggleStatusMutation = useTogglePromotionStatus();

  const handleCreatePromotion = () => {
    router.push(`/ar/dashboard/promotions/create`);
  };

  const handleEditPromotion = (promotion: Promotion) => {
    router.push(`/ar/dashboard/promotions/edit/${promotion._id}`);
  };

  const handleDeletePromotion = (promotion: Promotion) => {
    setPromotionToDelete(promotion);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (promotionToDelete) {
      await deleteMutation.mutateAsync(promotionToDelete._id);
      setDeleteDialogOpen(false);
      setPromotionToDelete(null);
    }
  };

  const handleToggleStatus = async (promotion: Promotion) => {
    await toggleStatusMutation.mutateAsync({
      id: promotion._id,
      isActive: !promotion.isActive,
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
            إدارة العروض الترويجية
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreatePromotion}
            size="large"
          >
            إنشاء عرض جديد
          </Button>
        </Box>

        {/* الإحصائيات */}
        <PromotionStats stats={stats} isLoading={statsLoading} />
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
            placeholder="ابحث عن عرض..."
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

      {/* قائمة العروض */}
      {isLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={300} />
            </Grid>
          ))}
        </Grid>
      ) : promotionsData?.promotions && promotionsData.promotions.length > 0 ? (
        <Grid container spacing={3}>
          {promotionsData.promotions.map((promotion) => (
            <Grid item xs={12} sm={6} md={4} key={promotion._id}>
              <PromotionCard
                promotion={promotion}
                onEdit={handleEditPromotion}
                onDelete={handleDeletePromotion}
                onToggleStatus={handleToggleStatus}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mt: 4 }}>
          لا توجد عروض{' '}
          {statusFilter !== 'all' ? (statusFilter === 'active' ? 'نشطة' : 'منتهية') : ''}{' '}
          حالياً.
          {statusFilter === 'all' && (
            <>
              {' '}
              <Button onClick={handleCreatePromotion}>إنشاء أول عرض</Button>
            </>
          )}
        </Alert>
      )}

      {/* حوار الحذف */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف العرض &quot;{promotionToDelete?.name}&quot;؟ لا يمكن
            التراجع عن هذا الإجراء.
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

