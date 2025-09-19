// src/vector/embeddings.client.ts
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom, timeout, catchError, retry, delay } from 'rxjs';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingsClient {
  private readonly logger = new Logger(EmbeddingsClient.name);

  constructor(
    private readonly http: HttpService,
    private readonly i18n: I18nService,
    private readonly config: ConfigService,
  ) {}

  async embed(
    baseUrl: string,
    text: string,
    expected = this.config.get<number>('vars.embeddings.expectedDim')!,
  ): Promise<number[]> {
    // Validation
    if (!baseUrl || typeof baseUrl !== 'string') {
      throw new Error(
        await this.i18n.translate('embeddings.errors.invalidBaseUrl'),
      );
    }
    if (!text || typeof text !== 'string') {
      throw new Error(
        await this.i18n.translate('embeddings.errors.invalidText'),
      );
    }

    const maxLen = this.config.get<number>('vars.embeddings.maxTextLength')!;
    if (text.length > maxLen) {
      this.logger.warn(
        `Text length ${text.length} exceeds recommended limit (${maxLen})`,
      );
    }

    const endpointPath = this.config.get<string>(
      'vars.embeddings.endpointPath',
    )!;
    const httpTimeoutMs = this.config.get<number>(
      'vars.embeddings.httpTimeoutMs',
    )!;
    const rxTimeoutMs = this.config.get<number>('vars.embeddings.rxTimeoutMs')!;
    const maxRetries = this.config.get<number>(
      'vars.embeddings.retry.maxRetries',
    )!;
    const baseRetryDelay = this.config.get<number>(
      'vars.embeddings.retry.baseDelayMs',
    )!;

    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(
          `Embedding attempt ${attempt}/${maxRetries} for text length ${text.length}`,
        );

        const { data } = await firstValueFrom(
          this.http
            .post<{ embeddings: number[][] }>(
              `${baseUrl}${endpointPath}`,
              { texts: [text] },
              {
                timeout: httpTimeoutMs,
                headers: { 'Content-Type': 'application/json' },
              },
            )
            .pipe(
              timeout(rxTimeoutMs),
              catchError((error) => {
                this.logger.warn(
                  `Embedding attempt ${attempt} failed: ${error.message}`,
                );
                throw error;
              }),
            ),
        );

        const vec = data?.embeddings?.[0];
        if (!Array.isArray(vec) || vec.length !== expected) {
          throw new Error(
            await this.i18n.translate(
              'embeddings.errors.invalidEmbeddingLength',
              {
                args: { got: vec?.length || 0, expected },
              },
            ),
          );
        }

        this.logger.debug(
          `Successfully generated embedding of length ${vec.length}`,
        );
        return vec;
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delayMs = baseRetryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          this.logger.warn(
            `Embedding attempt ${attempt} failed, retrying in ${delayMs}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    this.logger.error(`All ${maxRetries} embedding attempts failed`, lastError);
    throw new Error(
      await this.i18n.translate('embeddings.errors.allAttemptsFailed'),
    );
  }
}
