import { Module } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
