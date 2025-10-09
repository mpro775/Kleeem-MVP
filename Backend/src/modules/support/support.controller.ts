// src/modules/support/support.controller.ts
import { randomUUID } from 'crypto';
import { extname } from 'path';

import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFiles,
  UseInterceptors,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { diskStorage } from 'multer';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

import { CreateContactDto } from './dto/create-contact.dto';
import { SupportTicketEntity } from './repositories/support.repository';
import { SupportService } from './support.service';

// عدّل المسار حسب مشروعك:
// import { Public } from 'src/common/decorators/public.decorator';

// ثوابت لتجنب الأرقام السحرية
const KB = 1024;
const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_FILE_SIZE_MB = 5;

function allowedMime(mime: string) {
  const allow = (
    process.env.SUPPORT_ALLOWED_FILE_TYPES || 'png,jpg,jpeg,pdf,doc,docx'
  )
    .split(',')
    .map((x) => x.trim().toLowerCase());
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return allow.some((ext) => map[ext] === mime);
}

const storage = diskStorage({
  destination: (req, file, cb) => {
    const dest = process.env.SUPPORT_UPLOAD_DIR || './uploads/support';
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const id = randomUUID();
    const ext = extname(file.originalname) || '';
    cb(null, `${id}${ext}`);
  },
});

@ApiTags('support')
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Post('contact')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'استقبال نموذج تواصل الليندنج بيج' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        payload: { type: 'string', description: 'JSON of CreateContactDto' },
        files: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: 'files',
          maxCount: Number(process.env.SUPPORT_MAX_FILES || DEFAULT_MAX_FILES),
        },
      ],
      {
        storage,
        limits: {
          fileSize:
            Number(
              process.env.SUPPORT_MAX_FILE_SIZE_MB || DEFAULT_MAX_FILE_SIZE_MB,
            ) *
            KB *
            KB,
        },
        fileFilter: (req, file, cb) => {
          if (!allowedMime(file.mimetype))
            return cb(new BadRequestException('نوع الملف غير مسموح'), false);
          cb(null, true);
        },
      },
    ),
  )
  private buildContactOptions(
    req: Request & {
      ips?: string[];
      ip?: string;
      headers?: { 'user-agent'?: string };
    },
  ): { ip?: string; userAgent?: string } {
    const options: { ip?: string; userAgent?: string } = {};
    const ip = (Array.isArray(req.ips) && req.ips[0]) || req.ip;
    if (ip) options.ip = ip;
    if (req.headers?.['user-agent'])
      options.userAgent = req.headers['user-agent'];
    return options;
  }

  async contact(
    @Body('payload') raw: string,
    @UploadedFiles() files: { files?: Express.Multer.File[] },
    @Req()
    req: Request & {
      ips?: string[];
      ip?: string;
      headers?: { 'user-agent'?: string };
    },
  ): Promise<{
    id: unknown;
    ticketNumber: unknown;
    status: unknown;
    createdAt: Date;
  }> {
    const dto = await this.validateContactPayload(raw);
    const uploaded = files?.files ?? [];
    const options = this.buildContactOptions(req);
    const created = await this.service.create(dto, uploaded, options);
    return this.formatTicketResponse(created);
  }
  @Post('contact/merchant')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إنشاء تذكرة دعم من لوحة التاجر (محمية)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: 'files',
          maxCount: Number(process.env.SUPPORT_MAX_FILES || DEFAULT_MAX_FILES),
        },
      ],
      {
        storage,
        limits: {
          fileSize:
            Number(
              process.env.SUPPORT_MAX_FILE_SIZE_MB || DEFAULT_MAX_FILE_SIZE_MB,
            ) *
            KB *
            KB,
        },
        fileFilter: (req, file, cb) => {
          if (!allowedMime(file.mimetype))
            return cb(new BadRequestException('نوع الملف غير مسموح'), false);
          cb(null, true);
        },
      },
    ),
  )
  private async validateContactPayload(raw: string): Promise<CreateContactDto> {
    if (!raw) throw new BadRequestException('payload required');
    let dto: CreateContactDto;
    try {
      dto = plainToInstance(CreateContactDto, JSON.parse(raw));
    } catch {
      throw new BadRequestException('invalid JSON payload');
    }
    const errs = await validate(dto);
    if (errs.length) throw new BadRequestException(errs);
    return dto;
  }

  private buildMerchantOptions(
    req: Request & { user?: { userId: string; merchantId: string } },
  ): {
    ip?: string;
    userAgent?: string;
    merchantId?: string;
    userId?: string;
    source: 'merchant';
  } {
    const reqAny = req as Request & {
      ips?: unknown[];
      ip?: unknown;
      headers?: { 'user-agent'?: unknown };
    };
    const options: {
      ip?: string;
      userAgent?: string;
      merchantId?: string;
      userId?: string;
      source: 'merchant';
    } = { source: 'merchant' };

    const ip =
      (Array.isArray(reqAny.ips) && (reqAny.ips[0] as string)) ||
      (reqAny.ip as string);
    if (ip) options.ip = ip;
    if (reqAny.headers?.['user-agent'])
      options.userAgent = reqAny.headers['user-agent'] as string;
    if (req.user?.merchantId) options.merchantId = req.user.merchantId;
    if (req.user?.userId) options.userId = req.user.userId;

    return options;
  }

  private formatTicketResponse(created: SupportTicketEntity): {
    id: unknown;
    ticketNumber: unknown;
    status: unknown;
    createdAt: Date;
  } {
    return {
      id: created._id,
      ticketNumber: (created as { ticketNumber?: unknown }).ticketNumber,
      status: (created as { status?: unknown }).status,
      createdAt: (created as { createdAt?: Date }).createdAt || new Date(),
    };
  }

  async contactFromMerchant(
    @Body('payload') raw: string,
    @UploadedFiles() files: { files?: Express.Multer.File[] },
    @Req() req: Request & { user?: { userId: string; merchantId: string } },
  ): Promise<{
    id: unknown;
    ticketNumber: unknown;
    status: unknown;
    createdAt: Date;
  }> {
    const dto = await this.validateContactPayload(raw);
    const uploaded = files?.files ?? [];
    const options = this.buildMerchantOptions(req);
    const created = await this.service.create(dto, uploaded, options);
    return this.formatTicketResponse(created);
  }
}
