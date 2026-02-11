import { IsOptional, IsIn, IsMongoId, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { TICKET_STATUS_VALUES, type TicketStatus } from '../support.enums';

export class UpdateSupportAdminDto {
  @ApiPropertyOptional({
    description: 'حالة التذكرة',
    enum: TICKET_STATUS_VALUES,
  })
  @IsOptional()
  @IsIn([...TICKET_STATUS_VALUES])
  status?: TicketStatus;

  @ApiPropertyOptional({
    description: 'معرف موظف الدعم المعيّن (أو null لفك التعيين)',
  })
  @IsOptional()
  @ValidateIf((o) => o.assignedTo != null && o.assignedTo !== '')
  @IsMongoId()
  assignedTo?: string | null;
}
