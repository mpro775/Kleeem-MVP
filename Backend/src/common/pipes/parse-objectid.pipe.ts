// src/common/pipes/parse-objectid.pipe.ts
import { BadRequestException } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

import type { PipeTransform } from '@nestjs/common';

export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isValidObjectId(value)) {
      throw new BadRequestException('معرّف غير صالح');
    }
    return value;
  }
}
