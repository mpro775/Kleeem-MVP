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
      // هنا نعرّف أن الـ GET سيُعيد ExtractApiResponse
      const resp: AxiosResponse<ExtractApiResponse> = await firstValueFrom(
        this.http.get<ExtractApiResponse>(
          'http://extractor-service:8001/extract/',
          { params: { url } },
        ),
      );

      // الآن resp.data.data مصنّف بدقّة كـ ExtractResult
      return resp.data.data;
    } catch (err) {
      this.logger.error(`Extract failed for ${url}: ${err.message}`);
      return {};
    }
  }
}
