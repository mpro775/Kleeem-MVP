import { useMemo, useState } from "react";
import {
  Paper,
  Stack,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  Chip,
  Typography,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";

import type { Badge } from "../type";

type Props = {
  value?: Badge[];
  onChange?: (badges: Badge[]) => void;
  label?: string;
};

export default function BadgesEditor({
  value,
  onChange,
  label = "الملصقات (badges)",
}: Props) {
  const [labelInput, setLabelInput] = useState("");
  const [colorInput, setColorInput] = useState("");
  const [showOnCard, setShowOnCard] = useState(true);

  const badges = useMemo(
    () => (value || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [value],
  );

  const emit = (next: Badge[]) => onChange?.(next);

  const addBadge = () => {
    const lbl = labelInput.trim();
    if (!lbl) return;
    const next: Badge = {
      label: lbl,
      color: colorInput.trim() ? colorInput.trim() : undefined,
      showOnCard,
      order: badges.length,
    };
    emit([...(badges || []), next]);
    setLabelInput("");
    setColorInput("");
    setShowOnCard(true);
  };

  const removeBadge = (idx: number) => {
    emit(badges.filter((_, i) => i !== idx));
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={600} mb={1}>
        {label}
      </Typography>

      <Stack spacing={1.5}>
        <TextField
          label="نص الملصق"
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addBadge()}
          size="small"
          fullWidth
        />
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            label="لون اختياري (hex أو اسم CSS)"
            value={colorInput}
            onChange={(e) => setColorInput(e.target.value)}
            size="small"
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={showOnCard}
                onChange={(e) => setShowOnCard(e.target.checked)}
              />
            }
            label="يظهر على الكارد"
          />
          <IconButton color="primary" onClick={addBadge}>
            <AddIcon />
          </IconButton>
        </Stack>

        <Divider />

        {badges.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            أضف ملصقًا لتمييز المنتج على الكارد.
          </Typography>
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap">
          {badges.map((b, idx) => (
            <Chip
              key={`${b.label}-${idx}`}
              label={b.color ? `${b.label} • ${b.color}` : b.label}
              onDelete={() => removeBadge(idx)}
              deleteIcon={<DeleteForeverIcon />}
              sx={{
                mb: 1,
                bgcolor: b.color ? `${b.color}22` : undefined,
                borderColor: b.color ? `${b.color}55` : undefined,
              }}
              variant={b.color ? "outlined" : "filled"}
            />
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
