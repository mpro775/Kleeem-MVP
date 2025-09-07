// src/modules/support/support.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';

import { SupportService } from './support.service';
import {
  SupportTicket,
  SupportTicketSchema,
} from './schemas/support-ticket.schema';
import { SupportController } from './support.controller';
import * as Minio from 'minio';

@Module({
  imports: [
    HttpModule,
    MulterModule.register({}),
    MongooseModule.forFeature([
      { name: SupportTicket.name, schema: SupportTicketSchema },
    ]),
  ],
  controllers: [SupportController],
  providers: [SupportService,
    {
      provide: 'MINIO_CLIENT',
      useFactory: () =>
        new Minio.Client({
          endPoint: process.env.MINIO_ENDPOINT!,
          port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
          useSSL: process.env.MINIO_USE_SSL === 'true',
          accessKey: process.env.MINIO_ACCESS_KEY!,
          secretKey: process.env.MINIO_SECRET_KEY!,
        }),
    },
  ],
  exports: [SupportService],
})
export class SupportModule {}
