import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';
import { CloudinaryStorage } from './storage/cloudinary.storage.js';
import { LocalStorage } from './storage/local.storage.js';
import { S3Storage } from './storage/s3.storage.js';
import { STORAGE, type StorageService } from './storage/storage.js';
import { UploadsAdminController } from './uploads.admin.controller.js';
import { UploadsService } from './uploads.service.js';

@Module({
  controllers: [UploadsAdminController],
  providers: [
    UploadsService,
    {
      provide: STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): StorageService => {
        const driver = config.get('STORAGE_DRIVER', { infer: true });
        const s3 = config.get('S3', { infer: true });
        if (driver === 's3' && s3) return new S3Storage(s3);
        const cloudinary = config.get('CLOUDINARY', { infer: true });
        if (driver === 'cloudinary' && cloudinary) return new CloudinaryStorage(cloudinary);
        return new LocalStorage(
          config.get('UPLOADS_DIR', { infer: true }),
          config.get('UPLOADS_PUBLIC_URL', { infer: true }),
        );
      },
    },
  ],
})
export class UploadsModule {}
