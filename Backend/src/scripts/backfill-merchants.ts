// src/scripts/backfill-merchants.ts
/* eslint-disable no-console */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';

import { MerchantsService } from '../modules/merchants/merchants.service';
import { StorefrontService } from '../modules/storefront/storefront.service';
import {
  Merchant,
  MerchantDocument,
} from '../modules/merchants/schemas/merchant.schema';
import {
  Storefront,
  StorefrontDocument,
} from '../modules/storefront/schemas/storefront.schema';
import { N8nWorkflowService } from 'src/modules/n8n-workflow/n8n-workflow.service';
import { PromptBuilderService } from 'src/modules/merchants/services/prompt-builder.service';

type OnlyKind = 'workflow' | 'prompt' | 'storefront' | 'all';
const argv = process.argv.slice(2);
const getArg = (name: string) => {
  const i = argv.findIndex(
    (a) => a === `--${name}` || a.startsWith(`--${name}=`),
  );
  if (i === -1) return undefined;
  const v = argv[i];
  const eq = v.indexOf('=');
  return eq > -1 ? v.slice(eq + 1) : argv[i + 1];
};

const DRY_RUN = argv.includes('--dry-run');
const LIMIT = Number(getArg('limit') ?? '0'); // 0 = no limit
const ONLY = (getArg('only') as OnlyKind) ?? 'all';
const ONLY_MERCHANT = getArg('merchant'); // id
const CONCURRENCY = Number(getArg('concurrency') ?? '1');

const logger = new Logger('BackfillMerchants');

async function run() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const merchantModel = app.get<Model<MerchantDocument>>(
    getModelToken(Merchant.name),
  );
  const storefrontModel = app.get<Model<StorefrontDocument>>(
    getModelToken(Storefront.name),
  );

  const merchantsService = app.get(MerchantsService);
  const n8n = app.get(N8nWorkflowService);
  const promptBuilder = app.get(PromptBuilderService);
  const storefrontService = app.get(StorefrontService);

  // ⚠️ نعالج الجميع افتراضيًا (لأن نقص storefront لا يُكتشف بفيلتر على merchants فقط)
  let filter: any = ONLY_MERCHANT
    ? { _id: new Types.ObjectId(ONLY_MERCHANT) }
    : {};
  const query = merchantModel.find(filter).sort({ _id: 1 });
  if (LIMIT > 0) query.limit(LIMIT);

  const cursor = query.cursor();

  let total = 0,
    fixedWorkflow = 0,
    fixedPrompt = 0,
    fixedStorefront = 0,
    fixedSlug = 0,
    errors = 0;
  const queue: MerchantDocument[] = [];

  async function ensurePublicSlug(m: MerchantDocument) {
    const slug = (m as any).publicSlug;
    if (!slug || String(slug).trim() === '') {
      const newSlug = `m-${String(m._id)}`;
      logger.log(`[${m._id}] Missing publicSlug → set to ${newSlug}`);
      if (!DRY_RUN) {
        (m as any).publicSlug = newSlug;
        await m.save();
      }
      fixedSlug++;
    }
  }

  async function ensureWorkflow(m: MerchantDocument) {
    const idStr = String(m._id);
    let wfId = m.workflowId ? String(m.workflowId) : '';
    let needsCreate = !wfId;

    if (wfId) {
      try {
        await n8n.get(wfId); // يتأكد فعلاً موجود في n8n
      } catch (e: any) {
        const status = e?.response?.status;
        if (status === 404) {
          logger.warn(
            `[${idStr}] workflowId=${wfId} dangling (404 in n8n) → recreate`,
          );
          needsCreate = true;
        } else {
          throw e;
        }
      }
    }

    if (needsCreate && (ONLY === 'all' || ONLY === 'workflow')) {
      logger.log(`[${idStr}] Create workflow in n8n`);
      if (!DRY_RUN) {
        wfId = await n8n.createForMerchant(idStr);
        try {
          await n8n.setActive(wfId, true);
        } catch {}
        m.workflowId = wfId as any;
        await m.save();
      }
      fixedWorkflow++;
    }
  }

  async function ensurePrompt(m: MerchantDocument) {
    if (!(ONLY === 'all' || ONLY === 'prompt')) return;
    const missing =
      !m.finalPromptTemplate || m.finalPromptTemplate.trim() === '';
    if (missing) {
      logger.log(`[${m._id}] Missing finalPromptTemplate → compile`);
      if (!DRY_RUN) {
        const tpl = await promptBuilder.compileTemplate(m);
        m.finalPromptTemplate = tpl || '';
        await m.save();
      }
      fixedPrompt++;
    }
  }

  async function ensureStorefront(m: MerchantDocument) {
    if (!(ONLY === 'all' || ONLY === 'storefront')) return;
    // انتبه لنوع merchant في سكيمة الـ storefront؛ جرب بـ ObjectId ثم string
    let exists = await storefrontModel.exists({ merchant: m._id as any });
    if (!exists)
      exists = await storefrontModel.exists({ merchant: String(m._id) as any });

    if (!exists) {
      const slug =
        (m as any).publicSlug && typeof (m as any).publicSlug === 'string'
          ? (m as any).publicSlug
          : String(m._id);

      logger.log(`[${m._id}] Missing storefront → create (slug=${slug})`);
      if (!DRY_RUN) {
        await storefrontService.create({
          merchant: String(m._id),
          primaryColor: '#FF8500',
          secondaryColor: '#1976d2',
          buttonStyle: 'rounded',
          banners: [],
          featuredProductIds: [],
          slug,
        });
      }
      fixedStorefront++;
    }
  }

  async function processOne(m: MerchantDocument) {
    total++;
    const idStr = String(m._id);
    try {
      await ensurePublicSlug(m);
      await ensureWorkflow(m);
      await ensurePrompt(m);
      await ensureStorefront(m);
      logger.log(`[${idStr}] ✅ done`);
    } catch (e: any) {
      errors++;
      logger.error(`[${idStr}] ❌ failed`, {
        status: e?.response?.status,
        data: e?.response?.data,
        msg: e?.message || String(e),
      } as any);
    }
  }

  for await (const m of cursor) {
    queue.push(m as MerchantDocument);
    if (queue.length >= CONCURRENCY) {
      await Promise.all(queue.splice(0).map(processOne));
    }
  }
  if (queue.length) await Promise.all(queue.splice(0).map(processOne));

  logger.log('==================== SUMMARY ====================');
  logger.log(`Total scanned:     ${total}`);
  logger.log(`Slugs fixed:       ${fixedSlug}`);
  if (ONLY === 'all' || ONLY === 'workflow')
    logger.log(`Workflows fixed:   ${fixedWorkflow}`);
  if (ONLY === 'all' || ONLY === 'prompt')
    logger.log(`Prompts fixed:     ${fixedPrompt}`);
  if (ONLY === 'all' || ONLY === 'storefront')
    logger.log(`Storefronts fixed: ${fixedStorefront}`);
  logger.log(`Errors:            ${errors}`);
  logger.log(`Dry-run:           ${DRY_RUN ? 'YES' : 'NO'}`);

  await app.close();
}

run().catch((e) => {
  logger.error(e?.stack || e?.message || String(e));
  process.exit(1);
});
