// src/modules/webhooks/utils/normalize-incoming.ts

type NormalizedMessage = {
  merchantId: string;
  sessionId: string;
  channel: string;
  text: string;
  role: 'customer' | 'agent' | 'bot';
  metadata: any;
  timestamp: Date;
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
  let channel = 'unknown';
  let from = '';
  let text = '';
  let fileUrl: string | undefined;
  let fileId: string | undefined;
  let fileName: string | undefined;
  let mimeType: string | undefined;
  let mediaType: NormalizedMessage['mediaType'];
  let role: 'customer' | 'agent' | 'bot' = 'customer';
  const metadata = body.metadata || {};
  const timestamp = new Date();

  // ---------- Telegram ----------
  if (body.message?.chat?.id) {
    channel = 'telegram';
    from = body.message.chat.id;
    text = body.message.text;

    if (body.message.photo) {
      const photoArray = body.message.photo;
      fileId = photoArray[photoArray.length - 1]?.file_id;
      mediaType = 'image';
    } else if (body.message.voice) {
      fileId = body.message.voice.file_id;
      mimeType = body.message.voice.mime_type;
      mediaType = 'audio';
    } else if (body.message.document) {
      fileId = body.message.document.file_id;
      fileName = body.message.document.file_name;
      mimeType = body.message.document.mime_type;
      if (mimeType?.includes('pdf') || fileName?.endsWith('.pdf')) {
        mediaType = 'pdf';
      } else if (mimeType?.includes('image')) {
        mediaType = 'image';
      } else if (mimeType?.includes('audio')) {
        mediaType = 'audio';
      } else {
        mediaType = 'document';
      }
    }
  }
  // ---------- WhatsApp ----------
  else if (body.data?.key?.remoteJid) {
    channel = 'whatsapp';
    from = body.data.key.remoteJid.replace('@s.whatsapp.net', '');
    text = body.data.message?.conversation || '';

    if (body.data.message?.imageMessage) {
      fileUrl = body.data.message.imageMessage.url;
      mimeType = body.data.message.imageMessage.mimetype;
      mediaType = 'image';
      fileName = body.data.message.imageMessage.fileName;
    } else if (body.data.message?.audioMessage) {
      fileUrl = body.data.message.audioMessage.url;
      mimeType = body.data.message.audioMessage.mimetype;
      mediaType = 'audio';
      fileName = body.data.message.audioMessage.fileName;
    } else if (body.data.message?.documentMessage) {
      fileUrl = body.data.message.documentMessage.url;
      mimeType = body.data.message.documentMessage.mimetype;
      fileName = body.data.message.documentMessage.fileName;
      if (mimeType?.includes('pdf') || fileName?.endsWith('.pdf')) {
        mediaType = 'pdf';
      } else if (mimeType?.includes('image')) {
        mediaType = 'image';
      } else if (mimeType?.includes('audio')) {
        mediaType = 'audio';
      } else {
        mediaType = 'document';
      }
    }
  }
  // ---------- Webchat ----------
  else if (body.channel === 'webchat' || body.fromWebchat) {
    channel = 'webchat';
    from = body.from;
    text = body.text;
    if (body.fileUrl) {
      fileUrl = body.fileUrl;
      fileName = body.fileName;
      mimeType = body.mimeType;
      if (mimeType?.includes('image')) mediaType = 'image';
      else if (mimeType?.includes('audio')) mediaType = 'audio';
      else if (mimeType?.includes('pdf')) mediaType = 'pdf';
      else mediaType = 'document';
    }
  }

  if (body.role === 'agent' || body.sentBy === 'agent') role = 'agent';

  return {
    merchantId,
    sessionId: from,
    channel,
    text,
    role,
    metadata,
    timestamp,
    fileUrl,
    fileId,
    fileName,
    mimeType,
    mediaType,
  };
}
