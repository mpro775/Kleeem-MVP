// src/media/media.service.ts
import { Injectable } from '@nestjs/common';
import { MediaHandlerDto, MediaType } from './dto/media-handler.dto';
import { extname } from 'path';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import * as mime from 'mime-types';

@Injectable()
export class MediaService {
  async handleMedia(
    dto: MediaHandlerDto,
  ): Promise<{ text: string; meta?: any }> {
    // 1. تحميل الملف مؤقتًا
    const res = await axios.get(dto.fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(res.data, 'binary');
    const ext = extname(dto.fileUrl).toLowerCase();
    const tmpFile = `/tmp/media-${Date.now()}${ext}`;
    await fs.writeFile(tmpFile, buffer);

    let text = '';
    const meta = {};

    switch (dto.type) {
      case MediaType.VOICE:
      case MediaType.AUDIO:
        text = await this.transcribeAudioWithDeepgram(tmpFile);
        break;

      case MediaType.PHOTO:
      case MediaType.IMAGE:
        text = await this.describeImage(tmpFile);
        break;

      case MediaType.PDF:
      case MediaType.DOCUMENT:
        text = await this.extractTextFromDocument(tmpFile, dto.mimeType);
        break;

      default:
        text = '[نوع ملف غير مدعوم]';
    }

    // احذف الملف المؤقت
    await fs.unlink(tmpFile);

    return { text, meta };
  }

  // 🟢 صوت: Whisper Open Source
  async transcribeAudioWithDeepgram(filepath: string): Promise<string> {
    const apiKey = '2ed019921677d533a3db04d9caae7167ce2cb875';
    const audio = fsSync.readFileSync(filepath);
    const contentType = mime.lookup(filepath) || 'application/octet-stream';

    try {
      const resp = await axios.post(
        'https://api.deepgram.com/v1/listen',
        audio,
        {
          headers: {
            Authorization: `Token ${apiKey}`,
            'Content-Type': contentType,
          },
          timeout: 90000,
        },
      );
      const text =
        resp.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
      if (typeof text === 'string' && text.trim().length > 0) {
        return text;
      }
      return '[فشل التحويل الصوتي]';
    } catch {
      return `[خطأ في تحويل الصوت للنص]`;
    }
  }
  // 🟢 صورة: Tesseract OCR
  async describeImage(filepath: string): Promise<string> {
    try {
      const { data } = await Tesseract.recognize(filepath, 'ara+eng');
      return data.text
        ? `نص الصورة: ${data.text}`
        : '[لم يتم استخراج نص من الصورة]';
    } catch {
      return `[خطأ في استخراج نص من الصورة]`;
    }
  }

  // 🟢 ملف PDF: pdf-parse
  async extractTextFromDocument(
    filepath: string,
    mimeType?: string,
  ): Promise<string> {
    if (mimeType?.includes('pdf') || filepath.endsWith('.pdf')) {
      try {
        const buffer = fsSync.readFileSync(filepath);
        const data = await pdfParse(buffer);
        return data.text || '[لا يوجد نص في الملف]';
      } catch {
        return '[خطأ في استخراج النص من PDF]';
      }
    }
    if (mimeType?.includes('word') || filepath.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ path: filepath });
      return result.value || '[لا يوجد نص في ملف Word]';
    }
    if (mimeType?.includes('excel') || filepath.endsWith('.xlsx')) {
      const workbook = xlsx.readFile(filepath);
      let text = '';
      workbook.SheetNames.forEach((name) => {
        const sheet = workbook.Sheets[name];
        text += xlsx.utils.sheet_to_csv(sheet);
      });
      return text || '[لا يوجد بيانات في Excel]';
    }
    return '[لا يمكن قراءة الملف]';
  }
  
}
