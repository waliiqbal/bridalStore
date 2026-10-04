import sharp, { type Metadata } from 'sharp';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 10;
const MAX_DIMENSION = 2400;
const WEBP_QUALITY = 82;
// Rejects decompression bombs (small files that decode to huge images)
const MAX_INPUT_PIXELS = 50_000_000;

export class UnsupportedImageError extends Error {}

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  contentType: 'image/webp';
}

// Real type from the decoded header, not the filename or browser-sent MIME type.
async function detectFormat(input: Buffer): Promise<string> {
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new UnsupportedImageError('is not a valid image');
  }
  // sharp reports AVIF as "heif" with AV1 compression; HEIC (HEVC) is not accepted
  if (meta.format === 'heif') return meta.compression === 'av1' ? 'avif' : 'heic';
  return meta.format ?? 'unknown';
}

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif']);

/**
 * Auto-rotates from EXIF, strips all metadata (EXIF, GPS location, camera
 * details), fits within 2400×2400 without enlarging, and converts to WebP.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const format = await detectFormat(input);
  if (!ALLOWED_FORMATS.has(format)) {
    throw new UnsupportedImageError(
      `is a ${format.toUpperCase()} file. Please upload JPEG, PNG, WebP or AVIF images.`,
    );
  }

  try {
    const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
      .autoOrient()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width, height: info.height, contentType: 'image/webp' };
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    throw new UnsupportedImageError(
      /pixel limit/i.test(reason) ? 'is too large in pixels (maximum 50 megapixels)' : 'could not be processed',
    );
  }
}
