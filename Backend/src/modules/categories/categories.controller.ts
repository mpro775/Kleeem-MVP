// categories.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  Patch,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { MoveCategoryDto } from './dto/move-category.dto';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { 
  ApiSuccessResponse, 
  ApiCreatedResponse as CommonApiCreatedResponse, 
  CurrentUser, 
  PaginationDto
} from '../../common';
import multer from 'multer';
import os from 'os';

@ApiTags('الفئات')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'إضافة فئة' })
  @CommonApiCreatedResponse(CreateCategoryDto, 'تم إنشاء الفئة بنجاح')
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'جلب فئات (flat أو tree)' })
  @ApiQuery({ name: 'merchantId', required: true })
  @ApiQuery({ name: 'tree', required: false, type: 'boolean' })
  @ApiSuccessResponse(Array, 'تم جلب الفئات بنجاح')
  findAll(
    @Query('merchantId') merchantId: string,
    @Query('tree') tree?: string,
  ) {
    return tree === 'true'
      ? this.categories.findAllTree(merchantId)
      : this.categories.findAllFlat(merchantId);
  }

  @Get(':id')
  @ApiQuery({ name: 'merchantId', required: true })
  findOne(@Param('id') id: string, @Query('merchantId') merchantId: string) {
    return this.categories.findOne(id, merchantId);
  }

  @Get(':id/breadcrumbs')
  @ApiQuery({ name: 'merchantId', required: true })
  breadcrumbs(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
  ): Promise<any> {
    return this.categories.breadcrumbs(id, merchantId);
  }

  @Get(':id/subtree')
  @ApiQuery({ name: 'merchantId', required: true })
  subtree(@Param('id') id: string, @Query('merchantId') merchantId: string) {
    return this.categories.subtree(id, merchantId);
  }

  @Patch(':id/move')
  @ApiQuery({ name: 'merchantId', required: true })
  @ApiOperation({
    summary: 'نقل/ترتيب الفئة (داخل أب، قبل/بعد أخ، أو موضع محدد)',
  })
  move(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
    @Body() dto: MoveCategoryDto,
  ) {
    return this.categories.move(id, merchantId, dto);
  }

  @Delete(':id')
  @ApiQuery({ name: 'merchantId', required: true })
  @ApiQuery({ name: 'cascade', required: false, type: 'boolean' })
  remove(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
    @Query('cascade') cascade?: string,
  ) {
    return this.categories.remove(id, merchantId, cascade === 'true');
  }

  @Post(':id/image')
  @ApiOperation({ summary: 'رفع صورة الفئة (≤ 2MB، تُحوَّل إلى webp مربّعة)' })
  @ApiQuery({ name: 'merchantId', required: true })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    storage: multer.diskStorage({
      destination: os.tmpdir(), // تخزين مؤقت على القرص
      filename: (_req, file, cb) => {
        const ext = (file.originalname.split('.').pop() || 'img').toLowerCase();
        cb(null, `cat-${Date.now()}.${ext}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (_req, file, cb) => {
      const ok = /^(image\/png|image\/jpe?g|image\/webp)$/i.test(file.mimetype);
      cb(ok ? null : new BadRequestException('صيغة الصورة غير مدعومة (png/jpg/webp فقط)'), ok);
    },
  }))
  async uploadImage(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('لم يتم إرفاق ملف');
    const url = await this.categories.uploadCategoryImageToMinio(id, merchantId, file);
    return { url };
  }

  @Put(':id')
  @ApiOperation({ summary: 'تعديل فئة' })
  @ApiParam({ name: 'id', description: 'معرّف الفئة' })
  @ApiQuery({ name: 'merchantId', required: true })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ status: 200, description: 'تم تعديل الفئة بنجاح.' })
  @ApiResponse({ status: 404, description: 'الفئة غير موجودة.' })
  async update(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(id, merchantId, dto);
  }
}
