import type { Sleeper } from './ports';

export class AppsScriptSleeper implements Sleeper {
  sleep(milliseconds: number): void {
    Utilities.sleep(milliseconds);
  }
}
