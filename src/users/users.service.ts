import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 10);

export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_bot?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  findByTelegramId(telegramId: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { telegram_id: String(telegramId) } });
  }

  findByReferralCode(code: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { referral_code: code } });
  }

  findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findAll(page = 1, limit = 20): Promise<[User[], number]> {
    return this.userRepo.findAndCount({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async upsertFromTelegram(
    tgUser: TelegramUserData,
    referrerId?: number,
  ): Promise<{ user: User; isNew: boolean; referrer: User | null }> {
    let user = await this.findByTelegramId(tgUser.id);

    if (user) {
      // Update mutable fields
      user.first_name = tgUser.first_name;
      user.last_name = tgUser.last_name ?? null;
      user.username = tgUser.username ?? null;
      user.photo_url = tgUser.photo_url ?? null;
      await this.userRepo.save(user);
      return { user, isNew: false, referrer: null };
    }

    // Generate unique referral code
    let referral_code = nanoid();
    while (await this.userRepo.findOne({ where: { referral_code } })) {
      referral_code = nanoid();
    }

    user = this.userRepo.create({
      telegram_id: String(tgUser.id),
      first_name: tgUser.first_name,
      last_name: tgUser.last_name ?? null,
      username: tgUser.username ?? null,
      language_code: tgUser.language_code ?? null,
      photo_url: tgUser.photo_url ?? null,
      is_bot: tgUser.is_bot ?? false,
      referral_code,
      referred_by_id:
        referrerId && referrerId !== tgUser.id ? referrerId : null,
    });

    await this.userRepo.save(user);

    // Increment referrer's count atomically
    if (user.referred_by_id) {
      await this.userRepo.increment(
        { id: user.referred_by_id },
        'referral_count',
        1,
      );
    }

    const referrer = user.referred_by_id
      ? await this.findById(user.referred_by_id)
      : null;

    return { user, isNew: true, referrer };
  }

  async setBanned(telegramId: number, banned: boolean): Promise<void> {
    await this.userRepo.update(
      { telegram_id: String(telegramId) },
      { is_banned: banned },
    );
  }

  async setPro(telegramId: number, isPro: boolean, until?: Date): Promise<void> {
    await this.userRepo.update(
      { telegram_id: String(telegramId) },
      { is_pro: isPro, pro_until: until ?? null },
    );
  }

  async resetReferralCounts(): Promise<void> {
    await this.userRepo.update({}, { referral_count: 0 });
  }

  async setAdmin(telegramId: number, isAdmin: boolean): Promise<void> {
    await this.userRepo.update(
      { telegram_id: String(telegramId) },
      { is_admin: isAdmin },
    );
  }

  countAll(): Promise<number> {
    return this.userRepo.count();
  }

  countPro(): Promise<number> {
    return this.userRepo.count({ where: { is_pro: true } });
  }
}
