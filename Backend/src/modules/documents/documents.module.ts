// src/modules/documents/documents.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';

import { DocumentSchemaClass, DocumentSchema } from './schemas/document.schema';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentProcessor } from './processors/document.processor';
import { VectorModule } from '../vector/vector.module';
import { MongoDocumentsRepository } from './repositories/mongo-documents.repository';

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
