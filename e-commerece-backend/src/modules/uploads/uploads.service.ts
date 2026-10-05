import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { processImage, UnsupportedImageError, type ProcessedImage } from './image-processor.js';
import { STORAGE, type StorageService } from './storage/storage.js';

export interface UploadedImage {
  url: string;
  width: number;
  height: number;
}

export interface IncomingFile {
  originalname: string;
  buffer: Buffer;
}

export function storageKey(now = new Date()): string {
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `images/${now.getUTCFullYear()}/${month}/${randomUUID()}.webp`;
}

@Injectable()
export class UploadsService {
  constructor(@Inject(STORAGE) private readonly storage: StorageService) {}

  // Every file is checked and processed before any is saved, so one bad
  // file rejects the whole batch with a clear message.
  async uploadImages(files: IncomingFile[]): Promise<UploadedImage[]> {
    if (!files.length) throw new BadRequestException('Please choose at least one image');

    const processed: ProcessedImage[] = [];
    for (const file of files) {
      try {
        processed.push(await processImage(file.buffer));
      } catch (error) {
        if (error instanceof UnsupportedImageError) {
          throw new BadRequestException(`"${file.originalname}" ${error.message}`);
        }
        throw error;
      }
    }

    return Promise.all(
      processed.map(async (image) => ({
        url: await this.storage.save(storageKey(), image.buffer, image.contentType),
        width: image.width,
        height: image.height,
      })),
    );
  }
}
