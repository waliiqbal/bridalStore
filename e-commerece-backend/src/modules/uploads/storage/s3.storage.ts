import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { S3Env } from '../../../config/env.validation.js';
import { assertSafeKey, publicUrlFor, type StorageService } from './storage.js';

// Production driver for AWS S3 and S3-compatible stores (Cloudflare R2:
// region "auto", endpoint https://<account-id>.r2.cloudflarestorage.com).
export class S3Storage implements StorageService {
  private readonly client: S3Client;

  constructor(private readonly config: S3Env) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      // Custom endpoints (R2, MinIO) expect bucket-in-path URLs
      forcePathStyle: !!config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async save(key: string, body: Buffer, contentType: string): Promise<string> {
    assertSafeKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Keys are unique per upload, so files never change
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return publicUrlFor(this.config.publicUrl, key);
  }
}
