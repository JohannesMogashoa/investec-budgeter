import type { LogEvent, Logger } from './ports';

function serialize(event: LogEvent): string {
  return JSON.stringify({
    event: event.event,
    ...(event.fields ?? {}),
  });
}

export class AppsScriptLogger implements Logger {
  info(event: LogEvent): void {
    console.log(serialize(event));
  }

  warn(event: LogEvent): void {
    console.warn(serialize(event));
  }

  error(event: LogEvent): void {
    console.error(serialize(event));
  }
}
