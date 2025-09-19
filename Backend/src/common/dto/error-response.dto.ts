import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponse {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code!: string;

  @ApiProperty({ example: 'Invalid request data' })
  message!: string;

  @ApiPropertyOptional({ type: [String], example: ['email must be an email'] })
  details?: string[];

  @ApiPropertyOptional({ example: '2023-09-18T12:00:00Z' })
  timestamp?: string;
}
