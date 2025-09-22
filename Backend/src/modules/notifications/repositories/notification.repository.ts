import type { Notification } from '../schemas/notification.schema';
import type { Types } from 'mongoose';

export type Severity = 'info' | 'success' | 'warning' | 'error';

export type NotificationEntity = Notification & {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  merchantId?: Types.ObjectId;
  read?: boolean;
  readAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface NotificationCreateInput {
  userId: string; // as string; repo will cast to ObjectId
  merchantId?: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  severity?: Severity;
}

export interface NotificationRepository {
  create(input: NotificationCreateInput): Promise<NotificationEntity>;

  listForUser(
    userId: string,
    opts: { page: number; limit: number; unreadOnly?: boolean },
  ): Promise<{
    items: NotificationEntity[];
    total: number;
    page: number;
    limit: number;
  }>;

  markRead(userId: string, notifId: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
}
