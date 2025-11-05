'use client';

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSnackbar } from "notistack";
import {
  Paper,
  Stack,
  TextField,
  MenuItem,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef, type GridRowSelectionModel } from "@mui/x-data-grid";
import dayjs from "dayjs";
import {
  fetchKleemList,
  updateKleem,
  bulkResolve,
  type KleemItem,
} from "@/features/admin/api/adminAnalytics";

export default function KleemMissingResponsesPage() {
  const { enqueueSnackbar } = useSnackbar();
  
  const [rows, setRows] = useState<KleemItem[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState<string>("");
  const [resolved, setResolved] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [selection, setSelection] = useState<GridRowSelectionModel>([] as unknown as GridRowSelectionModel);
  const [edit, setEdit] = useState<{ open: boolean; row?: KleemItem }>({ open: false });

  const columns = useMemo<GridColDef<KleemItem>[]>(
    () => [
      { field: "createdAt", headerName: "التاريخ", width: 150, valueFormatter: ({ value }) => dayjs(value as string).format("YYYY-MM-DD HH:mm") },
      { field: "channel", headerName: "القناة", width: 110, renderCell: (p) => <Chip label={p.value} size="small" /> },
      { field: "question", headerName: "السؤال", flex: 1, minWidth: 220 },
      { field: "botReply", headerName: "رد البوت", flex: 1, minWidth: 220 },
      { field: "aiAnalysis", headerName: "تحليل AI", flex: 1, minWidth: 200 },
      { field: "manualReply", headerName: "رد يدوي", flex: 1, minWidth: 200 },
      {
        field: "resolved", headerName: "الحالة", width: 120,
        renderCell: (p) => p.value ? <Chip label="تم الحل" color="success" size="small" /> : <Chip label="مفتوح" color="warning" size="small" />
      },
      {
        field: "actions", headerName: "إجراءات", width: 160, sortable: false, filterable: false,
        renderCell: (p) => (
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => setEdit({ open: true, row: p.row })}>تعديل</Button>
            {!p.row.resolved && (
              <Button size="small" onClick={async () => {
                const updated = await updateKleem(p.row._id, { resolved: true });
                setRows((r) => r.map((x) => (x._id === updated._id ? updated : x)));
                enqueueSnackbar('تم الحل', { variant: 'success' });
              }}>حلّ</Button>
            )}
          </Stack>
        ),
      },
    ],
    [enqueueSnackbar]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchKleemList({
        page: page + 1,
        limit: pageSize,
        q,
        channel: channel as 'telegram' | 'whatsapp' | 'webchat' | undefined,
        resolved: resolved as 'true' | 'false' | undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(res.items);
      setRowCount(res.total);
    } catch (e) {
      enqueueSnackbar((e as Error).message || 'خطأ', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, channel, resolved, from, to, enqueueSnackbar]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Stack gap={2}>
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} gap={2}>
          <TextField label="بحث" value={q} onChange={(e) => setQ(e.target.value)} />
          <TextField select label="القناة" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="telegram">Telegram</MenuItem>
            <MenuItem value="whatsapp">WhatsApp</MenuItem>
            <MenuItem value="webchat">Webchat</MenuItem>
          </TextField>
          <TextField select label="الحالة" value={resolved} onChange={(e) => setResolved(e.target.value)}>
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="false">مفتوح</MenuItem>
            <MenuItem value="true">تم الحل</MenuItem>
          </TextField>
          <TextField type="date" label="من" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
          <TextField type="date" label="إلى" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
          <Button variant="contained" onClick={() => { setPage(0); void load(); }}>تطبيق</Button>
          {Array.isArray(selection) && selection.length > 0 && (
            <Button variant="outlined" onClick={async () => {
              await bulkResolve(selection as string[]);
              setSelection([] as unknown as GridRowSelectionModel);
              void load();
              enqueueSnackbar('تم الحل الجماعي', { variant: 'success' });
            }}>حلّ جماعي</Button>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, height: 580 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r._id}
          pagination
          paginationMode="server"
          paginationModel={{ page, pageSize }}
          pageSizeOptions={[10, 20, 50]}
          onPaginationModelChange={(m) => { setPage(m.page); setPageSize(m.pageSize); }}
          rowCount={rowCount}
          loading={loading}
          checkboxSelection
          rowSelectionModel={selection}
          onRowSelectionModelChange={setSelection}
        />
      </Paper>

      <Dialog open={edit.open} onClose={() => setEdit({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>تعديل السجل</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1, whiteSpace: "pre-wrap" }}>{edit.row?.question}</Typography>
          <Stack gap={2} sx={{ mt: 1 }}>
            <TextField
              label="رد يدوي"
              value={edit.row?.manualReply || ""}
              onChange={(e) => setEdit((s) => ({ ...s, row: { ...(s.row as KleemItem), manualReply: e.target.value } }))}
              multiline
            />
            <TextField
              label="تصنيف"
              value={edit.row?.category || ""}
              onChange={(e) => setEdit((s) => ({ ...s, row: { ...(s.row as KleemItem), category: e.target.value } }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit({ open: false })}>إلغاء</Button>
          <Button variant="contained" onClick={async () => {
            const r = edit.row!;
            const updated = await updateKleem(r._id, { manualReply: r.manualReply, category: r.category, resolved: r.resolved });
            setRows((list) => list.map((x) => (x._id === updated._id ? updated : x)));
            setEdit({ open: false });
            enqueueSnackbar('تم الحفظ', { variant: 'success' });
          }}>حفظ</Button>
          {!edit.row?.resolved && (
            <Button onClick={async () => {
              const r = edit.row!;
              const updated = await updateKleem(r._id, { resolved: true });
              setRows((list) => list.map((x) => (x._id === updated._id ? updated : x)));
              setEdit({ open: false });
              enqueueSnackbar('تم وضعه كـ تم الحل', { variant: 'success' });
            }}>وضع كـ تم الحل</Button>
          )}
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

