import { Injectable } from '@nestjs/common';

import { SettingsService } from '../settings/settings.service';

@Injectable()
export class IntentService {
  constructor(private readonly settings: SettingsService) {}

  highIntent(text: string): boolean {
    const s = this.settings.cached();
    const arr = (s.highIntentKeywords || [])
      .map((k) => k.trim())
      .filter(Boolean);
    if (!arr.length) return false;
    const any = arr
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    const re = new RegExp(`(${any})`, 'i');
    return re.test(text || '');
  }
}
