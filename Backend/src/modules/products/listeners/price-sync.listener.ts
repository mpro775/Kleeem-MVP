// src/modules/products/listeners/price-sync.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  CURRENCY_EVENTS,
  ExchangeRatesUpdatedEvent,
  BaseCurrencyChangedEvent,
  SupportedCurrenciesChangedEvent,
} from '../../merchants/services/currency.service';
import { PriceSyncService } from '../services/price-sync.service';

/**
 * PriceSyncListener
 * يستمع لأحداث تغيير إعدادات العملات ويقوم بمزامنة أسعار المنتجات
 */
@Injectable()
export class PriceSyncListener {
  private readonly logger = new Logger(PriceSyncListener.name);

  constructor(private readonly priceSyncService: PriceSyncService) {}

  /**
   * معالجة حدث تغيير أسعار الصرف
   * يقوم بتحديث أسعار المنتجات التلقائية (غير اليدوية) للعملات المتأثرة
   */
  @OnEvent(CURRENCY_EVENTS.EXCHANGE_RATES_UPDATED)
  async handleExchangeRateUpdate(
    payload: ExchangeRatesUpdatedEvent,
  ): Promise<void> {
    this.logger.log(
      `استلام حدث تغيير أسعار الصرف للتاجر ${payload.merchantId}`,
    );
    this.logger.debug(
      `العملات المتأثرة: ${payload.affectedCurrencies.join(', ')}`,
    );

    try {
      const result = await this.priceSyncService.syncPricesOnExchangeRateChange(
        payload.merchantId,
        payload.affectedCurrencies,
      );

      this.logger.log(
        `تم تحديث ${result.updatedCount} منتج للتاجر ${payload.merchantId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `فشل في مزامنة أسعار التاجر ${payload.merchantId}: ${message}`,
      );
    }
  }

  /**
   * معالجة حدث تغيير العملة الأساسية
   * قد يتطلب إعادة حساب جميع الأسعار
   */
  @OnEvent(CURRENCY_EVENTS.BASE_CURRENCY_CHANGED)
  handleBaseCurrencyChange(payload: BaseCurrencyChangedEvent): void {
    this.logger.log(
      `استلام حدث تغيير العملة الأساسية للتاجر ${payload.merchantId}: ${payload.previousCurrency} → ${payload.newCurrency}`,
    );

    // ملاحظة: تغيير العملة الأساسية قد يتطلب مراجعة يدوية
    // لأنه قد يؤثر على منطق الأعمال
    this.logger.warn(
      `تنبيه: تم تغيير العملة الأساسية للتاجر ${payload.merchantId}. قد تحتاج المنتجات إلى مراجعة.`,
    );

    // يمكن إضافة منطق إضافي هنا حسب الحاجة
    // مثل: إرسال إشعار للتاجر، تسجيل في سجل التدقيق، إلخ
  }

  /**
   * معالجة حدث تغيير العملات المدعومة
   * عند إضافة عملة جديدة، يمكن توليد أسعار لها
   */
  @OnEvent(CURRENCY_EVENTS.SUPPORTED_CURRENCIES_CHANGED)
  handleSupportedCurrenciesChange(
    payload: SupportedCurrenciesChangedEvent,
  ): void {
    this.logger.log(
      `استلام حدث تغيير العملات المدعومة للتاجر ${payload.merchantId}`,
    );

    if (payload.addedCurrencies.length > 0) {
      this.logger.log(
        `عملات جديدة مضافة: ${payload.addedCurrencies.join(', ')}`,
      );

      // يمكن توليد أسعار للعملات الجديدة هنا
      // لكن هذا قد يكون مكلفاً حسابياً لعدد كبير من المنتجات
      // لذا نتركه للتاجر ليقرر متى يريد توليد الأسعار
    }

    if (payload.removedCurrencies.length > 0) {
      this.logger.log(
        `عملات تمت إزالتها: ${payload.removedCurrencies.join(', ')}`,
      );

      // ملاحظة: لا نحذف الأسعار الموجودة للعملات المزالة
      // لأنها قد تكون مطلوبة للطلبات السابقة
    }
  }
}
