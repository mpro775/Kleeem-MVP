// Mock for file-type library
export const fileTypeFromBuffer = jest.fn().mockResolvedValue({
  ext: 'jpg',
  mime: 'image/jpeg',
});

export const fileTypeFromFile = jest.fn().mockResolvedValue({
  ext: 'jpg',
  mime: 'image/jpeg',
});

export const fileTypeFromStream = jest.fn().mockResolvedValue({
  ext: 'jpg',
  mime: 'image/jpeg',
});

export const fileTypeFromBlob = jest.fn().mockResolvedValue({
  ext: 'jpg',
  mime: 'image/jpeg',
});

export default {
  fileTypeFromBuffer,
  fileTypeFromFile,
  fileTypeFromStream,
  fileTypeFromBlob,
};
