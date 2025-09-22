import type { Webhook } from '../schemas/webhook.schema';
import type { Types } from 'mongoose';

export type WebhookEntity = Webhook & {
  _id: Types.ObjectId;
  eventType: string;
  payload: string;
  receivedAt: Date;
};

export interface WebhookRepository {
  createOne(
    data: Pick<WebhookEntity, 'eventType' | 'payload' | 'receivedAt'>,
    opts?: { session?: any },
  ): Promise<WebhookEntity>;
}
