// src/modules/categories/categories.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('الفئات')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'إضافة فئة جديدة' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: 'تم إنشاء الفئة بنجاح.' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة.' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'جلب كل الفئات (flat or tree)' })
  @ApiQuery({ name: 'tree', description: 'إرجاع الفئات على شكل شجرة', required: false, type: 'boolean' })
  @ApiResponse({ status: 200, description: 'تم جلب الفئات بنجاح.' })
  async findAll(@Query('tree') tree?: string) {
    if (tree === 'true') return this.categoriesService.findAllTree();
    return this.categoriesService.findAllFlat();
  }

  @Get(':id')
  @ApiOperation({ summary: 'جلب فئة واحدة' })
  @ApiParam({ name: 'id', description: 'معرف الفئة' })
  @ApiResponse({ status: 200, description: 'تم جلب الفئة بنجاح.' })
  @ApiResponse({ status: 404, description: 'الفئة غير موجودة.' })
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'تعديل فئة' })
  @ApiParam({ name: 'id', description: 'معرف الفئة' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ status: 200, description: 'تم تعديل الفئة بنجاح.' })
  @ApiResponse({ status: 404, description: 'الفئة غير موجودة.' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف فئة' })
  @ApiParam({ name: 'id', description: 'معرف الفئة' })
  @ApiResponse({ status: 200, description: 'تم حذف الفئة بنجاح.' })
  @ApiResponse({ status: 404, description: 'الفئة غير موجودة.' })
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
