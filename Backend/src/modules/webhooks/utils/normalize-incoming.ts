/* ===== types ===== */
export type Channel = 'whatsapp' | 'telegram' | 'webchat';
export type Transport = 'api' | 'qr';
export type Role = 'customer' | 'agent' | 'bot';
export type MediaKind =
  | 'image'
  | 'audio'
  | 'video'
  | 'pdf'
  | 'document'
  | 'other';

export type NormalizedMessage = {
  merchantId: string;
  sessionId: string;
  channel: Channel;
  transport?: Transport;
  text: string;
  role: Role;
  metadata: Record<string, unknown>;
  timestamp: Date;
  platformMessageId: string;
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  mediaType?: MediaKind;
};

/* ===== helpers: type guards ===== */
function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}
function isString(v: unknown): v is string {
  return typeof v === 'string';
}
function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}
function toStringSafe(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  if (typeof v === 'object') return '';
  if (typeof v === 'number') return v.toString();
  if (typeof v === 'boolean') return v.toString();
  if (typeof v === 'bigint') return v.toString();
  return '';
}
const now = (): Date => new Date();

/* ===== helpers: domain ===== */
const cleanJid = (jid: string): string =>
  jid?.replace('@s.whatsapp.net', '')?.replace('@g.us', '') ?? '';

export function inferMediaType(mime?: string, name?: string): MediaKind {
  const n = (name || '').toLowerCase();
  const m = (mime || '').toLowerCase();
  if (!m && !n) return 'document';

  const checks = [
    {
      type: 'pdf' as MediaKind,
      test: () => m.includes('pdf') || n.endsWith('.pdf'),
    },
    {
      type: 'image' as MediaKind,
      test: () => m.includes('image') || /\.(png|jpg|jpeg|webp|gif)$/i.test(n),
    },
    {
      type: 'audio' as MediaKind,
      test: () => m.includes('audio') || /\.(mp3|ogg|wav|m4a)$/i.test(n),
    },
    {
      type: 'video' as MediaKind,
      test: () => m.includes('video') || /\.(mp4|mov|mkv|webm)$/i.test(n),
    },
  ];

  for (const { type, test } of checks) {
    if (test()) return type;
  }
  return 'document';
}

const isAgentFlag = (body: Record<string, unknown>): boolean => {
  const role = isString(body.role) ? body.role : undefined;
  const sentBy = isString(body.sentBy) ? body.sentBy : undefined;
  return role?.toLowerCase() === 'agent' || sentBy?.toLowerCase() === 'agent';
};

const baseMeta = (body: Record<string, unknown>): Record<string, unknown> => {
  const md = isRecord(body.metadata) ? body.metadata : {};
  const out: Record<string, unknown> = { ...md };
  if (isString((body as { channelId?: unknown }).channelId))
    out.channelId = (body as { channelId: string }).channelId;
  if (isString((body as { provider?: unknown }).provider))
    out.provider = (body as { provider: string }).provider;
  return out;
};

/* ======= Telegram helpers (صغيرة لتقليل التعقيد) ======= */
const isTelegram = (b: Record<string, unknown>): boolean =>
  (b as { update_id?: unknown }).update_id != null &&
  isRecord((b as { message?: unknown }).message) &&
  isRecord((b as { message: Record<string, unknown> }).message.chat) &&
  (b as { message: { chat: { id?: unknown } } }).message.chat.id != null;

const tgGetMessage = (b: Record<string, unknown>): Record<string, unknown> =>
  (b as { message: Record<string, unknown> }).message;

const tgSessionId = (m: Record<string, unknown>): string =>
  String((m.chat as { id: unknown }).id);

const tgText = (m: Record<string, unknown>): string =>
  toStringSafe(
    (m as { text?: unknown }).text ??
      (m as { caption?: unknown }).caption ??
      '',
  );

const tgPlatformId = (m: Record<string, unknown>, sid: string): string => {
  const msgId = (m as { message_id?: unknown }).message_id;
  return msgId != null ? toStringSafe(msgId) : `${sid}:${Date.now()}`;
};

