// src/pages/dashboard/MissingResponsesPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  TextField,
  MenuItem,
  Button,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  IconButton,
  Tooltip,
  Divider,
  Paper,
  useMediaQuery,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import dayjs from "dayjs";
import type { MissingResponse } from "@/features/mechant/MissingResponses/type";
import {
  getMissingResponses,
  resolveMissingResponse,
  bulkResolve,
  addMissingToKnowledge,
} from "@/features/mechant/MissingResponses/api";
import AddToKnowledgeDialog from "@/features/mechant/MissingResponses/ui/AddToKnowledgeDialog";
import { useErrorHandler } from "@/shared/errors";

export default function MissingResponsesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { handleError } = useErrorHandler();

  const [rows, setRows] = useState<MissingResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(6);

  const [resolved, setResolved] = useState<"all" | "true" | "false">("all");
  const [channel, setChannel] = useState<
    "all" | "telegram" | "whatsapp" | "webchat"
  >("all");
  const [type, setType] = useState<
    "all" | "missing_response" | "unavailable_product"
  >("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<MissingResponse | null>(null);

  const params = useMemo(
    () => ({
      page: page + 1,
      limit,
      resolved,
      channel,
      type,
      search: search.trim() || undefined,
    }),
    [page, limit, resolved, channel, type, search]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMissingResponses(params);
      if (data && Array.isArray(data.items)) {
        setRows(data.items);
        setTotal(data.total || 0);
      } else if (Array.isArray(data)) {
        setRows(data);
        setTotal(data.length);
      } else {
        setRows([]);
        setTotal(0);
      }
    } catch (error) {
      handleError(error);
      console.error("Error fetching missing responses:", error);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [params, handleError]);

  useEffect(() => {
    fetchData();
  }, [params, fetchData]);

  if (loading) return <CircularProgress />;
  const resetFilters = () => {
    setResolved("all");
    setChannel("all");
    setType("all");
    setSearch("");
    setPage(0);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleResolveOne = async (id: string) => {
    try {
      await resolveMissingResponse(id);
      fetchData();
    } catch (error) {
      handleError(error);
    }
  };

  const openKnowledge = (row: MissingResponse) => {
    setCurrentRow(row);
    setKnowledgeOpen(true);
  };

  const handleSubmitKnowledge = async (payload: {
    question: string;
    answer: string;
  }) => {
    if (!currentRow) return;
    try {
      await addMissingToKnowledge(currentRow._id, payload);
      setKnowledgeOpen(false);
      setCurrentRow(null);
      await fetchData();
    } catch (error) {
      handleError(error);
    }
  };

  const handleResolveBulk = async () => {
    if (selected.size === 0) return;
    try {
      await bulkResolve(Array.from(selected));
      setSelected(new Set());
      fetchData();
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <Box
      sx={{ p: { xs: 1.5, md: 3 }, bgcolor: "#f9fafb", minHeight: "100dvh" }}
    >
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="h5" fontWeight={800}>
          الرسائل المنسيّة / غير المفهومة
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<RestartAltIcon />}
            onClick={resetFilters}
            size={isMobile ? "small" : "medium"}
          >
            {isMobile ? "" : "تصفير الفلاتر"}
          </Button>
          <Button
            variant="contained"
            startIcon={<DoneAllIcon />}
            onClick={handleResolveBulk}
            disabled={selected.size === 0}
            size={isMobile ? "small" : "medium"}
          >
            {isMobile ? "" : "تحديد الكل كمُعالج"}
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            size="small"
            placeholder="بحث..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" /> }}
          />
          <TextField
            size="small"
            select
            label="الحالة"
            value={resolved}
            onChange={(e) => setResolved(e.target.value as "all" | "true" | "false")}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="false">غير مُعالج</MenuItem>
            <MenuItem value="true">مُعالج</MenuItem>
          </TextField>
          <TextField
            size="small"
            select
            label="القناة"
            value={channel}
            onChange={(e) => setChannel(e.target.value as "all" | "telegram" | "whatsapp" | "webchat")}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="whatsapp">WhatsApp</MenuItem>
            <MenuItem value="telegram">Telegram</MenuItem>
            <MenuItem value="webchat">WebChat</MenuItem>
          </TextField>
          <TextField
            size="small"
            select
            label="النوع"
            value={type}
            onChange={(e) => setType(e.target.value as "all" | "missing_response" | "unavailable_product")}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="missing_response">Missing Response</MenuItem>
            <MenuItem value="unavailable_product">Unavailable Product</MenuItem>
          </TextField>
          <Chip icon={<FilterAltIcon />} label={`${total} نتيجة`} />
        </Stack>
      </Paper>

      {/* Table or Cards */}
      {!isMobile ? (
        <Paper sx={{ borderRadius: 2, overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>تحديد</TableCell>
                <TableCell>التاريخ</TableCell>
                <TableCell>القناة</TableCell>
                <TableCell>السؤال</TableCell>
                <TableCell>رد البوت</TableCell>
                <TableCell>تحليل AI</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r._id} hover>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(r._id)}
                      onChange={() => toggleSelect(r._id)}
                    />
                  </TableCell>
                  <TableCell>
                    {dayjs(r.createdAt).format("YYYY-MM-DD HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={r.channel} />
                  </TableCell>
                  <TableCell style={{ maxWidth: 280 }}>{r.question}</TableCell>
                  <TableCell style={{ maxWidth: 240, color: "#6b7280" }}>
                    {r.botReply}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={r.aiAnalysis || ""}>
                      <span>
                        {r.aiAnalysis ? r.aiAnalysis.slice(0, 40) + "…" : "-"}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        r.type === "missing_response"
                          ? "Missing"
                          : "Unavailable"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {r.resolved ? (
                      <Chip size="small" color="success" label="مُعالج" />
                    ) : (
                      <Chip size="small" color="warning" label="غير مُعالج" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {!r.resolved && (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="center"
                      >
                        <Tooltip title="إضافة للمعرفة">
                          <IconButton onClick={() => openKnowledge(r)}>
                            <LibraryAddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تحديد كمُعالج">
                          <IconButton onClick={() => handleResolveOne(r._id)}>
                            <CheckIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={limit}
            onRowsPerPageChange={(e) => {
              setLimit(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[6, 12, 24]}
            labelRowsPerPage="عدد العناصر في الصفحة:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
            }
          />
        </Paper>
      ) : (
        // Mobile Cards
        <>
          <Stack spacing={1.5}>
            {rows.map((r) => (
              <Card key={r._id} variant="outlined">
                <CardContent>
                  <Typography fontWeight={700}>{r.question}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dayjs(r.createdAt).format("DD/MM HH:mm")} • {r.channel}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {r.botReply || "—"}
                  </Typography>
                  <Stack direction="row" spacing={1} mt={1}>
                    <Chip
                      label={r.resolved ? "مُعالج" : "غير مُعالج"}
                      color={r.resolved ? "success" : "warning"}
                      size="small"
                    />
                    <Chip label={r.type} size="small" variant="outlined" />
                  </Stack>
                  {!r.resolved && (
                    <Stack direction="row" spacing={1} mt={1}>
                      <Button
                        size="small"
                        onClick={() => openKnowledge(r)}
                        startIcon={<LibraryAddIcon />}
                      >
                        للمعرفة
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleResolveOne(r._id)}
                        startIcon={<CheckIcon />}
                      >
                        مُعالج
                      </Button>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
          
          {/* Mobile Pagination */}
          <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                السابق
              </Button>
              <Typography variant="body2">
                {page + 1} من {Math.ceil(total / limit)}
              </Typography>
              <Button
                size="small"
                disabled={page >= Math.ceil(total / limit) - 1}
                onClick={() => setPage(page + 1)}
              >
                التالي
              </Button>
            </Stack>
          </Box>
        </>
      )}

      <AddToKnowledgeDialog
        open={knowledgeOpen}
        onClose={() => setKnowledgeOpen(false)}
        initialQuestion={currentRow?.question || ""}
        initialAnswer=""
        onSubmit={handleSubmitKnowledge}
      />
    </Box>
  );
}
