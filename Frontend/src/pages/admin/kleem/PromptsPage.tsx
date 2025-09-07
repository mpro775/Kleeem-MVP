import { useEffect, useMemo, useState } from "react";
import {
  listPrompts,
  createPrompt,
  updatePrompt,
  setPromptActive,
  archivePrompt,
  deletePrompt,
  getActiveSystemContent,
  type Prompt,
  type CreatePromptDto,
  type PromptType,
} from "@/features/admin/api/adminKleem";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArchiveIcon from "@mui/icons-material/Archive";
import PublishIcon from "@mui/icons-material/Publish";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { sandboxTest, type SandboxResponse } from "@/features/admin/api/adminKleem";
import { Checkbox, FormControlLabel, Slider } from "@mui/material";

export default function PromptsPage() {
  const [rows, setRows] = useState<Prompt[]>([]);
  const [busy, setBusy] = useState(false);

  // إنشاء
  const [type, setType] = useState<"system" | "user">("system");
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [activateAfterSave, setActivateAfterSave] = useState(true);
  /* --- داخل الكومبوننت PromptsPage(): أضف حالات الساندبوكس --- */
  const [sText, setSText] = useState("");
  const [sAttach, setSAttach] = useState(true);
  const [sTopK, setSTopK] = useState(5);
  const [sDry, setSDry] = useState(false);
  const [sRes, setSRes] = useState<SandboxResponse | null>(null);
  const [tab, setTab] = useState<"list" | "create" | "sandbox">("list");

  // فلترة/عرض
  const [filterType, setFilterType] = useState<"system" | "user">("system");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [activeContent, setActiveContent] = useState<string>("");

  // تعديل
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editContent, setEditContent] = useState("");

  const runSandbox = async () => {
    if (!sText.trim()) return;
    setBusy(true);
    try {
      const data = await sandboxTest({
        text: sText.trim(),
        attachKnowledge: sAttach,
        topK: sTopK,
        dryRun: sDry,
      });
      setSRes(data);
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const [list, active] = await Promise.all([
        listPrompts({ type: filterType, includeArchived }),
        filterType === "system"
          ? getActiveSystemContent()
          : Promise.resolve({ content: "" }),
      ]);
      setRows(list);
      setActiveContent(active?.content ?? "");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, includeArchived]);

  const onCreate = async () => {
    if (!content.trim()) return;
    setBusy(true);
    try {
      const dto: CreatePromptDto = {
        type,
        content: content.trim(),
        name: name.trim() || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        active: activateAfterSave && type === "system",
      };
      await createPrompt(dto);
      // إعادة جلب لأن تفعيل system سيطفّي غيره
      await refresh();
      // تفريغ
      setName("");
      setTags("");
      setContent("");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (id: string, val: boolean) => {
    setBusy(true);
    try {
      await setPromptActive(id, val);
      await refresh(); // نزامن لأن تفعيل system يعطّل غيره
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (r: Prompt) => {
    setEditId(r._id);
    setEditName(r.name || "");
    setEditTags((r.tags || []).join(", "));
    setEditContent(r.content);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setBusy(true);
    try {
      await updatePrompt(editId, {
        name: editName.trim() || undefined,
        tags: editTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        content: editContent,
      });
      setEditOpen(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onArchive = async (id: string) => {
    setBusy(true);
    try {
      await archivePrompt(id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("تأكيد الحذف؟")) return;
    setBusy(true);
    try {
      await deletePrompt(id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => rows, [rows]);

  const copyActive = async () => {
    if (!activeContent) return;
    await navigator.clipboard.writeText(activeContent);
  };

  return (
    <Box dir="rtl">
      <Stack gap={2}>
        <Paper sx={{ p: 1 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="القائمة" value="list" />
            <Tab label="إنشاء" value="create" />
            <Tab label="Sandbox" value="sandbox" />
          </Tabs>
        </Paper>
        {tab === "list" && (
          <>
            {/* سطر علوي: فلترة + عرض النشط */}
            <Paper sx={{ p: 2 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                gap={2}
                alignItems={{ md: "center" }}
                justifyContent="space-between"
              >
                <Stack
                  direction="row"
                  gap={2}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <Typography variant="h6">إدارة البرومبت</Typography>
                  <Stack direction="row" gap={1}>
                    <Select
                      size="small"
                      value={filterType}
                      onChange={(e) =>
                        setFilterType(e.target.value as PromptType)
                      }
                    >
                      <MenuItem value="system">System</MenuItem>
                      <MenuItem value="user">User</MenuItem>
                    </Select>
                    <Select
                      size="small"
                      value={includeArchived ? "1" : "0"}
                      onChange={(e) =>
                        setIncludeArchived(e.target.value === "1")
                      }
                    >
                      <MenuItem value="0">بدون مؤرشف</MenuItem>
                      <MenuItem value="1">مع المؤرشف</MenuItem>
                    </Select>
                  </Stack>
                </Stack>

                {filterType === "system" && (
                  <Stack gap={1} sx={{ minWidth: 280 }}>
                    <Typography variant="subtitle2">
                      البرومبت النشط حاليًا
                    </Typography>
                    <Box
                      sx={{
                        position: "relative",
                        border: "1px solid #eee",
                        p: 1,
                        borderRadius: 1,
                        maxHeight: 160,
                        overflow: "auto",
                      }}
                    >
                      <Typography sx={{ whiteSpace: "pre-wrap" }}>
                        {activeContent || "— لا يوجد برومبت نشط —"}
                      </Typography>
                      {!!activeContent && (
                        <Tooltip title="نسخ البرومبت النشط">
                          <IconButton
                            size="small"
                            onClick={copyActive}
                            sx={{ position: "absolute", top: 4, left: 4 }}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Stack>
                )}
              </Stack>
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                البرومبتات
              </Typography>
              {filtered.map((r) => (
                <Box
                  key={r._id}
                  sx={{
                    display: "flex",
                    gap: 2,
                    borderBottom: "1px solid #eee",
                    py: 1,
                    alignItems: "flex-start",
                  }}
                >
                  <Stack alignItems="center" sx={{ mt: 0.5 }}>
                    <Switch
                      checked={!!r.active}
                      onChange={(_, v) => toggleActive(r._id, v)}
                      disabled={busy || r.archived}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {r.active ? "نشط" : "غير نشط"}
                    </Typography>
                  </Stack>

                  <Box sx={{ flex: 1 }}>
                    <Stack
                      direction="row"
                      gap={1}
                      alignItems="center"
                      flexWrap="wrap"
                      sx={{ mb: 0.5 }}
                    >
                      <Chip size="small" label={r.type.toUpperCase()} />
                      {r.archived && (
                        <Chip size="small" label="مؤرشف" color="warning" />
                      )}
                      {(r.tags || []).slice(0, 4).map((t) => (
                        <Chip size="small" key={t} label={t} />
                      ))}
                      {!!r.name && (
                        <Chip size="small" label={r.name} variant="outlined" />
                      )}
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: "pre-wrap" }}
                    >
                      {r.content}
                    </Typography>
                  </Box>

                  <Stack direction="row" gap={1}>
                    <Tooltip title="تعديل">
                      <span>
                        <IconButton onClick={() => openEdit(r)} disabled={busy}>
                          <EditIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="أرشفة">
                      <span>
                        <IconButton
                          onClick={() => onArchive(r._id)}
                          disabled={busy || r.archived}
                        >
                          <ArchiveIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <span>
                        <IconButton
                          onClick={() => onDelete(r._id)}
                          disabled={busy}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}
            </Paper>
          </>
        )}
        {tab === "create" && (
          <>
            {/* إنشاء برومبت جديد */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                إنشاء برومبت جديد
              </Typography>
              <Stack gap={1}>
                <Stack direction="row" gap={1}>
                  <Select
                    size="small"
                    value={type}
                    onChange={(e) => setType(e.target.value as PromptType)}
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="system">System</MenuItem>
                    <MenuItem value="user">User</MenuItem>
                  </Select>
                  <TextField
                    size="small"
                    label="الاسم (اختياري)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    size="small"
                    label="وسوم (مفصولة بفواصل)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    fullWidth
                  />
                </Stack>

                <TextField
                  fullWidth
                  multiline
                  minRows={6}
                  label="المحتوى"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />

                <Stack direction="row" gap={1} alignItems="center">
                  <Switch
                    checked={activateAfterSave && type === "system"}
                    onChange={(_, v) => setActivateAfterSave(v)}
                    disabled={type !== "system"}
                  />
                  <Typography variant="body2">
                    تفعيل بعد الحفظ (System فقط)
                  </Typography>
                </Stack>

                <Stack direction="row" gap={1}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onCreate}
                    disabled={busy || !content.trim()}
                  >
                    حفظ
                  </Button>

                  {type === "system" && !!content.trim() && (
                    <Button
                      variant="outlined"
                      startIcon={<PublishIcon />}
                      onClick={onCreate}
                      disabled={busy}
                    >
                      حفظ ونشر
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
          </>
        )}
      </Stack>

      {/* حوار التعديل */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fullWidth
        maxWidth="md"
        dir="rtl"
      >
        <DialogTitle>تعديل البرومبت</DialogTitle>
        <DialogContent>
          <Stack gap={1} sx={{ mt: 1 }}>
            <TextField
              label="الاسم (اختياري)"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
            />
            <TextField
              label="وسوم (مفصولة بفواصل)"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              fullWidth
            />
            <TextField
              label="المحتوى"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              fullWidth
              multiline
              minRows={6}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={busy}>
            إلغاء
          </Button>
          <Button
            onClick={saveEdit}
            variant="contained"
            disabled={busy || !editContent.trim()}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
      {tab === "sandbox" && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Sandbox اختبار البرومبت
          </Typography>
          <Stack gap={1}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              dir="rtl"
              label="اكتب رسالة اختبار"
              value={sText}
              onChange={(e) => setSText(e.target.value)}
              disabled={busy}
            />
            <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sAttach}
                    onChange={(_, v) => setSAttach(v)}
                  />
                }
                label="إرفاق Knowledge (FAQs)"
              />
              <Box sx={{ width: 240 }}>
                <Typography variant="caption">TopK</Typography>
                <Slider
                  size="small"
                  min={1}
                  max={10}
                  value={sTopK}
                  onChange={(_, v) => setSTopK(Number(v))}
                />
              </Box>
              <FormControlLabel
                control={
                  <Checkbox checked={sDry} onChange={(_, v) => setSDry(v)} />
                }
                label="معاينة فقط (بدون استدعاء النموذج)"
              />
              <Button
                variant="contained"
                onClick={runSandbox}
                disabled={busy || !sText.trim()}
              >
                تشغيل الاختبار
              </Button>
            </Stack>

            {sRes && (
              <Stack gap={2} sx={{ mt: 2 }}>
                <Box>
                  <Typography variant="subtitle2">
                    System Prompt النهائي
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{ p: 1, mt: 0.5, maxHeight: 240, overflow: "auto" }}
                  >
                    <Typography
                      sx={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}
                    >
                      {sRes.systemPrompt || "—"}
                    </Typography>
                  </Paper>
                </Box>

                {!!sRes.knowledge?.length && (
                  <Box>
                    <Typography variant="subtitle2">
                      Knowledge المُرفق
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1, mt: 0.5 }}>
                      {sRes.knowledge.map((k, i) => (
                        <Box
                          key={i}
                          sx={{ py: 0.5, borderBottom: "1px dashed #eee" }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: "pre-wrap" }}
                          >
                            Q: {k.question}\nA: {k.answer}
                          </Typography>
                          <Chip
                            size="small"
                            label={k.score.toFixed(3)}
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      ))}
                    </Paper>
                  </Box>
                )}

                <Stack direction="row" gap={2}>
                  <Chip
                    size="small"
                    color={sRes.highIntent ? "success" : "default"}
                    label={`HighIntent: ${sRes.highIntent}`}
                  />
                  <Chip
                    size="small"
                    color={sRes.ctaAllowed ? "success" : "default"}
                    label={`CTA allowed: ${sRes.ctaAllowed}`}
                  />
                  {!!sRes.result?.tokens && (
                    <Chip
                      size="small"
                      label={`Tokens: ${sRes.result.tokens}`}
                    />
                  )}
                  {!!sRes.result?.latencyMs && (
                    <Chip
                      size="small"
                      label={`Latency: ${sRes.result.latencyMs}ms`}
                    />
                  )}
                </Stack>

                {sRes?.result && (
                  <Stack gap={1}>
                    {!!sRes.result.raw && (
                      <Box>
                        <Typography variant="subtitle2">
                          رد النموذج (خام)
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 1 }}>
                          <Typography sx={{ whiteSpace: "pre-wrap" }}>
                            {sRes.result.raw}
                          </Typography>
                        </Paper>
                      </Box>
                    )}
                    {!!sRes.result.final && (
                      <Box>
                        <Typography variant="subtitle2">
                          بعد فلترة الخصوصية/الـCTA
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 1 }}>
                          <Typography sx={{ whiteSpace: "pre-wrap" }}>
                            {sRes.result.final}
                          </Typography>
                        </Paper>
                      </Box>
                    )}
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
