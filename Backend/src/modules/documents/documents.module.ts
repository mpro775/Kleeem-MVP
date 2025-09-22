// src/modules/documents/documents.module.ts
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';

import { VectorModule } from '../vector/vector.module';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentProcessor } from './processors/document.processor';
import { MongoDocumentsRepository } from './repositories/mongo-documents.repository';
import { DocumentSchemaClass, DocumentSchema } from './schemas/document.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentSchemaClass.name, schema: DocumentSchema },
    ]),
    BullModule.registerQueue({ name: 'documents-processing-queue' }),

    MulterModule.register({
      dest: './uploads', // فقط تخزين محلي مؤقت!
    }),
    VectorModule, // ✅ أضف هذا هنا
  ],
  providers: [
    DocumentsService,
    DocumentProcessor,
    {
      provide: 'DocumentsRepository',
      useClass: MongoDocumentsRepository,
    },
  ],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
