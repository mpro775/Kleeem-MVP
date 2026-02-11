import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FeatureFlagsDto {
  merchantSignupEnabled: boolean;
  userSignupEnabled: boolean;
}

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly config: ConfigService) {}

  isMerchantSignupEnabled(): boolean {
    const v = this.config.get<string>('DISABLE_MERCHANT_SIGNUP');
    return v !== '1' && v !== 'true' && v !== 'yes';
  }

  isUserSignupEnabled(): boolean {
    const v = this.config.get<string>('DISABLE_USER_SIGNUP');
    return v !== '1' && v !== 'true' && v !== 'yes';
  }

  getFlags(): FeatureFlagsDto {
    return {
      merchantSignupEnabled: this.isMerchantSignupEnabled(),
      userSignupEnabled: this.isUserSignupEnabled(),
    };
  }
}
