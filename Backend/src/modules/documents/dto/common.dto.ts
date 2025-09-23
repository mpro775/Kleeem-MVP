// src/modules/documents/dto/common.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Matches, IsNumber } from 'class-validator';

export class MerchantParamDto {
  @ApiProperty({ example: 'm_12345' })
  @IsString()
  @Matches(/^m_.+$/)
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
