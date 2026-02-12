// src/modules/users/users.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CommonServicesModule } from '../../common/services/common-services.module';
import { AuthModule } from '../auth/auth.module';

import { MongoUsersRepository } from './repositories/mongo-users.repository';
import { User, UserSchema } from './schemas/user.schema';
import { UsersAdminController } from './users.admin.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => CommonServicesModule),
    forwardRef(() => AuthModule),
  ],
  providers: [
    UsersService,
    {
      provide: 'UsersRepository',
      useClass: MongoUsersRepository,
    },
  ],
  controllers: [UsersController, UsersAdminController],
  exports: [UsersService],
})
export class UsersModule {}
