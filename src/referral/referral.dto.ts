import { ApiProperty } from '@nestjs/swagger';

export class ReferralResponseDto {
  @ApiProperty({ type: 'string', example: 'https://t.me/play_lottery_bot?start=ref_AB3XK29NMQ' })
  link: string;

  @ApiProperty({ type: 'string', example: 'AB3XK29NMQ' })
  code: string;

  @ApiProperty({ type: 'integer', example: 5 })
  count: number;
}
