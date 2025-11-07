// src/pages/ChatPage.tsx
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import { Box, Paper, Skeleton, Alert, Stack } from '@mui/material';
import { useErrorHandler } from '@/lib/errors';
import WidgetChatUI from '@/features/merchant/widget-config/ui/WidgetChatUI';

type Raw = unknown;

interface Settings {
  merchantId: string | undefined;
  botName: string;
  welcomeMessage: string;
  brandColor: string;
  fontFamily: string;
  avatarUrl?: string;
  showPoweredBy: boolean;
  publicSlug?: string;
  widgetSlug?: string;
  embedMode: string;
}

function unwrap(x: Raw) {
  // الباك إند يرسل الآن: { success, data, requestId, timestamp }
  // البيانات تأتي في data مباشرة
  if (x && typeof x === 'object') {
    const obj = x as Record<string, unknown>;
    if ('data' in obj && obj.data !== undefined) {
      return obj.data;
    }
  }
  return x;
}

// طبع الإعدادات إلى الواجهة المتوقعة من WidgetChatUI
function normalizeSettings(raw: Raw): Settings {
  const d = unwrap(raw) as Record<string, unknown>;

  // merchant object
  const merchant =
    typeof d.merchant === 'object' && d.merchant !== null
      ? (d.merchant as Record<string, unknown>)
      : undefined;
  const merchantId =
    typeof merchant?.id === 'string'
      ? merchant.id
      : typeof merchant?._id === 'string'
      ? merchant._id
      : typeof d.merchantId === 'string'
      ? d.merchantId
      : undefined;

  const publicSlug =
    typeof merchant?.slug === 'string'
      ? merchant.slug
      : typeof d.publicSlug === 'string'
      ? d.publicSlug
      : typeof d.slug === 'string'
      ? d.slug
      : undefined;

  const widgetSlug =
    typeof d.widgetSlug === 'string' ? d.widgetSlug : publicSlug;

  return {
    merchantId,
    botName:
      typeof d.botName === 'string'
        ? d.botName
        : typeof merchant?.name === 'string'
        ? merchant.name
        : 'Kaleem Bot',
    welcomeMessage:
      typeof d.welcomeMessage === 'string'
        ? d.welcomeMessage
        : 'أهلًا! كيف أقدر أساعدك؟',
    brandColor:
      typeof d.theme === 'object' &&
      d.theme !== null &&
      typeof (d.theme as Record<string, unknown>).primaryColor === 'string'
        ? ((d.theme as Record<string, unknown>).primaryColor as string)
        : typeof d.brandColor === 'string'
        ? (d.brandColor as string)
        : '#111827',
    fontFamily:
      typeof d.fontFamily === 'string'
        ? d.fontFamily
        : 'Tajawal, system-ui, sans-serif',
    avatarUrl: typeof d.avatarUrl === 'string' ? d.avatarUrl : undefined,
    showPoweredBy:
      typeof d.showPoweredBy === 'boolean' ? d.showPoweredBy : true,
    publicSlug,
    widgetSlug,
    embedMode: typeof d.embedMode === 'string' ? d.embedMode : 'bubble',
  };
}
export default function ChatPage() {
  const { handleError } = useErrorHandler();

  // ✅ التقط أي اسم بارام محتمل لتفادي undefined
  const params = useParams();
  const slug =
    (params.widgetSlug as string) ||
    (params.slug as string) ||
    (params.slugOrId as string) ||
    (params.id as string) ||
    '';

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!slug) throw new Error('لا يوجد سلاج في المسار.');

        // ملاحظة: الاندبوينت عندك هو /public/chat-widget/:slug
        const res = await axios.get(`/public/chat-widget/${slug}`);
        const normalized = normalizeSettings(res);

        if (!normalized.merchantId) {
          throw new Error('تعذر تحديد معرف التاجر لإعدادات الدردشة.');
        }

        if (mounted) setSettings(normalized);
      } catch (e: unknown) {
        if (!mounted) return;
        let errorMsg = 'حدث خطأ غير متوقع';
        if (typeof e === 'object' && e !== null) {
          const errObj = e as Record<string, unknown>;
          if (
            'response' in errObj &&
            typeof errObj.response === 'object' &&
            errObj.response !== null
          ) {
            const resp = errObj.response as Record<string, unknown>;
            if (
              'data' in resp &&
              typeof resp.data === 'object' &&
              resp.data !== null &&
              'message' in (resp.data as Record<string, unknown>) &&
              typeof (resp.data as Record<string, unknown>).message === 'string'
            ) {
              errorMsg = (resp.data as Record<string, unknown>)
                .message as string;
            }
          } else if (
            'message' in errObj &&
            typeof errObj.message === 'string'
          ) {
            errorMsg = errObj.message as string;
          }
        }
        setError(errorMsg);
        handleError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug, handleError]);

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        p: { xs: 1.5, md: 3 },
        background: 'linear-gradient(180deg,#f6f7fb,#eef1f7)',
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {/* وعاء مرن بعرض محترم على الديسكتوب، وعرض كامل على الجوال */}
      <Box
        sx={{
          mx: 'auto',
          width: '100%',
          maxWidth: { xs: '100%', sm: '100%', md: '100%' },
          height: { xs: 'calc(100dvh - 24px)', md: 'calc(100dvh - 48px)' },
          display: 'flex',
        }}
      >
        {loading && (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, flex: 1 }}>
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" height={60} />
              <Skeleton variant="rounded" height={280} />
              <Skeleton variant="rounded" height={56} />
            </Stack>
          </Paper>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ direction: 'rtl', flex: 1 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && !settings && (
          <Alert severity="warning" sx={{ direction: 'rtl', flex: 1 }}>
            لم يتم العثور على إعدادات الدردشة.
          </Alert>
        )}

        {!loading && !error && settings && (
          <WidgetChatUI
            settings={{
              ...settings,
              merchantId: settings.merchantId || '',
              embedMode: 'conversational',
            }}
            layout="standalone"
          />
        )}
      </Box>
    </Box>
  );
}
