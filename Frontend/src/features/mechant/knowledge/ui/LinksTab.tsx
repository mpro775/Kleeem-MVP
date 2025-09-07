// src/features/knowledge/ui/LinksTab.tsx
import { useEffect, useMemo, useState, useRef } from "react";
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
  Link as MuiLink,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Collapse,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddLinkIcon from "@mui/icons-material/AddLink";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { LoadingButton } from "@mui/lab";
import { useSnackbar } from "notistack";
import { useLinks } from "../hooks";
import axios from "@/shared/api/axios";

type LinkItem = {
  _id: string;
  url: string;
  status?: "pending" | "completed" | "failed" | string;
  errorMessage?: string;
  createdAt?: string;
};

type StatusResp = {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  urls: { url: string; status: string; errorMessage?: string; textLength: number }[];
};

function isValidUrl(u: string) {
  try {
    const url = new URL(u.trim());
    return !!url.protocol && !!url.hostname;
  } catch {
    return false;
  }
}

export default function LinksTab({ merchantId }: { merchantId: string }) {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { links, loading, add, remove, refresh, addBulk, removeAll } = useLinks(merchantId) as {
    links: LinkItem[];
    loading: boolean;
    add: (url: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
    refresh?: () => Promise<void>;
    addBulk?: (urls: string[]) => Promise<void>;
    removeAll?: () => Promise<void>;
  };

  // إدخال رابط واحد + إدخال متعدد
  const [singleUrl, setSingleUrl] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  // حالة التدريب الإجمالية
  const [statusLoading, setStatusLoading] = useState(false);
  const [status, setStatus] = useState<StatusResp | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parsedBulkUrls = useMemo(() => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const valid = lines.filter(isValidUrl);
    const invalid = lines.filter((l) => !isValidUrl(l));
    return { valid, invalid };
  }, [bulkText]);

  const anyPending = (status?.pending ?? 0) > 0;
  const progress =
    status && status.total > 0
      ? Math.round(((status.completed + status.failed) / status.total) * 100)
      : 0;

  // ---- جلب الحالة + Polling ذكي أثناء وجود pending ----
  const fetchStatus = async () => {
    try {
      setStatusLoading(true);
      const { data } = await axios.get<StatusResp>(`/merchants/${merchantId}/knowledge/urls/status`);
      setStatus(data);
    } catch (e: any) {
      // صامت؛ لا نزعج المستخدم كثيراً
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // بدء/إيقاف التحديث التلقائي اعتماداً على وجود مهام قيد المعالجة
  }, [merchantId]);

  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (anyPending) {
      pollingRef.current = setInterval(() => {
        fetchStatus();
        // نحدّث قائمة الروابط أيضاً لأنها تحمل الحالات والتواريخ
        refresh?.();
      }, 4000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [anyPending]);

  // ---- إجراءات ----
  const handleAddSingle = async () => {
    const value = singleUrl.trim();
    if (!value) return;
    if (!isValidUrl(value)) {
      enqueueSnackbar("الرجاء إدخال رابط صحيح", { variant: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      await add(value);
      setSingleUrl("");
      enqueueSnackbar("تمت إضافة الرابط وقيد المعالجة", { variant: "success" });
      await Promise.all([fetchStatus(), refresh?.()]);
    } catch (e: any) {
      enqueueSnackbar(e?.message || "تعذر إضافة الرابط", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBulk = async () => {
    if (!parsedBulkUrls.valid.length) {
      enqueueSnackbar("لا توجد روابط صالحة في القائمة", { variant: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      if (addBulk) {
        await addBulk(parsedBulkUrls.valid);
      } else {
        for (const u of parsedBulkUrls.valid) {
          // eslint-disable-next-line no-await-in-loop
          await add(u);
        }
      }
      setBulkText("");
      const msg =
        parsedBulkUrls.invalid.length > 0
          ? `تمت إضافة ${parsedBulkUrls.valid.length} رابط. ${parsedBulkUrls.invalid.length} غير صالحة.`
          : `تمت إضافة ${parsedBulkUrls.valid.length} رابط.`;
      enqueueSnackbar(msg, { variant: "success" });
      await Promise.all([fetchStatus(), refresh?.()]);
    } catch (e: any) {
      enqueueSnackbar(e?.message || "تعذر إضافة الروابط", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await remove(id);
      enqueueSnackbar("تم حذف الرابط وما يتعلق به من المتجهات", { variant: "info" });
      await Promise.all([fetchStatus(), refresh?.()]);
    } catch (e: any) {
      enqueueSnackbar(e?.message || "تعذر حذف الرابط", { variant: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    setSubmitting(true);
    try {
      if (removeAll) {
        await removeAll();
        enqueueSnackbar("تم حذف جميع الروابط والمتجهات المرتبطة", { variant: "info" });
        setDeleteAllOpen(false);
        await Promise.all([fetchStatus(), refresh?.()]);
      } else {
        enqueueSnackbar("واجهة removeAll غير متوفرة في الهوك.", { variant: "warning" });
      }
    } catch (e: any) {
      enqueueSnackbar(e?.message || "تعذر حذف الكل", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      enqueueSnackbar("تم نسخ الرابط", { variant: "success" });
    } catch {
      enqueueSnackbar("تعذر النسخ", { variant: "error" });
    }
  };

  // ---- عناصر UI مساعدة ----
  const statusChip = (s?: LinkItem["status"], error?: string) => {
    if (s === "completed") return <Chip size="small" label="مكتمل" color="success" />;
    if (s === "failed")
      return (
        <Tooltip title={error || "فشل المعالجة"}>
          <Chip size="small" label="فشل" color="error" />
        </Tooltip>
      );
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

  const PendingBanner = (
    <Collapse in={(status?.total ?? 0) > 0}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(90deg, rgba(255,193,7,0.08), transparent)"
              : "linear-gradient(90deg, rgba(255,193,7,0.18), white)",
          border: (t) => `1px dashed ${t.palette.warning.main}`,
        }}
      >
        <Stack direction={isMobile ? "column" : "row"} spacing={1.5} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <InfoOutlinedIcon color="warning" />
            <Typography fontWeight={700}>
              {anyPending ? "الفهرسة قيد التنفيذ" : "الفهرسة مكتملة"}
            </Typography>
          </Stack>

          <Stack direction={isMobile ? "column" : "row"} spacing={1} alignItems="center">
            <Chip size="small" label={`قيد المعالجة: ${status?.pending ?? 0}`} color="warning" />
            <Chip size="small" label={`مكتمل: ${status?.completed ?? 0}`} color="success" />
            {status?.failed ? <Chip size="small" label={`فشل: ${status.failed}`} color="error" /> : null}
            <Tooltip title="تحديث الآن">
              <span>
                <LoadingButton loading={statusLoading} onClick={fetchStatus} startIcon={<RefreshIcon />} variant="outlined" size="small">
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
    <Box sx={{ "& .pulse-dot": { width: 8, height: 8, borderRadius: "50%", background: theme.palette.warning.main, animation: "pulse 1.2s ease-in-out infinite" }, "@keyframes pulse": { "0%": { transform: "scale(0.9)", opacity: 0.6 }, "50%": { transform: "scale(1.2)", opacity: 1 }, "100%": { transform: "scale(0.9)", opacity: 0.6 } } }}>
      {(loading || statusLoading) && <LinearProgress sx={{ mb: 2 }} />}

      {/* بانر الحالة الإجمالية */}
      {PendingBanner}

      {/* إضافة رابط واحد */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems={isMobile ? "stretch" : "center"}>
          <TextField
            label="رابط واحد"
            placeholder="https://example.com/article"
            value={singleUrl}
            onChange={(e) => setSingleUrl(e.target.value)}
            fullWidth
            InputProps={{
              endAdornment: (
                <Tooltip title="إضافة رابط">
                  <span>
                    <LoadingButton
                      loading={submitting}
                      onClick={handleAddSingle}
                      variant="contained"
                      startIcon={<AddLinkIcon />}
                      disabled={!singleUrl.trim()}
                    >
                      إضافة
                    </LoadingButton>
                  </span>
                </Tooltip>
              ),
            }}
          />
        </Stack>
      </Paper>

      {/* إضافة متعددة */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" fontWeight={700}>
            إضافة متعددة
          </Typography>
          <TextField
            label="الصق روابط متعددة (كل سطر رابط)"
            placeholder={`https://a.com\nhttps://b.com\nhttps://c.com`}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            multiline
            minRows={isMobile ? 3 : 4}
            maxRows={8}
            fullWidth
          />
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={`الصحيحة: ${parsedBulkUrls.valid.length}`} color="success" size="small" />
              {parsedBulkUrls.invalid.length > 0 && (
                <Tooltip title={`روابط غير صالحة:\n${parsedBulkUrls.invalid.join("\n")}`}>
                  <Chip label={`غير صالحة: ${parsedBulkUrls.invalid.length}`} color="error" size="small" />
                </Tooltip>
              )}
            </Stack>
            <LoadingButton
              loading={submitting}
              onClick={handleAddBulk}
              variant="outlined"
              startIcon={<PlaylistAddIcon />}
              disabled={parsedBulkUrls.valid.length === 0}
            >
              إضافة الكل
            </LoadingButton>
          </Stack>
        </Stack>
      </Paper>

      {/* رأس القائمة + حذف الكل */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6" fontWeight={800}>
          الروابط المضافة
        </Typography>
        <Tooltip title="حذف جميع الروابط والمتجهات المرتبطة">
          <span>
            <LoadingButton
              color="error"
              startIcon={<ClearAllIcon />}
              variant="text"
              onClick={() => setDeleteAllOpen(true)}
              disabled={!links?.length}
              loading={submitting && deleteAllOpen}
            >
              حذف الكل
            </LoadingButton>
          </span>
        </Tooltip>
      </Stack>

      {/* قائمة الروابط */}
      <Paper variant="outlined" sx={{ p: links?.length ? 0 : 2 }}>
        {!links?.length ? (
          <Box textAlign="center" py={6}>
            <Typography variant="body1" color="text.secondary">
              لا توجد روابط بعد — ابدأ بإضافة بعض الروابط أعلاه.
            </Typography>
          </Box>
        ) : (
          <Box>
            {links.map((l, idx) => (
              <Box key={l._id}>
                <Stack
                  direction={isMobile ? "column" : "row"}
                  alignItems={isMobile ? "flex-start" : "center"}
                  spacing={1.5}
                  sx={{ p: 1.5 }}
                >
                  <Box flex={1} minWidth={0}>
                    <Typography variant="subtitle2" noWrap title={l.url}>
                      <MuiLink href={l.url} target="_blank" rel="noopener noreferrer" underline="hover">
                        {l.url}
                      </MuiLink>
                    </Typography>

                    {/* شريط تقدم سطري عندما يكون الرابط قيد التدريب */}
                    {l.status !== "completed" && l.status !== "failed" && (
                      <LinearProgress
                        variant="indeterminate"
                        sx={{
                          height: 4,
                          mt: 0.75,
                          borderRadius: 2,
                          backgroundColor: (t) => (t.palette.mode === "dark" ? "rgba(255,193,7,0.08)" : "rgba(255,193,7,0.18)"),
                          "& .MuiLinearProgress-bar": { borderRadius: 2 },
                        }}
                      />
                    )}

                    <Stack direction="row" spacing={1} alignItems="center" mt={0.75}>
                      {statusChip(l.status, l.errorMessage)}
                      {l.createdAt && (
                        <Typography variant="caption" color="text.secondary">
                          أضيف: {new Date(l.createdAt).toLocaleString()}
                        </Typography>
                      )}
                      {l.status === "failed" && l.errorMessage && (
                        <Tooltip title={l.errorMessage}>
                          <Typography variant="caption" color="error" sx={{ cursor: "help" }}>
                            (تفاصيل الفشل)
                          </Typography>
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={0.5} sx={{ alignSelf: isMobile ? "flex-end" : "auto" }}>
                    <Tooltip title="فتح الرابط في تبويب جديد">
                      <IconButton size="small" onClick={() => window.open(l.url, "_blank")}>
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="نسخ الرابط">
                      <IconButton size="small" onClick={() => copyToClipboard(l.url)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف الرابط والمتجهات المرتبطة">
                      <span>
                        <LoadingButton
                          loading={deletingId === l._id}
                          color="error"
                          onClick={() => handleDelete(l._id)}
                          variant="text"
                          sx={{ minWidth: 0, p: 0.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </LoadingButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
                {idx < links.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* حوار تأكيد حذف الكل */}
      <Dialog open={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>تأكيد حذف جميع الروابط</DialogTitle>
        <DialogContent>
          <Typography>
            سيتم حذف جميع الروابط الخاصة بهذا التاجر وكذلك جميع المقاطع المضمّنة في قاعدة المتجهات (Qdrant).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllOpen(false)}>إلغاء</Button>
          <LoadingButton color="error" onClick={handleDeleteAll} loading={submitting}>
            حذف الكل
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
