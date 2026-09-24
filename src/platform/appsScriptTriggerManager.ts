import type { TriggerManager } from './ports';

const HANDLER = 'runScheduledTransactionSync';

export class AppsScriptTriggerManager implements TriggerManager {
  private matching(): GoogleAppsScript.Script.Trigger[] {
    return ScriptApp.getProjectTriggers().filter(
      (trigger) => trigger.getHandlerFunction() === HANDLER,
    );
  }

  ensureTransactionSync(intervalMinutes: 1 | 5 | 10 | 15 | 30): void {
    const triggers = this.matching();
    triggers.slice(1).forEach((trigger) => ScriptApp.deleteTrigger(trigger));
    if (triggers.length > 0) return;
    ScriptApp.newTrigger(HANDLER).timeBased().everyMinutes(intervalMinutes).create();
  }

  removeTransactionSync(): void {
    this.matching().forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  }

  hasTransactionSync(): boolean {
    return this.matching().length > 0;
  }
}
