// src/common/services/environment-validator.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MIN_JWT_SECRET_LENGTH = 32;
const MAX_PORT_NUMBER = 65535;
const MIN_API_KEY_LENGTH = 16;

interface RequiredEnvVar {
  key: string;
  description: string;
  validation?: (value: string) => boolean;
  defaultValue?: string;
  sensitive?: boolean; // لا تطبع القيمة في اللوج
}

@Injectable()
export class EnvironmentValidatorService {
  private readonly logger = new Logger(EnvironmentValidatorService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * ✅ F1: قائمة متغيرات البيئة الحرجة
   */
  private getRequiredEnvVars(): RequiredEnvVar[] {
    return [
      // JWT Configuration
      {
        key: 'JWT_SECRET',
        description: 'JWT signing secret (must be strong)',
        validation: (value) => value.length >= MIN_JWT_SECRET_LENGTH,
        sensitive: true,
      },
      {
        key: 'JWT_ACCESS_TTL',
        description: 'Access token TTL (e.g., 15m)',
        validation: (value) => /^\d+[smhd]$/.test(value),
        defaultValue: '15m',
      },
      {
        key: 'JWT_REFRESH_TTL',
        description: 'Refresh token TTL (e.g., 7d)',
        validation: (value) => /^\d+[smhd]$/.test(value),
        defaultValue: '7d',
      },

      // Redis Configuration
      {
        key: 'REDIS_URL',
        description: 'Redis connection URL',
        validation: (value) =>
          value.startsWith('redis://') || value.startsWith('rediss://'),
        sensitive: true,
      },

      // Webhook Configuration
      {
        key: 'PUBLIC_WEBHOOK_BASE',
        description: 'Public webhook base URL (without trailing slash)',
        validation: (value) =>
          value.startsWith('https://') && !value.endsWith('/'),
      },
      {
        key: 'TELEGRAM_WEBHOOK_SECRET',
        description: 'Telegram webhook secret token',
        validation: (value) => value.length >= MIN_API_KEY_LENGTH,
        sensitive: true,
      },
      {
        key: 'EVOLUTION_APIKEY',
        description: 'Evolution API key for WhatsApp QR',
        validation: (value) => value.length >= MIN_API_KEY_LENGTH,
        sensitive: true,
      },

      // Database
      {
        key: 'DATABASE_URL',
        description: 'MongoDB connection URL',
        validation: (value) =>
          value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
        sensitive: true,
      },

      // Environment
      {
        key: 'NODE_ENV',
        description: 'Node environment (development/production)',
        validation: (value) =>
          ['development', 'production', 'test'].includes(value),
        defaultValue: 'development',
      },

      // Optional but recommended
      {
        key: 'PORT',
        description: 'Server port',
        validation: (value) => {
          const port = parseInt(value);
          return !isNaN(port) && port > 0 && port <= MAX_PORT_NUMBER;
        },
        defaultValue: '3000',
      },
    ];
  }

  /**
   * ✅ F1: التحقق من جميع متغيرات البيئة الحرجة
   */
  validateEnvironment(): { isValid: boolean; errors: string[] } {
    const requiredVars = this.getRequiredEnvVars();
    const errors: string[] = [];

    this.logger.log('🔍 Validating critical environment variables...');

    for (const envVar of requiredVars) {
      try {
        let value = this.config.get<string>(envVar.key);

        // استخدام القيمة الافتراضية إذا لم تكن موجودة
        if (!value && envVar.defaultValue) {
          value = envVar.defaultValue;
          this.logger.warn(
            `⚠️  Using default value for ${envVar.key}: ${envVar.sensitive ? '[HIDDEN]' : value}`,
          );
        }

        // التحقق من وجود القيمة
        if (!value) {
          errors.push(
            `❌ Missing required environment variable: ${envVar.key} - ${envVar.description}`,
          );
          continue;
        }

        // التحقق من صحة القيمة
        if (envVar.validation && !envVar.validation(value)) {
          errors.push(
            `❌ Invalid value for ${envVar.key} - ${envVar.description}`,
          );
          continue;
        }

        // لوج نجاح التحقق
        const displayValue = envVar.sensitive ? '[HIDDEN]' : value;
        this.logger.debug(`✅ ${envVar.key}: ${displayValue}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push(`❌ Error validating ${envVar.key}: ${errorMessage}`);
      }
    }

    const isValid = errors.length === 0;

    if (isValid) {
      this.logger.log(
        '✅ All critical environment variables are properly configured',
      );
    } else {
      this.logger.error('❌ Environment validation failed:');
      errors.forEach((error) => this.logger.error(`  ${error}`));
    }

    return { isValid, errors };
  }

  /**
   * ✅ F1: Fail fast - إيقاف التطبيق إذا كانت البيئة غير صحيحة
   */
  validateOrExit(): void {
    const { isValid, errors } = this.validateEnvironment();

    if (!isValid) {
      this.logger.error(
        '💥 Application cannot start due to environment validation errors:',
      );
      errors.forEach((error) => this.logger.error(error));
      this.logger.error(
        '🛑 Please fix the above issues and restart the application',
      );
      process.exit(1);
    }
  }

  /**
   * طباعة ملخص الإعدادات (للـ startup logs)
   */
  logEnvironmentSummary(): void {
    const nodeEnv = this.config.get<string>('NODE_ENV') || 'development';
    const port = this.config.get<string>('PORT') || '3000';
    const publicWebhookBase =
      this.config.get<string>('PUBLIC_WEBHOOK_BASE') || 'Not configured';

    this.logger.log('🚀 Environment Summary:');
    this.logger.log(`   NODE_ENV: ${nodeEnv}`);
    this.logger.log(`   PORT: ${port}`);
    this.logger.log(`   PUBLIC_WEBHOOK_BASE: ${publicWebhookBase}`);
    this.logger.log(
      `   JWT_ACCESS_TTL: ${this.config.get<string>('JWT_ACCESS_TTL') || '15m'}`,
    );
    this.logger.log(
      `   JWT_REFRESH_TTL: ${this.config.get<string>('JWT_REFRESH_TTL') || '7d'}`,
    );

    if (nodeEnv === 'production') {
      this.logger.log('🔒 Production mode: Enhanced security features enabled');
    } else {
      this.logger.warn(
        '⚠️  Development mode: Some security features may be relaxed',
      );
    }
  }
}
