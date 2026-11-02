import { describe, expect, it } from 'vitest';
import { checkVideo, UnsupportedVideoError } from './video-processor.js';

const mp4 = (brand: string) =>
  Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftyp'), Buffer.from(brand), Buffer.alloc(16)]);

describe('checkVideo', () => {
  it('accepts an MP4', () => {
    expect(checkVideo(mp4('isom'))).toMatchObject({ contentType: 'video/mp4', extension: 'mp4' });
  });

  it('accepts a WebM', () => {
    const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(20)]);
    expect(checkVideo(webm)).toMatchObject({ contentType: 'video/webm', extension: 'webm' });
  });

  it('rejects an iPhone .mov with a clear message', () => {
    expect(() => checkVideo(mp4('qt  '))).toThrow(/\.mov/);
  });

  it('rejects other files, whatever their name says', () => {
    expect(() => checkVideo(Buffer.from('<html>not a video at all</html>'))).toThrow(UnsupportedVideoError);
    expect(() => checkVideo(Buffer.alloc(0))).toThrow(UnsupportedVideoError);
  });
});
