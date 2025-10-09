import {
  inferMediaType,
  normalizeIncomingMessage,
} from '../../utils/normalize-incoming';

describe('normalize-incoming utils', () => {
  it('infers media type from mime and name', () => {
    expect(inferMediaType('application/pdf', 'x.pdf')).toBe('pdf');
    expect(inferMediaType('image/png', 'photo.png')).toBe('image');
    expect(inferMediaType('audio/mpeg', 'a.mp3')).toBe('audio');
    expect(inferMediaType('video/mp4', 'v.mp4')).toBe('video');
    expect(inferMediaType('', '')).toBe('document');
  });

  it('normalizes Telegram messages', () => {
    const body = {
      update_id: 1,
      message: {
        message_id: 10,
        chat: { id: 123 },
        text: 'hello',
      },
    };
    const out = normalizeIncomingMessage(body, 'm1');
    expect(out.channel).toBe('telegram');
    expect(out.sessionId).toBe('123');
    expect(out.text).toBe('hello');
    expect(out.platformMessageId).toBe('10');
  });

  it('fallbacks to webchat when no parser matches', () => {
    const out = normalizeIncomingMessage({ foo: 'bar' }, 'm');
    expect(out.channel).toBe('webchat');
    expect(out.merchantId).toBe('m');
  });
});
