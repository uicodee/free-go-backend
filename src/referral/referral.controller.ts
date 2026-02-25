import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { TelegramAuth } from '@/auth/guards/auth.guard';
import { CurrentUser } from '@/auth/decorators/user.decorator';
import { ReferralService } from './referral.service';
import { User } from '@/users/user.entity';
import { ReferralResponseDto } from './referral.dto';

@ApiTags('referral')
@ApiSecurity('initData')
@Controller('referral')
@UseGuards(TelegramAuth)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user referral link and stats' })
  @ApiResponse({ status: 200, description: 'Referral link and invite count', type: ReferralResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing Telegram initData' })
  getReferral(@CurrentUser() user: User): ReferralResponseDto {
    return this.referralService.getReferralLink(user);
  }
}
