import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class PresenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PresenceService.name);
  private redisClient: Redis | null = null;
  private memoryCache = new Map<number, { isOnline: boolean; lastSeen: Date }>();
  private useRedis = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const host = process.env.REDIS_HOST;
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD;

    if (host) {
      try {
        this.redisClient = new Redis({
          host,
          port,
          password,
          maxRetriesPerRequest: 3,
        });

        this.redisClient.on('connect', () => {
          this.logger.log('Successfully connected to Redis for Presence tracking.');
          this.useRedis = true;
        });

        this.redisClient.on('error', (err) => {
          this.logger.warn(`Redis connection error, falling back to database/memory presence tracking. Error: ${err.message}`);
          this.useRedis = false;
        });
      } catch (err) {
        this.logger.warn(`Could not initialize Redis. Falling back to DB/memory. Error: ${err.message}`);
      }
    } else {
      this.logger.log('Redis host not configured. Using database and local memory for presence tracking.');
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  async setUserOnline(userId: number): Promise<void> {
    const lastSeen = new Date();
    
    // Update local cache
    this.memoryCache.set(userId, { isOnline: true, lastSeen });

    // Update Redis if enabled
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.hset('presence', String(userId), JSON.stringify({ isOnline: true, lastSeen }));
        await this.redisClient.sadd('online_users', String(userId));
      } catch (err) {
        this.logger.warn(`Failed to update presence in Redis: ${err.message}`);
      }
    }

    // Persist status in database
    try {
      await this.prisma.chatUserPresence.upsert({
        where: { userId },
        update: { isOnline: true, lastSeen },
        create: { userId, isOnline: true, lastSeen },
      });
    } catch (err) {
      this.logger.error(`Database error setting user ${userId} online: ${err.message}`);
    }
  }

  async setUserOffline(userId: number): Promise<void> {
    const lastSeen = new Date();

    // Update local cache
    this.memoryCache.set(userId, { isOnline: false, lastSeen });

    // Update Redis if enabled
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.hset('presence', String(userId), JSON.stringify({ isOnline: false, lastSeen }));
        await this.redisClient.srem('online_users', String(userId));
      } catch (err) {
        this.logger.warn(`Failed to remove presence from Redis: ${err.message}`);
      }
    }

    // Persist status in database
    try {
      await this.prisma.chatUserPresence.upsert({
        where: { userId },
        update: { isOnline: false, lastSeen },
        create: { userId, isOnline: false, lastSeen },
      });
    } catch (err) {
      this.logger.error(`Database error setting user ${userId} offline: ${err.message}`);
    }
  }

  async getUserStatus(userId: number): Promise<{ isOnline: boolean; lastSeen: Date }> {
    // 1. Check Memory Cache
    if (this.memoryCache.has(userId)) {
      return this.memoryCache.get(userId);
    }

    // 2. Check Redis
    if (this.useRedis && this.redisClient) {
      try {
        const cached = await this.redisClient.hget('presence', String(userId));
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.lastSeen = new Date(parsed.lastSeen);
          this.memoryCache.set(userId, parsed);
          return parsed;
        }
      } catch (err) {
        this.logger.warn(`Failed to read presence from Redis: ${err.message}`);
      }
    }

    // 3. Fallback to Database
    try {
      const presence = await this.prisma.chatUserPresence.findUnique({
        where: { userId },
      });
      if (presence) {
        const status = { isOnline: presence.isOnline, lastSeen: presence.lastSeen };
        this.memoryCache.set(userId, status);
        return status;
      }
    } catch (err) {
      this.logger.error(`Failed to read presence from database for user ${userId}: ${err.message}`);
    }

    // Default if not found anywhere
    return { isOnline: false, lastSeen: new Date(0) };
  }

  async getMultipleStatuses(userIds: number[]): Promise<Record<number, { isOnline: boolean; lastSeen: Date }>> {
    const results: Record<number, { isOnline: boolean; lastSeen: Date }> = {};
    const missingUserIds: number[] = [];

    // Check local memory first
    for (const id of userIds) {
      if (this.memoryCache.has(id)) {
        results[id] = this.memoryCache.get(id);
      } else {
        missingUserIds.push(id);
      }
    }

    if (missingUserIds.length === 0) return results;

    // Check Redis for missing keys
    if (this.useRedis && this.redisClient) {
      try {
        const stringKeys = missingUserIds.map(String);
        const cachedVals = await this.redisClient.hmget('presence', ...stringKeys);
        
        stringKeys.forEach((key, index) => {
          const val = cachedVals[index];
          const userIdNum = parseInt(key, 10);
          if (val) {
            const parsed = JSON.parse(val);
            parsed.lastSeen = new Date(parsed.lastSeen);
            this.memoryCache.set(userIdNum, parsed);
            results[userIdNum] = parsed;
          }
        });
      } catch (err) {
        this.logger.warn(`Redis hmget error for presence: ${err.message}`);
      }
    }

    // Filter missing again
    const dbQueryIds = userIds.filter(id => !results[id]);
    if (dbQueryIds.length > 0) {
      try {
        const dbPresences = await this.prisma.chatUserPresence.findMany({
          where: { userId: { in: dbQueryIds } },
        });

        for (const presence of dbPresences) {
          const status = { isOnline: presence.isOnline, lastSeen: presence.lastSeen };
          this.memoryCache.set(presence.userId, status);
          results[presence.userId] = status;
        }
      } catch (err) {
        this.logger.error(`DB error fetching multiple presence records: ${err.message}`);
      }
    }

    // Default remaining to offline
    for (const id of userIds) {
      if (!results[id]) {
        results[id] = { isOnline: false, lastSeen: new Date(0) };
      }
    }

    return results;
  }
}
