// src/common/pipes/parse-objectid.pipe.ts
import { PipeTransform, BadRequestException } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string) {
    if (!isValidObjectId(value)) {
      throw new BadRequestException('معرّف غير صالح');
    }
    return value;
  }
}
