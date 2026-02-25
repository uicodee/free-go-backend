import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity';

@Injectable()
export class ReferralService {
  constructor(private readonly configService: ConfigService) {}

  getReferralLink(user: User) {
    const botUsername = this.configService.get<string>('bot.username') ?? '';
    const link = `https://t.me/${botUsername}?start=ref_${user.referral_code}`;
    return {
      link,
      code: user.referral_code,
      count: user.referral_count,
    };
  }
}
