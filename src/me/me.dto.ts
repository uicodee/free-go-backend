import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MeResponseDto {
  @ApiProperty({ type: 'integer', example: 1 })
  id: number;

  @ApiProperty({ type: 'string', example: '547187822' })
  telegram_id: string;

  @ApiProperty({ type: 'string', example: 'Abduxalilov' })
  first_name: string;

  @ApiPropertyOptional({ type: 'string', nullable: true, example: 'Javlon' })
  last_name: string | null;

  @ApiPropertyOptional({ type: 'string', nullable: true, example: 'uicode' })
  username: string | null;

  @ApiPropertyOptional({ type: 'string', nullable: true, example: 'https://t.me/i/userpic/...' })
  photo_url: string | null;

  @ApiProperty({ type: 'string', example: 'AB3XK29NMQ' })
  referral_code: string;

  @ApiProperty({ type: 'integer', example: 5 })
  referral_count: number;

  @ApiProperty({ type: 'boolean', example: false })
  is_pro: boolean;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true, example: '2026-04-01T00:00:00.000Z' })
  pro_until: Date | null;

  @ApiProperty({ type: 'boolean', example: false })
  is_admin: boolean;

  @ApiProperty({ type: 'string', format: 'date-time', example: '2026-02-19T10:00:00.000Z' })
  created_at: Date;
}
