'use client';

import {
  Stack,
  TextField,
  Switch,
  FormControlLabel,
  Paper,
  Typography,
} from '@mui/material';

export type OfferForm = {
  enabled: boolean;
  oldPrice?: number;
  newPrice?: number;
  startAt?: string; // datetime-local
  endAt?: string;
};

interface Props {
  value?: OfferForm;
  onChange?: (val: OfferForm) => void;
}

export default function OfferEditor({ value, onChange }: Props) {
  const v = value || { enabled: false };

  const set = (patch: Partial<OfferForm>) => onChange?.({ ...v, ...patch });

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={600} mb={1}>
        العرض الترويجي
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={!!v.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
          />
        }
        label="تفعيل العرض"
      />
      {v.enabled && (
        <Stack spacing={2} mt={1}>
          <TextField
            label="السعر القديم"
            type="number"
            value={v.oldPrice ?? ''}
            onChange={(e) => set({ oldPrice: Number(e.target.value) })}
            inputProps={{ min: 0, step: '0.5' }}
          />
          <TextField
            label="السعر الجديد"
            type="number"
            value={v.newPrice ?? ''}
            onChange={(e) => set({ newPrice: Number(e.target.value) })}
            inputProps={{ min: 0, step: '0.5' }}
            helperText="سيُستخدم هذا كسعر فعلي طوال فترة العرض"
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="بداية العرض"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={v.startAt ?? ''}
              onChange={(e) => set({ startAt: e.target.value })}
            />
            <TextField
              label="نهاية العرض"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={v.endAt ?? ''}
              onChange={(e) => set({ endAt: e.target.value })}
            />
          </Stack>
        </Stack>
      )}
    </Paper>
  );
}

