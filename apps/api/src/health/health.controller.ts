import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { HealthResponse } from '@tandem/shared';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/auth/auth.decorators';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    let dbUp = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch {
      dbUp = false;
    }
    res.status(dbUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return { status: dbUp ? 'ok' : 'error', db: dbUp ? 'up' : 'down', timestamp: new Date().toISOString() };
  }
}
