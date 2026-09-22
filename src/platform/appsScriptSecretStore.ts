import type { SecretStore } from './ports';

export class AppsScriptSecretStore implements SecretStore {
  constructor(private readonly properties = PropertiesService.getUserProperties()) {}

  get(key: string): string | undefined {
    return this.properties.getProperty(key) ?? undefined;
  }

  set(key: string, value: string): void {
    this.properties.setProperty(key, value);
  }

  delete(key: string): void {
    this.properties.deleteProperty(key);
  }
}
