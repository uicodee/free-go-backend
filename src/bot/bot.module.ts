import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotMessage } from './bot-message.entity';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';
import { BotAdminUpdate } from './bot-admin.update';
import { UsersModule } from '../users/users.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { ProModule } from '../pro/pro.module';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BotMessage]),
    UsersModule,
    LeaderboardModule,
    forwardRef(() => ProModule),
    ChannelsModule,
  ],
  providers: [BotService, BotUpdate, BotAdminUpdate],
  exports: [BotService],
})
export class BotModule {}
