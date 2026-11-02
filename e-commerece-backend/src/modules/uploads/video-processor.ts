export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export class UnsupportedVideoError extends Error {}

export interface CheckedVideo {
  buffer: Buffer;
  contentType: 'video/mp4' | 'video/webm';
  extension: 'mp4' | 'webm';
}

// The real type comes from the file's first bytes, not its name or the browser-sent MIME type.
export function checkVideo(input: Buffer): CheckedVideo {
  // MP4: size (4 bytes), "ftyp", then a brand. "qt  " is an iPhone .mov, which many browsers can't play.
  if (input.length > 12 && input.toString('latin1', 4, 8) === 'ftyp') {
    if (input.toString('latin1', 8, 12) === 'qt  ') {
      throw new UnsupportedVideoError('is a .mov file. Please save or export it as an MP4 first');
    }
    return { buffer: input, contentType: 'video/mp4', extension: 'mp4' };
  }
  // WebM / Matroska header
  if (input.length > 4 && input[0] === 0x1a && input[1] === 0x45 && input[2] === 0xdf && input[3] === 0xa3) {
    return { buffer: input, contentType: 'video/webm', extension: 'webm' };
  }
  throw new UnsupportedVideoError('is not an MP4 video');
}
