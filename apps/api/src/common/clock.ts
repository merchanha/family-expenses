/** Port for "now" so time-dependent logic is testable without mocking Date globally. */
export abstract class Clock {
  abstract now(): Date;
}

export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
