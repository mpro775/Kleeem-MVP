// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CommonServicesModule } from '../../common/services/common-services.module';
import { MongoUsersRepository } from './repositories/mongo-users.repository';
import { UsersRepository } from './repositories/users.repository';

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
