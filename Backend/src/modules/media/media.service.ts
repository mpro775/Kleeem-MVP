// src/media/media.service.ts
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import { tmpdir } from 'os';
import { extname, join } from 'path';

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import mammoth from 'mammoth';
import * as mime from 'mime-types';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import * as xlsx from 'xlsx';

import { MediaHandlerDto, MediaType } from './dto/media-handler.dto';

// ===== Constants (no magic numbers/strings) =====
const TMP_PREFIX = 'media-' as const;
const OCR_LANGS = 'ara+eng' as const;
const AXIOS_TIMEOUT_MS = 90_000;
const PDF_FALLBACK_TEXT = '[لا يوجد نص في الملف]' as const;
const PDF_ERROR_TEXT = '[خطأ في استخراج النص من PDF]' as const;
const WORD_FALLBACK_TEXT = '[لا يوجد نص في ملف Word]' as const;
const EXCEL_FALLBACK_TEXT = '[لا يوجد بيانات في Excel]' as const;
const FILE_UNSUPPORTED_TEXT = '[لا يمكن قراءة الملف]' as const;
const AUDIO_TRANSCRIBE_FAIL = '[فشل التحويل الصوتي]' as const;
const AUDIO_TRANSCRIBE_ERROR = '[خطأ في تحويل الصوت للنص]' as const;
const IMAGE_NO_TEXT = '[لم يتم استخراج نص من الصورة]' as const;
const IMAGE_OCR_ERROR = '[خطأ في استخراج نص من الصورة]' as const;
const DEFAULT_OCTET = 'application/octet-stream' as const;

// ===== Helpers =====
function asStringOrNull(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}
function getContentType(filePath: string): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const mt = mime.lookup(filePath) as string | undefined;
  return typeof mt === 'string' ? mt : DEFAULT_OCTET;
}
async function safeUnlink(path: string | null | undefined): Promise<void> {
  if (!path) return;
  try {
    await fs.unlink(path);
  } catch {
    /* ignore */
  }
}
function buildTmpPath(originalUrl: string): string {
  const ext = extname(originalUrl).toLowerCase();
  return join(tmpdir(), `${TMP_PREFIX}${Date.now()}${ext}`);
}
function looksLike(
  extOrMime: string | undefined,
  target: 'pdf' | 'docx' | 'xlsx',
): boolean {
  if (!extOrMime) return false;
  const v = extOrMime.toLowerCase();
  if (target === 'pdf') return v.includes('pdf') || v.endsWith('.pdf');
  if (target === 'docx') return v.includes('word') || v.endsWith('.docx');
  // xlsx
  return v.includes('excel') || v.endsWith('.xlsx');
}

@Injectable()
export class MediaService {
  constructor(private readonly config: ConfigService) {}

  /**
   * تحميل الوسيط مؤقتًا ثم استخلاص النص بحسب النوع
   */
  async handleMedia(
    dto: MediaHandlerDto,
  ): Promise<{ text: string; meta?: Record<string, unknown> }> {
    let tmpFile: string | null = null;

    try {
      // 1) تنزيل الملف إلى مسار مؤقت آمن
      tmpFile = await this.downloadToTempFile(dto.fileUrl);

      // 2) معالجة بحسب النوع
      const text = await this.processByType(dto, tmpFile);

      return { text, meta: {} };
    } finally {
      await safeUnlink(tmpFile);
    }
  }

  // ===== Private: download/process =====

  private async downloadToTempFile(fileUrl: string): Promise<string> {
    const tmpFile = buildTmpPath(fileUrl);
    const resp: AxiosResponse<ArrayBuffer> = await axios.get<ArrayBuffer>(
      fileUrl,
      {
        responseType: 'arraybuffer',
      },
    );
    const buffer = Buffer.from(resp.data);
    await fs.writeFile(tmpFile, buffer);
    return tmpFile;
  }

  private async processByType(
    dto: MediaHandlerDto,
    tmpFile: string,
  ): Promise<string> {
    switch (dto.type) {
      case MediaType.VOICE:
      case MediaType.AUDIO:
        return this.transcribeAudio(tmpFile);
      case MediaType.PHOTO:
      case MediaType.IMAGE:
        return this.ocrImage(tmpFile);
      case MediaType.PDF:
      case MediaType.DOCUMENT:
        return this.extractTextFromDocument(tmpFile, dto.mimeType);
      default:
        return FILE_UNSUPPORTED_TEXT;
    }
  }

  // ===== Audio: Deepgram =====
  private extractTranscript(resp: {
    data?: {
      results?: { channels?: { alternatives?: { transcript?: unknown }[] }[] };
    };
  }): string {
    const transcript = asStringOrNull(
      resp?.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript,
    );
    return transcript && transcript.trim().length > 0
      ? transcript
      : AUDIO_TRANSCRIBE_FAIL;
  }

  private async transcribeAudio(filepath: string): Promise<string> {
    const apiKey = this.config.get<string>('DEEPGRAM_API_KEY') ?? '';
    if (!apiKey) {
      throw new InternalServerErrorException('Deepgram API key not configured');
    }

    const audio = fsSync.readFileSync(filepath);
    const contentType = getContentType(filepath);

    try {
      const resp = await axios.post(
        'https://api.deepgram.com/v1/listen',
        audio,
        {
          headers: {
            Authorization: `Token ${apiKey}`,
            'Content-Type': contentType,
          },
          timeout: AXIOS_TIMEOUT_MS,
        },
      );
      return this.extractTranscript(resp);
    } catch {
      return AUDIO_TRANSCRIBE_ERROR;
    }
  }

  // ===== Image: Tesseract OCR =====
  private async ocrImage(filepath: string): Promise<string> {
    try {
      const { data } = await Tesseract.recognize(filepath, OCR_LANGS);
      return data.text && data.text.trim().length > 0
        ? `نص الصورة: ${data.text}`
        : IMAGE_NO_TEXT;
    } catch {
      return IMAGE_OCR_ERROR;
    }
  }

  // ===== Documents: PDF/DOCX/XLSX =====
  private async extractTextFromDocument(
    filepath: string,
    mimeType?: string,
  ): Promise<string> {
    if (looksLike(mimeType ?? filepath, 'pdf')) {
      try {
        const buffer = fsSync.readFileSync(filepath);
        const data = await pdfParse(buffer);
        return data.text || PDF_FALLBACK_TEXT;
      } catch {
        return PDF_ERROR_TEXT;
      }
    }

    if (looksLike(mimeType ?? filepath, 'docx')) {
      const result = await mammoth.extractRawText({ path: filepath });
      return result.value || WORD_FALLBACK_TEXT;
    }

    if (looksLike(mimeType ?? filepath, 'xlsx')) {
      const wb = xlsx.readFile(filepath);
      let text = '';
      wb.SheetNames.forEach((name) => {
        const sheet = wb.Sheets[name];
        text += xlsx.utils.sheet_to_csv(sheet);
      });
      return text || EXCEL_FALLBACK_TEXT;
    }

    return FILE_UNSUPPORTED_TEXT;
  }
}
