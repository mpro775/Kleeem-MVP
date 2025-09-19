import { Inject, Injectable } from '@nestjs/common';
import { BotRuntimeSettings } from './botRuntimeSettings.schema';
import { UpdateBotRuntimeSettingsDto } from './dto/update-settings.dto';
import { SETTINGS_REPOSITORY } from './tokens';
import { SettingsRepository } from './repositories/settings.repository';

@Injectable()
export class SettingsService {
  private cache: BotRuntimeSettings | null = null;
  private cacheAt = 0;
  private TTL = 10_000; // 10s

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

  async update(dto: UpdateBotRuntimeSettingsDto) {
    const existing = await this.repo.findOneLean();
    let updated: BotRuntimeSettings;
    if (!existing) {
      updated = await this.repo.create(dto as any);
    } else {
      updated = await this.repo.findOneAndUpdate(dto as any);
    }
    this.cache = updated;
    this.cacheAt = Date.now();
    return this.cache;
  }
}
