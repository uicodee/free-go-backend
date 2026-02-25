import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequiredChannel } from './required-channel.entity';
import { ChannelsService } from './channels.service';

@Module({
  imports: [TypeOrmModule.forFeature([RequiredChannel])],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
