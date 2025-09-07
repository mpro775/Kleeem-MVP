import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

export type ExtractResult = {
  name?: string;
  description?: string;
  images?: string[];
  price?: number;
  availability?: string;
};

// واجهة تصف شكل الاستجابة من خدمة Python
interface ExtractApiResponse {
  data: ExtractResult;
}

@Injectable()
export class ExtractService {
  private readonly logger = new Logger(ExtractService.name);

  constructor(private readonly http: HttpService) {}

  async extractFromUrl(url: string): Promise<ExtractResult> {
    try {
      const base = (process.env.EXTRACTOR_BASE_URL || 'http://extractor:8001').replace(/\/+$/, '');
      const resp: AxiosResponse<ExtractApiResponse> = await firstValueFrom(
        this.http.get<ExtractApiResponse>(`${base}/extract/`, { params: { url }, timeout: 10000 }),
      );
      return resp.data?.data || {};
    } catch (err: any) {
      this.logger.error(`Extract failed for ${url}: ${err.message}`);
      return {};
    }
  }
}
