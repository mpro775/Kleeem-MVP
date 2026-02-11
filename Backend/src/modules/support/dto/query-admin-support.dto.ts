import { Type } from 'class-transformer';
import { IsOptional, IsIn, IsInt, Min, Max, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { TICKET_STATUS_VALUES, type TicketStatus } from '../support.enums';

export class QueryAdminSupportDto {
  @ApiPropertyOptional({
    description: 'بحث في الموضوع والرسالة والاسم',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'فلترة حسب حالة التذكرة',
    enum: TICKET_STATUS_VALUES,
  })
  @IsOptional()
  @IsIn([...TICKET_STATUS_VALUES])
  status?: TicketStatus;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 30;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: 'ترتيب حسب',
    enum: ['createdAt', 'status', 'ticketNumber', 'updatedAt'],
  })
  @IsOptional()
  @IsIn(['createdAt', 'status', 'ticketNumber', 'updatedAt'])
  sortBy?: 'createdAt' | 'status' | 'ticketNumber' | 'updatedAt' = 'createdAt';

  @ApiPropertyOptional({
    description: 'اتجاه الترتيب',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
