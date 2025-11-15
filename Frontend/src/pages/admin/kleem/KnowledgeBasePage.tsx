// src/pages/admin/KnowledgeBasePage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  addFaq,
  deleteFaq,
  listFaqs,
  importFaqs,
  importFaqsFile,
  reindexAllFaqs,
  type BotFaq,
  type CreateBotFaqDto,
  type BotFaqSearchItem,
  semanticSearch,
  updateFaq,
} from "@/features/admin/api/adminKleem";
import {
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  Divider,
  Tooltip,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ReplayIcon from "@mui/icons-material/Replay";
import Papa, { type ParseResult } from "papaparse";
import EditIcon from "@mui/icons-material/Edit";

const toSource = (s?: string): "manual" | "auto" | "imported" => {
  const v = (s ?? "manual").toLowerCase().trim();
  return v === "auto" || v === "imported" ? v : "manual";
};
const toLocale = (s?: string): "ar" | "en" =>
  (s ?? "ar").toLowerCase().trim() === "en" ? "en" : "ar";
const toTags = (s?: string): string[] =>
  String(s ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

type FaqCsvRow = {
  question?: string;
  answer?: string;
  tags?: string;
  locale?: string;
  source?: string;
};

export default function KnowledgeBasePage() {
  const [rows, setRows] = useState<BotFaq[]>([]);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [tags, setTags] = useState("");
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editLocale, setEditLocale] = useState<"ar" | "en">("ar");
  const openEdit = (row: BotFaq) => {
    setEditId(row._id);
    setEditQ(row.question);
    setEditA(row.answer);
    setEditTags((row.tags || []).join(", "));
    setEditLocale(row.locale === "en" ? "en" : "ar");
    setEditOpen(true);
  };
  const saveEdit = async () => {
    if (!editId) return;
    setBusy(true);
    try {
      const dto = {
        question: editQ.trim(),
        answer: editA.trim(),
        tags: editTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        locale: editLocale,
      };
      const updated = await updateFaq(editId, dto);
      // حدّث الصف محليًا أو أعد التحميل:
      setRows((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
      setEditOpen(false);
    } finally {
      setBusy(false);
    }
  };

  // بحث دلالي
  const [sQ, setSQ] = useState("");
  const [sTopK, setSTopK] = useState(5);
  const [sRows, setSRows] = useState<BotFaqSearchItem[]>([]);

  // فرز القائمة
  const [sortBy, setSortBy] = useState<"updated" | "created" | "question">(
    "updated"
  );
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    listFaqs().then(setRows);
  }, []);

  const validToCreate = q.trim().length > 0 && a.trim().length > 0 && !busy;

  const runSearch = async () => {
    if (!sQ.trim()) return;
    setBusy(true);
    try {
      const data = await semanticSearch(sQ.trim(), sTopK);
      // ترتيب نتائج البحث الدلالي حسب السكور تنازليًا
      setSRows((data || []).sort((x, y) => y.score - x.score));
    } finally {
      setBusy(false);
    }
  };

  const addOne = async () => {
    if (!validToCreate) return;
    setBusy(true);
    try {
      const dto: CreateBotFaqDto = {
        question: q.trim(),
        answer: a.trim(),
        tags: toTags(tags),
        locale,
        source: "manual",
      };
      await addFaq(dto);
      // يظهر أوّل القائمة
      setRows(await listFaqs());
      setQ("");
      setA("");
      setTags("");
    } finally {
      setBusy(false);
    }
  };

  const importCSV = async (file: File): Promise<void> => {
    const parsed = await new Promise<FaqCsvRow[]>((resolve, reject) => {
      Papa.parse<FaqCsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (r: ParseResult<FaqCsvRow>) => resolve(r.data),
        error: (err) => reject(err),
      });
    });
    const items: CreateBotFaqDto[] = parsed
      .map((r) => ({
        question: String(r.question || "").trim(),
        answer: String(r.answer || "").trim(),
        tags: toTags(r.tags),
        locale: toLocale(r.locale),
        source: toSource(r.source),
      }))
      .filter((r) => r.question && r.answer);

    if (items.length) {
      setBusy(true);
      try {
        await importFaqs(items);
        setRows(await listFaqs());
      } finally {
        setBusy(false);
      }
    }
  };

  const importJSON = async (file: File) => {
    setBusy(true);
    try {
      await importFaqsFile(file);
      setRows(await listFaqs());
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await deleteFaq(id);
      setRows((prev) => prev.filter((r) => r._id !== id));
    } finally {
      setBusy(false);
    }
  };

  const reindexAll = async () => {
    setBusy(true);
    try {
      await reindexAllFaqs();
      setRows(await listFaqs());
    } finally {
      setBusy(false);
    }
  };

  // ترتيب منطقي للقائمة
  const orderedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sortBy === "question") {
        const cmp = a.question.localeCompare(b.question, "ar");
        return sortDir === "asc" ? cmp : -cmp;
      }
      const ax = (a as BotFaq).updatedAt || (a as BotFaq).createdAt || "";
      const bx = (b as BotFaq).updatedAt || (b as BotFaq).createdAt || "";
      const cmp = new Date(ax).getTime() - new Date(bx).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortBy, sortDir]);

  return (
    <Box dir="rtl">
      {" "}
      {/* ← RTL */}
      <Stack gap={2}>
        <Paper sx={{ p: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            gap={2}
            alignItems={{ md: "center" }}
            justifyContent="space-between"
          >
            <Typography variant="h6">
              قاعدة المعرفة (الأسئلة الشائعة)
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Tooltip title="إعادة فهرسة جميع العناصر">
                <span>
                  <Button
                    onClick={reindexAll}
                    disabled={busy}
                    variant="outlined"
                    startIcon={<ReplayIcon />}
                  >
                    إعادة فهرسة
                  </Button>
                </span>
              </Tooltip>
              <Button
                component="label"
                variant="outlined"
                disabled={busy}
                startIcon={<UploadFileIcon />}
              >
                استيراد CSV
                <input
                  hidden
                  type="file"
                  accept=".csv"
                  onChange={(e) =>
                    e.target.files && importCSV(e.target.files[0])
                  }
                />
              </Button>
              <Button
                component="label"
                variant="outlined"
                disabled={busy}
                startIcon={<UploadFileIcon />}
              >
                استيراد JSON
                <input
                  hidden
                  type="file"
                  accept=".json"
                  onChange={(e) =>
                    e.target.files && importJSON(e.target.files[0])
                  }
                />
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* 🔎 بحث دلالي سريع */}
          <Paper
            sx={{ p: 2, bgcolor: "background.default" }}
            variant="outlined"
          >
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              بحث دلالي سريع
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              gap={1}
              alignItems="center"
            >
              <TextField
                fullWidth
                label="اكتب سؤالاً للمراجعة"
                value={sQ}
                onChange={(e) => setSQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                disabled={busy}
              />
              <TextField
                type="number"
                label="Top K"
                sx={{ width: 120 }}
                value={sTopK}
                onChange={(e) =>
                  setSTopK(Math.max(1, Number(e.target.value) || 5))
                }
                disabled={busy}
              />
              <Button
                startIcon={<SearchIcon />}
                variant="contained"
                onClick={runSearch}
                disabled={busy || !sQ.trim()}
              >
                بحث
              </Button>
            </Stack>

            {!!sRows.length && (
              <Box sx={{ mt: 2 }}>
                {sRows.map((r, i) => (
                  <Box
                    key={`${r.id}-${i}`}
                    sx={{ py: 1, borderBottom: "1px solid #eee" }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="subtitle2">{r.question}</Typography>
                      <Chip size="small" label={r.score.toFixed(3)} />
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: "pre-wrap" }}
                    >
                      {r.answer}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>

          <Divider sx={{ my: 2 }} />

          {/* 📝 إنشاء سؤال فردي */}
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            إنشاء سؤال فردي
          </Typography>
          <Stack gap={1}>
            <TextField
              fullWidth
              label="السؤال"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={busy}
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="الإجابة"
              value={a}
              onChange={(e) => setA(e.target.value)}
              disabled={busy}
            />
            <Stack direction="row" gap={1}>
              <TextField
                label="وسوم (مفصولة بفواصل)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={busy}
                fullWidth
              />
              <TextField
                select
                label="اللغة"
                value={locale}
                onChange={(e) => setLocale(e.target.value as "ar" | "en")}
                sx={{ minWidth: 120 }}
                disabled={busy}
              >
                <MenuItem value="ar">العربية</MenuItem>
                <MenuItem value="en">English</MenuItem>
              </TextField>
            </Stack>

            <Stack direction="row" justifyContent="flex-start">
              <Button
                sx={{ mt: 1 }}
                size="large"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={addOne}
                disabled={!validToCreate}
              >
                إنشاء سؤال
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* ⚙️ خيارات الفرز + القائمة */}
        <Paper sx={{ p: 2 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            gap={2}
            alignItems={{ sm: "center" }}
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography variant="h6">قائمة الأسئلة</Typography>
            <Stack direction="row" gap={1}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="sort-by">ترتيب حسب</InputLabel>
                <Select
                  labelId="sort-by"
                  value={sortBy}
                  label="ترتيب حسب"
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as "updated" | "created" | "question"
                    )
                  }
                >
                  <MenuItem value="updated">تاريخ التحديث</MenuItem>
                  <MenuItem value="created">تاريخ الإنشاء</MenuItem>
                  <MenuItem value="question">عنوان السؤال</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="sort-dir">الاتجاه</InputLabel>
                <Select
                  labelId="sort-dir"
                  value={sortDir}
                  label="الاتجاه"
                  onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
                >
                  <MenuItem value="desc">تنازلي</MenuItem>
                  <MenuItem value="asc">تصاعدي</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          {orderedRows.map((r) => (
            <Box
              key={r._id}
              sx={{
                display: "flex",
                gap: 2,
                borderBottom: "1px solid #eee",
                py: 1,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  gap={1}
                  flexWrap="wrap"
                >
                  <Typography variant="subtitle2">{r.question}</Typography>
                  {!!r.tags?.length &&
                    r.tags
                      .slice(0, 3)
                      .map((t) => <Chip key={t} size="small" label={t} />)}
                  {r.tags && r.tags.length > 3 && (
                    <Chip size="small" label={`+${r.tags.length - 3}`} />
                  )}
                  {r.locale && (
                    <Chip
                      size="small"
                      label={r.locale === "ar" ? "العربية" : "EN"}
                    />
                  )}
                  {r.vectorStatus && (
                    <Chip
                      size="small"
                      label={r.vectorStatus}
                      color={
                        r.vectorStatus === "ok"
                          ? "success"
                          : (r as BotFaq).vectorStatus === "failed"
                          ? "error"
                          : "warning"
                      }
                    />
                  )}
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ whiteSpace: "pre-wrap" }}
                >
                  {r.answer}
                </Typography>
              </Box>
              <Tooltip title="تعديل">
                <span>
                  <IconButton onClick={() => openEdit(r)} disabled={busy}>
                    <EditIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="حذف">
                <span>
                  <IconButton onClick={() => remove(r._id)} disabled={busy}>
                    <DeleteIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          ))}
        </Paper>
        <Dialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          fullWidth
          maxWidth="md"
          dir="rtl"
        >
          <DialogTitle>تعديل السؤال</DialogTitle>
          <DialogContent>
            <Stack gap={1} sx={{ mt: 1 }}>
              <TextField
                label="السؤال"
                fullWidth
                value={editQ}
                onChange={(e) => setEditQ(e.target.value)}
              />
              <TextField
                label="الإجابة"
                fullWidth
                multiline
                minRows={3}
                value={editA}
                onChange={(e) => setEditA(e.target.value)}
              />
              <Stack direction="row" gap={1}>
                <TextField
                  label="وسوم (مفصولة بفواصل)"
                  fullWidth
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                />
                <TextField
                  select
                  label="اللغة"
                  value={editLocale}
                  onChange={(e) => setEditLocale(e.target.value as "ar" | "en")}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="ar">العربية</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </TextField>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                * بعد الحفظ تتم إعادة الفهرسة تلقائيًا، وقد تظهر الحالة{" "}
                <Chip size="small" label="pending" /> للحظات.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)} disabled={busy}>
              إلغاء
            </Button>
            <Button
              onClick={saveEdit}
              variant="contained"
              disabled={busy || !editQ.trim() || !editA.trim()}
            >
              حفظ
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
}
