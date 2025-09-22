import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  BotRuntimeSettings,
  BotRuntimeSettingsSchema,
} from './botRuntimeSettings.schema';
import { SettingsMongoRepository } from './repositories/settings.mongo.repository';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SETTINGS_REPOSITORY } from './tokens';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BotRuntimeSettings.name, schema: BotRuntimeSettingsSchema },
    ]),
  ],
  providers: [
    SettingsService,
    {
      provide: SETTINGS_REPOSITORY,
      useClass: SettingsMongoRepository,
    },
  ],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
