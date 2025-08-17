import { Controller, Post, Body, UseGuards, UseInterceptors, UploadedFile, Res, Param, Delete, Get } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaHandlerDto } from './dto/media-handler.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@ApiTags('الوسائط')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'رفع ملف وسائط',
    description: 'رفع ملف وسائط جديد إلى الخادم' 
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'الملف المراد رفعه'
        },
        sessionId: {
          type: 'string',
          description: 'معرف الجلسة (اختياري)'
        },
        channel: {
          type: 'string',
          description: 'قناة الاتصال (whatsapp, telegram, etc.)'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'تم رفع الملف بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() mediaHandlerDto: MediaHandlerDto,
    @Res() res: Response
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    const result = await this.mediaService.handleMedia(mediaHandlerDto);
    return res.status(201).json(result);
  }

  @Get('file/:id')
  @ApiOperation({ 
    summary: 'تحميل ملف وسائط',
    description: 'تحميل ملف وسائط بواسطة المعرف' 
  })
  @ApiParam({ name: 'id', description: 'معرف الملف' })
  @ApiResponse({ status: 200, description: 'تم جلب الملف بنجاح' })
  @ApiResponse({ status: 404, description: 'الملف غير موجود' })
  async getFile(@Param('id') id: string, @Res() res: Response) {
    // Implementation here
    return res.sendFile(id, { root: './uploads' });
  }

}
