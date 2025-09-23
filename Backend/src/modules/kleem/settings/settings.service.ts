import { Inject, Injectable } from '@nestjs/common';
import { MS_PER_SECOND } from 'src/common/constants/common';

import { BotRuntimeSettings } from './botRuntimeSettings.schema';
import { UpdateBotRuntimeSettingsDto } from './dto/update-settings.dto';
import { SettingsRepository } from './repositories/settings.repository';
import { SETTINGS_REPOSITORY } from './tokens';

@Injectable()
export class SettingsService {
  private cache: BotRuntimeSettings | null = null;
  private cacheAt = 0;
  private TTL = MS_PER_SECOND * 10; // 10s

  constructor(
    @Inject(SETTINGS_REPOSITORY)
    private readonly repo: SettingsRepository,
  ) {}

  async get(): Promise<BotRuntimeSettings> {
    const now = Date.now();
    if (this.cache && now - this.cacheAt < this.TTL) return this.cache;

    let doc = await this.repo.findOneLean();
    if (!doc) {
      doc = await this.repo.create({} as Partial<BotRuntimeSettings>);
    }
    this.cache = doc;
    this.cacheAt = now;
    return this.cache;
  }

  cached(): BotRuntimeSettings {
    return this.cache || ({} as BotRuntimeSettings);
  }

  async update(dto: UpdateBotRuntimeSettingsDto): Promise<BotRuntimeSettings> {
    const existing = await this.repo.findOneLean();
    let updated: BotRuntimeSettings;
    if (!existing) {
      updated = await this.repo.create(dto);
    } else {
      updated = await this.repo.findOneAndUpdate(dto);
    }
    this.cache = updated;
    this.cacheAt = Date.now();
    return this.cache;
  }
}
