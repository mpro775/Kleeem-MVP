// src/pages/admin/ConversationView.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getSession } from "@/features/admin/api/adminKleem";
import { Avatar, Box, Paper, Typography } from "@mui/material";
import type { ChatSession } from "@/features/admin/api/adminKleem";
import { useErrorHandler } from '@/shared/errors';

export default function ConversationView() {
  const { handleError } = useErrorHandler();
  const { sessionId } = useParams();
  const [sess, setSess] = useState<ChatSession | null>(null);

  useEffect(() => {
    if (sessionId) {
      getSession(sessionId)
        .then(setSess)
        .catch(handleError);
    }
  }, [sessionId, handleError]);

  if (!sess) return null;
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Session: {sessionId}
      </Typography>
      {sess.messages.map((m, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            mb: 1,
          }}
        >
          <Paper
            sx={{
              p: 1.2,
              bgcolor: m.role === "user" ? "#f0f0f0" : "#563fa6",
              color: m.role === "user" ? "inherit" : "#fff",
            }}
          >
            <Typography variant="body2">{m.text}</Typography>
          </Paper>
          <Avatar
            sx={{
              width: 24,
              height: 24,
              bgcolor: m.role === "user" ? "#eee" : "#563fa6",
              ml: 1,
            }}
          >
            {m.role[0].toUpperCase()}
          </Avatar>
        </Box>
      ))}
    </Box>
  );
}
