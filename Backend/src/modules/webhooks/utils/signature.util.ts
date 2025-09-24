// src/modules/webhooks/utils/signature.util.ts
import { createHmac, timingSafeEqual } from 'crypto';

import { decryptSecret } from '../../channels/utils/secrets.util';

import type { ChannelRepository } from '../repositories/channel.repository';
import type { Request } from 'express';

export async function verifyMetaSignature(
  merchantId: string,
  req: Request & { rawBody?: Buffer },
  channelsRepo: ChannelRepository,
): Promise<boolean> {
  const sig = req.headers['x-hub-signature-256'];
  if (typeof sig !== 'string' || !sig.startsWith('sha256=')) return false;

  const ch = await channelsRepo.findDefaultWaCloudWithAppSecret(merchantId);
  const appSecretEnc = (ch as unknown as { appSecretEnc?: string })
    ?.appSecretEnc;
  const appSecret = appSecretEnc ? decryptSecret(appSecretEnc) : undefined;
  if (!appSecret || !req.rawBody || !Buffer.isBuffer(req.rawBody)) return false;

  const theirs = Buffer.from(sig.split('=')[1] ?? '', 'hex');
  const ours = createHmac('sha256', appSecret).update(req.rawBody).digest();
  return theirs.length === ours.length && timingSafeEqual(theirs, ours);
}
