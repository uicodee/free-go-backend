import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { TelegramAuth } from '@/auth/guards/auth.guard';
import { CurrentUser } from '@/auth/decorators/user.decorator';
import { ProService } from './pro.service';
import { BotService } from '@/bot/bot.service';
import { ConfigService } from '@nestjs/config';
import { User } from '@/users/user.entity';
import { ProStatusResponseDto } from './pro.dto';

@ApiTags('pro')
@ApiSecurity('initData')
@Controller('pro-status')
@UseGuards(TelegramAuth)
export class ProController {
  constructor(
    private readonly proService: ProService,
    private readonly botService: BotService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get Pro subscription status and slot availability' })
  @ApiResponse({ status: 200, description: 'Pro status for current user', type: ProStatusResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing Telegram initData' })
  getProStatus(@CurrentUser() user: User): Promise<ProStatusResponseDto> {
    return this.proService.getProStatus(user);
  }

  @Post('claim')
  @HttpCode(200)
  @ApiOperation({ summary: 'Claim Pro subscription (decrements available slots by 1)' })
  @ApiResponse({ status: 200, description: 'Pro granted, slot decremented', type: ProStatusResponseDto })
  @ApiBadRequestResponse({ description: 'Already Pro or no slots available' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing Telegram initData' })
  async claimPro(@CurrentUser() user: User): Promise<ProStatusResponseDto> {
    const proUntil = await this.proService.claimPro(user);

    const updated = { ...user, is_pro: true, pro_until: proUntil } as User;
    const status = await this.proService.getProStatus(updated);

    // Send Telegram notification
    try {
      const botUsername = this.configService.get<string>('bot.username') ?? '';
      const refLink = `https://t.me/${botUsername}?start=ref_${user.referral_code}`;
      const slotsLeft = status.total_slots - status.taken_slots;
      const until = status.active_until
        ? new Date(status.active_until).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

      const lines = [
        '⚡️ Pro obuna faollashtirildi!',
        '',
        until ? `Amal qilish muddati: ${until}` : '',
        `Bo'sh joylar: ${slotsLeft} / ${status.total_slots}`,
        '',
        `Do'stlaringizni ham taklif qiling va ular ham bepul Pro olishsin:`,
        refLink,
      ].filter((l) => l !== null && l !== undefined);

      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("Free Go orqali bepul Pro obuna oling!")}`;
      await this.botService.bot.api.sendMessage(
        parseInt(user.telegram_id, 10),
        lines.join('\n'),
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔗 Referal havolam', url: refLink },
                { text: '📤 Ulashish', url: shareUrl },
              ],
            ],
          },
        },
      );
    } catch {
      // Notification is best-effort — don't fail the request if bot can't reach user
    }

    return status;
  }
}
