import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

export type ExtractResult = {
  name?: string;
  description?: string;
  images?: string[];
  price?: number;
  availability?: string;
};
const DEFAULT_TIMEOUT = 30_000;

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
      const base = (
        process.env.EXTRACTOR_BASE_URL || 'http://extractor:8001'
      ).replace(/\/+$/, '');
      const resp: AxiosResponse<ExtractApiResponse> = await firstValueFrom(
        this.http.get<ExtractApiResponse>(`${base}/extract/`, {
          params: { url },
          timeout: DEFAULT_TIMEOUT,
        }),
      );
      return resp.data?.data || {};
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.error(`Extract failed for ${url}: ${err.message}`);
      } else {
        this.logger.error(`Extract failed for ${url}: ${String(err)}`);
      }
      return {};
    }
  }
}
