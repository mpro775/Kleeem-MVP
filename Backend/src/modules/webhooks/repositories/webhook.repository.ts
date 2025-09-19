import { Types } from 'mongoose';
import { Webhook } from '../schemas/webhook.schema';

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
