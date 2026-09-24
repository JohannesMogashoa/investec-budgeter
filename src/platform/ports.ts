export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpRequest {
  readonly url: string;
  readonly method: HttpMethod;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
}

export interface HttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface HttpTransport {
  request(request: HttpRequest): HttpResponse;
}

export interface SecretStore {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

export interface Cache {
  get(key: string): string | undefined;
  put(key: string, value: string, ttlSeconds: number): void;
  remove(key: string): void;
}

export interface Clock {
  now(): Date;
}

export interface Lock {
  tryAcquire(timeoutMilliseconds: number): boolean;
  release(): void;
}

export interface LockProvider {
  get(name: string): Lock;
}

export type LogValue = string | number | boolean | null;

export interface LogEvent {
  readonly event: string;
  readonly fields?: Readonly<Record<string, LogValue>>;
}

export interface Logger {
  info(event: LogEvent): void;
  warn(event: LogEvent): void;
  error(event: LogEvent): void;
}

export type SheetValue = string | number | boolean | null;

export interface SheetColumnFormat {
  readonly numberFormat?: string;
  readonly protected?: boolean;
}

export interface SheetSetup {
  readonly frozenRows: number;
  readonly headerBackground: string;
  readonly headerFontColor: string;
  readonly columns: readonly SheetColumnFormat[];
  readonly hidden?: boolean;
}

export interface SheetPort {
  readonly name: string;
  getLastRow(): number;
  getLastColumn(): number;
  readValues(): SheetValue[][];
  writeValues(startRow: number, startColumn: number, values: SheetValue[][]): void;
  appendValues(values: SheetValue[][]): void;
  applySetup(setup: SheetSetup): void;
}

export interface SheetGateway {
  getSpreadsheetId(): string;
  getTimeZone(): string;
  getSheet(name: string): SheetPort | undefined;
  createSheet(name: string): SheetPort;
}
