export type NormalizedMessage = {
  merchantId: string;
  sessionId: string; // chat_id أو رقم العميل
  channel: 'whatsapp' | 'telegram' | 'webchat';
  transport?: 'api' | 'qr'; // للواتساب فقط
  text: string;
  role: 'customer' | 'agent' | 'bot';
  metadata: Record<string, any>;
  timestamp: Date;

  platformMessageId: string; // مهم لمنع التكرار

  fileId?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  mediaType?: 'image' | 'audio' | 'video' | 'pdf' | 'document' | 'other';
};

export function normalizeIncomingMessage(
  body: any,
  merchantId: string,
): NormalizedMessage {
  let channel: NormalizedMessage['channel'] = 'webchat';
  let transport: NormalizedMessage['transport'] | undefined;
  let sessionId = '';
  let text = '';
  let role: NormalizedMessage['role'] = 'customer';
  let platformMessageId = '';

  let fileUrl: string | undefined;
  let fileId: string | undefined;
  let fileName: string | undefined;
  let mimeType: string | undefined;
  let mediaType: NormalizedMessage['mediaType'] | undefined;

  const metadata: Record<string, any> = { ...(body?.metadata ?? {}) };
  const timestamp = new Date();

  // تمرير channelId/provider لو مسارك الجديد يرسلهم
  if (body?.channelId) metadata.channelId = body.channelId;
  if (body?.provider) metadata.provider = body.provider;

  // -----------------------------------
  // Telegram
  // -----------------------------------
  if (body?.update_id && body?.message?.chat?.id) {
    const m = body.message;
    channel = 'telegram';
    sessionId = String(m.chat.id);
    text = m.text ?? m.caption ?? '';
    platformMessageId = String(m.message_id);

    if (m.photo?.length) {
      const last = m.photo[m.photo.length - 1];
      fileId = last.file_id;
      mediaType = 'image';
    } else if (m.voice) {
      fileId = m.voice.file_id;
      mimeType = m.voice.mime_type;
      mediaType = 'audio';
    } else if (m.document) {
      fileId = m.document.file_id;
      fileName = m.document.file_name;
      mimeType = m.document.mime_type;
      mediaType = inferMediaType(mimeType, fileName);
    }

    if (body.role === 'agent' || body.sentBy === 'agent') role = 'agent';

    return {
      merchantId,
      sessionId,
      channel,
      transport,
      text,
      role,
      metadata: {
        ...metadata,
        from: m.from,
        entities: m.entities,
        sourceMessageId: platformMessageId,
        provider: 'telegram',
      },
      timestamp,
      platformMessageId,
      fileUrl,
      fileId,
      fileName,
      mimeType,
      mediaType,
    };
  }

  // -----------------------------------
  // WhatsApp Cloud API (Meta)
  // entry[0].changes[0].value.messages[0]
  // -----------------------------------
  const wEntry = body?.entry?.[0];
  const wValue = wEntry?.changes?.[0]?.value;
  const wMsg = wValue?.messages?.[0];
  if (body?.object === 'whatsapp_business_account' || wMsg) {
    channel = 'whatsapp';
    transport = 'api';

    const from = wMsg?.from || wValue?.contacts?.[0]?.wa_id || '';
    sessionId = from;

    text =
      wMsg?.text?.body ??
      wMsg?.button?.text ??
      wMsg?.interactive?.list_reply?.title ??
      wMsg?.interactive?.button_reply?.title ??
      '';

    platformMessageId = wMsg?.id || `${from}:${Date.now()}`;

    const type = wMsg?.type;
    if (type === 'image') {
      fileId = wMsg?.image?.id;
      mediaType = 'image';
      mimeType = wMsg?.image?.mime_type;
    } else if (type === 'audio') {
      fileId = wMsg?.audio?.id;
      mediaType = 'audio';
      mimeType = wMsg?.audio?.mime_type;
    } else if (type === 'document') {
      fileId = wMsg?.document?.id;
      fileName = wMsg?.document?.filename;
      mimeType = wMsg?.document?.mime_type;
      mediaType = inferMediaType(mimeType, fileName);
    } else if (type === 'video') {
      fileId = wMsg?.video?.id;
      mimeType = wMsg?.video?.mime_type;
      mediaType = 'video';
    }

    if (body.role === 'agent' || body.sentBy === 'agent') role = 'agent';

    return {
      merchantId,
      sessionId,
      channel,
      transport,
      text,
      role,
      metadata: {
        ...metadata,
        value: wValue,
        type,
        sourceMessageId: platformMessageId,
        provider: 'whatsapp_cloud',
      },
      timestamp,
      platformMessageId,
      fileUrl,
      fileId,
      fileName,
      mimeType,
      mediaType,
    };
  }

  // -----------------------------------
  // WhatsApp QR (Evolution) – شكل حديث (messages[])
  // -----------------------------------
  if (Array.isArray(body?.data?.messages) && body.data.messages.length > 0) {
    const m = body.data.messages[0];
    const sessionId = m?.key?.remoteJid
      ? cleanJid(m.key.remoteJid)
      : m?.key?.participant
        ? cleanJid(m.key.participant)
        : body?.from || '';

    const text =
      m?.message?.conversation ??
      m?.message?.extendedTextMessage?.text ??
      m?.message?.imageMessage?.caption ??
      '';

    const platformMessageId = m?.key?.id || `${sessionId}:${Date.now()}`;

    let mediaType, mimeType, fileName;
    const metadata: Record<string, any> = {
      ...(body?.metadata ?? {}),
      sourceMessageId: platformMessageId,
      provider: 'whatsapp_qr',
    };

    if (m?.message?.imageMessage) {
      mediaType = 'image';
      mimeType = m.message.imageMessage.mimetype;
      fileName = m.message.imageMessage.fileName;
      metadata.base64 = m.message.imageMessage?.base64;
    } else if (m?.message?.audioMessage) {
      mediaType = 'audio';
      mimeType = m.message.audioMessage.mimetype;
      fileName = m.message.audioMessage.fileName;
      metadata.base64 = m.message.audioMessage?.base64;
    } else if (m?.message?.documentMessage) {
      mimeType = m.message.documentMessage.mimetype;
      fileName = m.message.documentMessage.fileName;
      mediaType = inferMediaType(mimeType, fileName);
      metadata.base64 = m.message.documentMessage?.base64;
    }

    return {
      merchantId,
      sessionId,
      channel: 'whatsapp',
      transport: 'qr',
      text,
      role:
        body.role === 'agent' || body.sentBy === 'agent' ? 'agent' : 'customer',
      metadata,
      timestamp: new Date(),
      platformMessageId,
      fileUrl: undefined,
      fileId: undefined,
      fileName,
      mimeType,
      mediaType,
    };
  }

  // -----------------------------------
  // WhatsApp QR (Evolution) – الشكل الأقدم body.data.key.remoteJid
  // -----------------------------------
  if (body?.data?.key?.remoteJid) {
    channel = 'whatsapp';
    transport = 'qr';

    sessionId = cleanJid(body.data.key.remoteJid);
    text =
      body.data.message?.conversation ??
      body.data.message?.extendedTextMessage?.text ??
      body.data.message?.imageMessage?.caption ??
      '';

    platformMessageId = body.data.key?.id || `${sessionId}:${Date.now()}`;

    if (body.data.message?.imageMessage) {
      mediaType = 'image';
      fileUrl = body.data.message.imageMessage.url;
      mimeType = body.data.message.imageMessage.mimetype;
      fileName = body.data.message.imageMessage.fileName;
    } else if (body.data.message?.audioMessage) {
      mediaType = 'audio';
      fileUrl = body.data.message.audioMessage.url;
      mimeType = body.data.message.audioMessage.mimetype;
      fileName = body.data.message.audioMessage.fileName;
    } else if (body.data.message?.documentMessage) {
      mimeType = body.data.message.documentMessage.mimetype;
      fileUrl = body.data.message.documentMessage.url;
      fileName = body.data.message.documentMessage.fileName;
      mediaType = inferMediaType(mimeType, fileName);
    }

    if (body.role === 'agent' || body.sentBy === 'agent') role = 'agent';

    return {
      merchantId,
      sessionId,
      channel,
      transport,
      text,
      role,
      metadata: {
        ...metadata,
        sourceMessageId: platformMessageId,
        provider: 'whatsapp_qr',
      },
      timestamp,
      platformMessageId,
      fileUrl,
      fileId,
      fileName,
      mimeType,
      mediaType,
    };
  }

  // -----------------------------------
  // WebChat
  // -----------------------------------
  if (body?.channel === 'webchat' || body?.fromWebchat) {
    channel = 'webchat';
    sessionId = String(body?.from || body?.sessionId || '');
    text = body?.text || '';

    if (body?.fileUrl) {
      fileUrl = body.fileUrl;
      fileName = body.fileName;
      mimeType = body.mimeType;
      mediaType = inferMediaType(mimeType, fileName);
    }

    if (body.role === 'agent' || body.sentBy === 'agent') role = 'agent';

    platformMessageId = body?.msgId || `${sessionId}:${Date.now()}`;

    return {
      merchantId,
      sessionId,
      channel,
      transport,
      text,
      role,
      metadata: {
        ...(body?.metadata ?? {}),
        sourceMessageId: platformMessageId,
        provider: 'webchat',
      },
      timestamp,
      platformMessageId,
      fileUrl,
      fileId,
      fileName,
      mimeType,
      mediaType,
    };
  }

  // افتراضي
  return {
    merchantId,
    sessionId: sessionId || '',
    channel,
    transport,
    text,
    role,
    metadata,
    timestamp,
    platformMessageId: platformMessageId || `${Date.now()}`,
    fileUrl,
    fileId,
    fileName,
    mimeType,
    mediaType,
  };
}

// --------- Helpers ---------
function cleanJid(jid: string): string {
  return jid?.replace('@s.whatsapp.net', '')?.replace('@g.us', '') ?? '';
}

function inferMediaType(
  mime?: string,
  name?: string,
): NormalizedMessage['mediaType'] {
  if (!mime && !name) return 'document';
  const n = (name || '').toLowerCase();
  const m = (mime || '').toLowerCase();
  if (m.includes('pdf') || n.endsWith('.pdf')) return 'pdf';
  if (m.includes('image') || /\.(png|jpg|jpeg|webp|gif)$/i.test(n))
    return 'image';
  if (m.includes('audio') || /\.(mp3|ogg|wav|m4a)$/i.test(n)) return 'audio';
  if (m.includes('video') || /\.(mp4|mov|mkv|webm)$/i.test(n)) return 'video';
  return 'document';
}
