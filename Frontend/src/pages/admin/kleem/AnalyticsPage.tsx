// src/pages/admin/AnalyticsPage.tsx
import { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Stack,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { statsBadReplies, statsTopQuestions } from "@/features/admin/api/adminKleem";

export default function AnalyticsPageAdmin() {
  const [tops, setTops] = useState<{ text: string; count: number }[]>([]);
  const [bads, setBads] = useState<
    { text: string; count: number; feedbacks: string[] }[]
  >([]);
  useEffect(() => {
    statsTopQuestions().then(setTops);
    statsBadReplies().then(setBads);
  }, []);
  return (
    <Stack gap={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Top Questions</Typography>
        <List>
          {tops.map((t, i) => (
            <ListItem key={i}>
              <ListItemText primary={`${t.count} × ${t.text}`} />
            </ListItem>
          ))}
        </List>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Frequent Bad Bot Replies</Typography>
        <List>
          {bads.map((b, i) => (
            <ListItem key={i}>
              <ListItemText
                primary={`${b.count} × ${b.text}`}
                secondary={b.feedbacks?.slice(0, 3).join(" | ")}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Stack>
  );
}
