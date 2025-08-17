import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BotRuntimeSettings } from './botRuntimeSettings.schema';
import { UpdateBotRuntimeSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  private cache: BotRuntimeSettings | null = null;
  private cacheAt = 0;
  private TTL = 10_000; // 10s

  constructor(
    @InjectModel(BotRuntimeSettings.name)
    private readonly model: Model<BotRuntimeSettings>,
  ) {}

  async get(): Promise<BotRuntimeSettings> {
    const now = Date.now();
    if (this.cache && now - this.cacheAt < this.TTL) return this.cache;

    let doc = await this.model.findOne().lean<BotRuntimeSettings>();
    if (!doc) {
      // أنشئ بوثيقة افتراضية واحدة فقط
      doc = (await this.model.create({})).toObject();
    }
    this.cache = doc;
    this.cacheAt = now;
    return this.cache;
  }

  cached(): BotRuntimeSettings {
    // قديمة/منتهية؟ لا بأس، للاستخدامات السريعة
    return this.cache || ({} as BotRuntimeSettings);
  }

  async update(dto: UpdateBotRuntimeSettingsDto) {
    const doc = await this.model.findOne();
    if (!doc) {
      const created = await this.model.create(dto);
      this.cache = created.toObject() as BotRuntimeSettings;
      this.cacheAt = Date.now();
      return this.cache;
    }
    Object.assign(doc, dto);
    await doc.save();
    this.cache = doc.toObject() as BotRuntimeSettings;
    this.cacheAt = Date.now();
    return this.cache;
  }
}
