import { v2 as cloudinary } from 'cloudinary';
import type { CloudinaryEnv } from '../../../config/env.validation.js';
import { assertSafeKey, type StorageService } from './storage.js';

// Uploads to Cloudinary and returns its https URL. Only that URL is stored in
// the database. Images are already resized and cleaned by processImage().
export class CloudinaryStorage implements StorageService {
  constructor(config: CloudinaryEnv) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
  }

  async save(key: string, body: Buffer): Promise<string> {
    assertSafeKey(key);
    // "images/2026/10/abc.webp" → public id "images/2026/10/abc" (Cloudinary adds the format)
    const publicId = key.replace(/\.[a-z0-9]+$/i, '');

    return new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: 'image',
          // Keys are unique per upload, so never replace an existing file
          overwrite: false,
          use_filename: false,
          unique_filename: false,
        },
        (error, result) => {
          if (error || !result?.secure_url) {
            // Cloudinary's errors are plain objects, not Error instances
            const reason = error?.message ?? 'no URL returned';
            reject(new Error(`Cloudinary upload failed: ${reason}`));
            return;
          }
          resolve(result.secure_url);
        },
      );
      stream.end(body);
    });
  }
}
