import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MeModule } from './me/me.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ProModule } from './pro/pro.module';
import { ReferralModule } from './referral/referral.module';
import { BotModule } from './bot/bot.module';
import { ChannelsModule } from './channels/channels.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    MeModule,
    LeaderboardModule,
    ProModule,
    ReferralModule,
    BotModule,
    ChannelsModule,
  ],
})
export class AppModule {}
