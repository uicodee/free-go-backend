import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { TelegramAuth } from '@/auth/guards/auth.guard';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardEntryDto } from './leaderboard.dto';

@ApiTags('leaderboard')
@ApiSecurity('initData')
@Controller('leaderboard')
@UseGuards(TelegramAuth)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get top users by referral count' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50, description: 'Max number of users to return (default 50)' })
  @ApiResponse({ status: 200, description: 'Top users ranked by referral count', type: [LeaderboardEntryDto] })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing Telegram initData' })
  getLeaderboard(@Query('limit') limit?: string): Promise<LeaderboardEntryDto[]> {
    return this.leaderboardService.getTop(limit ? parseInt(limit, 10) : 50);
  }
}
