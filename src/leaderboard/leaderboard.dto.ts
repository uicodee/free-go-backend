import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeaderboardEntryDto {
  @ApiProperty({ type: 'integer', example: 1 })
  rank: number;

  @ApiProperty({ type: 'string', example: 'Abduxalilov' })
  first_name: string;

  @ApiPropertyOptional({ type: 'string', nullable: true, example: 'Javlon' })
  last_name: string | null;

  @ApiPropertyOptional({ type: 'string', nullable: true, example: 'uicode' })
  username: string | null;

  @ApiProperty({ type: 'integer', example: 12 })
  referral_count: number;
}
