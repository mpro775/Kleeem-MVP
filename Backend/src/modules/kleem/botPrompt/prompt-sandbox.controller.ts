// src/modules/kleem/prompt-sandbox.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import axios, { AxiosInstance } from 'axios';
import { MS_PER_SECOND } from 'src/common/constants/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { VectorService } from 'src/modules/vector/vector.service';

import { CtaService } from '../cta/cta.service';
import { IntentService } from '../intent/intent.service';
import { SettingsService } from '../settings/settings.service';

import { BotPromptService } from './botPrompt.service';
import { SandboxDto } from './dto/sandbox.dto';

/** ===== Helpers ===== */
function renderPrompt(tpl: string, vars: Record<string, string>): string {
  return (tpl || '').replace(
    /\{([A-Z0-9_]+)\}/g,
    (_, k) => vars[k as keyof typeof vars] ?? `{${k}}`,
  );
}

type KnowledgeItem = { question: string; answer: string; score: number };
type SandboxResult = { raw: string; final: string; latencyMs: number };
type SandboxResponse = {
  systemPrompt: string;
  knowledge: KnowledgeItem[];
  highIntent: string;
  ctaAllowed: boolean;
  result?: SandboxResult; // في وضع dryRun لا نعيد result
};

type N8nWebhookResponse =
  | { message?: string; text?: string }
  | { [k: string]: unknown };

/** ===== Swagger Schemas (لتقصير دالة sandbox) ===== */
const KNOWLEDGE_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    answer: { type: 'string' },
    score: { type: 'number' },
  },
} as const;

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    raw: { type: 'string', description: 'الرد الخام من النموذج' },
    final: { type: 'string', description: 'الرد النهائي بعد التعديلات' },
    latencyMs: { type: 'number', description: 'زمن الاستجابة بالمللي ثانية' },
  },
} as const;

const CREATED_RESP_SCHEMA = {
  type: 'object',
  properties: {
    systemPrompt: {
      type: 'string',
      description: 'نص البرومبت النهائي بعد استبدال المتغيرات',
    },
    knowledge: {
      type: 'array',
      items: KNOWLEDGE_ITEM_SCHEMA,
      description: 'المعرفة المسترجعة من الأسئلة الشائعة',
    },
    highIntent: { type: 'string', description: 'النية المستخلصة من النص' },
    ctaAllowed: {
      type: 'boolean',
      description: 'هل مسموح بعرض دعوة للعمل',
    },
    result: RESULT_SCHEMA,
  },
} as const;

const BAD_REQUEST_SCHEMA = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 400 },
    message: { type: 'string', example: 'text is required' },
    error: { type: 'string', example: 'Bad Request' },
  },
} as const;

const FORBIDDEN_SCHEMA = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 403 },
    message: { type: 'string', example: 'Forbidden resource' },
    error: { type: 'string', example: 'Forbidden' },
  },
} as const;

const INTERNAL_SCHEMA = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 500 },
    message: { type: 'string', example: 'حدث خطأ غير متوقع' },
    error: { type: 'string', example: 'Internal Server Error' },
  },
} as const;

