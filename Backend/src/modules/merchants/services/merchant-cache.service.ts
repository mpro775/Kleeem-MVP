import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';

import { TranslationService } from '../../../common/services/translation.service';
import { MerchantsRepository } from '../repositories/merchants.repository';
import { MerchantDocument } from '../schemas/merchant.schema';
import { MerchantStatusResponse } from '../types/types';

import { PromptBuilderService } from './prompt-builder.service';

interface StoreContext {
  merchantId: string;
  name?: string;
  description?: string;
}

@Injectable()
export class MerchantCacheService {
  constructor(
    @Inject('MerchantsRepository')
    private readonly repo: MerchantsRepository,
    private readonly promptBuilder: PromptBuilderService,
    private readonly translation: TranslationService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly config: ConfigService,
  ) {}

  private ttlMerchant() {
    return this.config.get<number>('vars.cache.merchantTtlMs')!;
  }
  private ttlPrompt() {
    return this.config.get<number>('vars.cache.merchantPromptTtlMs')!;
  }
  private ttlStatus() {
    return this.config.get<number>('vars.cache.merchantStatusTtlMs')!;
  }

  async findOne(id: string): Promise<MerchantDocument> {
    const cacheKey = `merchant:${id}`;
    const cached = await this.cache.get<MerchantDocument>(cacheKey);
    if (cached) return cached;

    const merchant = await this.repo.findOne(id);
    if (!merchant) {
      throw new NotFoundException(
        this.translation.translate('merchants.errors.notFound'),
      );
    }

    // أعِد بناء الـ prompt النهائي وخزّنه داخل الوثيقة
    merchant.finalPromptTemplate =
      await this.promptBuilder.compileTemplate(merchant);
    await merchant.save?.();

    await this.cache.set(cacheKey, merchant, this.ttlMerchant());
    return merchant;
  }

  async getStatus(id: string): Promise<MerchantStatusResponse> {
    const key = `merchant:status:${id}`;
    const cached = await this.cache.get<MerchantStatusResponse>(key);
    if (cached) return cached;

    const status = await this.repo.getStatus(id);
    await this.cache.set(key, status, this.ttlStatus());
    return status;
  }

  async buildFinalPrompt(id: string): Promise<string> {
    const key = `merchant:prompt:${id}`;
    const cached = await this.cache.get<string>(key);
    if (cached) return cached;

    const m = await this.repo.findOne(id);
    const tpl = await this.promptBuilder.compileTemplate(m);
    m.finalPromptTemplate = tpl;
    await m.save?.();

    await this.cache.set(key, tpl, this.ttlPrompt());
    return tpl;
  }

  async invalidate(merchantId: string): Promise<void> {
    await Promise.all([
      this.cache.del(`merchant:${merchantId}`),
      this.cache.del(`merchant:status:${merchantId}`),
      this.cache.del(`merchant:prompt:${merchantId}`),
    ]);
  }

  async getStoreContext(merchantId: string): Promise<StoreContext> {
    const merchant = await this.findOne(merchantId);
    const context: StoreContext = {
      merchantId: String(merchant._id),
      // توسعة لاحقًا بما يلزم
    };

    if (merchant.name) {
      context.name = merchant.name;
    }

    if (merchant.businessDescription) {
      context.description = merchant.businessDescription;
    }

    return context;
  }
}
