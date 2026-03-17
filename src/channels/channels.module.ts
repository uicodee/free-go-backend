import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequiredChannel } from './required-channel.entity';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/users/users.module';
import { BotModule } from '@/bot/bot.module';

@Module({
  imports: [TypeOrmModule.forFeature([RequiredChannel]), AuthModule, UsersModule, forwardRef(() => BotModule)],
  controllers: [ChannelsController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
