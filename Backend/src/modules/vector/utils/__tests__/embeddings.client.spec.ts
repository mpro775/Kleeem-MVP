import { firstValueFrom, timeout, catchError } from 'rxjs';

import { EmbeddingsClient } from '../../utils/embeddings.client';

jest.mock('rxjs', () => ({
  firstValueFrom: jest.fn(),
  timeout: jest.fn(() => (source: unknown) => source),
  catchError: jest.fn(() => (source: unknown) => source),
}));

const firstValueFromMock = firstValueFrom as jest.MockedFunction<
  typeof firstValueFrom
>;
const timeoutMock = timeout as jest.MockedFunction<typeof timeout>;
const catchErrorMock = catchError as jest.MockedFunction<typeof catchError>;

describe('EmbeddingsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    timeoutMock.mockReturnValue((source: any) => source);
    catchErrorMock.mockImplementation(() => (source: any) => source);
  });

  const makeService = () => {
    const http = {
      post: jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue('PIPELINE'),
      }),
    } as any;
    const i18n = { translate: jest.fn().mockResolvedValue('localized') } as any;
    const cfgMap: Record<string, unknown> = {
      'vars.embeddings.expectedDim': 3,
      'vars.embeddings.maxTextLength': 5000,
      'vars.embeddings.endpointPath': '/embed',
      'vars.embeddings.httpTimeoutMs': 1000,
      'vars.embeddings.rxTimeoutMs': 2000,
      'vars.embeddings.retry.maxRetries': 2,
      'vars.embeddings.retry.baseDelayMs': 10,
    };
    const config = {
      get: jest.fn((key: string) => cfgMap[key]),
    } as any;
    const svc = new EmbeddingsClient(http, i18n, config);
    return { svc, http, i18n, config };
  };

  it('validates inputs and throws localized errors', async () => {
    const { svc, i18n } = makeService();
    await expect((svc as any).validateInputs('', 'text')).rejects.toThrow();
    expect(i18n.translate).toHaveBeenCalledWith(
      'embeddings.errors.invalidBaseUrl',
    );

    await expect(
      (svc as any).validateInputs('http://base', ''),
    ).rejects.toThrow();
    expect(i18n.translate).toHaveBeenCalledWith(
      'embeddings.errors.invalidText',
    );
  });

  it('returns embedding vector on success', async () => {
    const { svc } = makeService();
    const vector = [0.1, 0.2, 0.3];
    firstValueFromMock.mockResolvedValueOnce({
      data: { embeddings: [vector] },
    } as any);

    const result = await svc.embed('http://base', 'hello', 3);
    expect(result).toEqual(vector);
    expect(firstValueFromMock).toHaveBeenCalledWith('PIPELINE');
  });

  it('retries and fails with localized message when embeddings invalid', async () => {
    const { svc, i18n } = makeService();
    firstValueFromMock.mockResolvedValue({ data: { embeddings: [[]] } } as any);
    i18n.translate.mockResolvedValueOnce('invalid len');
    i18n.translate.mockResolvedValueOnce('invalid len');
    i18n.translate.mockResolvedValueOnce('all failed');

    await expect(svc.embed('http://base', 'hello', 3)).rejects.toThrow(
      'all failed',
    );
    expect(firstValueFromMock).toHaveBeenCalledTimes(2);
  });
});
