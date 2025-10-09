import axios from 'axios';

import { geminiRerankTopN } from '../../utils/geminiRerank';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('geminiRerankTopN', () => {
  const originalEnv = process.env.GEMINI_API_KEY;

  afterEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = originalEnv;
  });

  it('throws when API key missing', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(
      geminiRerankTopN({ query: 'q', candidates: ['a'] }),
    ).rejects.toThrow('Missing GEMINI_API_KEY');
  });

  it('parses indices from response text', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        candidates: [
          {
            content: {
              parts: [{ text: 'النتيجة: 1,3' }],
            },
          },
        ],
      },
    } as any);

    const indices = await geminiRerankTopN({
      query: 'hello',
      candidates: ['c1', 'c2', 'c3'],
      topN: 2,
    });
    expect(indices).toEqual([0, 2]);
    expect(mockedAxios.post).toHaveBeenCalled();
  });

  it('returns empty array on refusal text', async () => {
    process.env.GEMINI_API_KEY = 'another-key';
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        candidates: [
          {
            content: {
              parts: [{ text: '�?�? �?�?�?�? �?�?�?�?' }],
            },
          },
        ],
      },
    } as any);

    const indices = await geminiRerankTopN({
      query: 'x',
      candidates: ['a', 'b'],
    });
    expect(indices).toEqual([]);
  });
});
