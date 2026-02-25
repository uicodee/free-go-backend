import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InitData, parse, validate } from '@tma.js/init-data-node';

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  validateInitData(authData: string): InitData {
    try {
      const mode = this.configService.getOrThrow<string>('nodeEnv');
      if (mode === 'production') {
        validate(authData, this.configService.getOrThrow<string>('bot.token'), {
          expiresIn: this.configService.getOrThrow<number>('initDataExpire'),
        });
      }
      return parse(authData);
    } catch {
      throw new UnauthorizedException('Invalid init data');
    }
  }
}