type MediaOut = {
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  mediaType?: MediaKind;
};
const tgMedia = (m: Record<string, unknown>): MediaOut => {
  const photos = isArray((m as { photo?: unknown }).photo)
    ? (m as { photo: unknown[] }).photo
    : undefined;
  const voice = isRecord((m as { voice?: unknown }).voice)
    ? (m as { voice: Record<string, unknown> }).voice
    : undefined;
  const document = isRecord((m as { document?: unknown }).document)
    ? (m as { document: Record<string, unknown> }).document
    : undefined;

  const handlers = [
    {
      condition: () => photos?.length,
      handler: () => {
        const last = photos![photos!.length - 1];
        const fileId =
          isRecord(last) && isString(last.file_id) ? last.file_id : undefined;
        return fileId
          ? { fileId, mediaType: 'image' as MediaKind }
          : { mediaType: 'image' as MediaKind };
      },
    },
    {
      condition: () => !!voice,
      handler: () => {
        const fileId = isString(voice!.file_id) ? voice!.file_id : undefined;
        const mime = isString(voice!.mime_type) ? voice!.mime_type : undefined;
        const result: MediaOut = { mediaType: 'audio' as MediaKind };
        if (fileId) result.fileId = fileId;
        if (mime) result.mimeType = mime;
        return result;
      },
    },
    {
      condition: () => !!document,
      handler: () => {
        const fileId = isString(document!.file_id)
          ? document!.file_id
          : undefined;
        const fileName = isString(document!.file_name)
          ? document!.file_name
          : undefined;
        const mime = isString(document!.mime_type)
          ? document!.mime_type
          : undefined;
        const result: MediaOut = {
          mediaType: inferMediaType(mime, fileName),
        };
        if (fileId) result.fileId = fileId;
        if (fileName) result.fileName = fileName;
        if (mime) result.mimeType = mime;
        return result;
      },
    },
  ];

  for (const { condition, handler } of handlers) {
    if (condition()) return handler();
  }
  return {};
};

/* ======= WhatsApp Cloud helpers ======= */
type WabaPair = {
  value: Record<string, unknown>;
  msg: Record<string, unknown> | null;
} | null;

const wabaPick = (b: Record<string, unknown>): WabaPair => {
  const entry = isArray((b as { entry?: unknown }).entry)
    ? (b as { entry: unknown[] }).entry[0]
    : undefined;
  const changes =
    entry && isArray((entry as { changes?: unknown }).changes)
      ? (entry as { changes: unknown[] }).changes
      : undefined;
  const value =
    changes && isRecord(changes[0]) && isRecord(changes[0].value)
      ? (changes[0] as { value: Record<string, unknown> }).value
      : undefined;
  const msg =
    value && isArray((value as { messages?: unknown }).messages)
      ? (value as { messages: unknown[] }).messages[0]
      : null;
  return value ? { value, msg: isRecord(msg) ? msg : null } : null;
};

const isWaba = (b: Record<string, unknown>): boolean =>
  (b as { object?: unknown }).object === 'whatsapp_business_account' ||
  !!wabaPick(b);

const wabaSessionId = (
  value: Record<string, unknown>,
  msg: Record<string, unknown> | null,
): string => {
  const contact = (value as { contacts?: Array<{ wa_id?: string }> })
    .contacts?.[0]?.wa_id;
  const from = msg ? (msg as { from?: unknown }).from : undefined;
  return toStringSafe(from ?? contact ?? '');
};

const wabaText = (m: Record<string, unknown>): string =>
  toStringSafe((m as { text?: { body?: unknown } }).text?.body) ||
  toStringSafe((m as { button?: { text?: unknown } }).button?.text) ||
  toStringSafe(
    (m as { interactive?: { list_reply?: { title?: unknown } } }).interactive
      ?.list_reply?.title,
  ) ||
  toStringSafe(
    (m as { interactive?: { button_reply?: { title?: unknown } } }).interactive
      ?.button_reply?.title,
  ) ||
  '';

const wabaType = (m: Record<string, unknown>): string =>
  toStringSafe((m as { type?: unknown }).type);

