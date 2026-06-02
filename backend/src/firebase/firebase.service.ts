import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private prisma: PrismaService) {}

  async saveToken(userId: number, fcmToken: string, deviceType?: string) {
    try {
      // Upsert token
      const existing = await this.prisma.notificationToken.findUnique({
        where: { fcmToken }
      });
      if (existing) {
        return await this.prisma.notificationToken.update({
          where: { fcmToken },
          data: { userId, deviceType, updatedAt: new Date() }
        });
      } else {
        return await this.prisma.notificationToken.create({
          data: { userId, fcmToken, deviceType }
        });
      }
    } catch (error) {
      this.logger.error(`Error saving token for user ${userId}`, error);
    }
  }

  async removeToken(fcmToken: string) {
    try {
      await this.prisma.notificationToken.delete({ where: { fcmToken } });
    } catch (error) {
      this.logger.error(`Error removing token ${fcmToken}`, error);
    }
  }

  async sendToUser(userId: number, title: string, body: string, data?: any) {
    try {
      const tokens = await this.prisma.notificationToken.findMany({
        where: { userId }
      });
      
      if (tokens.length === 0) return;

      const fcmTokens = tokens.map(t => t.fcmToken);
      
      const stringifiedData: { [key: string]: string } = {};
      if (data) {
        for (const key in data) {
          if (data[key] !== null && data[key] !== undefined) {
            stringifiedData[key] = typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]);
          }
        }
      }
      
      const message = {
        notification: {
          title: title,
          body: body,
        },
        data: stringifiedData,
        tokens: fcmTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const failedToken = fcmTokens[idx];
            if (resp.error?.code === 'messaging/invalid-registration-token' ||
                resp.error?.code === 'messaging/registration-token-not-registered') {
              // Clean up invalid tokens
              this.removeToken(failedToken);
            } else {
              this.logger.error(`Failed to send to token ${failedToken}: ${resp.error}`);
            }
          }
        });
      }
      this.logger.log(`Push notification sent to user ${userId}`);
    } catch (error) {
      this.logger.error(`Error sending push notification to user ${userId}`, error);
    }
  }

  async sendToMultipleUsers(userIds: number[], title: string, body: string, data?: any) {
    // Note: Can batch if large, simplified for now
    for (const userId of userIds) {
      await this.sendToUser(userId, title, body, data);
    }
  }

  async sendAnnouncement(userIds: number[], title: string, body: string, data?: any) {
    await this.sendToMultipleUsers(userIds, title, body, { type: 'ANNOUNCEMENT', ...data });
  }

  async sendTaskNotification(userId: number, title: string, body: string, data?: any) {
    await this.sendToUser(userId, title, body, { type: 'TASK', ...data });
  }

  async sendProjectNotification(userId: number, title: string, body: string, data?: any) {
    await this.sendToUser(userId, title, body, { type: 'PROJECT', ...data });
  }
}