@Controller('admin/kleem/prompts')
@ApiTags('كليم - ساندبوكس البرومبت')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PromptSandboxController {
  private readonly n8n: AxiosInstance;

  constructor(
    private readonly prompts: BotPromptService,
    private readonly settings: SettingsService,
    private readonly intent: IntentService,
    private readonly cta: CtaService,
    private readonly vector: VectorService,
  ) {
    this.n8n = axios.create({
      baseURL: process.env.N8N_BASE_URL || 'https://n8n.kaleem-ai.com',
      timeout: MS_PER_SECOND * 15,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ====== صغار مساعدة لتصغير sandbox ======
  private async prepareSystemPrompt(): Promise<string> {
    const sysTemplate = await this.prompts.getActiveSystemPrompt();
    const s = await this.settings.get();
    return renderPrompt(sysTemplate, {
      LAUNCH_DATE: s.launchDate,
      APPLY_URL: s.applyUrl,
      INTEGRATIONS_NOW: s.integrationsNow,
      TRIAL_OFFER: s.trialOffer,
      YEMEN_NEXT: s.yemenNext,
      YEMEN_POSITIONING: s.yemenPositioning,
    });
  }

  private async fetchKnowledgeIfNeeded(
    text: string,
    attachKnowledge?: boolean,
    topK?: number,
  ): Promise<{ knowledge: KnowledgeItem[]; systemPrompt: string }> {
    let knowledge: KnowledgeItem[] = [];
    let systemPrompt = await this.prepareSystemPrompt();

    if (attachKnowledge !== false) {
      const k = topK && topK > 0 ? topK : 5;
      const kn = await this.vector.searchBotFaqs(text, k);
      knowledge = kn.map((r) => ({
        question: String(r.question ?? ''),
        answer: String(r.answer ?? ''),
        score: Number(r.score ?? 0),
      }));
      if (knowledge.length) {
        const lines = knowledge
          .map((r) => `- Q: ${r.question}\n  A: ${r.answer}`)
          .join('\n');
        systemPrompt += `\n\n# Knowledge (use if relevant)\n${lines}\n`;
      }
    }
    return { knowledge, systemPrompt };
  }

  private analyzeIntent(text: string): {
    highIntent: string;
    ctaAllowed: boolean;
  } {
    const highIntent = this.intent.highIntent(text);
    const ctaAllowed = this.cta.allow('sandbox', highIntent);
    return { highIntent: highIntent ? 'high' : 'low', ctaAllowed };
  }

  private async callN8n(
    text: string,
    systemPrompt: string,
  ): Promise<{ raw: string; latencyMs: number }> {
    const started = Date.now();
    const resp = await this.n8n.post<N8nWebhookResponse>(
      '/webhook-test/webhooks/kleem/sandbox',
      { text, prompt: systemPrompt },
    );
    const latencyMs = Date.now() - started;

    const data = resp.data;
    const msg =
      (typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : undefined) ??
      (typeof (data as { text?: unknown }).text === 'string'
        ? (data as { text: string }).text
        : undefined);

    return { raw: msg ?? '', latencyMs };
  }

  private buildPiiRegex(keywords: string[]): RegExp {
    const esc = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return esc.length > 0 ? new RegExp(esc.join('|'), 'i') : /a^/;
  }

  private async postProcess(raw: string, ctaAllowed: boolean): Promise<string> {
    const s = await this.settings.get();
    const piiRe = this.buildPiiRegex(s.piiKeywords || []);

    let final = raw;
    if (piiRe.test(final)) {
      final += `\n\nحرصًا على الخصوصية، لا نجمع بيانات شخصية داخل المحادثة. للبدء يوم الإطلاق: ${s.applyUrl}`;
    }
    if (!ctaAllowed) {
      final = final
        .replace(/(صفحة التقديم[:：]?\s*https?:\/\/\S+)/gi, '')
        .replace(/(للبدء يوم الإطلاق[:：]?\s*https?:\/\/\S+)/gi, '')
        .trim();
    } else if (!/https?:\/\/\S+/i.test(final)) {
      final += `\n\nللبدء يوم الإطلاق: ${s.applyUrl}`;
    }
    return final;
  }

  private validateInput(body: SandboxDto): string {
    const text = body.text?.trim();
    if (!text) throw new BadRequestException('text is required');
    return text;
  }

  private buildDryRunResponse(
    knowledge: KnowledgeItem[],
    systemPrompt: string,
    highIntent: string,
    ctaAllowed: boolean,
  ): SandboxResponse {
    return { systemPrompt, knowledge, highIntent, ctaAllowed };
  }

  private buildFinalResponse(
    knowledge: KnowledgeItem[],
    systemPrompt: string,
    highIntent: string,
    ctaAllowed: boolean,
    raw: string,
    final: string,
    latencyMs: number,
  ): SandboxResponse {
    return {
      systemPrompt,
      knowledge,
      highIntent,
      ctaAllowed,
      result: { raw, final, latencyMs },
    };
  }

  // ====== Endpoint ======
  @Post('sandbox')
  @ApiOperation({
    summary: 'اختبار نموذج البرومبت',
    description:
      'إرسال رسالة إلى نموذج البرومبت والحصول على الرد مع معلومات إضافية',
  })
  @ApiBody({ type: SandboxDto })
  @ApiCreatedResponse({
    description: 'تم معالجة الطلب بنجاح',
    schema: CREATED_RESP_SCHEMA,
  })
  @ApiBadRequestResponse({
    description: 'طلب غير صالح - النص مطلوب',
    schema: BAD_REQUEST_SCHEMA,
  })
  @ApiForbiddenResponse({
    description: 'غير مصرح - يجب أن تكون مسؤولاً',
    schema: FORBIDDEN_SCHEMA,
  })
  @ApiInternalServerErrorResponse({
    description: 'خطأ داخلي في الخادم',
    schema: INTERNAL_SCHEMA,
  })
  async sandbox(@Body() body: SandboxDto): Promise<SandboxResponse> {
    const text = this.validateInput(body);

    const { knowledge, systemPrompt } = await this.fetchKnowledgeIfNeeded(
      text,
      body.attachKnowledge,
      body.topK,
    );

    const { highIntent, ctaAllowed } = this.analyzeIntent(text);

    if (body.dryRun) {
      return this.buildDryRunResponse(
        knowledge,
        systemPrompt,
        highIntent,
        ctaAllowed,
      );
    }

    const { raw, latencyMs } = await this.callN8n(text, systemPrompt);
    const final = await this.postProcess(raw, ctaAllowed);

    return this.buildFinalResponse(
      knowledge,
      systemPrompt,
      highIntent,
      ctaAllowed,
      raw,
      final,
      latencyMs,
    );
  }
}
