import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MessagesModule } from './messages/messages.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { LeavesModule } from './leaves/leaves.module';
import { ReportsModule } from './reports/reports.module';
import { UploadsModule } from './uploads/uploads.module';
import { FirebaseModule } from './firebase/firebase.module';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { PresenceModule } from './presence/presence.module';
import { TaskDiscussionModule } from './task-discussion/task-discussion.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    NotificationsModule,
    MessagesModule,
    AnnouncementsModule,
    LeavesModule,
    ReportsModule,
    UploadsModule,
    FirebaseModule,
    ChatModule,
    PresenceModule,
    TaskDiscussionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
