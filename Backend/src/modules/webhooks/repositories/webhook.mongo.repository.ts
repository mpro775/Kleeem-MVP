import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';

import { Webhook, WebhookDocument } from '../schemas/webhook.schema';

import { WebhookEntity, WebhookRepository } from './webhook.repository';

@Injectable()
export class WebhookMongoRepository implements WebhookRepository {
  constructor(
    @InjectModel(Webhook.name)
    private readonly model: Model<WebhookDocument>,
  ) {}

  async createOne(
    data: Pick<WebhookEntity, 'eventType' | 'payload' | 'receivedAt'>,
    opts?: { session?: ClientSession },
  ): Promise<WebhookEntity> {
    const [doc] = await this.model.create([data as unknown as WebhookEntity], {
      session: opts?.session,
    });
    return doc.toObject() as unknown as WebhookEntity;
  }
}
