import { WhatsAppCloudWebhookController } from '../whatsapp-cloud.webhook.controller';

describe('WhatsAppCloudWebhookController', () => {
  const makeDeps = () => {
    const cache = { set: jest.fn(), get: jest.fn(), del: jest.fn() } as any;
    const webhooksController = {
      handleIncoming: jest.fn().mockResolvedValue(undefined),
    } as any;
    return { cache, webhooksController };
  };

  const makeCtrl = () => {
    const { cache, webhooksController } = makeDeps();
    const ctrl = new WhatsAppCloudWebhookController(cache, webhooksController);
    return { ctrl, cache, webhooksController };
  };

  it('extracts message id with fallback and delegates to main controller', async () => {
    const { ctrl, webhooksController } = makeCtrl();
    const body = {
      object: 'o',
      entry: [{ changes: [{ value: { messages: [{ id: 'm1' }] } }] }],
    } as any;
    const req = { merchantId: 'm1' } as any;
    await ctrl.incoming('c1', req, body);
    expect(webhooksController.handleIncoming).toHaveBeenCalled();
  });
});
