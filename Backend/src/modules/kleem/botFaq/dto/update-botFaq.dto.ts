// src/modules/kleem/botFaq/dto/update-botFaq.dto.ts
import { PartialType } from '@nestjs/mapped-types';

import { CreateBotFaqDto } from './create-botFaq.dto';
export class UpdateBotFaqDto extends PartialType(CreateBotFaqDto) {}
