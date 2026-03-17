import { Controller, forwardRef, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { TelegramAuth } from '@/auth/guards/auth.guard';
import { CurrentUser } from '@/auth/decorators/user.decorator';
import { ChannelsService } from './channels.service';
import { BotService } from '@/bot/bot.service';
import { User } from '@/users/user.entity';
import { SubscriptionStatusDto } from './channels.dto';

@ApiTags('channels')
@ApiSecurity('initData')
@Controller('channels')
@UseGuards(TelegramAuth)
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService,
    @Inject(forwardRef(() => BotService)) private readonly botService: BotService,
    private readonly configService: ConfigService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Check subscription status for all required channels' })
  @ApiResponse({ status: 200, type: SubscriptionStatusDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing Telegram initData' })
  async getStatus(@CurrentUser() user: User): Promise<SubscriptionStatusDto> {
    if (this.configService.get<string>('nodeEnv') === 'development') {
      return {
        subscribed: false,
        missing: [
          { channel_id: '@test_channel_1', title: 'Test Channel 1', url: 'https://t.me/test_channel_1' },
          { channel_id: '@test_channel_2', title: 'Test Channel 2', url: 'https://t.me/test_channel_2' },
        ],
      };
    }

    const missing = await this.channelsService.getMissingSubscriptions(
      Number(user.telegram_id),
      this.botService.bot,
    );
    return {
      subscribed: missing.length === 0,
      missing: missing.map((ch) => ({
        channel_id: ch.channel_id,
        title: ch.title,
        url: this.channelsService.getChannelUrl(ch),
      })),
    };
  }
}
