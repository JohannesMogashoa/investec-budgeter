import type {
  Cache,
  Clock,
  HttpRequest,
  HttpResponse,
  HttpTransport,
  Lock,
  LockProvider,
  LogEvent,
  Logger,
  Sleeper,
  SecretStore,
  SheetGateway,
  SheetPort,
  SheetSetup,
  SheetValue,
} from '../../src/platform/ports';

export class FakeHttpTransport implements HttpTransport {
  readonly requests: HttpRequest[] = [];
  response: HttpResponse = { status: 200, headers: {}, body: '' };
  readonly responses: HttpResponse[] = [];

  request(request: HttpRequest): HttpResponse {
    this.requests.push(request);
    return this.responses.shift() ?? this.response;
  }
}

export class FakeSleeper implements Sleeper {
  readonly delays: number[] = [];

  sleep(milliseconds: number): void {
    this.delays.push(milliseconds);
  }
}

export class FakeSecretStore implements SecretStore {
  private readonly values = new Map<string, string>();

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  set(key: string, value: string): void {
    this.values.set(key, value);
  }

  delete(key: string): void {
    this.values.delete(key);
  }
}

export class FakeCache implements Cache {
  private readonly values = new Map<string, string>();

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  put(key: string, value: string, _ttlSeconds: number): void {
    void _ttlSeconds;
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}

export class FakeClock implements Clock {
  constructor(private currentTime = new Date('2026-01-01T00:00:00.000Z')) {}

  now(): Date {
    return new Date(this.currentTime);
  }

  advance(milliseconds: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + milliseconds);
  }
}

export class FakeLock implements Lock {
  acquired = false;
  released = false;

  tryAcquire(_timeoutMilliseconds: number): boolean {
    void _timeoutMilliseconds;
    this.acquired = true;
    return true;
  }

  release(): void {
    this.released = true;
  }
}

export class FakeLockProvider implements LockProvider {
  readonly locks = new Map<string, FakeLock>();

  get(name: string): Lock {
    const lock = this.locks.get(name) ?? new FakeLock();
    this.locks.set(name, lock);
    return lock;
  }
}

export class FakeLogger implements Logger {
  readonly entries: Array<{ level: string; event: LogEvent }> = [];

  info(event: LogEvent): void {
    this.entries.push({ level: 'info', event });
  }

  warn(event: LogEvent): void {
    this.entries.push({ level: 'warn', event });
  }

  error(event: LogEvent): void {
    this.entries.push({ level: 'error', event });
  }
}

export class FakeSheet implements SheetPort {
  setup?: SheetSetup;

  constructor(
    readonly name: string,
    private values: SheetValue[][] = [],
  ) {}

  getLastRow(): number {
    return this.values.length;
  }

  getLastColumn(): number {
    return this.values.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  }

  readValues(): SheetValue[][] {
    return this.values.map((row) => [...row]);
  }

  writeValues(startRow: number, startColumn: number, values: SheetValue[][]): void {
    values.forEach((row, rowOffset) => {
      const targetRow = startRow - 1 + rowOffset;
      while (this.values.length <= targetRow) {
        this.values.push([]);
      }
      row.forEach((value, columnOffset) => {
        this.values[targetRow][startColumn - 1 + columnOffset] = value;
      });
    });
  }

  clearValues(): void {
    this.values = [];
  }

  appendValues(values: SheetValue[][]): void {
    this.writeValues(this.getLastRow() + 1, 1, values);
  }

  applySetup(setup: SheetSetup): void {
    this.setup = setup;
  }
}

export class FakeSheetGateway implements SheetGateway {
  readonly sheets = new Map<string, FakeSheet>();

  constructor(
    private readonly spreadsheetId = 'fake-spreadsheet',
    private readonly timeZone = 'Africa/Johannesburg',
  ) {}

  getSpreadsheetId(): string {
    return this.spreadsheetId;
  }

  getTimeZone(): string {
    return this.timeZone;
  }

  getSheet(name: string): SheetPort | undefined {
    return this.sheets.get(name);
  }

  createSheet(name: string): SheetPort {
    const sheet = new FakeSheet(name);
    this.sheets.set(name, sheet);
    return sheet;
  }
}
