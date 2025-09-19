import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentSchemaClass } from '../schemas/document.schema';
import { DocumentsService } from '../documents.service';
import { VectorService } from '../../vector/vector.service';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join } from 'path';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import mammoth from 'mammoth'; // ✅ استيراد عصري
import { Logger } from '@nestjs/common';

interface DocumentJobData {
  docId: string;
  merchantId: string;
}

async function downloadFromMinioToTemp(minio, key: string): Promise<string> {
  const tempFile = join(tmpdir(), `${Date.now()}-${key}`);
  const stream = await minio.getObject(process.env.MINIO_BUCKET!, key);
  const buffers: Buffer[] = [];
  for await (const chunk of stream) {
    buffers.push(chunk as Buffer);
  }
  await fs.writeFile(tempFile, Buffer.concat(buffers));
  return tempFile;
}

@Processor('documents-processing-queue')
export class DocumentProcessor {
  private readonly logger = new Logger(DocumentProcessor.name);

  constructor(
    private readonly docsSvc: DocumentsService,
    @InjectModel(DocumentSchemaClass.name)
    private readonly docModel: Model<DocumentSchemaClass>,
    private readonly vectorService: VectorService,
  ) {
    this.logger.log('🟢 DocumentProcessor initialized');
  }

  @Process('process')
  async process(job: Job<DocumentJobData>): Promise<void> {
    this.logger.log(`🚀 Processing job ${job.id}`, job.data);

    const { docId } = job.data;
    let filePath = '';

    try {
      // 1. تحديث حالة الوثيقة إلى "processing"
      await this.docModel
        .findByIdAndUpdate(docId, { status: 'processing' })
        .exec();
      this.logger.log(`📄 Document ${docId} status updated to processing`);

      // 2. جلب بيانات الوثيقة من MongoDB
      this.logger.log(`🔎 Fetching document ${docId} from MongoDB`);
      const doc = await this.docModel.findById(docId).lean();
      if (!doc) {
        throw new Error('Document not found in MongoDB');
      }
      this.logger.log(`📄 Document data: ${JSON.stringify(doc)}`);

      // 3. تنزيل الملف من MinIO
      this.logger.log(`📦 Downloading file from MinIO: ${doc.storageKey}`);
      filePath = await downloadFromMinioToTemp(
        this.docsSvc.minio,
        doc.storageKey,
      );
      this.logger.log(`✅ File downloaded to: ${filePath}`);

      // 4. استخراج النص من الملف
      this.logger.log(`5️⃣ Extracting text from ${doc.fileType}`);
      let text = '';
      if (
        doc.fileType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else if (doc.fileType === 'application/pdf') {
        const buffer = readFileSync(filePath);
        const parsed = await pdfParse(buffer);
        text = parsed.text;
      } else if (
        doc.fileType ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        doc.fileType === 'application/vnd.ms-excel'
      ) {
        const workbook = XLSX.readFile(filePath);
        for (const sheetName of workbook.SheetNames) {
          text += XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]) + '\n';
        }
      } else {
        throw new Error('Unsupported file type');
      }
      this.logger.log(`6️⃣ Extracted text length: ${text.length}`);

      // 5. تقسيم النص إلى قطع (Chunks)
      const maxChunkSize = 500; // تحديد حجم القطعة
      const chunks = text.match(new RegExp(`.{1,${maxChunkSize}}`, 'gs')) ?? [];
      this.logger.log(`📦 Text split into ${chunks.length} chunks`);

      if (chunks.length === 0) {
        throw new Error('No text chunks created');
      }

      const chunksArr: { id: string; vector: number[]; payload: any }[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        this.logger.log(
          `🔤 Processing chunk ${i + 1}/${chunks.length}, length: ${chunk.length}`,
        );
        try {
          // 6. الحصول على الـ embedding لكل قطعة
          const embedding = await this.vectorService.embedText(chunk);
          this.logger.log(`✅ Embedding generated for chunk ${i + 1}`);

          // 7. إنشاء الـ payload
          chunksArr.push({
            id: `${docId}-${i}`, // إنشاء ID فريد
            vector: embedding,
            payload: {
              merchantId: String(doc.merchantId),
              documentId: String(docId),
              text: chunk.substring(0, 2000), // تقليل حجم النص
              chunkIndex: i,
              totalChunks: chunks.length,
            },
          });
        } catch (embedError: any) {
          this.logger.error(
            `❌ Embedding error for chunk ${i + 1}: ${embedError.message}`,
            embedError.stack,
          );
          throw embedError; // إعادة رمي الخطأ لإيقاف العملية
        }
      }

      // 8. إرسال القطع إلى Qdrant
      this.logger.log(`📤 Upserting ${chunksArr.length} chunks to Qdrant`);
      await this.vectorService.upsertDocumentChunks(chunksArr);
      this.logger.log('✅ Chunks upserted successfully');

      // 9. تحديث حالة الوثيقة إلى "completed"
      await this.docModel
        .findByIdAndUpdate(docId, { status: 'completed' })
        .exec();
      this.logger.log('✅ Document status updated to completed');
    } catch (error: any) {
      this.logger.error(
        `❌ Error processing job ${job.id}: ${error.message}`,
        error.stack,
      );
      // 10. تحديث حالة الوثيقة إلى "failed" في حالة وجود خطأ
      await this.docModel
        .findByIdAndUpdate(docId, {
          status: 'failed',
          errorMessage: error.message || 'Unknown error',
        })
        .exec();
    } finally {
      // 11. حذف الملف المؤقت      if (filePath) {
      await fs.unlink(filePath).catch(() => {
        this.logger.warn(`⚠️ Failed to delete temporary file: ${filePath}`);
      });
    }
  }
}
