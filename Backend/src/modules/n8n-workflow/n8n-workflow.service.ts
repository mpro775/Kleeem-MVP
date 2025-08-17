// src/modules/n8n-workflow/n8n-workflow.service.ts

import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

import templateJson from './workflow-template.json';

import { WorkflowHistoryService } from '../workflow-history/workflow-history.service';
import { MerchantsService } from '../merchants/merchants.service';

function setWebhookPath(raw: any, merchantId: string) {
  const hook = Array.isArray(raw?.nodes)
    ? raw.nodes.find((n: any) => n?.type === 'n8n-nodes-base.webhook')
    : undefined;
  if (hook?.parameters) {
    hook.parameters.path = `ai-agent-${merchantId}`; // مسار فريد لكل تاجر
  }
  // لا ترسِل webhookId إطلاقًا (sanitizeTemplate يتولى عدم نسخه)
}

/**
 * الهيكل الكامل الذي يعيده n8n عند GET /workflows/:id
 */
export interface WorkflowDefinition {
  id?: string;
  name: string;
  nodes: Array<{
    name: string;
    type: string;
    typeVersion: number;
    position: [number, number];
    parameters: Record<string, unknown>;
    credentials?: Record<string, { name: string }>;
  }>;
  connections: Record<string, unknown>;
  active: boolean;
  settings: Record<string, unknown>;
  pinData: Record<string, unknown>;
  // قد يحتوي على حقول أخرى مثل 'createdAt' و 'updatedAt'، يمكنك إضافتها إذا استعملتها
}

/**
 * الهيكل المسموح به عند POST /workflows
 */
interface WorkflowCreatePayload {
  name: string;
  nodes: Array<{
    name: string;
    type: string;
    typeVersion: number;
    position: [number, number];
    parameters: Record<string, unknown>;
    credentials?: Record<string, { name: string }>;
  }>;
  connections: Record<string, unknown>;
  active?: boolean;
  settings?: Record<string, unknown>;
  staticData?: Record<string, unknown>;
}

@Injectable()
export class N8nWorkflowService {
  private api: AxiosInstance;
  private readonly logger = new Logger(N8nWorkflowService.name);

  constructor(
    private readonly history: WorkflowHistoryService,
    @Inject(forwardRef(() => MerchantsService))
    private readonly merchants: MerchantsService,
  ) {
    const keyName = 'X-N8N-API-KEY';
    const apiKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4N2M4NjU2OS01ZGFmLTQyNjYtOTVhYy04OTQxY2U1YWVhZTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTk0MjE3LCJleHAiOjE3NTc3MzYwMDB9.LEFrlXhDS6E1Urrst5GMy63ebz4ZaeMP7RNylkk_Rlk';
    const baseUrl = 'https://n8n.kaleem-ai.com'.replace(/\/+$/, '');

    this.logger.log(`▶️ [n8n.baseURL] = ${baseUrl}`);
    this.logger.log(`▶️ [n8n.header]  = ${keyName}: ${apiKey}`);

    this.api = axios.create({
      baseURL: `${baseUrl}/api/v1`,
      headers: { [keyName]: apiKey },
      timeout: 5000,
    });
  }

  private wrapError(err: any, action: string): never {
    this.logger.error(`n8n API ${action} raw error`, {
      status: err.response?.status,
      data: err.response?.data,
      msg: err.message,
    });
    const status = err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      err.response?.data?.message || err.message || 'Unknown error';
    throw new HttpException(`n8n API ${action} failed: ${message}`, status);
  }

  /** نظّف القالب من الحقول غير المدعومة */
  private sanitizeTemplate(raw: unknown): WorkflowCreatePayload {
    // ---------- helpers ----------
    type NodeDef = WorkflowCreatePayload['nodes'][number];

    const isObj = (v: unknown): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null && !Array.isArray(v);
    const isStr = (v: unknown): v is string => typeof v === 'string';
    const isNum = (v: unknown): v is number =>
      typeof v === 'number' && Number.isFinite(v);
    const isPos = (v: unknown): v is [number, number] =>
      Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]);
    const asRecord = (v: unknown): Record<string, unknown> =>
      isObj(v) ? v : {};
    const get = (o: unknown, k: string): unknown => {
      if (!isObj(o)) return undefined;
      return o[k]; // ✅ بعد الـ guard صار o: Record<string, unknown>
    };

    const isCred = (v: unknown): v is { name: string } =>
      isObj(v) && isStr(v.name);

    const toNodeDef = (rawNode: unknown): NodeDef | null => {
      if (!isObj(rawNode)) return null;

      const nameRaw = get(rawNode, 'name');
      const typeRaw = get(rawNode, 'type');
      const verRaw = get(rawNode, 'typeVersion');

      if (!isStr(nameRaw) || !isStr(typeRaw) || !isNum(verRaw)) {
        return null;
      }

      const posRaw = get(rawNode, 'position');
      const parametersRaw = get(rawNode, 'parameters');
      const credsRaw = get(rawNode, 'credentials');

      const position: [number, number] = isPos(posRaw) ? posRaw : [0, 0];
      const parameters: Record<string, unknown> = asRecord(parametersRaw);

      let credentials: Record<string, { name: string }> | undefined;
      if (isObj(credsRaw)) {
        const entries = Object.entries(credsRaw)
          .filter(([, v]) => isCred(v))
          .map(([k, v]) => [k, { name: (v as { name: string }).name }]);
        if (entries.length) credentials = Object.fromEntries(entries);
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

    // ---------- pick only allowed top-level fields ----------
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

    // ⚠️ لا نُدرج: active, pinData, staticData, id, versionId, meta, tags
    // لأن n8n يرفضها عند POST /workflows (active read-only وقت الإنشاء)

    const payload: WorkflowCreatePayload = {
      name,
      nodes,
      connections,
      ...(settings && { settings }),
    };

    return payload;
  }

  /** إنشاء workflow جديد */
  async createForMerchant(merchantId: string): Promise<string> {
    const raw = JSON.parse(JSON.stringify(templateJson));
    raw.name = `wf-${merchantId}`;
    setWebhookPath(raw, merchantId);

    const payload = this.sanitizeTemplate(raw); // ← يزيل id/webhookId/active/...
    const resp = await this.api.post('/workflows', payload);
    const wfId = (resp.data as { id: string }).id;

    try {
      await this.setActive(wfId, true);
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
      const resp = await this.api.get<WorkflowDefinition>(
        `/workflows/${workflowId}`,
      );
      return resp.data;
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

      await this.api.patch(`/workflows/${workflowId}`, newJson);
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
      await this.api.patch(`/workflows/${workflowId}`, hist.workflowJson);
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
    const raw = JSON.parse(JSON.stringify(source));

    raw.name = `wf-${targetMerchantId}`;
    setWebhookPath(raw, targetMerchantId);

    const payload = this.sanitizeTemplate(raw); // ← يمنع تسريب webhookId و node.id و active...
    const resp = await this.api.post('/workflows', payload);
    const wfId = (resp.data as { id: string }).id;

    try {
      await this.setActive(wfId, true);
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

  /** تفعيل/تعطيل workflow */
  async setActive(workflowId: string, active: boolean): Promise<void> {
    try {
      const action = active ? 'activate' : 'deactivate';
      await this.api.post(`/workflows/${workflowId}/${action}`);
    } catch (err) {
      this.wrapError(err, 'SET ACTIVE');
    }
  }
}
