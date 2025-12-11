// src/modules/products/controllers/attribute-definitions.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentMerchantId } from '../../../common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ParseObjectIdPipe } from '../../../common/pipes/parse-objectid.pipe';
import {
  CreateAttributeDefinitionDto,
  UpdateAttributeDefinitionDto,
} from '../dto/attribute-definition.dto';
import { AttributeDefinitionDocument } from '../schemas/attribute-definition.schema';
import { AttributeDefinitionsService } from '../services/attribute-definitions.service';

@ApiTags('سمات المنتجات')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attribute-definitions')
export class AttributeDefinitionsController {
  constructor(private readonly service: AttributeDefinitionsService) {}

  @Get()
  @ApiOperation({ summary: 'List attribute definitions for merchant' })
  async list(
    @CurrentMerchantId() merchantId: string,
  ): Promise<AttributeDefinitionDocument[]> {
    return this.service.listByMerchant(merchantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create attribute definition' })
  async create(
    @Body() dto: CreateAttributeDefinitionDto,
    @CurrentMerchantId() merchantId: string,
  ): Promise<AttributeDefinitionDocument> {
    return this.service.create(merchantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update attribute definition' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateAttributeDefinitionDto,
    @CurrentMerchantId() merchantId: string,
  ): Promise<AttributeDefinitionDocument> {
    return this.service.updateScoped(id, merchantId, dto);
  }
}
