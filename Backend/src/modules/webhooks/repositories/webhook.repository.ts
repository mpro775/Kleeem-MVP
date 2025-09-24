import type { Webhook } from '../schemas/webhook.schema';
import type { ClientSession, Types } from 'mongoose';

export type WebhookEntity = Webhook & {
  _id: Types.ObjectId;
  eventType: string;
  payload: string;
  receivedAt: Date;
};

export interface WebhookRepository {
  createOne(
    data: Pick<WebhookEntity, 'eventType' | 'payload' | 'receivedAt'>,
    opts?: { session?: ClientSession },
  ): Promise<WebhookEntity>;
}
