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
      baseURL: (
        process.env.N8N_BASE_URL ||
        process.env.N8N_API_URL ||
        'http://n8n:5678'
      ).replace(/\/+$/, ''),
      timeout: 15000,
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
  private typingIntervals = new Map<string, ReturnType<typeof setInterval>>();

  private startTyping(sessionId: string) {
    // أرسل إشارة فورًا
    this.events.emit('kleem.typing', { sessionId, role: 'bot' as const });
    // نبض كل 1.5 ثانية حتى نتوقف
    if (this.typingIntervals.has(sessionId)) return;
    const id = setInterval(() => {
      this.events.emit('kleem.typing', { sessionId, role: 'bot' as const });
    }, 1500);
    this.typingIntervals.set(sessionId, id);
  }

  stopTyping(sessionId: string) {
    const id = this.typingIntervals.get(sessionId);
    if (id) clearInterval(id);
    this.typingIntervals.delete(sessionId);
    // (اختياري) أرسل bot_done لو تحب تستخدمه للفصل النهائي
    // this.events.emit('kleem.bot_done', { sessionId });
  }
  async handleUserMessage(
    sessionId: string,
    text: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.chats.createOrAppend(sessionId, [
      { role: 'user', text, metadata: metadata ?? {} },
    ]);
    this.events.emit('kleem.admin_new_message', {
      sessionId,
      message: { role: 'user', text },
    });

    // ✅ فعّل “يكتب الآن” فورًا
    this.startTyping(sessionId);

    const systemPrompt = await this.buildSystemPrompt(text);
    try {
      await this.n8n.post('/webhook/webhooks/kleem/incoming', {
        bot: 'kleem',
        sessionId,
        channel: 'webchat',
        text,
        prompt: systemPrompt,
        policy: {
          allowCTA: this.cta.allow(sessionId, this.intent.highIntent(text)),
        },
        meta: metadata ?? {},
      });
    } catch (err) {
      this.logger.error('[n8n] failed to post user message', err as Error);
      // إن فشل، أوقف النبض بعد ثانيتين حتى لا تبقى تومض
      setTimeout(() => this.stopTyping(sessionId), 2000);
    }
    return { status: 'queued' as const };
  }
}
