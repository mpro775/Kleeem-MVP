import { Collections, Namespaces } from '../utils/collections';

describe('vector utils: collections and namespaces', () => {
  it('exports expected collection names', () => {
    expect(Collections.Products).toBe('products');
    expect(Collections.Offers).toBe('offers');
    expect(Collections.FAQs).toBe('faqs');
    expect(Collections.Documents).toBe('documents');
    expect(Collections.Web).toBe('web_knowledge');
    expect(Collections.BotFAQs).toBe('bot_faqs');
  });

  it('namespaces look like UUIDs', () => {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(Namespaces.Product).toMatch(uuidRe);
    expect(Namespaces.FAQ).toMatch(uuidRe);
    expect(Namespaces.Web).toMatch(uuidRe);
  });
});
