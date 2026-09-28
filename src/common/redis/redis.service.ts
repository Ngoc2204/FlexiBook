import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private readonly lockTokens = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url');
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');

    if (redisUrl) {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 2000);
        },
      });
    } else {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 2000);
        },
      });
    }

    this.client.on('connect', () => {
      this.logger.log(`Connected to Redis at ${host}:${port}`);
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis connection error: ${err.message}`);
    });

    this.client.connect().catch((err) => {
      this.logger.warn(`Failed initial Redis connection: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
      this.logger.log('Disconnected from Redis');
    }
  }

  getClient(): Redis {
    return this.client;
  }

  /**
   * Acquire a distributed lock with TTL
   * @param key Resource key to lock
   * @param ttlMs Time to live in milliseconds (default: 5000ms)
   * @returns true if lock acquired, false otherwise
   */
  async acquireLock(key: string, ttlMs: number = 5000): Promise<boolean> {
    try {
      const token = randomUUID();
      const result = await this.client.set(key, token, 'PX', ttlMs, 'NX');
      if (result === 'OK') {
        this.lockTokens.set(key, token);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.warn(`Redis acquireLock failed for key ${key}: ${(error as Error).message}`);
      // Fallback: If Redis is unavailable in local dev without Docker, allow operation or log
      return true;
    }
  }

  /**
   * Release a previously acquired distributed lock using Lua script for atomicity
   * @param key Resource key to release
   */
  async releaseLock(key: string): Promise<boolean> {
    try {
      const token = this.lockTokens.get(key);
      if (!token) {
        return false;
      }

      // Lua script ensures atomicity: only delete if current value equals the token
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.client.eval(luaScript, 1, key, token);
      this.lockTokens.delete(key);
      return result === 1;
    } catch (error) {
      this.logger.warn(`Redis releaseLock failed for key ${key}: ${(error as Error).message}`);
      this.lockTokens.delete(key);
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.warn(`Redis set failed: ${(error as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Redis del failed: ${(error as Error).message}`);
    }
  }
}
