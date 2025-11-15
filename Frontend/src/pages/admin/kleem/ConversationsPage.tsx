// src/pages/admin/ConversationsPage.tsx
import { useEffect, useState } from "react";
import { listSessions } from "@/features/admin/api/adminKleem";
import { Link } from "react-router-dom";
import {
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Pagination,
} from "@mui/material";
import type { ChatSession } from "@/features/admin/api/adminKleem";
import { useErrorHandler } from '@/shared/errors';

export default function ConversationsKleemPage() {
  const { handleError } = useErrorHandler();
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ChatSession[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    listSessions(page, 20)
      .then(({ data, total }) => {
        setRows(data);
        setTotal(total);
      })
      .catch(handleError);
  }, [page, handleError]);

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
              component={Link}
              to={`/admin/kleem/conversations/${s.sessionId}`}
              style={{ textDecoration: "none", color: "inherit" }}
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
