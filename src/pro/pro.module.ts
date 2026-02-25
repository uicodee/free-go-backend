import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProSlot } from './pro-slot.entity';
import { User } from '../users/user.entity';
import { ProService } from './pro.service';
import { ProController } from './pro.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProSlot, User]),
    AuthModule,
    UsersModule,
    forwardRef(() => BotModule),
  ],
  providers: [ProService],
  controllers: [ProController],
  exports: [ProService],
})
export class ProModule {}
