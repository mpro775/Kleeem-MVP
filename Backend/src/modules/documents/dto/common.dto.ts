// src/modules/documents/dto/common.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsMongoId, IsNumber } from 'class-validator';

export class MerchantParamDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId({ message: 'معرف التاجر غير صالح (ObjectId مطلوب)' })
  merchantId!: string;
}

export class DocParamDto {
  @ApiProperty({ example: 'doc_66f1a2b3c4d5e6f7g8h9i0j' })
  @IsString()
  @Matches(/^doc_.+$/)
  docId!: string;
}

export class DocumentDto {
  @ApiProperty() id!: string;
  @ApiProperty() merchantId!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() originalName!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() @IsNumber() size!: number;
  @ApiProperty() url!: string;
  @ApiProperty() uploadedAt!: string;
  @ApiPropertyOptional() lastModified?: string;
}

// غلاف رد عام
export class ApiResponseDto<T> {
  @ApiProperty() success!: boolean;
  @ApiPropertyOptional() message?: string;
  // سيُحقن نوع T ديناميكيًا في الـ Controller عبر getSchemaPath
  data!: T;
}

export class PaginatedMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() hasNext!: boolean;
  @ApiProperty() hasPrev!: boolean;
}

export class PaginatedDocumentsDto {
  @ApiProperty({ type: [DocumentDto] }) items!: DocumentDto[];
  @ApiProperty({ type: PaginatedMetaDto }) meta!: PaginatedMetaDto;
}
