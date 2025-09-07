// src/features/knowledge/ui/FaqsTab.tsx
import { useCallback, useEffect,  useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  LinearProgress,
  Stack,
  Divider,
  Chip,
  Tooltip,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Collapse,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useSnackbar } from "notistack";
import axios from "@/shared/api/axios";
import { useFaqs } from "../hooks";

type FaqItem = {
  _id: string;
  question: string;
  answer: string;
  status?: "pending" | "completed" | "failed" | "deleted" | string;
  errorMessage?: string;
  createdAt?: string;
};

type StatusResp = {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  deleted: number;
};

export default function FaqsTab({ merchantId }: { merchantId: string }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { enqueueSnackbar } = useSnackbar();

  // الهوك يفترض أنه يوفر هذه الدوال (حدّثه إن لزم):
  const { faqs, loading, add,  remove, removeAll, update, refresh } = useFaqs(merchantId) as {
    faqs: FaqItem[];
    loading: boolean;
    add: (q: string, a: string) => Promise<void>;
    addBulk?: (items: { question: string; answer: string }[]) => Promise<void>;
    remove: (id: string, hard?: boolean) => Promise<void>;
    removeAll?: (hard?: boolean) => Promise<void>;
    update?: (id: string, data: Partial<Pick<FaqItem, "question" | "answer">>) => Promise<void>;
    refresh?: () => Promise<void>;
  };

  // إدخال فردي
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  // حالة عامة
  const [submitting, setSubmitting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [status, setStatus] = useState<StatusResp | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // حوار حذف الكل
  const [confirmDeleteAll, setConfirmDeleteAll] = useState<null | { hard: boolean }>(null);
  // حذف فردي
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteOne, setConfirmDeleteOne] = useState<null | { id: string; hard: boolean }>(null);

  // تحرير سطر
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);



  const anyPending = (status?.pending ?? 0) > 0;
  
  // إيقاف الـ polling إذا لم تعد هناك FAQs قيد المعالجة
  useEffect(() => {
    if (!anyPending && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [anyPending]);
  const progress =
    status && status.total > 0
      ? Math.round(((status.completed + status.failed + status.deleted) / status.total) * 100)
      : 0;

  const fetchStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const { data } = await axios.get<StatusResp>(`/merchants/${merchantId}/faqs/status`);
      setStatus(data);
    } catch {
      // صامت
    } finally {
      setStatusLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    // فقط إذا كان هناك FAQs قيد المعالجة، ابدأ الـ polling
    if (anyPending && (status?.pending ?? 0) > 0) {
      pollingRef.current = setInterval(async () => {
        await fetchStatus();
        await refresh?.();
      }, 4000);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [anyPending, status?.pending, fetchStatus, refresh]);

  const statusChip = (s?: FaqItem["status"], error?: string) => {
    if (s === "completed") return <Chip size="small" label="مكتمل" color="success" />;
    if (s === "failed")
      return (
        <Tooltip title={error || "فشل الفهرسة"}>
          <Chip size="small" label="فشل" color="error" />
        </Tooltip>
      );
    if (s === "deleted") return <Chip size="small" label="محذوف" variant="outlined" />;
    return (
      <Chip
        size="small"
        label={
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box className="pulse-dot" />
            <span>قيد التدريب</span>
          </Stack>
        }
        color="warning"
        variant="outlined"
      />
    );
  };

  const handleAddOne = async () => {
    if (!q.trim() || !a.trim()) return;
    setSubmitting(true);
    try {
      await add(q.trim(), a.trim());
      setQ(""); setA("");
      enqueueSnackbar("تمت إضافة السؤال وقيد المعالجة", { variant: "success" });
      await Promise.all([fetchStatus(), refresh?.()]);
    } catch (e: any) {
      enqueueSnackbar(e?.message || "تعذر الإضافة", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };



  const askDeleteOne = (id: string, hard: boolean) => setConfirmDeleteOne({ id, hard });

  const handleDeleteOne = async () => {
    if (!confirmDeleteOne) return;
    setDeletingId(confirmDeleteOne.id);
    try {
      await remove(confirmDeleteOne.id, confirmDeleteOne.hard);
      enqueueSnackbar(confirmDeleteOne.hard ? "تم الحذف النهائي" : "تم الحذف (Soft Delete)", { variant: "info" });
      await Promise.all([fetchStatus(), refresh?.()]);
    } catch (e: any) {
      enqueueSnackbar(e?.message || "تعذر الحذف", { variant: "error" });
    } finally {
      setDeletingId(null);
      setConfirmDeleteOne(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirmDeleteAll) return;
    setSubmitting(true);
    try {
      if (!removeAll) throw new Error("واجهة removeAll غير متوفرة في الهوك");
      await removeAll(confirmDeleteAll.hard);
      enqueueSnackbar(confirmDeleteAll.hard ? "تم حذف جميع الأسئلة نهائيًا" : "تم أرشفة جميع الأسئلة (Soft)", {
        variant: "info",
      });
      await Promise.all([fetchStatus(), refresh?.()]);
    } catch (e: any) {
      enqueueSnackbar(e?.message || "تعذر حذف الكل", { variant: "error" });
    } finally {
      setSubmitting(false);
      setConfirmDeleteAll(null);
    }
  };

  const startEdit = (it: FaqItem) => {
    setEditingId(it._id);
    setEditQ(it.question);
    setEditA(it.answer);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditQ("");
    setEditA("");
  };
  const saveEdit = async (id: string) => {
    if (!update) return;
    setSavingEdit(true);
    try {
      await update(id, { question: editQ.trim(), answer: editA.trim() });
      enqueueSnackbar("تم التعديل وسيعاد الفهرسة", { variant: "success" });
      cancelEdit();
      await Promise.all([fetchStatus(), refresh?.()]);
    } catch (e: any) {
      enqueueSnackbar(e?.message || "تعذر الحفظ", { variant: "error" });
    } finally {
      setSavingEdit(false);
    }
  };

  const PendingBanner = (
    <Collapse in={!!status}>
      <Paper
        elevation={0}
        sx={{
          p: 2, mb: 2, borderRadius: 2,
          background: theme.palette.mode === "dark"
            ? "linear-gradient(90deg, rgba(255,193,7,0.08), transparent)"
            : "linear-gradient(90deg, rgba(255,193,7,0.18), white)",
          border: (t) => `1px dashed ${t.palette.warning.main}`,
        }}
      >
        <Stack direction={isMobile ? "column" : "row"} spacing={1.5} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <InfoOutlinedIcon color="warning" />
            <Typography fontWeight={700}>
              {(status?.pending ?? 0) > 0 ? "الفهرسة قيد التنفيذ" : "الفهرسة مكتملة"}
            </Typography>
          </Stack>

          <Stack direction={isMobile ? "column" : "row"} spacing={1} alignItems="center">
            <Chip size="small" label={`قيد المعالجة: ${status?.pending ?? 0}`} color="warning" />
            <Chip size="small" label={`مكتمل: ${status?.completed ?? 0}`} color="success" />
            {!!status?.failed && <Chip size="small" label={`فشل: ${status?.failed}`} color="error" />}
            {!!status?.deleted && <Chip size="small" label={`محذوف: ${status?.deleted}`} variant="outlined" />}
            <Tooltip title="تحديث الآن">
              <span>
                <LoadingButton
                  loading={statusLoading}
                  onClick={async () => {
                    await fetchStatus();
                    await refresh?.();
                  }}
                  startIcon={<RefreshIcon />}
                  variant="outlined"
                  size="small"
                >
                  تحديث
                </LoadingButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Box sx={{ mt: 1.5 }}>
          <LinearProgress
            variant={status?.total ? "determinate" : "indeterminate"}
            value={progress}
            sx={{
              height: 8,
              borderRadius: 8,
              backgroundColor: theme.palette.action.hover,
              "& .MuiLinearProgress-bar": { borderRadius: 8 },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            {status?.total ? `${progress}% — ${status?.completed ?? 0} من ${status?.total ?? 0}` : "جاري التحضير..."}
          </Typography>
        </Box>
      </Paper>
    </Collapse>
  );

  return (
    <Box
      sx={{
        "& .pulse-dot": {
          width: 8, height: 8, borderRadius: "50%",
          background: theme.palette.warning.main,
          animation: "pulse 1.2s ease-in-out infinite",
        },
        "@keyframes pulse": {
          "0%": { transform: "scale(0.9)", opacity: 0.6 },
          "50%": { transform: "scale(1.2)", opacity: 1 },
          "100%": { transform: "scale(0.9)", opacity: 0.6 },
        },
      }}
    >
      {(loading || statusLoading) && <LinearProgress sx={{ mb: 2 }} />}

      {/* بانر الحالة */}
      {PendingBanner}

      {/* إضافة فردية */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems={isMobile ? "stretch" : "center"}>
          <TextField
            label="السؤال"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            fullWidth
          />
          <TextField
            label="الإجابة"
            value={a}
            onChange={(e) => setA(e.target.value)}
            fullWidth
          />
          <LoadingButton
            loading={submitting}
            onClick={handleAddOne}
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            disabled={!q.trim() || !a.trim()}
          >
            إضافة
          </LoadingButton>
        </Stack>
      </Paper>

    

      {/* رأس القائمة + حذف الكل */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6" fontWeight={800}>الأسئلة الشائعة</Typography>
        <Stack direction="row" spacing={1}>
      
          <Tooltip title="Hard Delete — حذف نهائي + تنظيف Qdrant">
            <span>
              <LoadingButton
                color="error"
                startIcon={<ClearAllIcon />}
                variant="text"
                onClick={() => setConfirmDeleteAll({ hard: true })}
                disabled={!faqs?.length}
                loading={submitting && !!confirmDeleteAll && !!confirmDeleteAll.hard}
              >
                حذف الكل 
              </LoadingButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {/* القائمة */}
      <Paper variant="outlined" sx={{ p: faqs?.length ? 0 : 2 }}>
        {!faqs?.length ? (
          <Box textAlign="center" py={6}>
            <Typography variant="body1" color="text.secondary">
              لا توجد أسئلة بعد — ابدأ بإضافتها أعلاه.
            </Typography>
          </Box>
        ) : (
          <Box>
            {faqs.map((f, idx) => {
              const isEditing = editingId === f._id;
              const showRowProgress = f.status !== "completed" && f.status !== "failed" && f.status !== "deleted";
              return (
                <Box key={f._id}>
                  <Box sx={{ p: 1.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Box flex={1} minWidth={0}>
                        {isEditing ? (
                          <Stack spacing={1}>
                            <TextField
                              label="السؤال"
                              value={editQ}
                              onChange={(e) => setEditQ(e.target.value)}
                              fullWidth
                            />
                            <TextField
                              label="الإجابة"
                              value={editA}
                              onChange={(e) => setEditA(e.target.value)}
                              fullWidth
                              multiline
                              minRows={2}
                            />
                          </Stack>
                        ) : (
                          <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} gutterBottom noWrap title={f.question}>
                              {f.question}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                              {f.answer}
                            </Typography>
                          </>
                        )}

                        {showRowProgress && (
                          <LinearProgress
                            variant="indeterminate"
                            sx={{
                              height: 4, mt: 1, borderRadius: 2,
                              backgroundColor: (t) =>
                                t.palette.mode === "dark" ? "rgba(255,193,7,0.08)" : "rgba(255,193,7,0.18)",
                              "& .MuiLinearProgress-bar": { borderRadius: 2 },
                            }}
                          />
                        )}

                        <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                          {statusChip(f.status, f.errorMessage)}
                          {f.createdAt && (
                            <Typography variant="caption" color="text.secondary">
                              أضيف: {new Date(f.createdAt).toLocaleString()}
                            </Typography>
                          )}
                          {f.status === "failed" && f.errorMessage && (
                            <Tooltip title={f.errorMessage}>
                              <Typography variant="caption" color="error" sx={{ cursor: "help" }}>
                                (تفاصيل الفشل)
                              </Typography>
                            </Tooltip>
                          )}
                        </Stack>
                      </Box>

                      {/* أزرار السطر */}
                      <Stack direction="row" spacing={0.5} alignSelf="flex-start">
                        {isEditing ? (
                          <>
                            <Tooltip title="حفظ">
                              <span>
                                <LoadingButton
                                  loading={savingEdit}
                                  onClick={() => saveEdit(f._id)}
                                  variant="contained"
                                  sx={{ minWidth: 0, p: 0.75 }}
                                >
                                  <SaveIcon fontSize="small" />
                                </LoadingButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="إلغاء">
                              <IconButton onClick={cancelEdit} sx={{ p: 0.75 }}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            <Tooltip title="تعديل">
                              <IconButton onClick={() => startEdit(f)} sx={{ p: 0.75 }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                           

                            {/* Hard delete */}
                            <Tooltip title="حذف نهائي ">
                              <span>
                                <LoadingButton
                                  loading={deletingId === f._id && !!confirmDeleteOne?.hard}
                                  color="error"
                                  onClick={() => askDeleteOne(f._id, true)}
                                  variant="text"
                                  sx={{ minWidth: 0, p: 0.5 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </LoadingButton>
                              </span>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                  {idx < faqs.length - 1 && <Divider />}
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* حوار حذف عنصر */}
      <Dialog open={!!confirmDeleteOne} onClose={() => setConfirmDeleteOne(null)} fullWidth maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDeleteOne?.hard
              ? "سيتم حذف السؤال نهائيًا وإزالة متجهاته من  قاعده المعرفة لدى كليم."
              : "سيتم أرشفة السؤال (Soft Delete) مع إمكانية استعادته لاحقًا."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOne(null)}>إلغاء</Button>
          <LoadingButton color={confirmDeleteOne?.hard ? "error" : "warning"} onClick={handleDeleteOne} loading={!!deletingId}>
            تأكيد
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* حوار حذف الكل */}
      <Dialog open={!!confirmDeleteAll} onClose={() => setConfirmDeleteAll(null)} fullWidth maxWidth="xs">
        <DialogTitle>تأكيد حذف جميع الأسئلة</DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDeleteAll?.hard
              ? "سيتم حذف جميع الأسئلة نهائيًا مع إزالة كل المعرفة من قاعده المعرفة لدى كليم."
              : "سيتم أرشفة جميع الأسئلة (Soft Delete)."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteAll(null)}>إلغاء</Button>
          <LoadingButton color={confirmDeleteAll?.hard ? "error" : "warning"} onClick={handleDeleteAll} loading={submitting}>
            تأكيد
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
