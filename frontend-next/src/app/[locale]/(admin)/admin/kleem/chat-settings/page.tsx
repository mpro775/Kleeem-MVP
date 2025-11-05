import { useEffect, useState } from 'react';
import {
  getChatSettings,
  updateChatSettings,
  type ChatSettings,
} from '@/features/admin/api/adminKleem';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

export default function ChatSettingsPage() {
  const [s, setS] = useState<ChatSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getChatSettings().then(setS);
  }, []);

  const save = async () => {
    if (!s) return;
    setBusy(true);
    try {
      const clean: Partial<ChatSettings> = {
        launchDate: s.launchDate?.trim(),
        applyUrl: s.applyUrl?.trim(),
        integrationsNow: s.integrationsNow?.trim(),
        trialOffer: s.trialOffer?.trim(),
        yemenNext: s.yemenNext?.trim(),
        yemenPositioning: s.yemenPositioning?.trim(),
        ctaEvery: Number(s.ctaEvery || 3),
        highIntentKeywords: (s.highIntentKeywords || [])
          .map((x) => x.trim())
          .filter(Boolean),
        piiKeywords: (s.piiKeywords || []).map((x) => x.trim()).filter(Boolean),
      };
      const updated = await updateChatSettings(clean);
      setS(updated);
    } finally {
      setBusy(false);
    }
  };

  const setCsv = (key: keyof ChatSettings, csv: string) => {
    if (!s) return;
    setS({
      ...s,
      [key]: csv
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    } as ChatSettings);
  };

  if (!s) return <Typography>…جارِ التحميل</Typography>;

  return (
    <Box dir="rtl">
      <Stack gap={2}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">إعدادات كليم (المحادثة)</Typography>
          <Stack gap={1} sx={{ mt: 1 }}>
            <TextField
              label="موعد الإطلاق"
              value={s.launchDate}
              onChange={(e) => setS({ ...s, launchDate: e.target.value })}
            />
            <TextField
              label="رابط صفحة التقديم"
              value={s.applyUrl}
              onChange={(e) => setS({ ...s, applyUrl: e.target.value })}
            />
            <TextField
              label="التكاملات المتاحة الآن (خليج)"
              value={s.integrationsNow}
              onChange={(e) => setS({ ...s, integrationsNow: e.target.value })}
            />
            <TextField
              label="عرض التجربة"
              value={s.trialOffer}
              onChange={(e) => setS({ ...s, trialOffer: e.target.value })}
            />
            <TextField
              label="قريبًا (اليمن)"
              value={s.yemenNext}
              onChange={(e) => setS({ ...s, yemenNext: e.target.value })}
            />
            <TextField
              label="تموضع اليمن"
              value={s.yemenPositioning}
              onChange={(e) => setS({ ...s, yemenPositioning: e.target.value })}
            />

            <TextField
              type="number"
              label="السماح بالـCTA كل (n) رسائل عند النية المنخفضة"
              value={s.ctaEvery}
              onChange={(e) =>
                setS({ ...s, ctaEvery: Number(e.target.value || 3) })
              }
            />

            <TextField
              label="كلمات مفتاحية للنية العالية (مفصولة بفواصل)"
              value={(s.highIntentKeywords || []).join(', ')}
              onChange={(e) => setCsv('highIntentKeywords', e.target.value)}
            />
            <Stack direction="row" gap={1} flexWrap="wrap">
              {(s.highIntentKeywords || []).map((k) => (
                <Chip key={k} label={k} />
              ))}
            </Stack>

            <TextField
              label="كلمات حسّاسة (خصوصية) لمنع جمع البيانات (مفصولة بفواصل)"
              value={(s.piiKeywords || []).join(', ')}
              onChange={(e) => setCsv('piiKeywords', e.target.value)}
            />
            <Stack direction="row" gap={1} flexWrap="wrap">
              {(s.piiKeywords || []).map((k) => (
                <Chip key={k} label={k} />
              ))}
            </Stack>

            <Stack direction="row" gap={1} sx={{ mt: 1 }}>
              <Button variant="contained" onClick={save} disabled={busy}>
                حفظ
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
