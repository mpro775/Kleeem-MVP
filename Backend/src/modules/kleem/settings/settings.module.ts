import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BotRuntimeSettings,
  BotRuntimeSettingsSchema,
} from './botRuntimeSettings.schema';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { SETTINGS_REPOSITORY } from './tokens';
import { SettingsMongoRepository } from './repositories/settings.mongo.repository';

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
