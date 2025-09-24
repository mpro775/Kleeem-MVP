import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { AxiosError } from 'axios';

import { MerchantsService } from '../merchants/merchants.service';
import { WorkflowHistoryService } from '../workflow-history/workflow-history.service';

import {
  N8nClientRepository,
  WorkflowCreatePayload,
} from './repositories/n8n-client.repository';
import { N8N_CLIENT } from './tokens';
import { WorkflowDefinition } from './types';
import templateJson from './workflow-template.json';

function setWebhookPath(raw: unknown, merchantId: string) {
  if (!raw || typeof raw !== 'object' || !('nodes' in raw)) return;

  const nodes = (raw as { nodes: unknown[] }).nodes;
  if (!Array.isArray(nodes)) return;

  const hook = nodes.find((n: unknown) => {
    return (
      n &&
      typeof n === 'object' &&
      'type' in n &&
      n.type === 'n8n-nodes-base.webhook'
    );
  });

  if (
    hook &&
    typeof hook === 'object' &&
    'parameters' in hook &&
    hook.parameters &&
    typeof hook.parameters === 'object'
  ) {
    (hook.parameters as { path: string }).path = `ai-agent-${merchantId}`;
  }
}

/** تنظيف قالب الـ JSON قبل الإرسال إلى n8n */
function sanitizeTemplate(raw: unknown): WorkflowCreatePayload {
  type NodeDef = WorkflowCreatePayload['nodes'][number];

  const isObj = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);
  const isStr = (v: unknown): v is string => typeof v === 'string';
  const isNum = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v);
  const isPos = (v: unknown): v is [number, number] =>
    Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]);
  const asRecord = (v: unknown): Record<string, unknown> => (isObj(v) ? v : {});
  const get = (o: unknown, k: string): unknown => (isObj(o) ? o[k] : undefined);
  const isCred = (v: unknown): v is { name: string } =>
    isObj(v) && isStr(v.name);

  const toNodeDef = (rawNode: unknown): NodeDef | null => {
    if (!isObj(rawNode)) return null;

    const nameRaw = get(rawNode, 'name');
    const typeRaw = get(rawNode, 'type');
    const verRaw = get(rawNode, 'typeVersion');

    if (!isStr(nameRaw) || !isStr(typeRaw) || !isNum(verRaw)) return null;

    const posRaw = get(rawNode, 'position');
    const parametersRaw = get(rawNode, 'parameters');
    const credsRaw = get(rawNode, 'credentials');

    const position: [number, number] = isPos(posRaw) ? posRaw : [0, 0];
    const parameters: Record<string, unknown> = asRecord(parametersRaw);

    let credentials: Record<string, { name: string }> | undefined;
    if (isObj(credsRaw)) {
      const validEntries = Object.entries(credsRaw).filter(([, v]) =>
        isCred(v),
      ) as [string, { name: string }][];
      const entries = validEntries.map(([k, v]) => [k, { name: v.name }]);
      credentials = entries.length
        ? (Object.fromEntries(entries) as Record<string, { name: string }>)
        : undefined;
    }

    return {
      name: nameRaw,
      type: typeRaw,
      typeVersion: verRaw,
      position,
      parameters,
      ...(credentials && { credentials }),
    };
  };

  const nameVal = get(raw, 'name');
  const nodesVal = get(raw, 'nodes');
  const connectionsVal = get(raw, 'connections');
  const settingsVal = get(raw, 'settings');

  const name = isStr(nameVal) ? nameVal : 'Untitled Workflow';
  const nodes: NodeDef[] = Array.isArray(nodesVal)
    ? nodesVal.map(toNodeDef).filter((n): n is NodeDef => n !== null)
    : [];
  const connections: Record<string, unknown> = asRecord(connectionsVal);
  const settings: Record<string, unknown> | undefined = isObj(settingsVal)
    ? settingsVal
    : undefined;

  return { name, nodes, connections, ...(settings && { settings }) };
}

@Injectable()
export class N8nWorkflowService {
  private readonly logger = new Logger(N8nWorkflowService.name);

  constructor(
    private readonly history: WorkflowHistoryService,
    @Inject(forwardRef(() => MerchantsService))
    private readonly merchants: MerchantsService,
    @Inject(N8N_CLIENT)
    private readonly n8n: N8nClientRepository,
  ) {}

