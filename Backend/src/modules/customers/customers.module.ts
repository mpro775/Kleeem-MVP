// src/modules/customers/customers.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { CommonServicesModule } from '../../common/services/common-services.module';
import { AuthModule } from '../auth/auth.module';
import { ChannelsModule } from '../channels/channels.module';
import { LeadsModule } from '../leads/leads.module';
import { MailModule } from '../mail/mail.module';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerAddressMongoRepository } from './repositories/customer-address.mongo.repository';
import { CustomerOtpMongoRepository } from './repositories/customer-otp.mongo.repository';
import { CustomerMongoRepository } from './repositories/customer.mongo.repository';
import {
  CustomerAddress,
  CustomerAddressSchema,
} from './schemas/customer-address.schema';
import { CustomerOtp, CustomerOtpSchema } from './schemas/customer-otp.schema';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import { OtpService } from './services/otp.service';
import {
  CUSTOMER_REPOSITORY,
  CUSTOMER_OTP_REPOSITORY,
  CUSTOMER_ADDRESS_REPOSITORY,
} from './tokens';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: CustomerOtp.name, schema: CustomerOtpSchema },
      { name: CustomerAddress.name, schema: CustomerAddressSchema },
      { name: User.name, schema: UserSchema },
      { name: Merchant.name, schema: MerchantSchema },
    ]),
    JwtModule.register({}),
    MailModule,
    forwardRef(() => ChannelsModule),
    forwardRef(() => AuthModule),
    forwardRef(() => CommonServicesModule),
    LeadsModule,
  ],
  providers: [
    CustomersService,
    OtpService,
    {
      provide: CUSTOMER_REPOSITORY,
      useClass: CustomerMongoRepository,
    },
    {
      provide: CUSTOMER_OTP_REPOSITORY,
      useClass: CustomerOtpMongoRepository,
    },
    {
      provide: CUSTOMER_ADDRESS_REPOSITORY,
      useClass: CustomerAddressMongoRepository,
    },
  ],
  controllers: [CustomersController],
  exports: [
    CustomersService,
    CUSTOMER_REPOSITORY,
    CUSTOMER_OTP_REPOSITORY,
    CUSTOMER_ADDRESS_REPOSITORY,
  ],
})
export class CustomersModule {}
