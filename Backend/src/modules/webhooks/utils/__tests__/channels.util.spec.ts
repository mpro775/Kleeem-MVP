import { isBotEnabled, toProvider } from '../../utils/channels.util';

describe('channels.util', () => {
  it('toProvider maps public channel to provider', () => {
    expect(toProvider('whatsapp')).toBe('whatsapp_cloud');
    expect(toProvider('telegram')).toBe('telegram');
    expect(toProvider('webchat')).toBe('webchat');
    expect(toProvider('dashboard-test' as any)).toBeUndefined();
  });

  it('isBotEnabled checks default channel enabled flag', async () => {
    const channelsRepo = {
      findDefault: jest.fn().mockResolvedValue({ enabled: true }),
    } as any;
    await expect(isBotEnabled('m', 'whatsapp', channelsRepo)).resolves.toBe(
      true,
    );
  });
});
