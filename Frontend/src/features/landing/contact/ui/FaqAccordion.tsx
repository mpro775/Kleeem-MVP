import { Stack, Typography } from '@mui/material';

export default function FaqAccordion() {
  return (
    <Stack spacing={1.5}>
      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>كيف أفعّل دردشة كليم في موقعي؟</summary>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          من لوحة التاجر → القنوات → الويب شات، ثم انسخ سكربت التثبيت والصقه قبل <code>&lt;/body&gt;</code>.
        </Typography>
      </details>
      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>كم يستغرق الرد على التذاكر؟</summary>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          عادةً خلال 4–8 ساعات في أوقات العمل، و24 ساعة كحد أقصى.
        </Typography>
      </details>
      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>هل يوجد باقات للشركات؟</summary>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          نعم، لدينا خطط مخصّصة. راسلنا عبر النموذج وحدد "شركات/شراكات".
        </Typography>
      </details>
    </Stack>
  );
}