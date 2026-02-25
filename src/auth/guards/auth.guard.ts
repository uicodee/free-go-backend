import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { InitData } from '@tma.js/init-data-node';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/user.entity';

interface AuthenticatedRequest extends Request {
  user?: User | null;
  initData?: InitData;
}

@Injectable()
export class TelegramAuth implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    try {
      const authData = request.header('authorization') || '';
      const initData = this.authService.validateInitData(authData);
      const tgUser = initData.user;

      if (!tgUser?.id) return false;

      const { user } = await this.usersService.upsertFromTelegram({
        id: tgUser.id,
        first_name: tgUser.first_name,
        last_name: tgUser.last_name,
        username: tgUser.username,
        language_code: tgUser.language_code,
        photo_url: tgUser.photo_url,
        is_bot: tgUser.is_bot,
      });

      if (user.is_banned) return false;

      request.user = user;
      request.initData = initData;
      return true;
    } catch (error) {
      console.error('TelegramAuth Error:', error);
      return false;
    }
  }
}
