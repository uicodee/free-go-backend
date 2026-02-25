import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequiredChannel } from './required-channel.entity';
import { Bot } from 'grammy';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectRepository(RequiredChannel)
    private readonly channelRepo: Repository<RequiredChannel>,
  ) {}

  findAll(): Promise<RequiredChannel[]> {
    return this.channelRepo.find({ order: { created_at: 'ASC' } });
  }

  async add(channelId: string, title: string, inviteLink?: string): Promise<RequiredChannel> {
    const existing = await this.channelRepo.findOne({ where: { channel_id: channelId } });
    if (existing) {
      existing.title = title;
      if (inviteLink !== undefined) existing.invite_link = inviteLink;
      return this.channelRepo.save(existing);
    }
    return this.channelRepo.save(
      this.channelRepo.create({ channel_id: channelId, title, invite_link: inviteLink ?? null }),
    );
  }

  async remove(channelId: string): Promise<void> {
    await this.channelRepo.delete({ channel_id: channelId });
  }

  // Returns list of channels the user is NOT subscribed to
  async getMissingSubscriptions(userId: number, bot: Bot): Promise<RequiredChannel[]> {
    const channels = await this.findAll();
    if (channels.length === 0) return [];

    const missing: RequiredChannel[] = [];
    for (const ch of channels) {
      try {
        const member = await bot.api.getChatMember(ch.channel_id, userId);
        const active = ['member', 'administrator', 'creator'].includes(member.status);
        if (!active) missing.push(ch);
      } catch {
        // Bot is not in channel or channel doesn't exist — skip
      }
    }
    return missing;
  }

  // Returns the URL to use for the subscribe button
  getChannelUrl(ch: RequiredChannel): string {
    if (ch.invite_link) return ch.invite_link;
    return `https://t.me/${ch.channel_id.replace('@', '')}`;
  }

  // Check a single channel membership
  async isMember(userId: number, channelId: string, bot: Bot): Promise<boolean> {
    try {
      const member = await bot.api.getChatMember(channelId, userId);
      return ['member', 'administrator', 'creator'].includes(member.status);
    } catch {
      return false;
    }
  }
}
