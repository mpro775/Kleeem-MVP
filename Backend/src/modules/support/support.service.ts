import { createReadStream } from 'fs';
import { unlink } from 'node:fs/promises';

import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  Logger,
  Inject,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';

import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { toCsv } from '../../common/utils/csv.utils';
import {
  SupportRepository,
  SupportTicketEntity,
  ListAllAdminParams,
} from './repositories/support.repository';
import { SUPPORT_REPOSITORY } from './tokens';
import { S3_CLIENT_TOKEN } from '../../common/storage/s3-client.provider';
import type { TicketStatus } from './support.enums';

// ثوابت لتجنب الأرقام السحرية
const BASE_36 = 36;
const RANDOM_MAX = 999;
const MAX_FILENAME_LENGTH = 180;
const PRESIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

// أنواع للـ attachments
interface Attachment {
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  storage: 's3';
  url: string;
}

// نوع للـ reCAPTCHA response
interface RecaptchaResponse {
  success: boolean;
}

// نوع موسع للـ CreateContactDto مع الحقول الإضافية
interface ExtendedCreateContactDto extends CreateContactDto {
  website?: string;
  recaptchaToken?: string;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @Inject(SUPPORT_REPOSITORY)
    private readonly repo: SupportRepository,
    private readonly http: HttpService,
    @Inject(S3_CLIENT_TOKEN) private readonly s3: S3Client,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) { }

  private generateTicketNumber() {
    const a = Date.now().toString(BASE_36).toUpperCase();
    const b = Math.floor(Math.random() * RANDOM_MAX)
      .toString()
      .padStart(3, '0');
    return `KT-${a}-${b}`;
  }

  private sanitizeName(name: string) {
    return (name || 'file')
      .replace(/[^\w.-]/g, '_')
      .slice(0, MAX_FILENAME_LENGTH);
  }

  private async publicOrSignedUrl(bucket: string, key: string) {
    const cdn = (process.env.ASSETS_CDN_BASE_URL || '').replace(/\/+$/, '');
    const endpoint = (
      process.env.AWS_ENDPOINT ||
      process.env.MINIO_PUBLIC_URL ||
      ''
    ).replace(/\/+$/, '');
    // For R2 public buckets (CDN), bucket is implied by the domain
    if (cdn) return `${cdn}/${key}`;
    if (endpoint) return `${endpoint}/${bucket}/${key}`;
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: PRESIGNED_URL_EXPIRY },
    );
  }

  async verifyRecaptcha(token?: string): Promise<boolean> {
    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) return true;
    if (!token) return false;
    try {
      const url = 'https://www.google.com/recaptcha/api/siteverify';
      const { data } = await firstValueFrom(
        this.http.post<RecaptchaResponse>(url, null, {
          params: { secret, response: token },
        }),
      );
      return !!data?.success;
    } catch {
      this.logger.warn('reCAPTCHA verification failed');
      return false;
    }
  }

  async notifyChannels(
    ticket: Pick<
      SupportTicketEntity,
      | '_id'
      | 'ticketNumber'
      | 'name'
      | 'email'
      | 'phone'
      | 'topic'
      | 'subject'
      | 'message'
      | 'status'
    > & { createdAt?: Date },
  ): Promise<void> {
    const title = `🎫 New Ticket: ${ticket.ticketNumber}`;
    const text = [
      `*Name:* ${ticket.name}`,
      `*Email:* ${ticket.email}`,
      ticket.phone ? `*Phone:* ${ticket.phone}` : undefined,
      `*Topic:* ${ticket.topic}`,
      `*Subject:* ${ticket.subject}`,
      `*Message:* ${ticket.message.substring(0, 500)}${ticket.message.length > 500 ? '…' : ''}`,
    ]
      .filter(Boolean)
      .join('\n');

    if (process.env.SUPPORT_SLACK_WEBHOOK_URL) {
      try {
        await firstValueFrom(
          this.http.post(process.env.SUPPORT_SLACK_WEBHOOK_URL, {
            text: `${title}\n${text}`,
          }),
        );
      } catch {
        this.logger.warn('Slack notify failed');
      }
    }

    if (
      process.env.SUPPORT_TELEGRAM_BOT_TOKEN &&
      process.env.SUPPORT_TELEGRAM_CHAT_ID
    ) {
      try {
        const url = `https://api.telegram.org/bot${process.env.SUPPORT_TELEGRAM_BOT_TOKEN}/sendMessage`;
        await firstValueFrom(
          this.http.post(url, {
            chat_id: process.env.SUPPORT_TELEGRAM_CHAT_ID,
            text: `${title}\n${text}`,
            parse_mode: 'Markdown',
          }),
        );
      } catch {
        this.logger.warn('Telegram notify failed');
      }
    }

    if (process.env.SUPPORT_N8N_WEBHOOK_URL) {
      try {
        await firstValueFrom(
          this.http.post(process.env.SUPPORT_N8N_WEBHOOK_URL, {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
            name: ticket.name,
            email: ticket.email,
            phone: ticket.phone,
            topic: ticket.topic,
            subject: ticket.subject,
            message: ticket.message,
            status: ticket.status,
            createdAt: ticket.createdAt || new Date(),
          }),
        );
      } catch {
        this.logger.warn('n8n notify failed');
      }
    }
  }

  private async uploadFilesToS3(
    ticketNumber: string,
    files: Express.Multer.File[],
  ) {
    const bucket =
      process.env.S3_BUCKET_NAME || process.env.MINIO_BUCKET || '';
    if (!bucket) {
      throw new InternalServerErrorException('S3_BUCKET_NAME not configured');
    }

    const attachments: Attachment[] = [];
    for (const f of files) {
      const safe = this.sanitizeName(f.originalname || 'file');
      const key = `support/${ticketNumber}/${Date.now()}-${safe}`;

      try {
        if (f.buffer && f.buffer.length) {
          await this.s3.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: key,
              Body: f.buffer,
              ContentType: f.mimetype,
              CacheControl: 'private, max-age=0, no-store',
            }),
          );
        } else if ((f as Express.Multer.File & { path?: string }).path) {
          const filePath = (f as Express.Multer.File & { path?: string }).path;
          await this.s3.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: key,
              Body: createReadStream(filePath),
              ContentType: f.mimetype,
              CacheControl: 'private, max-age=0, no-store',
            }),
          );
        } else {
          throw new Error('Empty file');
        }

        const url = await this.publicOrSignedUrl(bucket, key);
        attachments.push({
          originalName: f.originalname,
          filename: safe,
          mimeType: f.mimetype,
          size: f.size,
          storage: 's3' as const,
          url,
        });
      } catch (e) {
        this.logger.error(`Failed to upload support attachment: ${safe}`, e);
        throw new InternalServerErrorException('SUPPORT_UPLOAD_FAILED');
      } finally {
        const filePath = (f as Express.Multer.File & { path?: string }).path;
        if (filePath) {
          await unlink(filePath).catch(() => null);
        }
      }
    }
    return attachments;
  }

  private async validateContactDto(
    dto: CreateContactDto,
    meta?: { source?: 'landing' | 'merchant' },
  ): Promise<void> {
    const extendedDto = dto as ExtendedCreateContactDto;
    if (extendedDto.website) throw new BadRequestException('Spam detected');

    // تخطي reCAPTCHA للطلبات من لوحة التاجر (المستخدم مصادق عليه)
    if (meta?.source === 'merchant') return;

    const ok = await this.verifyRecaptcha(extendedDto.recaptchaToken);
    if (!ok) throw new BadRequestException('reCAPTCHA failed');
  }

  private async prepareTicketData(
    dto: CreateContactDto,
    files: Express.Multer.File[],
    meta?: {
      ip?: string;
      userAgent?: string;
      merchantId?: string;
      userId?: string;
      source?: 'landing' | 'merchant';
    },
  ): Promise<Partial<SupportTicketEntity>> {
    const ticketNumber = this.generateTicketNumber();
    const attachments = await this.uploadFilesToS3(ticketNumber, files);

    const result: Partial<SupportTicketEntity> = {
      ...(dto as Partial<SupportTicketEntity>),
      ticketNumber,
      status: 'open',
      source: meta?.source || 'landing',
      ip: meta?.ip || '',
      attachments,
    };

    if (meta?.userAgent) result.userAgent = meta.userAgent;
    if (meta?.merchantId)
      result.merchantId = new Types.ObjectId(meta.merchantId);
    if (meta?.userId) result.createdBy = new Types.ObjectId(meta.userId);

    return result;
  }

  private async notifyTicketCreation(
    created: SupportTicketEntity,
  ): Promise<void> {
    await this.notifyChannels(
      created as Pick<
        SupportTicketEntity,
        | '_id'
        | 'ticketNumber'
        | 'name'
        | 'email'
        | 'phone'
        | 'topic'
        | 'subject'
        | 'message'
        | 'status'
      > & { createdAt?: Date },
    ).catch(() => undefined);
  }

  async create(
    dto: CreateContactDto,
    files: Express.Multer.File[] = [],
    meta?: {
      ip?: string;
      userAgent?: string;
      merchantId?: string;
      userId?: string;
      source?: 'landing' | 'merchant';
    },
  ): Promise<SupportTicketEntity> {
    await this.validateContactDto(dto, meta);
    const ticketData = await this.prepareTicketData(dto, files, meta);
    const created = await this.repo.create(ticketData);
    await this.notifyTicketCreation(created);
    return created;
  }

  /** د.3: إحصائيات التذاكر */
  async getStatsAdmin(): Promise<{
    byStatus: Record<string, number>;
    total: number;
    avgResolutionHours?: number;
  }> {
    return this.repo.statsAdmin?.() ?? {
      byStatus: {},
      total: 0,
    };
  }

  /** قائمة التذاكر للأدمن مع فلترة وترقيم */
  async listAllAdmin(
    params: ListAllAdminParams,
  ): Promise<{ items: SupportTicketEntity[]; total: number }> {
    return this.repo.listAllAdmin(params);
  }

  /** جلب تذكرة واحدة (للأدمن) */
  async findOne(id: string): Promise<SupportTicketEntity> {
    const ticket = await this.repo.findById?.(id);
    if (!ticket) throw new NotFoundException('التذكرة غير موجودة');
    return ticket;
  }

  async exportCsv(params: { status?: TicketStatus }): Promise<string> {
    const { items } = await this.listAllAdmin({
      limit: 5000,
      page: 1,
      ...params,
    });
    const headers = [
      'id',
      'ticketNumber',
      'name',
      'email',
      'phone',
      'topic',
      'subject',
      'message',
      'status',
      'source',
      'createdAt',
    ];
    const rows = items.map((t) => [
      (t as { _id?: { toString?: () => string } })._id?.toString?.() ?? '',
      (t as { ticketNumber?: string }).ticketNumber ?? '',
      (t as { name?: string }).name ?? '',
      (t as { email?: string }).email ?? '',
      (t as { phone?: string }).phone ?? '',
      (t as { topic?: string }).topic ?? '',
      (t as { subject?: string }).subject ?? '',
      (t as { message?: string }).message ?? '',
      (t as { status?: string }).status ?? '',
      (t as { source?: string }).source ?? '',
      (t as { createdAt?: Date }).createdAt
        ? new Date((t as { createdAt?: Date }).createdAt!).toISOString()
        : '',
    ]);
    return toCsv(headers, rows);
  }

  /** إشعار صاحب التذكرة عند التحديث أو الرد (د.4) */
  private async notifyTicketUpdated(
    ticket: SupportTicketEntity,
    kind: 'status_change' | 'reply_added',
    detail?: string,
  ): Promise<void> {
    const title =
      kind === 'status_change'
        ? `تحديث على تذكرتك ${ticket.ticketNumber}`
        : `رد جديد على تذكرتك ${ticket.ticketNumber}`;
    const body =
      detail ||
      (kind === 'status_change'
        ? `تم تحديث حالة التذكرة إلى: ${ticket.status}`
        : 'تمت إضافة رد على تذكرتك');

    if (ticket.createdBy) {
      await this.notificationsService
        .notifyUser(ticket.createdBy.toString(), {
          type: 'support_ticket_update',
          title,
          body,
          data: { ticketId: ticket._id?.toString(), ticketNumber: ticket.ticketNumber },
        })
        .catch(() => {});
    } else if (ticket.email) {
      const html = `
        <p>مرحباً ${ticket.name || ''}،</p>
        <p>${body}</p>
        <p>رقم التذكرة: ${ticket.ticketNumber}</p>
      `;
      await this.mailService
        .sendEmail(ticket.email, title, html)
        .catch(() => {});
    }
  }

  /** د.2: إضافة رد على تذكرة */
  async addReplyAdmin(
    id: string,
    body: string,
    authorId: string,
    isInternal = false,
  ): Promise<SupportTicketEntity> {
    const ticket = await this.repo.findById?.(id);
    if (!ticket) throw new NotFoundException('التذكرة غير موجودة');

    const reply = {
      authorId: new Types.ObjectId(authorId),
      body,
      isInternal: !!isInternal,
      createdAt: new Date(),
    };
    const updated = await this.repo.addReply?.(id, reply);
    if (!updated) throw new NotFoundException('التذكرة غير موجودة');

    if (!isInternal) {
      await this.notifyTicketUpdated(
        updated,
        'reply_added',
        `تمت إضافة رد جديد على تذكرتك`,
      );
    }
    return updated;
  }

  /** تحديث حالة التذكرة أو تعيين الموظف (للأدمن) */
  async updateAdmin(
    id: string,
    dto: { status?: TicketStatus; assignedTo?: string | null },
  ): Promise<SupportTicketEntity> {
    const before = await this.repo.findById?.(id);
    const patch: Partial<SupportTicketEntity> = {};
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.assignedTo !== undefined) {
      patch.assignedTo =
        dto.assignedTo != null && dto.assignedTo !== ''
          ? new Types.ObjectId(dto.assignedTo)
          : (null as unknown as Types.ObjectId);
    }
    const updated = await this.repo.updateById?.(id, patch);
    if (!updated) throw new NotFoundException('التذكرة غير موجودة');

    if (dto.status !== undefined && before?.status !== dto.status) {
      await this.notifyTicketUpdated(updated, 'status_change');
    }
    return updated;
  }
}
