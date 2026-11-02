import {
  CallHandler,
  Controller,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { catchError, type Observable } from 'rxjs';
import { MAX_FILES_PER_UPLOAD, MAX_UPLOAD_BYTES } from './image-processor.js';
import { UploadsService } from './uploads.service.js';
import { MAX_VIDEO_BYTES } from './video-processor.js';

// Multer's own messages ("File too large") are replaced with owner-friendly ones.
@Injectable()
class FriendlyUploadErrors implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        if (error instanceof PayloadTooLargeException) {
          throw new PayloadTooLargeException(
            `Each image must be ${MAX_UPLOAD_BYTES / 1024 / 1024} MB or smaller`,
          );
        }
        if (error instanceof Error && /Too many files|Unexpected field/i.test(error.message)) {
          error.message = `Upload up to ${MAX_FILES_PER_UPLOAD} images at a time, using the "files" field`;
        }
        throw error;
      }),
    );
  }
}

@Injectable()
class FriendlyVideoErrors implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        if (error instanceof PayloadTooLargeException) {
          throw new PayloadTooLargeException(
            `The video must be ${MAX_VIDEO_BYTES / 1024 / 1024} MB or smaller. Please shorten or compress it`,
          );
        }
        if (error instanceof Error && /Unexpected field/i.test(error.message)) {
          error.message = 'Upload one video at a time, using the "file" field';
        }
        throw error;
      }),
    );
  }
}

@Controller('admin/uploads')
export class UploadsAdminController {
  constructor(private readonly uploads: UploadsService) {}

  // multipart/form-data with one "file" field (MP4 or WebM)
  @Post('video')
  @UseInterceptors(
    FriendlyVideoErrors,
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
    }),
  )
  uploadVideo(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.uploads.uploadVideo(file);
  }

  // multipart/form-data with one or more "files" fields
  @Post()
  @UseInterceptors(
    FriendlyUploadErrors,
    FilesInterceptor('files', MAX_FILES_PER_UPLOAD, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: MAX_FILES_PER_UPLOAD },
    }),
  )
  upload(@UploadedFiles() files: Express.Multer.File[] | undefined) {
    return this.uploads.uploadImages(files ?? []);
  }
}
