// src/modules/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './services/token.service';
import { CookieService } from './services/cookie.service';

import { UsersModule } from '../users/users.module';
import { MerchantsModule } from '../merchants/merchants.module';

import { User, UserSchema } from '../users/schemas/user.schema';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema'; // ← استيراد الـ schema
import { MailModule } from '../mail/mail.module';
import { MetricsModule } from 'src/metrics/metrics.module';
import {
  EmailVerificationToken,
  EmailVerificationTokenSchema,
} from './schemas/email-verification-token.schema';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from './schemas/password-reset-token.schema';
import { MongoAuthRepository } from './repositories/mongo-auth.repository';
import { RedisSessionStore } from './repositories/redis-session-store.repository';
import { CommonServicesModule } from '../../common/services/common-services.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),

    // سجّل هنا كلا الـ schemas معاً
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Merchant.name, schema: MerchantSchema }, // ← إضافة هذا السطر
      {
        name: EmailVerificationToken.name,
        schema: EmailVerificationTokenSchema,
      },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
    ]),
    MailModule, // ← استيراد MailModule ليوفر MailService

    UsersModule,
    MerchantsModule, // لازمه ل AuthController الذي يستعمل MerchantsService
    MetricsModule,
    CommonServicesModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    TokenService,
    CookieService,
    {
      provide: 'AuthRepository',
      useClass: MongoAuthRepository,
    },
    {
      provide: 'SessionStore',
      useClass: RedisSessionStore,
    },
  ],
  exports: [AuthService, TokenService, CookieService],
})
export class AuthModule {}