const wabaMedia = (m: Record<string, unknown>, typ: string): MediaOut => {
  const handlers = [
    {
      type: 'image',
      handler: () => {
        const img = (m as { image?: { id?: unknown; mime_type?: unknown } })
          .image;
        const fileId = toStringSafe(img?.id) || undefined;
        const mimeType = toStringSafe(img?.mime_type) || undefined;
        const result: MediaOut = { mediaType: 'image' as MediaKind };
        if (fileId) result.fileId = fileId;
        if (mimeType) result.mimeType = mimeType;
        return result;
      },
    },
    {
      type: 'audio',
      handler: () => {
        const au = (m as { audio?: { id?: unknown; mime_type?: unknown } })
          .audio;
        const fileId = toStringSafe(au?.id) || undefined;
        const mimeType = toStringSafe(au?.mime_type) || undefined;
        const result: MediaOut = { mediaType: 'audio' as MediaKind };
        if (fileId) result.fileId = fileId;
        if (mimeType) result.mimeType = mimeType;
        return result;
      },
    },
    {
      type: 'video',
      handler: () => {
        const vd = (m as { video?: { id?: unknown; mime_type?: unknown } })
          .video;
        const fileId = toStringSafe(vd?.id) || undefined;
        const mimeType = toStringSafe(vd?.mime_type) || undefined;
        const result: MediaOut = { mediaType: 'video' as MediaKind };
        if (fileId) result.fileId = fileId;
        if (mimeType) result.mimeType = mimeType;
        return result;
      },
    },
    {
      type: 'document',
      handler: () => {
        const doc = (
          m as {
            document?: {
              id?: unknown;
              filename?: unknown;
              mime_type?: unknown;
            };
          }
        ).document;
        const fileId = toStringSafe(doc?.id) || undefined;
        const fileName = toStringSafe(doc?.filename) || undefined;
        const mimeType = toStringSafe(doc?.mime_type) || undefined;
        const result: MediaOut = {
          mediaType: inferMediaType(mimeType, fileName),
        };
        if (fileId) result.fileId = fileId;
        if (fileName) result.fileName = fileName;
        if (mimeType) result.mimeType = mimeType;
        return result;
      },
    },
  ];

  for (const { type, handler } of handlers) {
    if (typ === type) return handler();
  }
  return {};
};

/* ================= Parsers ================= */

type ParseResult = NormalizedMessage | null;

/** Telegram — تعقيد منخفض */
function parseTelegram(
  body: Record<string, unknown>,
  merchantId: string,
): ParseResult {
  if (!isTelegram(body)) return null;

  const msg = tgGetMessage(body);
  const sid = tgSessionId(msg);
  const text = tgText(msg);
  const pid = tgPlatformId(msg, sid);
  const media = tgMedia(msg);
  const role: Role = isAgentFlag(body) ? 'agent' : 'customer';

  const result: NormalizedMessage = {
    merchantId,
    sessionId: sid,
    channel: 'telegram',
    text,
    role,
    metadata: {
      ...baseMeta(body),
      from: (msg as { from?: unknown }).from,
      entities: (msg as { entities?: unknown }).entities,
      sourceMessageId: pid,
      provider: 'telegram',
    },
    timestamp: now(),
    platformMessageId: pid,
  };

  if (media.fileId) result.fileId = media.fileId;
  if (media.fileName) result.fileName = media.fileName;
  if (media.mimeType) result.mimeType = media.mimeType;
  if (media.mediaType) result.mediaType = media.mediaType;

  return result;
}

/** WhatsApp Cloud API — مقسمة لمساعدات لتقليل السطور/التعقيد */
function parseWhatsappCloud(
  body: Record<string, unknown>,
  merchantId: string,
): ParseResult {
  if (!isWaba(body)) return null;

  const pair = wabaPick(body);
  if (!pair) return null;

  const { value, msg } = pair;
  const m = msg ?? {};
  const sid = wabaSessionId(value, msg);
  const typ = wabaType(m);
  const text = wabaText(m);
  const pid = toStringSafe(
    (m as { id?: unknown }).id ?? `${sid}:${Date.now()}`,
  );
  const media = wabaMedia(m, typ);
  const role: Role = isAgentFlag(body) ? 'agent' : 'customer';

  const result: NormalizedMessage = {
    merchantId,
    sessionId: sid,
    channel: 'whatsapp',
    transport: 'api',
    text,
    role,
    metadata: {
      ...baseMeta(body),
      value,
      type: typ,
      sourceMessageId: pid,
      provider: 'whatsapp_cloud',
    },
    timestamp: now(),
    platformMessageId: pid,
  };

  if (media.fileId) result.fileId = media.fileId;
  if (media.fileName) result.fileName = media.fileName;
  if (media.mimeType) result.mimeType = media.mimeType;
  if (media.mediaType) result.mediaType = media.mediaType;

  return result;
}

const qrNewExtractData = (body: Record<string, unknown>) => {
  const data = isRecord(body.data) ? body.data : null;
  const msgs =
    data && isArray((data as { messages?: unknown }).messages)
      ? (data as { messages: unknown[] }).messages
      : null;
  return { data, msgs };
};

