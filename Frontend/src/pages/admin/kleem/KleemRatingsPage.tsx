// src/pages/admin/kleem/KleemRatingsPage.tsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box, Paper, Stack, TextField, MenuItem, Button, Chip, Typography, IconButton,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import dayjs from 'dayjs';
import { fetchRatings, fetchRatingsStats, type RatingRow } from '@/features/admin/api/adminKleemRatings';
import { useNavigate } from 'react-router-dom';

export default function KleemRatingsPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<RatingRow[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  // Filters
  const [q, setQ] = useState('');
  const [rating, setRating] = useState<string>(''); // '', '1', '0'
  const [sessionId, setSessionId] = useState('');
  const [from, setFrom] = useState(''); // yyyy-mm-dd
  const [to, setTo] = useState('');

  // Stats
  const [stats, setStats] = useState<null | {
    summary: { totalRated: number; thumbsUp: number; thumbsDown: number; upRate: number };
    weekly: { _id: { y: number; w: number }; total: number; up: number; down: number }[];
    topBad: { text: string; count: number; feedbacks: string[] }[];
  }>(null);

  const columns = useMemo<GridColDef<RatingRow>[]>(() => [
    { field: 'timestamp', headerName: 'التاريخ', width: 170,
      valueFormatter: ({ value }) => dayjs(value as string).format('YYYY-MM-DD HH:mm') },
    { field: 'message', headerName: 'رد البوت', flex: 1, minWidth: 260 },
    { field: 'feedback', headerName: 'ملاحظات العميل', flex: 1, minWidth: 220 },
    { field: 'rating', headerName: 'التقييم', width: 120,
      renderCell: (p) => p.value === 1
        ? <Chip label="👍 جيد" color="success" size="small" />
        : <Chip label="👎 سيّئ" color="error" size="small" /> },
    { field: 'sessionId', headerName: 'الجلسة', width: 220 },
    {
      field: 'actions', headerName: 'إجراءات', width: 120, sortable: false, filterable: false,
      renderCell: (p) => (
        <IconButton title="فتح الجلسة" onClick={() => nav(`/admin/kleem/bot-chats/${p.row.sessionId}`)}>
          <OpenInNewIcon />
        </IconButton>
      )
    },
  ], [nav]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchRatings({
      page: page + 1,
      limit: pageSize,
      rating: rating as '1' | '0' | undefined,
      q: q || undefined,
      sessionId: sessionId || undefined,
      from: from || undefined,
      to: to || undefined,
    });
    setRows(res.items);
    setRowCount(res.total);
    setLoading(false);
  }, [page, pageSize, rating, q, sessionId, from, to]);

  const loadStats = useCallback(async () => {
    const res = await fetchRatingsStats({ from: from || undefined, to: to || undefined });
    setStats(res);
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadStats(); }, [loadStats]);

  return (
    <Stack gap={2}>
      {/* كروت إحصائية */}
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
        <Paper className="p-4" sx={{ flex: 1 }}>
          <Typography variant="subtitle2">إجمالي التقييمات</Typography>
          <Typography variant="h5">{stats?.summary.totalRated ?? '—'}</Typography>
        </Paper>
        <Paper className="p-4" sx={{ flex: 1 }}>
          <Typography variant="subtitle2">جيدة 👍</Typography>
          <Typography variant="h5">{stats?.summary.thumbsUp ?? '—'}</Typography>
        </Paper>
        <Paper className="p-4" sx={{ flex: 1 }}>
          <Typography variant="subtitle2">سيئة 👎</Typography>
          <Typography variant="h5">{stats?.summary.thumbsDown ?? '—'}</Typography>
        </Paper>
        <Paper className="p-4" sx={{ flex: 1 }}>
          <Typography variant="subtitle2">نسبة الرضا</Typography>
          <Typography variant="h5">
            {stats ? Math.round(stats.summary.upRate * 100) + '%' : '—'}
          </Typography>
        </Paper>
      </Stack>

      {/* فلاتر */}
      <Paper className="p-4">
        <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
          <TextField label="بحث" value={q} onChange={(e)=>setQ(e.target.value)} />
          <TextField select label="نوع التقييم" value={rating} onChange={(e)=>setRating(e.target.value)}>
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="1">👍 جيد</MenuItem>
            <MenuItem value="0">👎 سيّئ</MenuItem>
          </TextField>
          <TextField label="Session ID" value={sessionId} onChange={(e)=>setSessionId(e.target.value)} />
          <TextField type="date" label="من" InputLabelProps={{shrink:true}} value={from} onChange={(e)=>setFrom(e.target.value)} />
          <TextField type="date" label="إلى" InputLabelProps={{shrink:true}} value={to} onChange={(e)=>setTo(e.target.value)} />
          <Button variant="contained" onClick={()=>{ setPage(0); void load(); }}>تطبيق</Button>
        </Stack>
      </Paper>

      {/* جدول */}
      <Paper className="p-2" style={{ height: 600 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r)=>r.id}
          pagination
          paginationMode="server"
          paginationModel={{ page, pageSize }}
          pageSizeOptions={[10,20,50]}
          onPaginationModelChange={(m)=>{ setPage(m.page); setPageSize(m.pageSize); }}
          rowCount={rowCount}
          loading={loading}
        />
      </Paper>

      {/* أسوأ الردود (Top 👎) */}
      {stats?.topBad?.length ? (
        <Paper className="p-4">
          <Typography variant="h6" sx={{ mb: 2 }}>الردود الأكثر حصولًا على 👎</Typography>
          <Stack gap={1}>
            {stats.topBad.map((t, i) => (
              <Box key={i}>
                <Typography variant="subtitle2">({t.count}) {t.text}</Typography>
                {t.feedbacks?.length ? (
                  <Typography variant="body2" sx={{ opacity: .8 }}>
                    ملاحظات: {t.feedbacks.slice(0, 3).join(' • ')}{t.feedbacks.length > 3 ? ' …' : ''}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
