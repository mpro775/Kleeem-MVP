// src/modules/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';
import { UsersService } from '../users/users.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

type NotifyInput = {
  userId: string;
  merchantId?: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  severity?: 'info' | 'success' | 'warning' | 'error';
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notifModel: Model<NotificationDocument>,
    private readonly users: UsersService,
    private events: EventEmitter2,
  ) {}

  async notifyUser(
    userId: string,
    input: Omit<NotifyInput, 'userId'> & { userId?: string },
  ) {
    const uid = new Types.ObjectId(userId ?? input.userId!);

    // 1) تفضيلات المستخدم
    const prefs = await this.users
      .getNotificationsPrefs(uid.toString())
      .catch(() => null);

    const inAppEnabled = prefs?.channels?.inApp !== false;
    const emailEnabled = prefs?.channels?.email === true;

    // 2) أنشئ In-App دائمًا (ونسجّل القراءة لاحقًا)
    const doc = await this.notifModel.create({
      userId: uid,
      merchantId: input.merchantId
        ? new Types.ObjectId(input.merchantId)
        : undefined,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      severity: input.severity ?? 'info',
    });

    // 3) بثّ فوري
    const payload = {
      id: doc._id.toString(),
      userId: uid.toString(),
      merchantId: input.merchantId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      severity: (input.severity ?? 'info') as
        | 'info'
        | 'success'
        | 'warning'
        | 'error',
      ts: Date.now(),
    };

    // إلى المستخدم نفسه
    if (inAppEnabled) {
      this.events.emit('notify.user', payload);
    }

    // (اختياري) إلى كل مستخدمي لوحة هذا التاجر (لو يهمّك بثّ عام داخل التاجر)
    if (input.merchantId) {
      this.events.emit('notify.merchant', {
        ...payload,
        merchantId: input.merchantId,
      });
    }

    // (توافقية) قناة الأدمن القديمة
    this.events.emit('admin:notification', {
      type: input.type,
      title: input.title,
      body: input.body,
      severity: input.severity ?? 'info',
      userId: uid.toString(),
      merchantId: input.merchantId,
      ts: payload.ts,
    });

    // 4) بريد (اختياري)
    if (emailEnabled) {
      // await this.mail.send(userEmail, input.title, input.body ?? '');
    }

    return doc;
  }

  async listForUser(
    userId: string,
    { page = 1, limit = 20, unreadOnly = false } = {},
  ) {
    const q: any = { userId: new Types.ObjectId(userId) };
    if (unreadOnly) q.read = false;

    const docs = await this.notifModel
      .find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await this.notifModel.countDocuments(q);
    return { items: docs, total, page, limit };
  }

  async markRead(userId: string, notifId: string) {
    await this.notifModel.updateOne(
      { _id: notifId, userId: new Types.ObjectId(userId) },
      { $set: { read: true, readAt: new Date() } },
    );
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.notifModel.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { $set: { read: true, readAt: new Date() } },
    );
    return { ok: true };
  }
}
