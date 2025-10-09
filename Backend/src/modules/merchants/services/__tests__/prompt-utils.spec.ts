import {
  buildHbsContext,
  stripGuardSections,
  GUARD_BLOCK_RX,
} from '../prompt-utils';

describe('prompt-utils', () => {
  it('builds handlebars context with merchant defaults', () => {
    const m = {
      name: 'Shop',
      categories: ['a'],
      quickConfig: { tone: 'x' },
    } as any;
    const ctx = buildHbsContext(m, { extra: 1 });
    expect(ctx.merchantName).toBe('Shop');
    expect(ctx.categories).toEqual(['a']);
    expect(ctx.quickConfig).toMatchObject({ tone: 'x' });
    expect(ctx.extra).toBe(1);
  });

  it('strips guard sections and collapses newlines', () => {
    const input = `Header\n[system-only]\nSECRET\n[another]\nBLOCK\n\n\nTail`;
    const out = stripGuardSections(input);
    expect(out).toContain('Header');
    expect(out).toContain('Tail');
    expect(out).not.toContain('SECRET');
    expect(out).not.toContain('BLOCK');
  });

  it('guard regex matches sections', () => {
    const text = `\n[system-only]\nX\n`;
    expect(GUARD_BLOCK_RX.test(text)).toBe(true);
  });
});
