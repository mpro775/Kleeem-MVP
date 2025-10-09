import { WebhooksController } from '../webhooks.controller';

describe('WebhooksController (light)', () => {
  it('constructs with minimal deps (no runtime)', () => {
    const service = {} as any; // not exercising methods, just ensuring import path covered
    const channelsRepo = {} as any; // mock channels repository
    const ctrl = new WebhooksController(service, channelsRepo);
    expect(ctrl).toBeDefined();
  });
});
