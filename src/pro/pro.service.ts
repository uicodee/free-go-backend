import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProSlot } from './pro-slot.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ProService implements OnModuleInit {
  constructor(
    @InjectRepository(ProSlot)
    private readonly proSlotRepo: Repository<ProSlot>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    const existing = await this.proSlotRepo.findOne({ where: { id: 1 } });
    if (!existing) {
      await this.proSlotRepo.save(
        this.proSlotRepo.create({
          id: 1,
          total_slots: 100,
          taken_slots: 0,
          pro_days: 30,
          promo_ends_at: new Date('2026-03-01'),
        }),
      );
    }
  }

  getProSlot(): Promise<ProSlot | null> {
    return this.proSlotRepo.findOne({ where: { id: 1 } });
  }

  async getProStatus(user: User) {
    const slot = await this.getProSlot();
    return {
      is_active: user.is_pro,
      active_until: user.pro_until,
      total_slots: slot?.total_slots ?? 100,
      taken_slots: slot?.taken_slots ?? 0,
      pro_days: slot?.pro_days ?? 30,
      promo_ends_at: slot?.promo_ends_at ?? new Date('2026-03-01'),
      pro_url: slot?.pro_url ?? null,
    };
  }

  async claimPro(user: User): Promise<Date> {
    if (user.is_pro) {
      throw new BadRequestException('Already have an active Pro subscription');
    }

    const slot = await this.getProSlot();
    const slotsLeft = (slot?.total_slots ?? 100) - (slot?.taken_slots ?? 0);

    if (slotsLeft <= 0) {
      throw new BadRequestException('No slots available');
    }

    // Compute pro_until from pro_days
    const days = slot?.pro_days ?? 30;
    const pro_until = new Date();
    pro_until.setDate(pro_until.getDate() + days);

    // Increment taken_slots atomically and grant Pro to user
    await Promise.all([
      this.proSlotRepo.increment({ id: 1 }, 'taken_slots', 1),
      this.userRepo.update({ telegram_id: user.telegram_id }, { is_pro: true, pro_until }),
    ]);

    return pro_until;
  }

  async setProUrl(url: string): Promise<void> {
    await this.proSlotRepo.update(1, { pro_url: url });
  }

  async setProDays(days: number): Promise<void> {
    await this.proSlotRepo.update(1, { pro_days: days });
  }

  async updateSlots(totalSlots: number, takenSlots: number, promoEndsAt: Date): Promise<ProSlot> {
    await this.proSlotRepo.update(1, {
      total_slots: totalSlots,
      taken_slots: takenSlots,
      promo_ends_at: promoEndsAt,
    });
    return this.proSlotRepo.findOneOrFail({ where: { id: 1 } });
  }

  async getStats() {
    const slot = await this.getProSlot();
    const totalUsers = await this.userRepo.count();
    const proUsers = await this.userRepo.count({ where: { is_pro: true } });
    return {
      total_users: totalUsers,
      pro_users: proUsers,
      slots_taken: slot?.taken_slots ?? 0,
      slots_total: slot?.total_slots ?? 100,
      promo_ends_at: slot?.promo_ends_at,
    };
  }
}
