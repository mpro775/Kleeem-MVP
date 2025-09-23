// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CommonServicesModule } from '../../common/services/common-services.module';

import { MongoUsersRepository } from './repositories/mongo-users.repository';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    CommonServicesModule,
  ],
  providers: [
    UsersService,
    {
      provide: 'UsersRepository',
      useClass: MongoUsersRepository,
    },
  ],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
