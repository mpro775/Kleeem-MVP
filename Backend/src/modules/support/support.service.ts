// src/modules/support/support.service.ts
import {
  BadRequestException,
  Injectable,
  Logger,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SupportTicket,
  SupportTicketDocument,
} from './schemas/support-ticket.schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as Minio from 'minio';
import { unlink } from 'node:fs/promises';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectModel(SupportTicket.name)
    private readonly Ticket: Model<SupportTicketDocument>,
    private readonly http: HttpService,
    @Inject('MINIO_CLIENT') private readonly minio: Minio.Client,
  ) {}

  private generateTicketNumber() {
    const a = Date.now().toString(36).toUpperCase();
    const b = Math.floor(Math.random() * 999)
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
    return (name || 'file').replace(/[^\w.\-]+/g, '_').slice(0, 180);
  }

  private async publicOrSignedUrl(bucket: string, key: string) {
    const cdn = (
      process.env.ASSETS_CDN_BASE_URL ||
      process.env.MINIO_PUBLIC_URL ||
      ''
    ).replace(/\/+$/, '');
    if (cdn) return `${cdn}/${bucket}/${key}`;
    // افتراضي آمن: رابط موقّع لمدة ساعة
    return await this.minio.presignedGetObject(bucket, key, 3600);
  }

  async verifyRecaptcha(token?: string) {
    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) return true;
    if (!token) return false;
    try {
      const url = 'https://www.google.com/recaptcha/api/siteverify';
      const { data } = await firstValueFrom(
        this.http.post(url, null, { params: { secret, response: token } }),
      );
      return !!data?.success;
    } catch {
      this.logger.warn('reCAPTCHA verification failed');
      return false;
    }
  }

  async notifyChannels(ticket: SupportTicketDocument) {
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
            createdAt: (ticket as any).createdAt || new Date(),
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

    const attachments: any[] = [];
    for (const f of files) {
      const safe = this.sanitizeName(f.originalname || 'file');
      const key = `support/${ticketNumber}/${Date.now()}-${safe}`;

      try {
        if (f.buffer && f.buffer.length) {
          // memoryStorage
          await this.minio.putObject(bucket, key, f.buffer, f.buffer.length, {
            'Content-Type': f.mimetype,
            'Cache-Control': 'private, max-age=0, no-store',
          });
        } else if (f.path) {
          // diskStorage
          await this.minio.fPutObject(bucket, key, f.path, {
            'Content-Type': f.mimetype,
            'Cache-Control': 'private, max-age=0, no-store',
          });
        } else {
          throw new Error('Empty file');
        }

        const url = await this.publicOrSignedUrl(bucket, key);
        attachments.push({
          originalName: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
          storage: 'minio' as const,
          storageKey: key,
          url, // ثابت عبر CDN أو موقّع لساعة
        });
      } catch (e) {
        this.logger.error(
          `Failed to upload support attachment: ${safe}`,
          e as any,
        );
        throw new InternalServerErrorException('SUPPORT_UPLOAD_FAILED');
      } finally {
        // نظّف الملف المؤقت إن وُجد
        if ((f as any).path) {
          await unlink((f as any).path).catch(() => null);
        }
      }
    }
    return attachments;
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
  ) {
    if (dto.website) throw new BadRequestException('Spam detected');

    const ok = await this.verifyRecaptcha(dto.recaptchaToken);
    if (!ok) throw new BadRequestException('reCAPTCHA failed');

    const ticketNumber = this.generateTicketNumber();

    // 🔼 ارفع المرفقات إلى MinIO
    const attachments = await this.uploadFilesToMinio(ticketNumber, files);

    const created = await this.Ticket.create({
      ...dto,
      ticketNumber,
      status: 'open',
      source: meta?.source || 'landing',
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      attachments,
      merchantId: meta?.merchantId,
      createdBy: meta?.userId,
    });

    this.notifyChannels(created).catch(() => undefined);
    return created;
  }
}
