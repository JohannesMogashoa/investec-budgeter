import type { Clock } from './ports';

export class AppsScriptClock implements Clock {
  now(): Date {
    return new Date();
  }
}