  private wrapError(err: unknown, action: string): never {
    // أخلي الرسالة موحدة كما كانت
    const status =
      (err as AxiosError)?.status ??
      (err as AxiosError)?.response?.status ??
      HttpStatus.INTERNAL_SERVER_ERROR;
    const message = (err as AxiosError)?.message ?? 'Unknown error';
    throw new HttpException(`n8n API ${action} failed: ${message}`, status);
  }

  /** إنشاء workflow جديد للتاجر */
  async createForMerchant(merchantId: string): Promise<string> {
    const raw = JSON.parse(JSON.stringify(templateJson)) as { name: string };
    raw.name = `wf-${merchantId}`;
    setWebhookPath(raw, merchantId);

    const payload = sanitizeTemplate(raw);
    const wfId = await this.n8n.createWorkflow(payload);

    try {
      await this.n8n.setActive(wfId, true);
    } catch (e) {
      this.logger.warn(`activate failed`, e);
    }

    await this.merchants.update(merchantId, { workflowId: wfId });
    await this.history.create({
      merchantId,
      workflowId: wfId,
      version: 1,
      workflowJson: payload,
      updatedBy: 'system',
      isRollback: false,
    });

    return wfId;
  }

  /** جلب الـ JSON الكامل */
  async get(workflowId: string): Promise<WorkflowDefinition> {
    try {
      return await this.n8n.getWorkflow(workflowId);
    } catch (err) {
      this.wrapError(err, 'GET');
    }
  }

  /** تعديل الـ workflow */
  async update(
    workflowId: string,
    updateFn: (json: WorkflowDefinition) => WorkflowDefinition,
    updatedBy: string,
  ): Promise<void> {
    try {
      const current = await this.get(workflowId);
      const prev = await this.history.findAllByWorkflow(workflowId);
      const nextVer = prev.length ? prev[0].version + 1 : 1;
      const newJson = updateFn(current);

      await this.n8n.patchWorkflow(workflowId, newJson);
      await this.history.create({
        merchantId: current.name.replace('wf-', ''),
        workflowId,
        version: nextVer,
        workflowJson: newJson,
        updatedBy,
        isRollback: false,
      });
    } catch (err) {
      this.wrapError(err, 'UPDATE');
    }
  }

  /** استرجاع نسخة قديمة */
  async rollback(
    workflowId: string,
    version: string | number,
    updatedBy: string,
  ): Promise<void> {
    try {
      const hist = await this.history.findVersion(workflowId, +version);
      if (!hist) {
        throw new HttpException(
          'Requested version not found',
          HttpStatus.NOT_FOUND,
        );
      }
      await this.n8n.patchWorkflow(workflowId, hist.workflowJson);
      await this.history.create({
        merchantId: hist.merchantId,
        workflowId,
        version: hist.version + 1,
        workflowJson: hist.workflowJson,
        updatedBy,
        isRollback: true,
      });
    } catch (err) {
      this.wrapError(err, 'ROLLBACK');
    }
  }

  /** استنساخ workflow */
  async cloneToMerchant(
    sourceId: string,
    targetMerchantId: string,
    createdBy: string,
  ): Promise<string> {
    const source = await this.get(sourceId);
    const raw = JSON.parse(JSON.stringify(source)) as { name: string };

    raw.name = `wf-${targetMerchantId}`;
    setWebhookPath(raw, targetMerchantId);

    const payload = sanitizeTemplate(raw);
    const wfId = await this.n8n.createWorkflow(payload);

    try {
      await this.n8n.setActive(wfId, true);
    } catch (e) {
      this.logger.warn(`activate failed`, e);
    }

    await this.merchants.update(targetMerchantId, { workflowId: wfId });
    await this.history.create({
      merchantId: targetMerchantId,
      workflowId: wfId,
      version: 1,
      workflowJson: payload,
      updatedBy: createdBy,
      isRollback: false,
    });
    return wfId;
  }

  async delete(workflowId: string): Promise<void> {
    try {
      await this.n8n.deleteWorkflow(workflowId);
    } catch (err) {
      this.wrapError(err, 'DELETE');
    }
  }

  /** تفعيل/تعطيل workflow */
  async setActive(workflowId: string, active: boolean): Promise<void> {
    try {
      await this.n8n.setActive(workflowId, active);
    } catch (err) {
      this.wrapError(err, 'SET ACTIVE');
    }
  }
}
