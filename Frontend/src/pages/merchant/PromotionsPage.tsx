// src/pages/merchant/PromotionsPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  CircularProgress,
  Paper,
  Button,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useAuth } from "@/context/hooks";
import { useErrorHandler } from "@/shared/errors";
import PromotionsToolbar, {
  type PromotionStatusFilter,
} from "@/features/mechant/promotions/ui/PromotionsToolbar";
import PromotionsTable from "@/features/mechant/promotions/ui/PromotionsTable";
import PromotionFormDialog from "@/features/mechant/promotions/ui/PromotionFormDialog";
import PromotionDetailsDialog from "@/features/mechant/promotions/ui/PromotionDetailsDialog";
import PromotionDeleteDialog from "@/features/mechant/promotions/ui/PromotionDeleteDialog";
import {
  createPromotion,
  deletePromotion,
  fetchPromotions,
  updatePromotion,
} from "@/features/mechant/promotions/api";
import type {
  Promotion,
  CreatePromotionPayload,
  UpdatePromotionPayload,
} from "@/features/mechant/promotions/type";
import { isMockDataEnabled } from "@/mock-data";

const DEFAULT_PAGE_SIZE = 10;

export default function PromotionsPage() {
  const { user } = useAuth();
  // في وضع الديمو، استخدم merchantId افتراضي إذا لم يكن موجوداً
  const merchantId = user?.merchantId || (isMockDataEnabled() ? "507f1f77bcf86cd799439011" : "");
  const { handleError } = useErrorHandler();
  const { enqueueSnackbar } = useSnackbar();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [statusFilter, setStatusFilter] =
    useState<PromotionStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [activePromotion, setActivePromotion] = useState<Promotion | null>(null);

  const [detailsPromotion, setDetailsPromotion] = useState<Promotion | null>(
    null
  );

  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const statusParam = useMemo(
    () => (statusFilter === "all" ? undefined : statusFilter),
    [statusFilter]
  );

  const loadPromotions = useCallback(async () => {
    if (!merchantId) {
      setPromotions([]);
      setTotalPages(1);
      return;
    }

    setLoading(true);
    try {
      const response = await fetchPromotions({
        merchantId,
        status: statusParam,
        page,
        limit: pageSize,
      });

      const effectiveLimit = response.limit || pageSize || DEFAULT_PAGE_SIZE;
      const nextTotalPages =
        response.total > 0
          ? Math.max(1, Math.ceil(response.total / effectiveLimit))
          : 1;

      setPageSize(effectiveLimit);

      if (page > nextTotalPages) {
        setTotalPages(nextTotalPages);
        setPage(Math.max(nextTotalPages, 1));
        return;
      }

      setTotalPages(nextTotalPages);
      setPromotions(response.promotions);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [merchantId, statusParam, page, pageSize, handleError]);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [statusParam, page]);

  const handleStatusChange = (status: PromotionStatusFilter) => {
    setStatusFilter(status);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  const openCreateDialog = () => {
    setActivePromotion(null);
    setFormOpen(true);
  };

  const openEditDialog = (promotion: Promotion) => {
    setActivePromotion(promotion);
    setFormOpen(true);
  };

  const openDetailsDialog = (promotion: Promotion) => {
    setDetailsPromotion(promotion);
  };

  const closeDetailsDialog = () => {
    setDetailsPromotion(null);
  };

  const handleCreatePromotion = async (payload: CreatePromotionPayload) => {
    setFormLoading(true);
    try {
      await createPromotion(payload);
      enqueueSnackbar("تم إنشاء العرض بنجاح", { variant: "success" });
      setFormOpen(false);
      if (page !== 1) {
        setPage(1);
      } else {
        await loadPromotions();
      }
    } catch (error) {
      handleError(error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdatePromotion = async (payload: UpdatePromotionPayload) => {
    if (!activePromotion) return;
    setFormLoading(true);
    try {
      const updated = await updatePromotion(
        activePromotion._id,
        merchantId,
        payload
      );
      enqueueSnackbar("تم تحديث العرض بنجاح", { variant: "success" });
      setFormOpen(false);
      setActivePromotion(null);
      setDetailsPromotion(updated);
      await loadPromotions();
    } catch (error) {
      handleError(error);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (promotion: Promotion) => {
    setDeleteTarget(promotion);
    setDeleteOpen(true);
  };

  const handleDeletePromotion = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deletePromotion(deleteTarget._id, merchantId);
      enqueueSnackbar("تم حذف العرض", { variant: "info" });
      setDeleteOpen(false);
      setDeleteTarget(null);
      if (detailsPromotion?._id === deleteTarget._id) {
        setDetailsPromotion(null);
      }
      if (activePromotion?._id === deleteTarget._id) {
        setActivePromotion(null);
      }
      if (promotions.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await loadPromotions();
      }
    } catch (error) {
      handleError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseForm = () => {
    if (formLoading) return;
    setFormOpen(false);
    setActivePromotion(null);
  };

  return (
    <Box
      dir="rtl"
      sx={{
        p: { xs: 2, md: 4 },
        bgcolor: "background.default",
        minHeight: "100vh",
      }}
    >
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={800}>
          إدارة العروض الترويجية
        </Typography>

        <PromotionsToolbar
          status={statusFilter}
          onStatusChange={handleStatusChange}
          onAdd={openCreateDialog}
        />

        {loading && promotions.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Paper>
        ) : (
          <PromotionsTable
            promotions={promotions}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onView={openDetailsDialog}
            onEdit={openEditDialog}
            onDelete={confirmDelete}
          />
        )}

        {!loading && promotions.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
            }}
          >
            <Typography variant="h6" fontWeight={700} gutterBottom>
              لم يتم إنشاء أي عروض بعد
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              ابدأ بإنشاء عرض ترويجي لجذب المزيد من العملاء.
            </Typography>
            <Button variant="contained" onClick={openCreateDialog}>
              إنشاء عرض جديد
            </Button>
          </Paper>
        ) : null}
      </Stack>

      <PromotionFormDialog
        open={formOpen}
        promotion={activePromotion ?? undefined}
        merchantId={merchantId}
        loading={formLoading}
        onClose={handleCloseForm}
        onCreate={handleCreatePromotion}
        onUpdate={handleUpdatePromotion}
      />

      <PromotionDetailsDialog
        open={Boolean(detailsPromotion)}
        promotion={detailsPromotion}
        onClose={closeDetailsDialog}
        onEdit={(promotion) => {
          setDetailsPromotion(null);
          openEditDialog(promotion);
        }}
      />

      <PromotionDeleteDialog
        open={deleteOpen}
        promotion={deleteTarget ?? undefined}
        loading={deleteLoading}
        onCancel={() => {
          if (!deleteLoading) {
            setDeleteOpen(false);
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleDeletePromotion}
      />
    </Box>
  );
}

