import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bot, InlineKeyboard } from 'grammy';
import { BotService } from './bot.service';
import { UsersService } from '../users/users.service';
import { ProService } from '../pro/pro.service';
import { ChannelsService } from '../channels/channels.service';
import { BotMessage } from './bot-message.entity';

type AdminAction = 'set_pro_url' | 'set_pro_days' | 'broadcast' | 'ban' | 'unban' | 'grantpro' | 'revokepro' | 'users_page' | 'add_channel' | 'del_channel';
const awaitingInput = new Map<number, { action: AdminAction }>();

@Injectable()
export class BotAdminUpdate implements OnModuleInit {
  private bot: Bot;

  constructor(
    private readonly botService: BotService,
    private readonly usersService: UsersService,
    private readonly proService: ProService,
    private readonly channelsService: ChannelsService,
    private readonly configService: ConfigService,
    @InjectRepository(BotMessage)
    private readonly botMessageRepo: Repository<BotMessage>,
  ) {}

  private isAdmin(telegramId: number): boolean {
    const adminIds = this.configService.get<string[]>('adminIds') ?? [];
    return adminIds.includes(String(telegramId));
  }

  private async sendAdminMenu(ctx: any) {
    const stats = await this.proService.getStats();
    const slot = await this.proService.getProSlot();
    const channels = await this.channelsService.findAll();
    const proUrl = slot?.pro_url ?? '—';
    const proDays = slot?.pro_days ?? 30;

    const kb = new InlineKeyboard()
      .text('📊 Statistika', 'adm:stats').row()
      .text('👥 Foydalanuvchilar', 'adm:users:1').row()
      .text('📢 Kanallar', 'adm:channels').row()
      .text('🔗 Pro URL', 'adm:set_pro_url').text(`📅 Pro kunlar: ${proDays}`, 'adm:set_pro_days').row()
      .text('🔄 Referallarni reset', 'adm:reset_referrals_confirm').row()
      .text('🪑 Joylarni reset', 'adm:reset_slots_confirm').row()
      .text('⚡️ Pro berish', 'adm:grantpro').text('❌ Pro olish', 'adm:revokepro').row()
      .text('🚫 Bloklash', 'adm:ban').text('✅ Blokdan chiqarish', 'adm:unban').row()
      .text('📤 Broadcast', 'adm:broadcast').row();

    const text =
      `🛠 Admin paneli\n\n` +
      `👥 Foydalanuvchilar: ${stats.total_users}\n` +
      `⚡️ Pro: ${stats.pro_users}\n` +
      `🪑 Joylar: ${stats.slots_taken}/${stats.slots_total}\n` +
      `📢 Majburiy kanallar: ${channels.length} ta\n` +
      `🔗 Pro URL: ${proUrl}\n` +
      `📅 Pro muddati: ${proDays} kun`;

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { reply_markup: kb });
    } else {
      await ctx.reply(text, { reply_markup: kb });
    }
  }

  onModuleInit() {
    this.bot = this.botService.bot;

    // ─── /admin ──────────────────────────────────────────────────────────────
    this.bot.command('admin', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) {
        return ctx.reply('❌ Ruxsat yo\'q.');
      }
      await this.sendAdminMenu(ctx);
    });

    // ─── Callback router ─────────────────────────────────────────────────────
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;
      const fromId = ctx.from.id;

      if (!data.startsWith('adm:')) return ctx.answerCallbackQuery();
      if (!this.isAdmin(fromId)) {
        return ctx.answerCallbackQuery({ text: '❌ Ruxsat yo\'q.', show_alert: true });
      }

      await ctx.answerCallbackQuery();

      // Stats
      if (data === 'adm:stats') {
        const stats = await this.proService.getStats();
        const slot = await this.proService.getProSlot();
        const kb = new InlineKeyboard().text('⬅️ Orqaga', 'adm:back');
        await ctx.editMessageText(
          `📊 Statistika\n\n` +
            `👥 Jami foydalanuvchilar: ${stats.total_users}\n` +
            `⚡️ Pro obunachi: ${stats.pro_users}\n` +
            `🪑 Joylar: ${stats.slots_taken} / ${stats.slots_total}\n` +
            `🗓 Aksiya tugaydi: ${stats.promo_ends_at?.toLocaleDateString('uz-UZ') ?? '—'}\n` +
            `🔗 Pro URL: ${slot?.pro_url ?? '—'}`,
          { reply_markup: kb },
        );
        return;
      }

      // Back to menu
      if (data === 'adm:back') {
        await this.sendAdminMenu(ctx);
        return;
      }

      // Reset referrals — confirm prompt
      if (data === 'adm:reset_referrals_confirm') {
        const kb = new InlineKeyboard()
          .text('✅ Ha, reset qilish', 'adm:reset_referrals_do').row()
          .text('❌ Bekor qilish', 'adm:back');
        await ctx.editMessageText(
          '⚠️ Barcha foydalanuvchilarning referal hisoblagichini 0 ga tushirasizmi?\n\nFoydalanuvchilarga hech qanday zarar yetmaydi — faqat hisoblagich sifirlanadi.',
          { reply_markup: kb },
        );
        return;
      }

      // Reset referrals — execute
      if (data === 'adm:reset_referrals_do') {
        await this.usersService.resetReferralCounts();
        const kb = new InlineKeyboard().text('⬅️ Orqaga', 'adm:back');
        await ctx.editMessageText('✅ Barcha referallar 0 ga tushirildi.', { reply_markup: kb });
        return;
      }

      // Reset slots — confirm prompt
      if (data === 'adm:reset_slots_confirm') {
        const slot = await this.proService.getProSlot();
        const kb = new InlineKeyboard()
          .text('✅ Ha, reset qilish', 'adm:reset_slots_do').row()
          .text('❌ Bekor qilish', 'adm:back');
        await ctx.editMessageText(
          `⚠️ Aktivlashtirilgan obunalar sonini 0 ga tushirasizmi?\n\nHozir: ${slot?.taken_slots ?? 0}/${slot?.total_slots ?? 100}\n\nFoydalanuvchilarning Pro statusiga ta'sir qilmaydi — faqat hisoblagich sifirlanadi.`,
          { reply_markup: kb },
        );
        return;
      }

      // Reset slots — execute
      if (data === 'adm:reset_slots_do') {
        await this.proService.resetTakenSlots();
        const kb = new InlineKeyboard().text('⬅️ Orqaga', 'adm:back');
        await ctx.editMessageText('✅ Aktivlashtirilgan obunalar soni 0 ga tushirildi.', { reply_markup: kb });
        return;
      }

      // Users list with pagination
      if (data.startsWith('adm:users:')) {
        const page = parseInt(data.split(':')[2], 10) || 1;
        const [users, total] = await this.usersService.findAll(page, 8);
        const totalPages = Math.ceil(total / 8);

        const lines = users.map((u, i) => {
          const n = (page - 1) * 8 + i + 1;
          const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
          const handle = u.username ? ` @${u.username}` : '';
          const flags = [u.is_pro ? '⚡️' : '', u.is_banned ? '🚫' : ''].filter(Boolean).join('');
          return `${n}. ${u.telegram_id} — ${name}${handle} ${flags} ${u.referral_count} ref`;
        });

        const kb = new InlineKeyboard();
        if (page > 1) kb.text('◀️', `adm:users:${page - 1}`);
        if (page < totalPages) kb.text('▶️', `adm:users:${page + 1}`);
        kb.row().text('⬅️ Orqaga', 'adm:back');

        await ctx.editMessageText(
          `👥 Foydalanuvchilar (${page}/${totalPages || 1})\n\n${lines.join('\n') || 'Hech kim yo\'q'}`,
          { reply_markup: kb },
        );
        return;
      }

      // Channels list
      if (data === 'adm:channels') {
        const channels = await this.channelsService.findAll();
        const kb = new InlineKeyboard();
        for (const ch of channels) {
          kb.text(`🗑 ${ch.title}`, `adm:del_channel:${ch.channel_id}`).row();
        }
        kb.text('➕ Kanal qo\'shish', 'adm:add_channel').row();
        kb.text('⬅️ Orqaga', 'adm:back');
        const text = channels.length
          ? `📢 Majburiy kanallar (${channels.length} ta):\n\n` +
            channels.map((ch) => `• ${ch.title} — ${ch.channel_id}`).join('\n') +
            '\n\nO\'chirish uchun kanal nomiga bosing.'
          : '📢 Hozircha majburiy kanallar yo\'q.\n\nQo\'shish uchun tugmani bosing.';
        await ctx.editMessageText(text, { reply_markup: kb });
        return;
      }

      // Delete channel
      if (data.startsWith('adm:del_channel:')) {
        const channelId = data.slice('adm:del_channel:'.length);
        await this.channelsService.remove(channelId);
        // Refresh channels page
        const channels = await this.channelsService.findAll();
        const kb = new InlineKeyboard();
        for (const ch of channels) {
          kb.text(`🗑 ${ch.title}`, `adm:del_channel:${ch.channel_id}`).row();
        }
        kb.text('➕ Kanal qo\'shish', 'adm:add_channel').row();
        kb.text('⬅️ Orqaga', 'adm:back');
        const text = channels.length
          ? `📢 Majburiy kanallar (${channels.length} ta):\n\n` +
            channels.map((ch) => `• ${ch.title} — ${ch.channel_id}`).join('\n') +
            '\n\nO\'chirish uchun kanal nomiga bosing.'
          : '📢 Hozircha majburiy kanallar yo\'q.';
        await ctx.editMessageText(text, { reply_markup: kb });
        return;
      }

      // Add channel
      if (data === 'adm:add_channel') {
        awaitingInput.set(fromId, { action: 'add_channel' });
        const kb = new InlineKeyboard().text('❌ Bekor qilish', 'adm:cancel_input');
        await ctx.editMessageText(
          '📢 Kanal qo\'shish\n\nFormat (2 xil):\n\n1. Ochiq kanal:\n@username Kanal nomi\n\n2. Yopiq kanal (invite link bilan):\nhttps://t.me/+xxx -100123456789 Kanal nomi\n\nMisol:\n@mychannel Mening kanalim\nhttps://t.me/+NJyMgDFAK-djM2Vi -1001234567890 Mening kanalim',
          { reply_markup: kb },
        );
        return;
      }

      // Set Pro URL
      if (data === 'adm:set_pro_url') {
        awaitingInput.set(fromId, { action: 'set_pro_url' });
        const kb = new InlineKeyboard().text('❌ Bekor qilish', 'adm:cancel_input');
        await ctx.editMessageText(
          '🔗 Yangi Pro URL-ni yuboring:\n\nMisol: https://t.me/your_channel',
          { reply_markup: kb },
        );
        return;
      }

      // Set Pro Days
      if (data === 'adm:set_pro_days') {
        awaitingInput.set(fromId, { action: 'set_pro_days' });
        const kb = new InlineKeyboard().text('❌ Bekor qilish', 'adm:cancel_input');
        await ctx.editMessageText(
          '📅 Pro muddatini kiriting (kunlarda):\n\nMisol: 30',
          { reply_markup: kb },
        );
        return;
      }

      // Broadcast
      if (data === 'adm:broadcast') {
        awaitingInput.set(fromId, { action: 'broadcast' });
        const kb = new InlineKeyboard().text('❌ Bekor qilish', 'adm:cancel_input');
        await ctx.editMessageText(
          '📤 Broadcast xabarini yuboring:\n\nBarcha foydalanuvchilarga yuboriladilar.',
          { reply_markup: kb },
        );
        return;
      }

      // Grant Pro
      if (data === 'adm:grantpro') {
        awaitingInput.set(fromId, { action: 'grantpro' });
        const kb = new InlineKeyboard().text('❌ Bekor qilish', 'adm:cancel_input');
        await ctx.editMessageText(
          '⚡️ Pro berish\n\nTelegram ID va kunlar sonini yuboring:\n123456789 30\n\n(kunlar soni ixtiyoriy, default: 30)',
          { reply_markup: kb },
        );
        return;
      }

      // Revoke Pro
      if (data === 'adm:revokepro') {
        awaitingInput.set(fromId, { action: 'revokepro' });
        const kb = new InlineKeyboard().text('❌ Bekor qilish', 'adm:cancel_input');
        await ctx.editMessageText(
          '❌ Pro olish\n\nTelegram ID-ni yuboring:',
          { reply_markup: kb },
        );
        return;
      }

      // Ban
      if (data === 'adm:ban') {
        awaitingInput.set(fromId, { action: 'ban' });
        const kb = new InlineKeyboard().text('❌ Bekor qilish', 'adm:cancel_input');
        await ctx.editMessageText(
          '🚫 Bloklash\n\nTelegram ID-ni yuboring:',
          { reply_markup: kb },
        );
        return;
      }

      // Unban
      if (data === 'adm:unban') {
        awaitingInput.set(fromId, { action: 'unban' });
        const kb = new InlineKeyboard().text('❌ Bekor qilish', 'adm:cancel_input');
        await ctx.editMessageText(
          '✅ Blokdan chiqarish\n\nTelegram ID-ni yuboring:',
          { reply_markup: kb },
        );
        return;
      }

      // Cancel input
      if (data === 'adm:cancel_input') {
        awaitingInput.delete(fromId);
        await this.sendAdminMenu(ctx);
        return;
      }
    });

    // ─── Text message handler (awaiting input) ───────────────────────────────
    this.bot.on('message:text', async (ctx) => {
      const fromId = ctx.from?.id;
      if (!fromId || !this.isAdmin(fromId)) return;

      const pending = awaitingInput.get(fromId);
      if (!pending) return;

      awaitingInput.delete(fromId);
      const text = ctx.message.text.trim();

      if (pending.action === 'add_channel') {
        // Format 1: "@username Title" or "-100xxx Title"
        // Format 2: "https://t.me/+xxx -100123456789 Title"
        let channelId: string;
        let title: string;
        let inviteLink: string | undefined;

        if (text.startsWith('https://t.me/+') || text.startsWith('http://t.me/+')) {
          // Invite link format: "<invite_link> <channel_id> <title>"
          const parts = text.split(/\s+/);
          if (parts.length < 3) {
            return ctx.reply('❌ Format: https://t.me/+xxx -100123456789 Kanal nomi\n\nQaytadan yuboring.');
          }
          inviteLink = parts[0];
          channelId = parts[1];
          title = parts.slice(2).join(' ');
        } else {
          // Public username/id format: "<@username|id> <title>"
          const spaceIdx = text.indexOf(' ');
          if (spaceIdx === -1) {
            return ctx.reply('❌ Format: @username Kanal nomi\n\nQaytadan yuboring.');
          }
          channelId = text.slice(0, spaceIdx).trim();
          title = text.slice(spaceIdx + 1).trim();
        }

        if (!channelId || !title) {
          return ctx.reply('❌ Noto\'g\'ri format. Qaytadan yuboring.');
        }
        await this.channelsService.add(channelId, title, inviteLink);
        await ctx.reply(`✅ Kanal qo\'shildi:\n${title} — ${channelId}`, {
          reply_markup: { inline_keyboard: [[{ text: '📢 Kanallar', callback_data: 'adm:channels' }]] },
        });
        return;
      }

      if (pending.action === 'set_pro_url') {
        if (!text.startsWith('http')) {
          return ctx.reply('❌ Noto\'g\'ri URL. https:// bilan boshlang.');
        }
        await this.proService.setProUrl(text);
        await ctx.reply(`✅ Pro URL yangilandi:\n${text}`, {
          reply_markup: { inline_keyboard: [[{ text: '🛠 Admin paneli', callback_data: 'adm:back' }]] },
        });
        return;
      }

      if (pending.action === 'set_pro_days') {
        const days = parseInt(text, 10);
        if (isNaN(days) || days <= 0) {
          return ctx.reply('❌ Noto\'g\'ri qiymat. Musbat son kiriting (masalan: 30).');
        }
        await this.proService.setProDays(days);
        await ctx.reply(`✅ Pro muddati yangilandi: ${days} kun`, {
          reply_markup: { inline_keyboard: [[{ text: '🛠 Admin paneli', callback_data: 'adm:back' }]] },
        });
        return;
      }

      if (pending.action === 'broadcast') {
        await ctx.reply('📤 Xabar yuborilmoqda...');
        let page = 1;
        let sentCount = 0;
        let hasMore = true;
        while (hasMore) {
          const [users, total] = await this.usersService.findAll(page, 50);
          hasMore = page * 50 < total;
          page++;
          for (const user of users) {
            try {
              await this.bot.api.sendMessage(parseInt(user.telegram_id, 10), text);
              sentCount++;
            } catch { /* user blocked bot */ }
            await new Promise((r) => setTimeout(r, 50));
          }
        }
        await this.botMessageRepo.save(
          this.botMessageRepo.create({
            text,
            sent_count: sentCount,
            sent_by_telegram_id: String(fromId),
          }),
        );
        await ctx.reply(`✅ Yuborildi: ${sentCount} ta foydalanuvchiga.`, {
          reply_markup: { inline_keyboard: [[{ text: '🛠 Admin paneli', callback_data: 'adm:back' }]] },
        });
        return;
      }

      if (pending.action === 'grantpro') {
        const parts = text.split(/\s+/);
        const targetId = parseInt(parts[0], 10);
        const days = parseInt(parts[1] ?? '30', 10);
        if (isNaN(targetId)) return ctx.reply('❌ Noto\'g\'ri ID.');
        const until = new Date();
        until.setDate(until.getDate() + days);
        await this.usersService.setPro(targetId, true, until);
        await ctx.reply(`✅ ${targetId} ga ${days} kunlik Pro berildi.`, {
          reply_markup: { inline_keyboard: [[{ text: '🛠 Admin paneli', callback_data: 'adm:back' }]] },
        });
        return;
      }

      if (pending.action === 'revokepro') {
        const targetId = parseInt(text, 10);
        if (isNaN(targetId)) return ctx.reply('❌ Noto\'g\'ri ID.');
        await this.usersService.setPro(targetId, false);
        await ctx.reply(`✅ ${targetId} dan Pro olindi.`, {
          reply_markup: { inline_keyboard: [[{ text: '🛠 Admin paneli', callback_data: 'adm:back' }]] },
        });
        return;
      }

      if (pending.action === 'ban') {
        const targetId = parseInt(text, 10);
        if (isNaN(targetId)) return ctx.reply('❌ Noto\'g\'ri ID.');
        await this.usersService.setBanned(targetId, true);
        await ctx.reply(`✅ ${targetId} bloklandi.`, {
          reply_markup: { inline_keyboard: [[{ text: '🛠 Admin paneli', callback_data: 'adm:back' }]] },
        });
        return;
      }

      if (pending.action === 'unban') {
        const targetId = parseInt(text, 10);
        if (isNaN(targetId)) return ctx.reply('❌ Noto\'g\'ri ID.');
        await this.usersService.setBanned(targetId, false);
        await ctx.reply(`✅ ${targetId} blokdan chiqarildi.`, {
          reply_markup: { inline_keyboard: [[{ text: '🛠 Admin paneli', callback_data: 'adm:back' }]] },
        });
        return;
      }
    });

    // ─── Legacy text commands (still work) ───────────────────────────────────
    this.bot.command('stats', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return ctx.reply('❌ Ruxsat yo\'q.');
      const stats = await this.proService.getStats();
      await ctx.reply(
        `📊 Statistika\n\n👥 ${stats.total_users}\n⚡️ Pro: ${stats.pro_users}\n🪑 ${stats.slots_taken}/${stats.slots_total}`,
      );
    });

    this.bot.command('broadcast', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return ctx.reply('❌ Ruxsat yo\'q.');
      const text = ctx.match;
      if (!text) return ctx.reply('Foydalanish: /broadcast <matn>');
      await ctx.reply('📤 Yuborilmoqda...');
      let page = 1, sentCount = 0, hasMore = true;
      while (hasMore) {
        const [users, total] = await this.usersService.findAll(page, 50);
        hasMore = page * 50 < total; page++;
        for (const user of users) {
          try { await this.bot.api.sendMessage(parseInt(user.telegram_id, 10), text); sentCount++; } catch { }
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      await this.botMessageRepo.save(this.botMessageRepo.create({ text, sent_count: sentCount, sent_by_telegram_id: String(ctx.from.id) }));
      await ctx.reply(`✅ Yuborildi: ${sentCount} ta.`);
    });

    this.bot.command('ban', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return ctx.reply('❌ Ruxsat yo\'q.');
      const id = parseInt(ctx.match ?? '', 10);
      if (isNaN(id)) return ctx.reply('Foydalanish: /ban <telegram_id>');
      await this.usersService.setBanned(id, true);
      await ctx.reply(`✅ ${id} bloklandi.`);
    });

    this.bot.command('unban', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return ctx.reply('❌ Ruxsat yo\'q.');
      const id = parseInt(ctx.match ?? '', 10);
      if (isNaN(id)) return ctx.reply('Foydalanish: /unban <telegram_id>');
      await this.usersService.setBanned(id, false);
      await ctx.reply(`✅ ${id} blokdan chiqarildi.`);
    });

    this.bot.command('grantpro', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return ctx.reply('❌ Ruxsat yo\'q.');
      const parts = (ctx.match ?? '').trim().split(/\s+/);
      const id = parseInt(parts[0], 10); const days = parseInt(parts[1] ?? '30', 10);
      if (isNaN(id)) return ctx.reply('Foydalanish: /grantpro <id> [kunlar]');
      const until = new Date(); until.setDate(until.getDate() + days);
      await this.usersService.setPro(id, true, until);
      await ctx.reply(`✅ ${id} ga ${days} kunlik Pro berildi.`);
    });

    this.bot.command('revokepro', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return ctx.reply('❌ Ruxsat yo\'q.');
      const id = parseInt(ctx.match ?? '', 10);
      if (isNaN(id)) return ctx.reply('Foydalanish: /revokepro <id>');
      await this.usersService.setPro(id, false);
      await ctx.reply(`✅ ${id} dan Pro olindi.`);
    });

    this.bot.command('users', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return ctx.reply('❌ Ruxsat yo\'q.');
      const page = parseInt(ctx.match ?? '1', 10) || 1;
      const [users, total] = await this.usersService.findAll(page, 10);
      if (!users.length) return ctx.reply('Foydalanuvchi topilmadi.');
      const lines = users.map((u, i) => {
        const n = (page - 1) * 10 + i + 1;
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
        const handle = u.username ? ` @${u.username}` : '';
        const flags = [u.is_pro ? '⚡️' : '', u.is_banned ? '🚫' : ''].filter(Boolean).join('');
        return `${n}. ${name}${handle} [${u.telegram_id}] ${flags} — ${u.referral_count} ref`;
      });
      await ctx.reply(`👥 Foydalanuvchilar (${page}/${Math.ceil(total / 10)})\n\n${lines.join('\n')}`);
    });
  }
}
