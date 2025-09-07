// src/modules/support/support.controller.ts
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
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateContactDto } from './dto/create-contact.dto';
import { SupportService } from './support.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';

// عدّل المسار حسب مشروعك:
// import { Public } from 'src/common/decorators/public.decorator';

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
      [{ name: 'files', maxCount: Number(process.env.SUPPORT_MAX_FILES || 5) }],
      {
        storage,
        limits: {
          fileSize:
            Number(process.env.SUPPORT_MAX_FILE_SIZE_MB || 5) * 1024 * 1024,
        },
        fileFilter: (req, file, cb) => {
          if (!allowedMime(file.mimetype))
            return cb(new BadRequestException('نوع الملف غير مسموح'), false);
          cb(null, true);
        },
      },
    ),
  )
  async contact(
    @Body('payload') raw: string,
    @UploadedFiles() files: { files?: Express.Multer.File[] },
    @Req() req: any,
  ) {
    if (!raw) throw new BadRequestException('payload required');

    let dto: CreateContactDto;
    try {
      dto = plainToInstance(CreateContactDto, JSON.parse(raw));
    } catch (e) {
      throw new BadRequestException('invalid JSON payload');
    }

    const errs = await validate(dto);
    if (errs.length) throw new BadRequestException(errs);

    const uploaded = files?.files ?? [];

    const created = await this.service.create(dto, uploaded, {
      ip:
        (Array.isArray((req as any).ips) && (req as any).ips[0]) ||
        (req as any).ip,
      userAgent: (req as any).headers?.['user-agent'],
    });

    return {
      id: created._id,
      ticketNumber: (created as any).ticketNumber,
      status: (created as any).status,
      createdAt: (created as any).createdAt || new Date(),
    };
  }
  @Post('contact/merchant')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إنشاء تذكرة دعم من لوحة التاجر (محمية)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'files', maxCount: Number(process.env.SUPPORT_MAX_FILES || 5) }],
      {
        storage,
        limits: {
          fileSize:
            Number(process.env.SUPPORT_MAX_FILE_SIZE_MB || 5) * 1024 * 1024,
        },
        fileFilter: (req, file, cb) => {
          if (!allowedMime(file.mimetype))
            return cb(new BadRequestException('نوع الملف غير مسموح'), false);
          cb(null, true);
        },
      },
    ),
  )
  async contactFromMerchant(
    @Body('payload') raw: string,
    @UploadedFiles() files: { files?: Express.Multer.File[] },
    @Req() req: Request & { user?: { userId: string; merchantId: string } },
  ) {
    if (!raw) throw new BadRequestException('payload required');
    let dto: CreateContactDto;
    try {
      dto = plainToInstance(CreateContactDto, JSON.parse(raw));
    } catch {
      throw new BadRequestException('invalid JSON payload');
    }
    const errs = await validate(dto);
    if (errs.length) throw new BadRequestException(errs);

    const uploaded = files?.files ?? [];
    const created = await this.service.create(dto, uploaded, {
      ip:
        (Array.isArray((req as any).ips) && (req as any).ips[0]) ||
        (req as any).ip,
      userAgent: (req as any).headers?.['user-agent'],
      merchantId: req.user?.merchantId,
      userId: req.user?.userId,
      source: 'merchant',
    });

    return {
      id: created._id,
      ticketNumber: (created as any).ticketNumber,
      status: (created as any).status,
      createdAt: (created as any).createdAt || new Date(),
    };
  }
}
