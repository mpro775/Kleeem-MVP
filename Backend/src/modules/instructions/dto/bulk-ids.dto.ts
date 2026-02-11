import { IsArray, ArrayMinSize, IsString, IsMongoId } from 'class-validator';

export class BulkIdsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'ids must contain at least one id' })
  @IsString({ each: true })
  @IsMongoId({ each: true })
  ids!: string[];
}
