'use client';

import { useState } from 'react';
import {
  Stack,
  TextField,
  IconButton,
  Chip,
  Typography,
  Paper,
  Divider,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

type Attributes = Record<string, string[]>;

interface Props {
  value?: Attributes;
  onChange?: (val: Attributes) => void;
  label?: string;
}

export default function AttributesEditor({
  value,
  onChange,
  label = 'السمات',
}: Props) {
  const [attrs, setAttrs] = useState<Attributes>(value || {});
  const [keyInput, setKeyInput] = useState('');
  const [valInput, setValInput] = useState<Record<string, string>>({});

  const emit = (next: Attributes) => {
    setAttrs(next);
    onChange?.(next);
  };

  const addKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    if (!attrs[k]) {
      const next = { ...attrs, [k]: [] };
      setValInput((v) => ({ ...v, [k]: '' }));
      emit(next);
    }
    setKeyInput('');
  };

  const removeKey = (k: string) => {
    const next = { ...attrs };
    delete next[k];
    const nv = { ...valInput };
    delete nv[k];
    setValInput(nv);
    emit(next);
  };

  const addValue = (k: string) => {
    const val = (valInput[k] || '').trim();
    if (!val) return;
    const cur = attrs[k] || [];
    if (cur.includes(val)) {
      setValInput((v) => ({ ...v, [k]: '' }));
      return;
    }
    const next = { ...attrs, [k]: [...cur, val].slice(0, 50) };
    emit(next);
    setValInput((v) => ({ ...v, [k]: '' }));
  };

  const removeValue = (k: string, val: string) => {
    const next = { ...attrs, [k]: (attrs[k] || []).filter((x) => x !== val) };
    emit(next);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={600} mb={1}>
        {label}
      </Typography>

      {/* إضافة مفتاح جديد */}
      <Stack direction="row" spacing={1} mb={1}>
        <TextField
          label="أضف مفتاحًا (مثال: اللون)"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addKey()}
          size="small"
          fullWidth
        />
        <IconButton color="primary" onClick={addKey}>
          <AddIcon />
        </IconButton>
      </Stack>

      <Divider sx={{ my: 1 }} />

      {/* كل مفتاح مع تعدد القيم */}
      <Stack spacing={2}>
        {Object.entries(attrs).map(([k, values]) => (
          <Paper key={k} variant="outlined" sx={{ p: 1.5 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography fontWeight={600}>{k}</Typography>
              <IconButton color="error" onClick={() => removeKey(k)}>
                <DeleteForeverIcon />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
              {values.map((v) => (
                <Chip
                  key={v}
                  label={v}
                  onDelete={() => removeValue(k, v)}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>

            <Stack direction="row" spacing={1} mt={1}>
              <TextField
                size="small"
                label={`أضف قيمة لـ ${k} ثم Enter`}
                value={valInput[k] || ''}
                onChange={(e) =>
                  setValInput((prev) => ({ ...prev, [k]: e.target.value }))
                }
                onKeyDown={(e) => e.key === 'Enter' && addValue(k)}
                fullWidth
              />
              <Button onClick={() => addValue(k)}>إضافة</Button>
            </Stack>
          </Paper>
        ))}

        {!Object.keys(attrs).length && (
          <Typography variant="body2" color="text.secondary">
            أضف مفتاحًا أولًا (مثال: اللون، المقاس…)
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

