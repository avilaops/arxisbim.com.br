import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LocalStorageService } from '../../src/core/storage/local-storage.service.js';
import { StorageError } from '../../src/core/storage/storage.types.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('LocalStorageService Security Audits', () => {
  let tmpRoot: string;
  let storage: LocalStorageService;

  beforeAll(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'arxisvr-test-storage-'));
    storage = new LocalStorageService(tmpRoot);
    await storage.ensureRoot();
  });

  afterAll(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('allows safe files within the storage root', async () => {
    const key = 'projects/p1/model.gltf';
    const content = 'mock-gltf-content';

    // Upload
    const uploadRes = await storage.upload(key, content);
    expect(uploadRes.key).toBe(key);

    // Exists
    const exists = await storage.exists(key);
    expect(exists).toBe(true);

    // Stat
    const stats = await storage.stat(key);
    expect(stats.size).toBe(content.length);

    // Download
    const downloaded = await storage.downloadText(key);
    expect(downloaded).toBe(content);

    // Delete
    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);
  });

  it('rejects directory traversal containing .. segments', async () => {
    const maliciousKeys = [
      '../traversal.txt',
      'subfolder/../../traversal.txt',
      'subfolder/../..',
      'a/b/../../../c.txt',
      '..\\traversal.txt',
      'subfolder\\..\\..\\traversal.txt'
    ];

    for (const key of maliciousKeys) {
      // Test upload
      await expect(storage.upload(key, 'data')).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );

      // Test download
      await expect(storage.download(key)).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );

      // Test exists
      await expect(storage.exists(key)).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );

      // Test delete
      await expect(storage.delete(key)).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );

      // Test stat
      await expect(storage.stat(key)).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );

      // Test presignGet
      await expect(storage.presignGet(key)).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );
    }
  });

  it('rejects absolute paths', async () => {
    const absoluteKeys = [
      '/etc/passwd',
      '/var/tmp/malicious.txt',
      'C:\\Windows\\System32\\drivers\\etc\\hosts',
      '\\\\network-share\\file.txt',
      'D:\\some-other-folder\\file.txt'
    ];

    for (const key of absoluteKeys) {
      // Test upload
      await expect(storage.upload(key, 'data')).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );

      // Test download
      await expect(storage.download(key)).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );

      // Test exists
      await expect(storage.exists(key)).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );

      // Test delete
      await expect(storage.delete(key)).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );

      // Test stat
      await expect(storage.stat(key)).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );

      // Test presignGet
      await expect(storage.presignGet(key)).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );
    }
  });

  it('rejects URL-encoded directory traversal sequences', async () => {
    const encodedKeys = [
      '%2e%2e/traversal.txt',
      'subfolder/%2e%2e/%2e%2e/traversal.txt',
      'a/b/%252e%252e/c.txt', // double encoded
      'subfolder%2f%2e%2e%2f%2e%2e%2ftraversal.txt',
      'sub%2e%2e/file.txt'
    ];

    for (const key of encodedKeys) {
      await expect(storage.upload(key, 'data')).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );
      await expect(storage.download(key)).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );
    }
  });

  it('rejects mixed separators and directory traversal sequences', async () => {
    const mixedKeys = [
      'subfolder/..\\..\\traversal.txt',
      'subfolder\\../..\\traversal.txt',
      'a/b\\..\\..\\c.txt'
    ];

    for (const key of mixedKeys) {
      await expect(storage.upload(key, 'data')).rejects.toThrowError(
        /Directory traversal or absolute path rejected/
      );
    }
  });

  it('rejects accessing or writing files via symlinks pointing outside the storage root', async () => {
    // 1. Create a file outside the storage root
    const tempDirOutside = await fs.mkdtemp(path.join(os.tmpdir(), 'arxisvr-test-outside-'));
    const outsideFile = path.join(tempDirOutside, 'secret.txt');
    await fs.writeFile(outsideFile, 'highly-sensitive-content');

    // 2. Create a symlink inside the storage root pointing to the outside file
    const symlinkKey = 'safe-folder/symlink.txt';
    const symlinkPath = path.join(tmpRoot, 'safe-folder/symlink.txt');
    await fs.mkdir(path.dirname(symlinkPath), { recursive: true });
    await fs.symlink(outsideFile, symlinkPath);

    // 3. Confirm that the storage service rejects reading the symlinked file
    await expect(storage.download(symlinkKey)).rejects.toThrowError(
      /Symlink resolution points outside storage root/
    );

    // 4. Confirm it also rejects stat and exists
    await expect(storage.stat(symlinkKey)).rejects.toThrowError(
      /Symlink resolution points outside storage root/
    );
    await expect(storage.exists(symlinkKey)).rejects.toThrowError(
      /Symlink resolution points outside storage root/
    );

    // Cleanup external folder
    await fs.rm(tempDirOutside, { recursive: true, force: true });
  });
});
