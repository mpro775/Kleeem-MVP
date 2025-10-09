import * as fs from 'fs/promises';

import { downloadRemoteFile } from '../../utils/download-files';

jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), head: jest.fn() },
  get: jest.fn(),
  head: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

describe('download-files (safe path)', () => {
  it('downloads https file and writes to tmp', async () => {
    const head = jest.fn();
    const get = jest.fn();
    head.mockResolvedValueOnce({ headers: { 'content-length': '10' } } as any);
    get.mockResolvedValueOnce({
      headers: { 'content-type': 'image/png' },
      data: new Uint8Array([1, 2, 3, 4]).buffer,
    } as any);

    const out = await downloadRemoteFile('https://example.com/file.png');
    expect(out.originalName).toBe('file.png');
    expect(fs.writeFile).toHaveBeenCalled();
  });
});
