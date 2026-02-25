import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot } from 'grammy';

@Injectable()
export class BotService implements OnApplicationBootstrap, OnApplicationShutdown {
  public readonly bot: Bot;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.getOrThrow<string>('bot.token');
    this.bot = new Bot(token);
    this.bot.catch((err) => {
      console.error(`Bot error [${err.ctx.update.update_id}]:`, err.error);
    });
  }

  async onApplicationBootstrap(): Promise<void> {
    void this.bot.start({
      allowed_updates: ['message', 'callback_query', 'chat_member'],
      onStart: () => console.log('🤖 Bot started (long-poll)'),
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.bot.stop();
  }
}
