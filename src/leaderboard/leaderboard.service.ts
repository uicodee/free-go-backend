import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getTop(limit = 50) {
    const users = await this.userRepo.find({
      where: { is_banned: false },
      order: { referral_count: 'DESC' },
      take: limit,
      select: ['id', 'first_name', 'last_name', 'username', 'referral_count'],
    });

    return users.map((user, index) => ({
      rank: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      referral_count: user.referral_count,
    }));
  }
}
