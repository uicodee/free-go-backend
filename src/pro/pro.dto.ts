import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProStatusResponseDto {
  @ApiProperty({ type: 'boolean', example: false })
  is_active: boolean;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true, example: '2026-04-01T00:00:00.000Z' })
  active_until: Date | null;

  @ApiProperty({ type: 'integer', example: 100 })
  total_slots: number;

  @ApiProperty({ type: 'integer', example: 87 })
  taken_slots: number;

  @ApiProperty({ type: 'integer', example: 30, description: 'How many days Pro is granted for when claimed' })
  pro_days: number;

  @ApiProperty({ type: 'string', format: 'date-time', example: '2026-03-01T00:00:00.000Z' })
  promo_ends_at: Date;

  @ApiPropertyOptional({ type: 'string', nullable: true, example: 'https://t.me/example' })
  pro_url: string | null;
}
