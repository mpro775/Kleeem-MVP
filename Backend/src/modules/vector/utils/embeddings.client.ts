// src/vector/embeddings.client.ts
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { firstValueFrom, timeout, catchError } from 'rxjs';

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
    await this.validateInputs(baseUrl, text);

    const config = this.getEmbeddingConfig();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        this.logger.debug(
          `Embedding attempt ${attempt}/${config.maxRetries} for text length ${text.length}`,
        );

        const vec = await this.performEmbeddingRequest(
          baseUrl,
          text,
          config,
          expected,
        );

        this.logger.debug(
          `Successfully generated embedding of length ${vec.length}`,
        );
        return vec;
      } catch (error) {
        lastError = error as Error;

        if (attempt < config.maxRetries) {
          const delayMs = config.baseRetryDelay * Math.pow(2, attempt - 1);
          this.logger.warn(
            `Embedding attempt ${attempt} failed, retrying in ${delayMs}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    this.logger.error(
      `All ${config.maxRetries} embedding attempts failed`,
      lastError,
    );
    throw new Error(
      await this.i18n.translate('embeddings.errors.allAttemptsFailed'),
    );
  }

  private async validateInputs(baseUrl: string, text: string): Promise<void> {
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
  }

  private getEmbeddingConfig() {
    return {
      endpointPath: this.config.get<string>('vars.embeddings.endpointPath')!,
      httpTimeoutMs: this.config.get<number>('vars.embeddings.httpTimeoutMs')!,
      rxTimeoutMs: this.config.get<number>('vars.embeddings.rxTimeoutMs')!,
      maxRetries: this.config.get<number>('vars.embeddings.retry.maxRetries')!,
      baseRetryDelay: this.config.get<number>(
        'vars.embeddings.retry.baseDelayMs',
      )!,
    };
  }

  private async performEmbeddingRequest(
    baseUrl: string,
    text: string,
    config: ReturnType<EmbeddingsClient['getEmbeddingConfig']>,
    expected: number,
  ): Promise<number[]> {
    const { data } = await firstValueFrom(
      this.http
        .post<{ embeddings: number[][] }>(
          `${baseUrl}${config.endpointPath}`,
          { texts: [text] },
          {
            timeout: config.httpTimeoutMs,
            headers: { 'Content-Type': 'application/json' },
          },
        )
        .pipe(
          timeout(config.rxTimeoutMs),
          catchError((error: unknown) => {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Embedding request failed: ${message}`);
            throw error;
          }),
        ),
    );

    const vec = data?.embeddings?.[0];
    if (!Array.isArray(vec) || vec.length !== expected) {
      throw new Error(
        await this.i18n.translate('embeddings.errors.invalidEmbeddingLength', {
          args: { got: vec?.length || 0, expected },
        }),
      );
    }

    return vec;
  }
}
