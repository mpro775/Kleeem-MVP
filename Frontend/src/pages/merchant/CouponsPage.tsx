// src/pages/merchant/CouponsPage.tsx
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
import CouponsToolbar, {
  type CouponStatusFilter,
} from "@/features/mechant/coupons/ui/CouponsToolbar";
import CouponsTable from "@/features/mechant/coupons/ui/CouponsTable";
import CouponFormDialog from "@/features/mechant/coupons/ui/CouponFormDialog";
import CouponDetailsDialog from "@/features/mechant/coupons/ui/CouponDetailsDialog";
import CouponDeleteDialog from "@/features/mechant/coupons/ui/CouponDeleteDialog";
import CouponGenerateCodesDialog from "@/features/mechant/coupons/ui/CouponGenerateCodesDialog";
import {
  createCoupon,
  deleteCoupon,
  fetchCoupons,
  generateCouponCodes,
  updateCoupon,
} from "@/features/mechant/coupons/api";
import type {
  Coupon,
  CreateCouponPayload,
  UpdateCouponPayload,
} from "@/features/mechant/coupons/type";
import { isMockDataEnabled } from "@/mock-data";

const DEFAULT_PAGE_SIZE = 10;

export default function CouponsPage() {
  const { user } = useAuth();
  // في وضع الديمو، استخدم merchantId افتراضي إذا لم يكن موجوداً
  const merchantId = user?.merchantId || (isMockDataEnabled() ? "507f1f77bcf86cd799439011" : "");
  const { handleError } = useErrorHandler();
  const { enqueueSnackbar } = useSnackbar();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CouponStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [activeCoupon, setActiveCoupon] = useState<Coupon | null>(null);

  const [detailsCoupon, setDetailsCoupon] = useState<Coupon | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[] | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim();
      setDebouncedSearch(next);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const statusParam = useMemo(
    () => (statusFilter === "all" ? undefined : statusFilter),
    [statusFilter]
  );

  const loadCoupons = useCallback(async () => {
    if (!merchantId) {
      setCoupons([]);
      setTotalPages(1);
      return;
    }

    setLoading(true);
    try {
      const response = await fetchCoupons({
        merchantId,
        status: statusParam,
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
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
      setCoupons(response.coupons);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [
    merchantId,
    statusParam,
    page,
    pageSize,
    debouncedSearch,
    handleError,
  ]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedSearch, statusParam, page]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleStatusChange = (status: CouponStatusFilter) => {
    setStatusFilter(status);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  const openCreateDialog = () => {
    setActiveCoupon(null);
    setFormOpen(true);
  };

  const openEditDialog = (coupon: Coupon) => {
    setActiveCoupon(coupon);
    setFormOpen(true);
  };

  const openDetailsDialog = (coupon: Coupon) => {
    setDetailsCoupon(coupon);
  };

  const closeDetailsDialog = () => {
    setDetailsCoupon(null);
  };

  const handleCreateCoupon = async (payload: CreateCouponPayload) => {
    setFormLoading(true);
    try {
      await createCoupon(payload);
      enqueueSnackbar("تم إنشاء الكوبون بنجاح", { variant: "success" });
      setFormOpen(false);
      if (page !== 1) {
        setPage(1);
      } else {
        await loadCoupons();
      }
    } catch (error) {
      handleError(error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateCoupon = async (payload: UpdateCouponPayload) => {
    if (!activeCoupon) return;
    setFormLoading(true);
    try {
      const updated = await updateCoupon(activeCoupon._id, merchantId, payload);
      enqueueSnackbar("تم تحديث الكوبون بنجاح", { variant: "success" });
      setFormOpen(false);
      setActiveCoupon(null);
      setDetailsCoupon(updated);
      await loadCoupons();
    } catch (error) {
      handleError(error);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (coupon: Coupon) => {
    setDeleteTarget(coupon);
    setDeleteOpen(true);
  };

  const handleDeleteCoupon = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteCoupon(deleteTarget._id, merchantId);
      enqueueSnackbar("تم حذف الكوبون", { variant: "info" });
      setDeleteOpen(false);
      setDeleteTarget(null);
      if (detailsCoupon?._id === deleteTarget._id) {
        setDetailsCoupon(null);
      }
      if (activeCoupon?._id === deleteTarget._id) {
        setActiveCoupon(null);
      }
      if (coupons.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await loadCoupons();
      }
    } catch (error) {
      handleError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleGenerateCodes = async ({
    count,
    length,
  }: {
    count: number;
    length: number;
  }) => {
    if (!merchantId) return;
    setGenerateLoading(true);
    try {
      const response = await generateCouponCodes({
        merchantId,
        count,
        length,
      });
      setGeneratedCodes(response.codes);
      enqueueSnackbar("تم توليد الأكواد بنجاح", { variant: "success" });
    } catch (error) {
      handleError(error);
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleCloseForm = () => {
    if (formLoading) return;
    setFormOpen(false);
    setActiveCoupon(null);
  };

  const handleOpenGenerate = () => {
    setGeneratedCodes(null);
    setGenerateOpen(true);
  };

  const handleCloseGenerate = () => {
    if (generateLoading) return;
    setGenerateOpen(false);
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
          إدارة الكوبونات
        </Typography>

        <CouponsToolbar
          search={search}
          status={statusFilter}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
          onAdd={openCreateDialog}
          onGenerateCodes={handleOpenGenerate}
          generatingCodes={generateLoading}
        />

        {loading && coupons.length === 0 ? (
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
          <CouponsTable
            coupons={coupons}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onView={openDetailsDialog}
            onEdit={openEditDialog}
            onDelete={confirmDelete}
          />
        )}

        {!loading && coupons.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
            }}
          >
            <Typography variant="h6" fontWeight={700} gutterBottom>
              لم يتم إنشاء أي كوبونات بعد
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              ابدأ بإنشاء كوبونات لتشجيع العملاء وزيادة المبيعات.
            </Typography>
            <Button variant="contained" onClick={openCreateDialog}>
              إنشاء كوبون جديد
            </Button>
          </Paper>
        ) : null}
      </Stack>

      <CouponFormDialog
        open={formOpen}
        coupon={activeCoupon ?? undefined}
        merchantId={merchantId}
        loading={formLoading}
        onClose={handleCloseForm}
        onCreate={handleCreateCoupon}
        onUpdate={handleUpdateCoupon}
      />

      <CouponDetailsDialog
        open={Boolean(detailsCoupon)}
        coupon={detailsCoupon}
        onClose={closeDetailsDialog}
        onEdit={(coupon) => {
          setDetailsCoupon(null);
          openEditDialog(coupon);
        }}
      />

      <CouponDeleteDialog
        open={deleteOpen}
        coupon={deleteTarget ?? undefined}
        loading={deleteLoading}
        onCancel={() => {
          if (!deleteLoading) {
            setDeleteOpen(false);
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleDeleteCoupon}
      />

      <CouponGenerateCodesDialog
        open={generateOpen}
        loading={generateLoading}
        codes={generatedCodes ?? undefined}
        onClose={handleCloseGenerate}
        onGenerate={handleGenerateCodes}
      />
    </Box>
  );
}

