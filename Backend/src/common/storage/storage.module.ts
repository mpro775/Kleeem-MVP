import { Module } from '@nestjs/common';

import { S3_CLIENT_TOKEN, createS3Client } from './s3-client.provider';

@Module({
  providers: [
    {
      provide: S3_CLIENT_TOKEN,
      useFactory: createS3Client,
    },
  ],
  exports: [S3_CLIENT_TOKEN],
})
export class StorageModule {}
