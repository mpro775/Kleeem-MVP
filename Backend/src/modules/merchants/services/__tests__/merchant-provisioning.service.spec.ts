import { Test, type TestingModule } from '@nestjs/testing';

import { TranslationService } from '../../../../common/services/translation.service';
import { BusinessMetrics } from '../../../../metrics/business.metrics';
import { N8nWorkflowService } from '../../../n8n-workflow/n8n-workflow.service';
import { StorefrontService } from '../../../storefront/storefront.service';
import { MerchantProvisioningService } from '../merchant-provisioning.service';
import { PromptBuilderService } from '../prompt-builder.service';

const repo = { create: jest.fn(), remove: jest.fn(), findOne: jest.fn() };
const n8n = {
  createForMerchant: jest.fn(),
  setActive: jest.fn(),
  delete: jest.fn(),
};
const storefront = { create: jest.fn(), deleteByMerchant: jest.fn() };
const promptBuilder = { compileTemplate: jest.fn() };
const metrics = {
  incMerchantCreated: jest.fn(),
  incN8nWorkflowCreated: jest.fn(),
};
const t = { translate: (k: string) => k };

describe('MerchantProvisioningService', () => {
  let svc: MerchantProvisioningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantProvisioningService,
        { provide: 'MerchantsRepository', useValue: repo },
        { provide: N8nWorkflowService, useValue: n8n },
        { provide: StorefrontService, useValue: storefront },
        { provide: PromptBuilderService, useValue: promptBuilder },
        { provide: BusinessMetrics, useValue: metrics },
        { provide: TranslationService, useValue: t },
      ],
    }).compile();
    svc = module.get(MerchantProvisioningService);
    jest.resetAllMocks();
  });

  it('creates merchant + workflow + storefront (happy path)', async () => {
    const merchant = { id: 'm1', save: jest.fn() } as any;
    repo.create.mockResolvedValue(merchant);
    n8n.createForMerchant.mockResolvedValue('wf1');
    promptBuilder.compileTemplate.mockResolvedValue('TPL');
    storefront.create.mockResolvedValue(true);

    const res = await svc.create({ name: 'x' } as any);
    expect(res).toBe(merchant);
    expect(n8n.createForMerchant.bind(n8n)).toHaveBeenCalledWith('m1');
    expect(merchant.save).toHaveBeenCalled();
    expect(storefront.create).toHaveBeenCalled();
  });

  it('rolls back on failure', async () => {
    const merchant = { id: 'm1', save: jest.fn() } as any;
    repo.create.mockResolvedValue(merchant);
    n8n.createForMerchant.mockResolvedValue('wf1');
    promptBuilder.compileTemplate.mockResolvedValue('TPL');
    storefront.create.mockRejectedValue(new Error('boom'));

    await expect(svc.create({} as any)).rejects.toBeTruthy();
    expect(n8n.setActive.bind(n8n)).toHaveBeenCalledWith('wf1', false);
    expect(n8n.delete.bind(n8n)).toHaveBeenCalledWith('wf1');
    expect(storefront.deleteByMerchant).not.toHaveBeenCalled(); // storefront فشل قبل الإنشاء
    expect(repo.remove.bind(repo)).toHaveBeenCalledWith('m1');
  });
});
