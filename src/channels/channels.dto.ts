import { ApiProperty } from '@nestjs/swagger';

export class ChannelDto {
  @ApiProperty({ example: '@mychannel' })
  channel_id: string;

  @ApiProperty({ example: 'My Channel' })
  title: string;

  @ApiProperty({ example: 'https://t.me/mychannel' })
  url: string;
}

export class SubscriptionStatusDto {
  @ApiProperty({ example: false })
  subscribed: boolean;

  @ApiProperty({ type: [ChannelDto] })
  missing: ChannelDto[];
}
