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
      const shareText = `🚀 FreeGo’da CANVA PRO — 30 KUN BEPUL!

Premium imkoniyatlardan foydalanmoqchimisiz?
Endi sizda ajoyib imkoniyat bor! 🎁

🔥 30 kunlik CANVA PRO obuna
🔥 Cheklangan joylar
🔥 Tez va oson faollashtirish

Barcha premium funksiyalarni sinab ko‘ring va natijani o‘zingiz his qiling!

⏳ Joylar tugashidan oldin ulgurib qoling!
👇 Hoziroq qo‘shiling!`;

      const lines = [
        '<b>⚡️ Pro obuna muvaffaqiyatli faollashtirildi!</b>',
        '',
        until ? `📅 Amal qilish muddati: <b>${until}</b>` : '',
        `👥 Bo‘sh joylar: <b>${slotsLeft} / ${status.total_slots}</b>`,
        '',
        `🎁 Do‘stlaringizni ham taklif qiling va ular ham bepul Pro obunaga ega bo‘lishsin:`,
        refLink,
        '',
        `❗️Eslatma: Agar majburiy kanallardan chiqib ketsangiz, Avtomatik bloklanasiz va keyingi oy pro olish imkoniyatidan mahrum bolasiz`,
      ].filter((l) => l !== null && l !== undefined);

      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareText)}&text=${encodeURIComponent(refLink)}`;
      await this.botService.bot.api.sendMessage(
        parseInt(user.telegram_id, 10),
        lines.join('\n'),
        {
          parse_mode: 'HTML',
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
