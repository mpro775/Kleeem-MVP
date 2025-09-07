/**
 * سكربت ترحيل من Merchant.channels (القديم) إلى مجموعة channels الجديدة.
 * شغّل عبر ts-node بعد تحميل بيئة Nest.
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../modules/merchants/schemas/merchant.schema';
import {
  Channel,
  ChannelDocument,
  ChannelProvider,
  ChannelStatus,
} from '../modules/channels/schemas/channel.schema';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const Merch = app.get<Model<MerchantDocument>>(getModelToken(Merchant.name));
  const Chan = app.get<Model<ChannelDocument>>(getModelToken(Channel.name));

  const merchants = await Merch.find({}).lean();
  for (const m of merchants) {
    const entries = Object.entries((m as any).channels || {});
    if (!entries.length) continue;
    for (const [provider, cfg] of entries) {
      const doc = await Chan.create({
        merchantId: new Types.ObjectId(m.id),
        provider: provider as ChannelProvider,
        enabled: !!(cfg as any).enabled,
        status: (cfg as any).status || ChannelStatus.DISCONNECTED,
        webhookUrl: (cfg as any).webhookUrl,
        accountLabel: (cfg as any).accountLabel,
        phoneNumberId: (cfg as any).phoneNumberId,
        wabaId: (cfg as any).wabaId,
        sessionId: (cfg as any).sessionId,
        instanceId: (cfg as any).instanceId,
        qr: (cfg as any).qr,
        widgetSettings: (cfg as any).widgetSettings || {},
        isDefault: true,
      });
      console.log('Migrated channel:', m._id, provider, doc._id);
    }
  }
  await app.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
