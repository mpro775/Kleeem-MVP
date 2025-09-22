import { Injectable } from '@nestjs/common';

import { SettingsService } from '../settings/settings.service';

@Injectable()
export class CtaService {
  private counters = new Map<string, number>(); // TODO: استبدلها بـ Redis في الإنتاج

  constructor(private readonly settings: SettingsService) {}

  allow(sessionId: string, highIntent: boolean): boolean {
    if (highIntent) return true;
    const s = this.settings.cached();
    const n = s.ctaEvery ?? 3;
    const curr = this.counters.get(sessionId) ?? 0;
    const ok = curr % n === 0;
    if (ok) this.counters.set(sessionId, curr + 1);
    return ok;
  }
}
