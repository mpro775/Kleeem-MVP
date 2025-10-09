import axios from 'axios';

import { sendReplyToChannel } from '../../utils/replies.util';

jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
  post: jest.fn(),
}));

jest.mock('../../../channels/utils/secrets.util', () => ({
  decryptSecret: jest.fn((enc: string) => (enc ? 'SECRET' : '')),
}));

describe('sendReplyToChannel', () => {
  const chatGateway = { sendMessageToSession: jest.fn() } as any;
  const evoService = { sendMessage: jest.fn().mockResolvedValue({}) } as any;
  const channelsRepo = {
    findDefaultWithSecrets: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends to webchat', async () => {
    await sendReplyToChannel(
      { merchantId: 'm', channel: 'webchat', sessionId: 's', text: 'hi' },
      channelsRepo,
      chatGateway,
      evoService,
    );
    expect(chatGateway.sendMessageToSession).toHaveBeenCalled();
  });

  it('sends to telegram via axios when configured', async () => {
    channelsRepo.findDefaultWithSecrets = jest
      .fn()
      .mockResolvedValueOnce({ botTokenEnc: 'enc' });
    await sendReplyToChannel(
      { merchantId: 'm', channel: 'telegram', sessionId: '123', text: 'hi' },
      channelsRepo,
      chatGateway,
      evoService,
    );
    expect((axios.post as any)()).toHaveBeenCalled();
  });

  it('tries WhatsApp Cloud then QR', async () => {
    // Cloud configured
    channelsRepo.findDefaultWithSecrets = jest
      .fn()
      .mockResolvedValueOnce({
        enabled: true,
        accessTokenEnc: 'enc',
        phoneNumberId: 'pn',
      })
      // for QR lookup after Cloud path returns true, QR should not be called
      .mockResolvedValueOnce({ enabled: true, sessionId: 'sess' });

    await sendReplyToChannel(
      { merchantId: 'm', channel: 'whatsapp', sessionId: 'u1', text: 'hello' },
      channelsRepo,
      chatGateway,
      evoService,
    );
    expect((axios.post as any)()).toHaveBeenCalled();
  });

  it('falls back to QR when Cloud not configured', async () => {
    channelsRepo.findDefaultWithSecrets = jest
      .fn()
      .mockResolvedValueOnce({ enabled: false }) // Cloud
      .mockResolvedValueOnce({ enabled: true, sessionId: 'sess-1' }); // QR

    await sendReplyToChannel(
      { merchantId: 'm', channel: 'whatsapp', sessionId: 'u2', text: 'x' },
      channelsRepo,
      chatGateway,
      evoService,
    );
    expect(evoService.sendMessage).toHaveBeenCalledWith('sess-1', 'u2', 'x');
  });

  it('throws if WhatsApp not configured', async () => {
    channelsRepo.findDefaultWithSecrets = jest
      .fn()
      .mockResolvedValueOnce({ enabled: false }) // Cloud
      .mockResolvedValueOnce({ enabled: false }); // QR

    await expect(
      sendReplyToChannel(
        { merchantId: 'm', channel: 'whatsapp', sessionId: 'u3', text: 'x' },
        channelsRepo,
        chatGateway,
        evoService,
      ),
    ).rejects.toThrow('WhatsApp not configured');
  });
});
