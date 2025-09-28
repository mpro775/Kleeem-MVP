// src/features/documents/queues/document.processor.ts
import { readFileSync } from 'fs';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bull';
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';
import { Model, Types } from 'mongoose';
import pdfParse from 'pdf-parse';

import { VectorService } from '../../vector/vector.service';
import { DocumentsService } from '../documents.service';
import { DocumentSchemaClass } from '../schemas/document.schema';

import type * as Minio from 'minio';

// =================== Constants (no magic numbers) ===================
const MAX_CHUNK_SIZE = 500;
const MAX_CHUNK_TEXT_LENGTH = 2000;
const TMP_PREFIX = 'docproc';

const CT_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const CT_PDF = 'application/pdf';
const CT_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CT_XLS = 'application/vnd.ms-excel';

const Q_PROCESS = 'documents-processing-queue';
const TASK_PROCESS = 'process';

const STATUS_PROCESSING = 'processing';
const STATUS_COMPLETED = 'completed';
const STATUS_FAILED = 'failed';

// =================== Types ===================
interface DocumentJobData {
  docId: string;
  merchantId: string;
}

interface LeanDoc {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId | string;
  storageKey: string;
  fileType: string;
}

interface ChunkPayload {
  id: string;
  vector: number[];
  payload: {
    merchantId: string;
    documentId: string;
    text: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

// =================== Utils & Type Guards ===================
function isReadable(v: unknown): v is Readable {
  return typeof (v as Readable)?.pipe === 'function';
}

function ensureStringId(v: unknown): string {
  return typeof v === 'string' ? v : String(v);
}

function splitTextIntoChunks(text: string, size = MAX_CHUNK_SIZE): string[] {
  if (!text) return [];
  const re = new RegExp(`.{1,${size}}`, 'gs');
  return text.match(re) ?? [];
}

async function downloadFromMinioToTemp(
  minio: Minio.Client,
  key: string,
  bucket: string,
): Promise<string> {
  const safeKey = key.replace(/[\\/]/g, '_');
  const tempFile = join(tmpdir(), `${TMP_PREFIX}-${Date.now()}-${safeKey}`);
  const stream = (await minio.getObject(bucket, key)) as unknown;

  if (!isReadable(stream)) {
    throw new Error('MinIO returned a non-readable stream');
  }

  const buffers: Buffer[] = [];
  for await (const chunk of stream) {
    // Node streams yield Buffer | string; Mammoth/PDF need Buffer
    buffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  await fs.writeFile(tempFile, Buffer.concat(buffers));
  return tempFile;
}
async function extractTextFromXlsxWithExceljs(
  filePath: string,
): Promise<string> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const lines: string[] = [];
  wb.worksheets.forEach((sheet) => {
    // اسم الشيت (اختياري)
    lines.push(`# Sheet: ${sheet.name}`);
    sheet.eachRow((row) => {
      // حوّل كل خلية لنص (افتراضيًا ExcelJS يرجع أنواع مختلفة)
      const values = row.values;
      if (!values || !Array.isArray(values)) return;

      const cells = values
        .filter(
          (v): v is NonNullable<typeof v> => v !== undefined && v !== null,
        )
        .map((v) => {
          if (typeof v === 'string') return v.trim();
          if (typeof v === 'number') return String(v);
          if (typeof v === 'boolean') return v ? 'true' : 'false';
          if (v && typeof v === 'object' && v !== null && 'text' in v) {
            // RichText / Formula result
            const obj = v as { text?: unknown };
            const textValue = obj.text;
            return typeof textValue === 'string'
              ? textValue.trim()
              : JSON.stringify(textValue);
          }
          if (typeof v === 'object' && v !== null) return JSON.stringify(v);
          return String(v);
        });
      lines.push(cells.join(','));
    });
    lines.push(''); // فاصل بين الشيتات
  });

  return lines.join('\n');
}

async function extractTextFromFile(
  filePath: string,
  fileType: string,
): Promise<string> {
  if (fileType === CT_DOCX) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value ?? '';
  }

  if (fileType === CT_PDF) {
    const buffer = readFileSync(filePath);
    const parsed = await pdfParse(buffer);
    return parsed.text ?? '';
  }

  if (fileType === CT_XLSX) {
    return extractTextFromXlsxWithExceljs(filePath);
  }

  if (fileType === CT_XLS) {
    // خيار 1: ارفضه برسالة واضحة
    throw new Error(
      'Unsupported file type: .xls (legacy). Please upload .xlsx instead.',
    );
    // خيار 2 لاحقًا: نفّذ تحويل خارجي ثم اقرأ الناتج .xlsx
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

@Processor(Q_PROCESS)
export class DocumentProcessor {
  private readonly logger = new Logger(DocumentProcessor.name);

  constructor(
    private readonly docsSvc: DocumentsService,
    @InjectModel(DocumentSchemaClass.name)
    private readonly docModel: Model<DocumentSchemaClass>,
    private readonly vectorService: VectorService,
  ) {
    this.logger.log('DocumentProcessor initialized');
  }

  @Process(TASK_PROCESS)
  async process(job: Job<DocumentJobData>): Promise<void> {
    const { docId } = job.data;
    let filePath = '';

    try {
      await this.updateStatus(docId, STATUS_PROCESSING);

      const doc = await this.fetchLeanDoc(docId);
      const bucket = this.getBucketName();

      filePath = await downloadFromMinioToTemp(
        this.docsSvc.minio,
        doc.storageKey,
        bucket,
      );

      const text = await extractTextFromFile(filePath, doc.fileType);
      const chunks = splitTextIntoChunks(text, MAX_CHUNK_SIZE);

      if (chunks.length === 0) {
        throw new Error('No text chunks created');
      }

      const vectors = await this.embedChunks(docId, doc.merchantId, chunks);
      await this.vectorService.upsertDocumentChunks(vectors);

      await this.updateStatus(docId, STATUS_COMPLETED);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Error processing job ${job.id}: ${msg}`, stack);

      await this.updateStatus(docId, STATUS_FAILED, msg);
    } finally {
      await this.safeUnlink(filePath);
    }
  }

  // =================== Private helpers ===================

  private getBucketName(): string {
    const bucket = process.env.MINIO_BUCKET ?? '';
    if (!bucket) throw new Error('MINIO_BUCKET not configured');
    return bucket;
  }

  private async updateStatus(
    docId: string,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (errorMessage) update.errorMessage = errorMessage;
    await this.docModel.findByIdAndUpdate(docId, update).exec();
  }

  private async fetchLeanDoc(docId: string): Promise<LeanDoc> {
    const doc = await this.docModel.findById(docId).lean<LeanDoc>().exec();
    if (!doc) throw new Error('Document not found in MongoDB');

    if (!doc.storageKey || !doc.fileType) {
      throw new Error('Document metadata incomplete (storageKey/fileType)');
    }
    return doc;
  }

  private async embedChunks(
    docId: string,
    merchantId: Types.ObjectId | string,
    chunks: string[],
  ): Promise<ChunkPayload[]> {
    const out: ChunkPayload[] = [];

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      this.logger.debug?.(
        `Embedding chunk ${i + 1}/${chunks.length} length=${chunk.length}`,
      );

      try {
        const embedding = await this.vectorService.embedText(chunk);
        out.push({
          id: `${ensureStringId(docId)}-${i}`,
          vector: embedding,
          payload: {
            merchantId: ensureStringId(merchantId),
            documentId: ensureStringId(docId),
            text: chunk.slice(0, MAX_CHUNK_TEXT_LENGTH),
            chunkIndex: i,
            totalChunks: chunks.length,
          },
        });
      } catch (embedErr: unknown) {
        const msg =
          embedErr instanceof Error
            ? embedErr.message
            : 'Unknown embedding error';
        const stack = embedErr instanceof Error ? embedErr.stack : undefined;
        this.logger.error(`Embedding error for chunk ${i + 1}: ${msg}`, stack);
        // إعادة الرمي لإيقاف العملية بالكامل (حسب منطقك الحالي)
        throw embedErr instanceof Error ? embedErr : new Error(msg);
      }
    }

    return out;
  }

  private async safeUnlink(path: string): Promise<void> {
    if (!path) return;
    try {
      await fs.unlink(path);
    } catch {
      this.logger.warn(`Failed to delete temporary file: ${path}`);
    }
  }
}
