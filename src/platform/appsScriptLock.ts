import type { Lock, LockProvider } from './ports';

class AppsScriptLock implements Lock {
  constructor(private readonly lock: GoogleAppsScript.Lock.Lock) {}

  tryAcquire(timeoutMilliseconds: number): boolean {
    return this.lock.tryLock(timeoutMilliseconds);
  }

  release(): void {
    this.lock.releaseLock();
  }
}

export class AppsScriptLockProvider implements LockProvider {
  get(_name: string): Lock {
    void _name;
    return new AppsScriptLock(LockService.getScriptLock());
  }
}
