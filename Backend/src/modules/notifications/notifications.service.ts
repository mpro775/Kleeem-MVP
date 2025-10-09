// src/modules/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { UsersService } from '../users/users.service';

import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';

import type { FilterQuery, UpdateQuery } from 'mongoose';

/** ثوابت لتجنّب الأرقام/النصوص السحرية */
const DEFAULT_PAGE = 1 as const;
const DEFAULT_LIMIT = 20 as const;
const ORDER_DESC = -1 as const;
const EVENT_NOTIFY_USER = 'notify.user' as const;
const EVENT_NOTIFY_MERCHANT = 'notify.merchant' as const;
const EVENT_ADMIN_COMPAT = 'admin:notification' as const;
const DEFAULT_SEVERITY = 'info' as const;

type Severity = 'info' | 'success' | 'warning' | 'error';

type NotifyInput = {
  userId: string;
  merchantId?: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  severity?: Severity;
};

type ListOptions = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
};

type ListResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

type Prefs = {
  channels?: {
    inApp?: boolean;
    email?: boolean;
  };
};

type NotificationPayload = {
  id: string;
  userId: string;
  merchantId?: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  severity: Severity;
  ts: number;
};

/** حارس نوع لتفضيلات المستخدم */
function isPrefs(v: unknown): v is Prefs {
  if (v === null || typeof v !== 'object') return false;
  const ch = (v as { channels?: unknown }).channels;
  if (ch === undefined) return true;
  if (typeof ch !== 'object' || ch === null) return false;
  const c = ch as { inApp?: unknown; email?: unknown };
  return (
    (c.inApp === undefined || typeof c.inApp === 'boolean') &&
    (c.email === undefined || typeof c.email === 'boolean')
  );
}

/** يحوّل قيمة نصية إلى ObjectId بشكل آمن */
function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

/** يبني حمولة الإشعار الموحدة */
function buildPayload(
  doc: NotificationDocument,
  userId: Types.ObjectId,
  input: Omit<NotifyInput, 'userId'>,
): NotificationPayload {
  const payload: NotificationPayload = {
    id: doc._id.toString(),
    userId: userId.toString(),
    type: input.type,
    title: input.title,
    severity: input.severity ?? DEFAULT_SEVERITY,
    ts: Date.now(),
  };

  if (input.merchantId !== undefined) {
    payload.merchantId = input.merchantId;
  }

  if (input.body !== undefined) {
    payload.body = input.body;
  }

  if (input.data !== undefined) {
    payload.data = input.data;
  }

  return payload;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notifModel: Model<NotificationDocument>,
    private readonly users: UsersService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * ينشئ إشعار In-App دائمًا، ويَبثّ حيًا حسب تفضيلات المستخدم،
   * ويرسل بريدًا إن كان مُفعّلًا.
   */
  async notifyUser(
    userId: string,
    input: Omit<NotifyInput, 'userId'> & { userId?: string },
  ): Promise<NotificationDocument> {
    const uid = this._resolveUserId(userId, input);
    const prefs = await this._getUserPreferences(uid);
    const doc = await this._createNotificationDocument(uid, input);
    const payload = buildPayload(doc, uid, input);

    this._emitEvents(payload, input, prefs);

    return doc;
  }

  private _resolveUserId(
    userId: string,
    input: Omit<NotifyInput, 'userId'> & { userId?: string },
  ): Types.ObjectId {
    const resolvedUserId = userId || input.userId || '';
    return toObjectId(resolvedUserId);
  }

  private async _getUserPreferences(
    uid: Types.ObjectId,
  ): Promise<Prefs | null> {
    const rawPrefs = (await this.users
      .getNotificationsPrefs(uid.toString())
      .catch(() => null)) as unknown as Prefs | null;
    return isPrefs(rawPrefs) ? rawPrefs : null;
  }

  private async _createNotificationDocument(
    uid: Types.ObjectId,
    input: Omit<NotifyInput, 'userId'> & { userId?: string },
  ): Promise<NotificationDocument> {
    return this.notifModel.create({
      userId: uid,
      merchantId: input.merchantId ? toObjectId(input.merchantId) : undefined,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      severity: input.severity ?? DEFAULT_SEVERITY,
    });
  }

  private _emitEvents(
    payload: NotificationPayload,
    input: Omit<NotifyInput, 'userId'> & { userId?: string },
    prefs: Prefs | null,
  ): void {
    const inAppEnabled = prefs?.channels?.inApp !== false;

    if (inAppEnabled) {
      this.events.emit(EVENT_NOTIFY_USER, payload);
    }

    if (input.merchantId) {
      this.events.emit(EVENT_NOTIFY_MERCHANT, {
        ...payload,
        merchantId: input.merchantId,
      });
    }

    // (توافقية) قناة الأدمن القديمة
    this.events.emit(EVENT_ADMIN_COMPAT, {
      type: input.type,
      title: input.title,
      body: input.body,
      severity: input.severity ?? DEFAULT_SEVERITY,
      userId: payload.userId,
      merchantId: input.merchantId,
      ts: payload.ts,
    });
  }

  /** يعيد قائمة إشعارات المستخدم مع ترقيم الصفحات */
  async listForUser(
    userId: string,
    {
      page = DEFAULT_PAGE,
      limit = DEFAULT_LIMIT,
      unreadOnly = false,
    }: ListOptions = {},
  ): Promise<ListResult<Notification>> {
    const baseFilter: FilterQuery<NotificationDocument> = {
      userId: toObjectId(userId),
    };
    const filter: FilterQuery<NotificationDocument> = unreadOnly
      ? { ...baseFilter, read: false }
      : baseFilter;

    const docs = await this.notifModel
      .find(filter)
      .sort({ createdAt: ORDER_DESC })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await this.notifModel.countDocuments(filter);

    return { items: docs as unknown as Notification[], total, page, limit };
  }

  /** وضع إشارة مقروء لإشعار واحد */
  async markRead(userId: string, notifId: string): Promise<{ ok: true }> {
    const filter: FilterQuery<NotificationDocument> = {
      _id: toObjectId(notifId),
      userId: toObjectId(userId),
    };
    const update: UpdateQuery<NotificationDocument> = {
      $set: { read: true, readAt: new Date() },
    };

    await this.notifModel.updateOne(filter, update);
    return { ok: true };
  }

  /** وضع إشارة مقروء لجميع الإشعارات غير المقروءة للمستخدم */
  async markAllRead(userId: string): Promise<{ ok: true }> {
    const filter: FilterQuery<NotificationDocument> = {
      userId: toObjectId(userId),
      read: false,
    };
    const update: UpdateQuery<NotificationDocument> = {
      $set: { read: true, readAt: new Date() },
    };

    await this.notifModel.updateMany(filter, update);
    return { ok: true };
  }
}
