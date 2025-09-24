// src/modules/webhooks/utils/replies.util.ts
import axios from 'axios';

import { decryptSecret } from '../../channels/utils/secrets.util';

import type { ChatGateway } from '../../chat/chat.gateway';
import type { EvolutionService } from '../../integrations/evolution.service';
import type { ChannelRepository } from '../repositories/channel.repository';
import type { PublicChannel } from '../types/channels';

function sendToWebchat(
  sessionId: string,
  text: string,
  chatGateway: ChatGateway,
): void {
  chatGateway.sendMessageToSession(sessionId, {
    id: `bot-${Date.now()}`,
    role: 'bot',
    text,
  });
}

async function sendToTelegram(
  merchantId: string,
  sessionId: string,
  text: string,
  channelsRepo: ChannelRepository,
): Promise<void> {
  const c = await channelsRepo.findDefaultWithSecrets(merchantId, 'telegram');
  const tokenEnc = (c as { botTokenEnc?: string })?.botTokenEnc;
  if (!tokenEnc) throw new Error('Telegram not configured');
  const token = decryptSecret(tokenEnc);
  await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: sessionId,
    text,
  });
}

async function sendToWhatsAppCloud(
  merchantId: string,
  sessionId: string,
  text: string,
  channelsRepo: ChannelRepository,
): Promise<boolean> {
  const cloud = await channelsRepo.findDefaultWithSecrets(
    merchantId,
    'whatsapp_cloud',
  );
  if (
    (cloud as { enabled?: boolean })?.enabled &&
    (cloud as { accessTokenEnc?: string })?.accessTokenEnc &&
    (cloud as { phoneNumberId?: string })?.phoneNumberId
  ) {
    const accessToken = decryptSecret(
      (cloud as { accessTokenEnc: string }).accessTokenEnc,
    );
    await axios.post(
      `https://graph.facebook.com/v19.0/${(cloud as { phoneNumberId: string }).phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: sessionId,
        type: 'text',
        text: { body: text },
      },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return true;
  }
  return false;
}

async function sendToWhatsAppQR(
  merchantId: string,
  sessionId: string,
  text: string,
  channelsRepo: ChannelRepository,
  evoService: EvolutionService,
): Promise<boolean> {
  const qr = await channelsRepo.findDefaultWithSecrets(
    merchantId,
    'whatsapp_qr',
  );
  if (
    (qr as { enabled?: boolean })?.enabled &&
    (qr as { sessionId?: string })?.sessionId
  ) {
    await evoService.sendMessage(
      (qr as { sessionId: string }).sessionId,
      sessionId,
      text,
    );
    return true;
  }
  return false;
}

export async function sendReplyToChannel(
  deps: {
    merchantId: string;
    channel: PublicChannel;
    sessionId: string;
    text: string;
  },
  channelsRepo: ChannelRepository,
  chatGateway: ChatGateway,
  evoService: EvolutionService,
): Promise<void> {
  const { merchantId, channel, sessionId, text } = deps;

  if (channel === 'webchat' || channel === 'dashboard-test') {
    sendToWebchat(sessionId, text, chatGateway);
    return;
  }

  if (channel === 'telegram') {
    await sendToTelegram(merchantId, sessionId, text, channelsRepo);
    return;
  }

  // whatsapp (cloud or qr)
  const sentViaCloud = await sendToWhatsAppCloud(
    merchantId,
    sessionId,
    text,
    channelsRepo,
  );
  if (sentViaCloud) return;

  const sentViaQR = await sendToWhatsAppQR(
    merchantId,
    sessionId,
    text,
    channelsRepo,
    evoService,
  );
  if (sentViaQR) return;

  throw new Error('WhatsApp not configured');
}
