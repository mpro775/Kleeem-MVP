import { BotRuntimeSettings } from '../botRuntimeSettings.schema';

export interface SettingsRepository {
  findOneLean(): Promise<BotRuntimeSettings | null>;
  create(data: Partial<BotRuntimeSettings>): Promise<BotRuntimeSettings>;
  findOneAndUpdate(
    patch: Partial<BotRuntimeSettings>,
  ): Promise<BotRuntimeSettings>;
}
