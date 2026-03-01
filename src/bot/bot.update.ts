import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { ChannelsService } from '../channels/channels.service';
import { BotService } from './bot.service';
import { InlineKeyboard } from 'grammy';
import { User } from '@/users/user.entity';

@Injectable()
export class BotUpdate implements OnModuleInit {
  constructor(
    private readonly botService: BotService,
    private readonly usersService: UsersService,
    private readonly leaderboardService: LeaderboardService,
    private readonly channelsService: ChannelsService,
    private readonly configService: ConfigService,
  ) {}

  private async notifyReferrer(bot: any, referrer: User, newUser: User) {
    try {
      const name = [newUser.first_name, newUser.last_name]
        .filter(Boolean)
        .join(' ');
      const handle = newUser.username ? ` (@${newUser.username})` : '';
      await bot.api.sendMessage(
        parseInt(referrer.telegram_id, 10),
        `🎉 ${name}${handle} sizning referal havolangiz orqali ro'yxatdan o'tdi!\n\n👥 Jami taklif qilganlar: ${referrer.referral_count + 1} ta`,
      );
    } catch {
      /* referrer may have blocked bot */
    }
  }

  onModuleInit() {
    const bot = this.botService.bot;
    const miniAppUrl = this.configService.get<string>('miniAppUrl') ?? '';
    const botUsername = this.configService.get<string>('bot.username') ?? '';
    const shareText = `🚀 FreeGo’da CANVA PRO — 30 KUN BEPUL!

Premium imkoniyatlardan foydalanmoqchimisiz?
Endi sizda ajoyib imkoniyat bor! 🎁

🔥 30 kunlik CANVA PRO obuna
🔥 Cheklangan joylar
🔥 Tez va oson faollashtirish

Barcha premium funksiyalarni sinab ko‘ring va natijani o‘zingiz his qiling!

⏳ Joylar tugashidan oldin ulgurib qoling!
👇 Hoziroq qo‘shiling!`;

    // ─── chat_member: выход из канала → отменить Pro ─────────────────────────
    bot.on('chat_member', async (ctx) => {
      const update = ctx.chatMember;
      const newStatus = update.new_chat_member.status;
      const userId = update.new_chat_member.user.id;

      // Если пользователь вышел или был кикнут
      if (['left', 'kicked', 'restricted'].includes(newStatus)) {
        const user = await this.usersService.findByTelegramId(userId);
        if (!user) return;

        const missing = await this.channelsService.getMissingSubscriptions(
          userId,
          bot,
        );
        const hasUnsubscribed = missing.length > 0;

        if (!hasUnsubscribed) return; // всё ещё подписан на все остальные

        const kb = new InlineKeyboard();
        for (const ch of missing) {
          kb.url(
            `📢 ${ch.title}`,
            this.channelsService.getChannelUrl(ch),
          ).row();
        }
        kb.text('✅ Tekshirish', 'check_subscription');

        try {
          if (user.is_pro) {
            await this.usersService.setPro(userId, false);
            await bot.api.sendMessage(
              userId,
              "❌ Siz majburiy kanallardan biridan chiqdingiz.\n\nPro obunangiz bekor qilindi. Qaytadan obuna bo'ling:",
              { reply_markup: kb },
            );
          } else {
            await bot.api.sendMessage(
              userId,
              "⚠️ Siz majburiy kanallardan biridan chiqdingiz.\n\nBotdan foydalanish uchun qaytadan obuna bo'ling:",
              { reply_markup: kb },
            );
          }
        } catch {
          /* user may have blocked bot */
        }
      }
    });

    // ─── Subscription check middleware ───────────────────────────────────────
    // Runs before every message/command, skips chat_member updates
    bot.use(async (ctx, next) => {
      // Only check for private message/command interactions
      if (!ctx.from || ctx.chat?.type !== 'private') return next();
      // Skip callback queries about subscription check itself
      if (ctx.callbackQuery?.data === 'check_subscription') return next();

      // If this is /start with a referral code — register the user first so the
      // referral is attributed even if they haven't subscribed to channels yet.
      if (ctx.message?.text?.startsWith('/start ')) {
        const startParam = ctx.message.text.slice('/start '.length).trim();
        if (startParam.startsWith('ref_')) {
          const code = startParam.slice(4);
          const referrer = await this.usersService.findByReferralCode(code);
          const referrerId =
            referrer && referrer.telegram_id !== String(ctx.from.id)
              ? referrer.id
              : undefined;
          const {
            user: newUser,
            isNew,
            referrer: referrerUser,
          } = await this.usersService.upsertFromTelegram(
            {
              id: ctx.from.id,
              first_name: ctx.from.first_name,
              last_name: ctx.from.last_name,
              username: ctx.from.username,
              language_code: ctx.from.language_code,
              is_bot: ctx.from.is_bot,
            },
            referrerId,
          );
          if (isNew && referrerUser) {
            await this.notifyReferrer(bot, referrerUser, newUser);
          }
        }
      }

      const missing = await this.channelsService.getMissingSubscriptions(
        ctx.from.id,
        bot,
      );
      if (missing.length === 0) return next();

      const kb = new InlineKeyboard();
      for (const ch of missing) {
        kb.url(`📢 ${ch.title}`, this.channelsService.getChannelUrl(ch)).row();
      }
      kb.text('✅ Tekshirish', 'check_subscription');

      await ctx.reply(
        `❗ Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n` +
          missing.map((ch) => `• ${ch.title}`).join('\n'),
        { reply_markup: kb },
      );
    });

    // ─── check_subscription callback ─────────────────────────────────────────
    bot.callbackQuery('check_subscription', async (ctx) => {
      await ctx.answerCallbackQuery();
      if (!ctx.from) return;

      const missing = await this.channelsService.getMissingSubscriptions(
        ctx.from.id,
        bot,
      );
      if (missing.length > 0) {
        const kb = new InlineKeyboard();
        for (const ch of missing) {
          kb.url(
            `📢 ${ch.title}`,
            this.channelsService.getChannelUrl(ch),
          ).row();
        }
        kb.text('✅ Tekshirish', 'check_subscription');
        await ctx.editMessageText(
          `❗ Hali obuna bo'lmagan kanallar:\n\n` +
            missing.map((ch) => `• ${ch.title}`).join('\n'),
          { reply_markup: kb },
        );
      } else {
        const user = await this.usersService.findByTelegramId(ctx.from.id);
        const greeting = `Salom, ${user?.first_name ?? ctx.from.first_name}! 👋 Free Go'ga xush kelibsiz.`;
        await ctx.editMessageText(greeting, {
          reply_markup: new InlineKeyboard()
            .webApp('🚀 Mini-ilovani ochish', miniAppUrl)
            .row()
            .text('🔗 Referal havolam', 'get_referral'),
        });
      }
    });

    // ─── /start ──────────────────────────────────────────────────────────────
    bot.command('start', async (ctx) => {
      const from = ctx.from;
      if (!from) return;

      const startParam = ctx.match ?? '';
      let referrerId: number | undefined;

      if (startParam.startsWith('ref_')) {
        const code = startParam.slice(4);
        const referrer = await this.usersService.findByReferralCode(code);
        if (referrer && referrer.telegram_id !== String(from.id)) {
          referrerId = referrer.id;
        }
      }

      const {
        user: newUser,
        isNew,
        referrer: referrerUser,
      } = await this.usersService.upsertFromTelegram(
        {
          id: from.id,
          first_name: from.first_name,
          last_name: from.last_name,
          username: from.username,
          language_code: from.language_code,
          is_bot: from.is_bot,
        },
        referrerId,
      );

      if (isNew && referrerUser) {
        await this.notifyReferrer(bot, referrerUser, newUser);
      }

      const greeting = `<b>🚀 Assalomu alaykum!</b>

FreeGo botiga xush kelibsiz! 🎉
Bu yerda siz Pro imkoniyatlardan maksimal darajada foydalanish, bepul obuna olish va foydali xizmatlardan foydalanish imkoniyatiga ega bo‘lasiz.

Boshlash uchun pastdagi tugmani bosing va foydalanishni boshlang! 🚀`;

      await ctx.reply(greeting, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Mini-ilovani ochish', web_app: { url: miniAppUrl } }],
            [{ text: '🔗 Referal havolam', callback_data: 'get_referral' }],
          ],
        },
      });
    });

    // ─── get_referral callback ────────────────────────────────────────────────
    bot.callbackQuery('get_referral', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      if (!from) return;
      const user = await this.usersService.findByTelegramId(from.id);
      if (!user) return;
      const link = `https://t.me/${botUsername}?start=ref_${user.referral_code}`;
      const shareUrl = `https://t.me/share/url?text=${encodeURIComponent(`${shareText}\n\n${link}`)}`;
      await ctx.reply(
        `🔗 Sizning referal havolangiz:\n\n${link}\n\n📊 Taklif qilganlar: ${user.referral_count} ta`,
        {
          reply_markup: new InlineKeyboard().url(
            "📤 Do'stlarga yuborish",
            shareUrl,
          ),
        },
      );
    });

    // ─── /refer ──────────────────────────────────────────────────────────────
    bot.command('refer', async (ctx) => {
      const from = ctx.from;
      if (!from) return;
      const user = await this.usersService.findByTelegramId(from.id);
      if (!user) return ctx.reply("Avval /start buyrug'ini yuboring.");
      const link = `https://t.me/${botUsername}?start=ref_${user.referral_code}`;
      const shareUrl = `https://t.me/share/url?text=${encodeURIComponent(`${shareText}\n\n${link}`)}`;
      await ctx.reply(
        `🔗 Sizning referal havolangiz:\n\n${link}\n\n📊 Taklif qilganlar: ${user.referral_count} ta`,
        {
          reply_markup: new InlineKeyboard().url(
            "📤 Do'stlarga yuborish",
            shareUrl,
          ),
        },
      );
    });

    // ─── /leaderboard ─────────────────────────────────────────────────────────
    bot.command('leaderboard', async (ctx) => {
      const top = await this.leaderboardService.getTop(10);
      if (top.length === 0) return ctx.reply("Hozircha hech kim yo'q.");

      const rankEmoji: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
      const lines = top.map((u) => {
        const medal = rankEmoji[u.rank] ?? `${u.rank}.`;
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
        const handle = u.username ? ` (@${u.username})` : '';
        return `${medal} ${name}${handle} — ${u.referral_count} ta`;
      });

      await ctx.reply(`🏆 Top 10 — Referal reytingi\n\n${lines.join('\n')}`);
    });
  }
}