const qrNewExtractSession = (
  msgs: unknown[],
  body: Record<string, unknown>,
) => {
  const m = isRecord(msgs[0]) ? msgs[0] : {};
  const key = isRecord(m.key) ? m.key : {};
  const remoteJid = toStringSafe((key as { remoteJid?: unknown }).remoteJid);
  const participant = toStringSafe(
    (key as { participant?: unknown }).participant,
  );
  const sid = remoteJid
    ? cleanJid(remoteJid)
    : participant
      ? cleanJid(participant)
      : toStringSafe((body as { from?: unknown }).from);
  return { m, key, sid };
};

const qrNewExtractText = (msg: Record<string, unknown>) =>
  toStringSafe((msg as { conversation?: unknown }).conversation) ||
  toStringSafe(
    (msg as { extendedTextMessage?: { text?: unknown } }).extendedTextMessage
      ?.text,
  ) ||
  toStringSafe(
    (msg as { imageMessage?: { caption?: unknown } }).imageMessage?.caption,
  ) ||
  '';

const qrNewExtractMedia = (
  msg: Record<string, unknown>,
  md: Record<string, unknown>,
) => {
  let fileName: string | undefined;
  let mimeType: string | undefined;
  let mediaType: MediaKind | undefined;

  const handlers = [
    {
      condition: () => isRecord(msg.imageMessage),
      handler: () => {
        const im = msg.imageMessage;
        mediaType = 'image';
        mimeType = toStringSafe((im as { mimetype?: unknown }).mimetype);
        fileName = toStringSafe((im as { fileName?: unknown }).fileName);
        if (isString((im as { base64?: unknown }).base64))
          md.base64 = (im as { base64: string }).base64;
      },
    },
    {
      condition: () => isRecord(msg.audioMessage),
      handler: () => {
        const am = msg.audioMessage;
        mediaType = 'audio';
        mimeType = toStringSafe((am as { mimetype?: unknown }).mimetype);
        fileName = toStringSafe((am as { fileName?: unknown }).fileName);
        if (isString((am as { base64?: unknown }).base64))
          md.base64 = (am as { base64: string }).base64;
      },
    },
    {
      condition: () => isRecord(msg.documentMessage),
      handler: () => {
        const dm = msg.documentMessage;
        mimeType = toStringSafe((dm as { mimetype?: unknown }).mimetype);
        fileName = toStringSafe((dm as { fileName?: unknown }).fileName);
        mediaType = inferMediaType(mimeType, fileName);
        if (isString((dm as { base64?: unknown }).base64))
          md.base64 = (dm as { base64: string }).base64;
      },
    },
  ];

  for (const { condition, handler } of handlers) {
    if (condition()) {
      handler();
      break;
    }
  }

  return { fileName, mimeType, mediaType };
};

/** WhatsApp QR (جديد) */
function parseWhatsappQrNew(
  body: Record<string, unknown>,
  merchantId: string,
): ParseResult {
  const { msgs } = qrNewExtractData(body);
  if (!msgs?.length) return null;

  const { m, key, sid } = qrNewExtractSession(msgs, body);
  const msg = isRecord(m.message) ? m.message : {};
  const text = qrNewExtractText(msg);
  const pid = toStringSafe(
    (key as { id?: unknown }).id ?? `${sid}:${Date.now()}`,
  );

  const md: Record<string, unknown> = {
    ...baseMeta(body),
    sourceMessageId: pid,
    provider: 'whatsapp_qr',
  };

  const { fileName, mimeType, mediaType } = qrNewExtractMedia(msg, md);
  const role: Role = isAgentFlag(body) ? 'agent' : 'customer';

  const result: NormalizedMessage = {
    merchantId,
    sessionId: sid,
    channel: 'whatsapp',
    transport: 'qr',
    text,
    role,
    metadata: md,
    timestamp: now(),
    platformMessageId: pid,
  };

  if (fileName) result.fileName = fileName;
  if (mimeType) result.mimeType = mimeType;
  if (mediaType) result.mediaType = mediaType;

  return result;
}

const qrOldExtractData = (body: Record<string, unknown>) => {
  const data = isRecord(body.data) ? body.data : null;
  const key =
    data && isRecord((data as { key?: unknown }).key)
      ? (data as { key: Record<string, unknown> }).key
      : null;
  return { data, key };
};

const qrOldExtractSession = (key: Record<string, unknown> | null) => {
  const remoteJid = key
    ? toStringSafe((key as { remoteJid?: unknown }).remoteJid)
    : '';
  if (!remoteJid) return null;
  const sid = cleanJid(remoteJid);
  return { remoteJid, sid };
};

