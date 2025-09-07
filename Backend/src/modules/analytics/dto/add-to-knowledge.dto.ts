import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AddToKnowledgeDto {
  @ApiProperty({ example: 'ماهي سياسة الاستبدال؟' })
  @IsString()
  @MinLength(3)
  question: string;

  @ApiProperty({ example: 'الاستبدال متاح خلال 14 يوم مع الفاتورة الأصلية.' })
  @IsString()
  @MinLength(3)
  answer: string;
}
