// S3 client factory for Cloudflare R2 (S3-compatible) with MinIO fallback
import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';

export const S3_CLIENT_TOKEN = 'S3_CLIENT';

export function createS3Client(): S3Client {
  const endpoint = (
    process.env.AWS_ENDPOINT ||
    process.env.MINIO_ENDPOINT ||
    ''
  ).replace(/\/+$/, '');

  const region = process.env.AWS_REGION || process.env.MINIO_REGION || 'auto';
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY || '';
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY || '';

  const clientConfig: S3ClientConfig = {
    region,
    forcePathStyle: true,
    ...(endpoint ? { endpoint } : {}),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };

  return new (S3Client as unknown as new (config: S3ClientConfig) => S3Client)(
    clientConfig,
  );
}
