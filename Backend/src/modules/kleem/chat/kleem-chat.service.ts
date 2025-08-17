import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios, { AxiosInstance } from 'axios';
import { BotChatsService } from '../botChats/botChats.service';
import { BotPromptService } from '../botPrompt/botPrompt.service';
import { KleemWsMessage } from '../ws/kleem-ws.types';
import { SettingsService } from '../settings/settings.service';
import { IntentService } from '../intent/intent.service';
import { CtaService } from '../cta/cta.service';
import { renderPrompt } from '../common/template.service';
import { VectorService } from 'src/modules/vector/vector.service';

@Injectable()
export class KleemChatService {
  private readonly logger = new Logger(KleemChatService.name);
  private readonly n8n: AxiosInstance;

  constructor(
    private readonly chats: BotChatsService,
    private readonly prompts: BotPromptService,
    private readonly settings: SettingsService,
    private readonly intent: IntentService,
    private readonly cta: CtaService,
    private readonly vector: VectorService,
    private readonly events: EventEmitter2,
  ) {
    this.n8n = axios.create({
      baseURL: process.env.N8N_BASE_URL || 'https://n8n.kaleem-ai.com',
      timeout: 15_000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async buildSystemPrompt(userText: string): Promise<string> {
    const sys = await this.prompts.getActiveSystemPrompt();
    const s = await this.settings.get();

    // 1) حقن المتغيّرات
    let systemPrompt = renderPrompt(sys, {
      LAUNCH_DATE: s.launchDate,
      APPLY_URL: s.applyUrl,
      INTEGRATIONS_NOW: s.integrationsNow,
      TRIAL_OFFER: s.trialOffer,
      YEMEN_NEXT: s.yemenNext,
      YEMEN_POSITIONING: s.yemenPositioning,
    });

    // 2) Knowledge (FAQs) — اختياري لكن مفيد
    try {
      const kn = await this.vector.searchBotFaqs(userText, 5);
      if (kn?.length) {
        const lines = kn
          .map((r) => `- Q: ${r.question}\n  A: ${r.answer}`)
          .join('\n');
        systemPrompt += `\n\n# Knowledge (use if relevant)\n${lines}\n`;
      }
    } catch (e) {
      this.logger.warn(
        '[buildSystemPrompt] failed RAG: ' + (e as Error).message,
      );
    }

    return systemPrompt;
  }

  async handleUserMessage(
    sessionId: string,
    text: string,
    metadata?: Record<string, unknown>,
  ) {
    // 1) خزّن رسالة المستخدم
    await this.chats.createOrAppend(sessionId, [
      { role: 'user', text, metadata: metadata ?? {} },
    ]);

    // 2) بثّ للمشرفين
    this.events.emit('kleem.admin_new_message', {
      sessionId,
      message: { role: 'user', text } as KleemWsMessage,
    });

    // 3) تحليل نية + سياسة CTA
    const high = this.intent.highIntent(text);
    const allowCTA = this.cta.allow(sessionId, high);

    // 4) ابنِ System Prompt كامل من الباك
    const systemPrompt = await this.buildSystemPrompt(text);

    // 5) أرسل إلى n8n مبسّطًا
    try {
      await this.n8n.post('/webhook/webhooks/kleem/incoming', {
        bot: 'kleem',
        sessionId,
        channel: 'webchat',
        text,
        prompt: systemPrompt, // جاهز للاستخدام مباشرة
        // مرّر قرارات الباك إن احتجت استعمالها داخل n8n (اختياري)
        policy: { allowCTA },
        meta: metadata ?? {},
      });
    } catch (err) {
      this.logger.error('[n8n] failed to post user message', err as Error);
    }

    return { status: 'queued' as const };
  }
}
