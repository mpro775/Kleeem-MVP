import './tracing';
import './polyfills';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

import { configureAppBasics } from './bootstrap/configure-app-basics';
import { configureCsrf } from './bootstrap/configure-csrf';
import { configureBodyParsers } from './bootstrap/configure-body-parsers';
import { configureLogging } from './bootstrap/configure-logging';
import { configurePipes } from './bootstrap/configure-pipes';
import { configureFilters } from './bootstrap/configure-filters';
import { configureInterceptors } from './bootstrap/configure-interceptors';
import { configureWebsocket } from './bootstrap/configure-websocket';
import { configureSwagger } from './bootstrap/configure-swagger';
import { configureRateLimits } from './bootstrap/configure-rate-limits';
import { startServer } from './bootstrap/start-server';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureAppBasics(app);
  configureCsrf(app);
  configureWebsocket(app);
  configureBodyParsers(app);
  configureLogging(app);
  configurePipes(app);
  configureFilters(app);
  configureInterceptors(app);
  configureSwagger(app);
  configureRateLimits(app);

  await startServer(app);
}

void bootstrap();
