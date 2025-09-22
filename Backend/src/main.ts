import './tracing';
import './polyfills';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureAppBasics } from './bootstrap/configure-app-basics';
import { configureBodyParsers } from './bootstrap/configure-body-parsers';
import { configureCsrf } from './bootstrap/configure-csrf';
import { configureFilters } from './bootstrap/configure-filters';
import { configureInterceptors } from './bootstrap/configure-interceptors';
import { configureLogging } from './bootstrap/configure-logging';
import { configurePipes } from './bootstrap/configure-pipes';
import { configureSwagger } from './bootstrap/configure-swagger';
import { configureWebsocket } from './bootstrap/configure-websocket';
import { startServer } from './bootstrap/start-server';

import type { NestExpressApplication } from '@nestjs/platform-express';

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

  await startServer(app);
}

void bootstrap();
