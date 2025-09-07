import { IsBoolean, IsOptional } from 'class-validator';

export class EnsureMyWorkflowDto {
  @IsOptional()
  @IsBoolean()
  forceRecreate?: boolean; // أعِد الإنشاء حتى لو موجود

  @IsOptional()
  @IsBoolean()
  activate?: boolean; // فعّل بعد الإنشاء/التحقق (default=true)
}
