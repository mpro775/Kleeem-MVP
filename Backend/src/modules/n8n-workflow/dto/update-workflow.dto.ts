import { IsObject, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WorkflowDefinition } from '../types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * نموذج تحديث سير العمل
 * يحتوي على التغييرات المراد تطبيقها على سير العمل
 */
export class UpdateWorkflowDto {
  @ApiProperty({
    description: 'التغييرات المراد تطبيقها على سير العمل',
    type: Object,
    additionalProperties: true,
    example: {
      name: 'سير العمل المحدث',
      active: true,
      nodes: [
        {
          id: 'node-1',
          type: 'n8n-nodes-base.httpRequest',
          parameters: {
            url: 'https://api.example.com/update',
            method: 'POST',
          },
        },
      ],
      connections: {},
      settings: {},
    },
  })
  @IsObject({ message: 'يجب أن يكون jsonPatch كائنًا' })
  @IsNotEmpty({ message: 'لا يمكن أن يكون jsonPatch فارغًا' })
  jsonPatch: Partial<WorkflowDefinition>;

  @ApiPropertyOptional({
    description: 'سبب التحديث (اختياري)',
    example: 'إضافة عقدة طلب HTTP جديدة',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون reason نصيًا' })
  reason?: string;
}
