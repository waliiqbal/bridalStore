import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { assertSafeKey, publicUrlFor, type StorageService } from './storage.js';

// Development driver: files on disk, served by the API at /uploads.
export class LocalStorage implements StorageService {
  private readonly root: string;

  constructor(
    rootDir: string,
    private readonly publicBaseUrl: string,
  ) {
    this.root = resolve(rootDir);
  }

  async save(key: string, body: Buffer): Promise<string> {
    assertSafeKey(key);
    const target = resolve(this.root, key);
    if (!target.startsWith(this.root + sep)) throw new Error(`Unsafe storage key: ${key}`);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body, { flag: 'wx' });
    return publicUrlFor(this.publicBaseUrl, key);
  }
}
