import type { Cache } from './ports';

export class AppsScriptUserCache implements Cache {
  constructor(private readonly cache = CacheService.getUserCache()) {}

  get(key: string): string | undefined {
    return this.cache.get(key) ?? undefined;
  }

  put(key: string, value: string, ttlSeconds: number): void {
    this.cache.put(key, value, ttlSeconds);
  }

  remove(key: string): void {
    this.cache.remove(key);
  }
}
