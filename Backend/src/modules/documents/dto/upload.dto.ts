// src/modules/documents/dto/upload.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() merchantId!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() originalName!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() size!: number;
  @ApiProperty() url!: string;
  @ApiProperty() uploadedAt!: string;
}
