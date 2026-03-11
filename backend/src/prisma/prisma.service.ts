import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('Successfully connected to the database');
        break;
      } catch (error) {
        retries -= 1;
        this.logger.error(`Failed to connect to the database. Retries left: ${retries}`, error);
        if (retries === 0) {
          throw error;
        }
        await new Promise(res => setTimeout(res, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
