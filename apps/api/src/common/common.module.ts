import { Global, Module } from '@nestjs/common';
import { Clock, SystemClock } from './clock';
import { MailService } from './mail/mail.service';
import { ConsoleMailService } from './mail/console-mail.service';

/** Cross-cutting ports available to every feature module. */
@Global()
@Module({
  providers: [
    { provide: Clock, useClass: SystemClock },
    { provide: MailService, useClass: ConsoleMailService },
  ],
  exports: [Clock, MailService],
})
export class CommonModule {}
