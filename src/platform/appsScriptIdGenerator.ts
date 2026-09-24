import type { IdGenerator } from './ports';

export class AppsScriptIdGenerator implements IdGenerator {
  uuid(): string {
    return Utilities.getUuid();
  }
}
