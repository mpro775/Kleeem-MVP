import { QdrantWrapper } from '../../utils/qdrant.client';

const mockGetCollections = jest.fn();
const mockCreateCollection = jest.fn();

jest.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: jest.fn().mockImplementation(() => ({
    getCollections: mockGetCollections,
    createCollection: mockCreateCollection,
    upsert: jest.fn(),
    search: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('QdrantWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes client and returns it', () => {
    const wrapper = new QdrantWrapper();
    const client = wrapper.init('http://qdrant');
    expect(client).toBeDefined();
  });

  it('creates collection when missing', async () => {
    mockGetCollections.mockResolvedValueOnce({ collections: [] });
    mockCreateCollection.mockResolvedValueOnce(undefined);

    const wrapper = new QdrantWrapper();
    wrapper.init('http://qdrant');
    await wrapper.ensureCollection('products', 128);

    expect(mockGetCollections).toHaveBeenCalled();
    expect(mockCreateCollection).toHaveBeenCalledWith('products', {
      vectors: { size: 128, distance: 'Cosine' },
    });
  });

  it('skips creation when collection exists', async () => {
    mockGetCollections.mockResolvedValueOnce({
      collections: [{ name: 'products' }],
    });

    const wrapper = new QdrantWrapper();
    wrapper.init('http://qdrant');
    await wrapper.ensureCollection('products', 64);

    expect(mockCreateCollection).not.toHaveBeenCalled();
  });

  it('ignores already exists errors', async () => {
    mockGetCollections.mockResolvedValueOnce({ collections: [] });
    mockCreateCollection.mockRejectedValueOnce({
      message: 'Collection already exists',
    });

    const wrapper = new QdrantWrapper();
    wrapper.init('http://qdrant');

    await expect(
      wrapper.ensureCollection('products', 64),
    ).resolves.toBeUndefined();
  });
});
