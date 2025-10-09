import axios from 'axios';

import { GeminiService } from '../gemini.service';

jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
  post: jest.fn(),
}));

describe('GeminiService', () => {
  const postMock = axios.post.bind(axios) as unknown as jest.MockedFunction<
    typeof axios.post
  >;

  it('summarize delegates to API and returns text', async () => {
    const svc = new GeminiService({} as any);
    process.env.GEMINI_API_KEY = 'key';
    postMock.mockResolvedValueOnce({
      data: {
        candidates: [{ content: { parts: [{ text: 'summary' }] } }],
      },
    } as any);
    const res = await svc.generateAndSaveInstructionFromBadReply('hello');
    expect(res).toBe('summary');
  });
});
