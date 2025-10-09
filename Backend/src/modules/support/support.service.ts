import { unlink } from 'node:fs/promises';

import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  Logger,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import * as Minio from 'minio';
import { Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';

import { CreateContactDto } from './dto/create-contact.dto';
import {
  SupportRepository,
  SupportTicketEntity,
} from './repositories/support.repository';
import { SUPPORT_REPOSITORY } from './tokens';

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
  storage: 'minio';
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
    @Inject('MINIO_CLIENT') private readonly minio: Minio.Client,
  ) {}

  private generateTicketNumber() {
    const a = Date.now().toString(BASE_36).toUpperCase();
    const b = Math.floor(Math.random() * RANDOM_MAX)
      .toString()
      .padStart(3, '0');
    return `KT-${a}-${b}`;
  }

  private async ensureBucket(bucket: string) {
    const exists = await this.minio.bucketExists(bucket).catch(() => false);
    if (!exists) {
      await this.minio.makeBucket(
        bucket,
        process.env.MINIO_REGION || 'us-east-1',
      );
    }
  }

  private sanitizeName(name: string) {
    return (name || 'file')
      .replace(/[^\w.-]/g, '_')
      .slice(0, MAX_FILENAME_LENGTH);
  }

  private async publicOrSignedUrl(bucket: string, key: string) {
    const cdn = (
      process.env.ASSETS_CDN_BASE_URL ||
      process.env.MINIO_PUBLIC_URL ||
      ''
    ).replace(/\/+$/, '');
    if (cdn) return `${cdn}/${bucket}/${key}`;
    return await this.minio.presignedGetObject(
      bucket,
      key,
      PRESIGNED_URL_EXPIRY,
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

  private async uploadFilesToMinio(
    ticketNumber: string,
    files: Express.Multer.File[],
  ) {
    const bucket = process.env.MINIO_BUCKET!;
    await this.ensureBucket(bucket);

    const attachments: Attachment[] = [];
    for (const f of files) {
      const safe = this.sanitizeName(f.originalname || 'file');
      const key = `support/${ticketNumber}/${Date.now()}-${safe}`;

      try {
        if (f.buffer && f.buffer.length) {
          await this.minio.putObject(bucket, key, f.buffer, f.buffer.length, {
            'Content-Type': f.mimetype,
            'Cache-Control': 'private, max-age=0, no-store',
          });
        } else if ((f as Express.Multer.File & { path?: string }).path) {
          await this.minio.fPutObject(
            bucket,
            key,
            (f as Express.Multer.File & { path?: string }).path,
            {
              'Content-Type': f.mimetype,
              'Cache-Control': 'private, max-age=0, no-store',
            },
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
          storage: 'minio' as const,
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

  private async validateContactDto(dto: CreateContactDto): Promise<void> {
    const extendedDto = dto as ExtendedCreateContactDto;
    if (extendedDto.website) throw new BadRequestException('Spam detected');

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
    const attachments = await this.uploadFilesToMinio(ticketNumber, files);

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
    await this.validateContactDto(dto);
    const ticketData = await this.prepareTicketData(dto, files, meta);
    const created = await this.repo.create(ticketData);
    await this.notifyTicketCreation(created);
    return created;
  }
}
