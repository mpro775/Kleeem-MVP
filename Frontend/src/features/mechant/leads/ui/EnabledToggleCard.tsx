// src/features/leads/ui/EnabledToggleCard.tsx
import { Paper, FormControlLabel, Switch } from "@mui/material";

export default function EnabledToggleCard({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (next: boolean) => void | Promise<void>;
}) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <FormControlLabel
        control={<Switch checked={enabled} onChange={(_, v) => onToggle(v)} />}
        label="تفعيل نموذج الـ Leads"
      />
    </Paper>
  );
}
