'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import {
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Pagination,
} from "@mui/material";
import { listSessions } from "@/features/admin/api/adminKleem";
import type { ChatSession } from "@/features/admin/api/adminKleem";

export default function ConversationsKleemPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { enqueueSnackbar } = useSnackbar();
  
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ChatSession[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    listSessions(page, 20)
      .then(({ data, total }) => {
        setRows(data);
        setTotal(total);
      })
      .catch((error) => {
        enqueueSnackbar((error as Error).message || 'خطأ', { variant: 'error' });
      });
  }, [page, enqueueSnackbar]);

  return (
    <Paper sx={{ p: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Session</TableCell>
            <TableCell>Last message</TableCell>
            <TableCell>Count</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((s) => (
            <TableRow
              key={s.sessionId}
              hover
              onClick={() => router.push(`/${locale}/admin/kleem/conversations/${s.sessionId}`)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>{s.sessionId}</TableCell>
              <TableCell>
                {s.messages[s.messages.length - 1]?.text?.slice(0, 80)}
              </TableCell>
              <TableCell>{s.messages.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        sx={{ mt: 2 }}
        page={page}
        onChange={(_, p) => setPage(p)}
        count={Math.ceil(total / 20)}
      />
    </Paper>
  );
}