const qrOldExtractText = (msg: Record<string, unknown>) =>
  toStringSafe((msg as { conversation?: unknown }).conversation) ||
  toStringSafe(
    (msg as { extendedTextMessage?: { text?: unknown } }).extendedTextMessage
      ?.text,
  ) ||
  toStringSafe(
    (msg as { imageMessage?: { caption?: unknown } }).imageMessage?.caption,
  ) ||
  '';

const qrOldExtractMedia = (msg: Record<string, unknown>) => {
  let fileUrl: string | undefined;
  let fileName: string | undefined;
  let mimeType: string | undefined;
  let mediaType: MediaKind | undefined;

  const handlers = [
    {
      condition: () =>
        isRecord((msg as { imageMessage?: unknown }).imageMessage),
      handler: () => {
        const im = (msg as { imageMessage: Record<string, unknown> })
          .imageMessage;
        mediaType = 'image';
        fileUrl = toStringSafe((im as { url?: unknown }).url);
        mimeType = toStringSafe((im as { mimetype?: unknown }).mimetype);
        fileName = toStringSafe((im as { fileName?: unknown }).fileName);
      },
    },
    {
      condition: () =>
        isRecord((msg as { audioMessage?: unknown }).audioMessage),
      handler: () => {
        const am = (msg as { audioMessage: Record<string, unknown> })
          .audioMessage;
        mediaType = 'audio';
        fileUrl = toStringSafe((am as { url?: unknown }).url);
        mimeType = toStringSafe((am as { mimetype?: unknown }).mimetype);
        fileName = toStringSafe((am as { fileName?: unknown }).fileName);
      },
    },
    {
      condition: () =>
        isRecord((msg as { documentMessage?: unknown }).documentMessage),
      handler: () => {
        const dm = (msg as { documentMessage: Record<string, unknown> })
          .documentMessage;
        fileUrl = toStringSafe((dm as { url?: unknown }).url);
        mimeType = toStringSafe((dm as { mimetype?: unknown }).mimetype);
        fileName = toStringSafe((dm as { fileName?: unknown }).fileName);
        mediaType = inferMediaType(mimeType, fileName);
      },
    },
  ];

  for (const { condition, handler } of handlers) {
    if (condition()) {
      handler();
      break;
    }
  }

  return { fileUrl, fileName, mimeType, mediaType };
};

/** WhatsApp QR (قديم) */
function parseWhatsappQrOld(
  body: Record<string, unknown>,
  merchantId: string,
): ParseResult {
  const { key } = qrOldExtractData(body);
  const session = qrOldExtractSession(key);
  if (!session) return null;

  const { sid } = session;
  const msg =
    key && isRecord((key as { message?: unknown }).message)
      ? (key as { message: Record<string, unknown> }).message
      : {};
  const text = qrOldExtractText(msg);
  const pid = toStringSafe(
    (key as { id?: unknown }).id ?? `${sid}:${Date.now()}`,
  );
  const { fileUrl, fileName, mimeType, mediaType } = qrOldExtractMedia(msg);
  const role: Role = isAgentFlag(body) ? 'agent' : 'customer';

  const result: NormalizedMessage = {
    merchantId,
    sessionId: sid,
    channel: 'whatsapp',
    transport: 'qr',
    text,
    role,
    metadata: {
      ...baseMeta(body),
      sourceMessageId: pid,
      provider: 'whatsapp_qr',
    },
    timestamp: now(),
    platformMessageId: pid,
  };

  if (fileUrl) result.fileUrl = fileUrl;
  if (fileName) result.fileName = fileName;
  if (mimeType) result.mimeType = mimeType;
  if (mediaType) result.mediaType = mediaType;

  return result;
}

/* ===== orchestrator ===== */
export function normalizeIncomingMessage(
  body: unknown,
  merchantId: string,
): NormalizedMessage {
  const base: Record<string, unknown> = isRecord(body) ? body : {};

  return (
    parseTelegram(base, merchantId) ||
    parseWhatsappCloud(base, merchantId) ||
    parseWhatsappQrNew(base, merchantId) ||
    parseWhatsappQrOld(base, merchantId) ||
    (() => {
      const result: NormalizedMessage = {
        merchantId,
        sessionId: '',
        channel: 'webchat',
        text: '',
        role: 'customer',
        metadata: baseMeta(base),
        timestamp: now(),
        platformMessageId: `${Date.now()}`,
      };
      return result;
    })()
  );
}
