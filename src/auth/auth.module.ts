import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TelegramAuth } from './guards/auth.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [AuthService, TelegramAuth],
  exports: [AuthService, TelegramAuth],
})
export class AuthModule {}
