import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  const port = app.get(ConfigService).get<number>('PORT') ?? 3001;
  await app.listen(port);
  console.log(`Tandem API listening on http://localhost:${port}/api`);
}
bootstrap();
