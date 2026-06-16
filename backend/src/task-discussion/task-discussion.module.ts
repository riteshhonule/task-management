import { Module } from '@nestjs/common';
import { TaskDiscussionController } from './task-discussion.controller';
import { TaskDiscussionService } from './task-discussion.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [TaskDiscussionController],
  providers: [TaskDiscussionService],
  exports: [TaskDiscussionService],
})
export class TaskDiscussionModule {}
