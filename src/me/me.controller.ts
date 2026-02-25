import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { TelegramAuth } from '@/auth/guards/auth.guard';
import { CurrentUser } from '@/auth/decorators/user.decorator';
import { User } from '@/users/user.entity';
import { MeResponseDto } from './me.dto';

@ApiTags('me')
@ApiSecurity('initData')
@Controller('me')
@UseGuards(TelegramAuth)
export class MeController {
  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile', type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing Telegram initData' })
  getMe(@CurrentUser() user: User): MeResponseDto {
    return {
      id: user.id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: user.photo_url,
      referral_code: user.referral_code,
      referral_count: user.referral_count,
      is_pro: user.is_pro,
      pro_until: user.pro_until,
      is_admin: user.is_admin,
      created_at: user.created_at,
    };
  }
}
