import type { SheetGateway, SheetPort, SheetSetup, SheetValue } from './ports';

class AppsScriptSheet implements SheetPort {
  readonly name: string;

  constructor(private readonly sheet: GoogleAppsScript.Spreadsheet.Sheet) {
    this.name = sheet.getName();
  }

  getLastRow(): number {
    return this.sheet.getLastRow();
  }

  getLastColumn(): number {
    return this.sheet.getLastColumn();
  }

  readValues(): SheetValue[][] {
    const rowCount = this.getLastRow();
    const columnCount = this.getLastColumn();
    if (rowCount === 0 || columnCount === 0) {
      return [];
    }

    return this.sheet.getRange(1, 1, rowCount, columnCount).getValues() as SheetValue[][];
  }

  writeValues(startRow: number, startColumn: number, values: SheetValue[][]): void {
    if (values.length === 0 || values[0]?.length === 0) {
      return;
    }

    this.sheet.getRange(startRow, startColumn, values.length, values[0].length).setValues(values);
  }

  clearValues(): void {
    this.sheet.getDataRange().clearContent();
  }

  appendValues(values: SheetValue[][]): void {
    this.writeValues(this.getLastRow() + 1, 1, values);
  }

  applySetup(setup: SheetSetup): void {
    this.sheet.setFrozenRows(setup.frozenRows);
    this.sheet
      .getRange(1, 1, 1, setup.columns.length)
      .setBackground(setup.headerBackground)
      .setFontColor(setup.headerFontColor)
      .setFontWeight('bold');

    const rowCount = Math.max(this.sheet.getMaxRows() - 1, 1);
    setup.columns.forEach((column, index) => {
      const range = this.sheet.getRange(2, index + 1, rowCount, 1);
      if (column.numberFormat) range.setNumberFormat(column.numberFormat);
      if (column.protected) {
        const protection = range.protect();
        protection.setDescription(`Investec Budgeter technical column ${index + 1}`);
        protection.setWarningOnly(true);
      }
    });

    if (setup.hidden) this.sheet.hideSheet();
  }
}

export class AppsScriptSheetGateway implements SheetGateway {
  constructor(private readonly spreadsheet = SpreadsheetApp.getActiveSpreadsheet()) {}

  getSpreadsheetId(): string {
    return this.spreadsheet.getId();
  }

  getTimeZone(): string {
    return this.spreadsheet.getSpreadsheetTimeZone();
  }

  getSheet(name: string): SheetPort | undefined {
    const sheet = this.spreadsheet.getSheetByName(name);
    return sheet ? new AppsScriptSheet(sheet) : undefined;
  }

  createSheet(name: string): SheetPort {
    return new AppsScriptSheet(this.spreadsheet.insertSheet(name));
  }
}
