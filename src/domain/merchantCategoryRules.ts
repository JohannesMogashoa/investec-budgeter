import type { SheetValue } from '../platform/ports';

export type TextMatchKind = 'EXACT' | 'CONTAINS';
export type AmountOperator =
  'EQUALS' | 'GREATER_THAN' | 'GREATER_OR_EQUAL' | 'LESS_THAN' | 'LESS_OR_EQUAL' | 'BETWEEN';

export interface MerchantCategoryRule {
  readonly ruleId: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly descriptionMatch?: string;
  readonly descriptionMatchType?: TextMatchKind;
  readonly transactionTypeMatch?: string;
  readonly transactionTypeMatchType?: TextMatchKind;
  readonly amountOperator?: AmountOperator;
  readonly amountValue?: number;
  readonly amountValue2?: number;
  readonly merchantDisplay?: string;
  readonly category: string;
  readonly budgetItemId?: string;
}

export class InvalidRuleSetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRuleSetError';
  }
}

const TEXT_MATCH_KINDS = new Set<TextMatchKind>(['EXACT', 'CONTAINS']);
const AMOUNT_OPERATORS = new Set<AmountOperator>([
  'EQUALS',
  'GREATER_THAN',
  'GREATER_OR_EQUAL',
  'LESS_THAN',
  'LESS_OR_EQUAL',
  'BETWEEN',
]);

function optionalText(value: SheetValue, field: string): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value !== 'string') throw new InvalidRuleSetError(`${field} must be text.`);
  return value;
}

function requiredText(value: SheetValue, field: string): string {
  const result = optionalText(value, field);
  if (!result || result.trim() === '') throw new InvalidRuleSetError(`${field} is required.`);
  return result;
}

function optionalNumber(value: SheetValue, field: string): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const result = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(result)) throw new InvalidRuleSetError(`${field} must be finite.`);
  if (Math.abs(result * 100 - Math.round(result * 100)) > 0.000001) {
    throw new InvalidRuleSetError(`${field} must use at most two decimal places.`);
  }
  return result;
}

function requiredBoolean(value: SheetValue, field: string): boolean {
  if (value === true || value === 'TRUE') return true;
  if (value === false || value === 'FALSE') return false;
  throw new InvalidRuleSetError(`${field} must be TRUE or FALSE.`);
}

function requiredPositiveInteger(value: SheetValue, field: string): number {
  const result = optionalNumber(value, field);
  if (result === undefined || !Number.isInteger(result) || result < 1) {
    throw new InvalidRuleSetError(`${field} must be a positive integer.`);
  }
  return result;
}

function matchKind(value: SheetValue, field: string): TextMatchKind | undefined {
  const result = optionalText(value, field);
  if (result === undefined) return undefined;
  if (!TEXT_MATCH_KINDS.has(result as TextMatchKind)) {
    throw new InvalidRuleSetError(`${field} must be EXACT or CONTAINS.`);
  }
  return result as TextMatchKind;
}

function amountOperator(value: SheetValue): AmountOperator | undefined {
  const result = optionalText(value, 'Amount Operator');
  if (result === undefined) return undefined;
  if (!AMOUNT_OPERATORS.has(result as AmountOperator)) {
    throw new InvalidRuleSetError(`Amount Operator is unsupported: ${result}.`);
  }
  return result as AmountOperator;
}

function validateTextPredicate(
  value: string | undefined,
  kind: TextMatchKind | undefined,
  field: string,
): void {
  if (value === undefined && kind !== undefined) {
    throw new InvalidRuleSetError(`${field} match type requires a match value.`);
  }
  if (value !== undefined && value.trim() === '') {
    throw new InvalidRuleSetError(`${field} cannot be blank.`);
  }
  if (value !== undefined && kind === undefined) {
    throw new InvalidRuleSetError(`${field} requires a match type.`);
  }
}

function validateAmountValue(value: number | undefined, field: string): void {
  if (value === undefined) return;
  if (!Number.isFinite(value)) throw new InvalidRuleSetError(`${field} must be finite.`);
  if (Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) {
    throw new InvalidRuleSetError(`${field} must use at most two decimal places.`);
  }
}

export function validateRuleSet(rules: readonly MerchantCategoryRule[]): void {
  const ids = new Set<string>();
  const priorities = new Set<number>();
  for (const rule of rules) {
    if (!rule.ruleId || rule.ruleId.trim() === '') {
      throw new InvalidRuleSetError('Rule ID is required.');
    }
    if (ids.has(rule.ruleId)) throw new InvalidRuleSetError(`Duplicate Rule ID: ${rule.ruleId}.`);
    ids.add(rule.ruleId);
    if (!Number.isInteger(rule.priority) || rule.priority < 1) {
      throw new InvalidRuleSetError(`Rule ${rule.ruleId} has an invalid priority.`);
    }
    if (rule.enabled && priorities.has(rule.priority)) {
      throw new InvalidRuleSetError(`Duplicate enabled priority: ${rule.priority}.`);
    }
    if (rule.enabled) priorities.add(rule.priority);

    validateTextPredicate(rule.descriptionMatch, rule.descriptionMatchType, 'Description Match');
    validateTextPredicate(
      rule.transactionTypeMatch,
      rule.transactionTypeMatchType,
      'Transaction Type Match',
    );
    if (rule.descriptionMatchType && !TEXT_MATCH_KINDS.has(rule.descriptionMatchType)) {
      throw new InvalidRuleSetError('Description Match Type must be EXACT or CONTAINS.');
    }
    if (rule.transactionTypeMatchType && !TEXT_MATCH_KINDS.has(rule.transactionTypeMatchType)) {
      throw new InvalidRuleSetError('Transaction Type Match Type must be EXACT or CONTAINS.');
    }
    if (rule.amountOperator && !AMOUNT_OPERATORS.has(rule.amountOperator)) {
      throw new InvalidRuleSetError(`Amount Operator is unsupported: ${rule.amountOperator}.`);
    }
    validateAmountValue(rule.amountValue, 'Amount Value');
    validateAmountValue(rule.amountValue2, 'Amount Value 2');
    if (rule.enabled && (!rule.category || rule.category.trim() === '')) {
      throw new InvalidRuleSetError(`Rule ${rule.ruleId} requires a category.`);
    }

    const hasAmount = rule.amountOperator !== undefined;
    if (hasAmount !== (rule.amountValue !== undefined)) {
      throw new InvalidRuleSetError(`Rule ${rule.ruleId} has an incomplete amount predicate.`);
    }
    if (rule.amountOperator === 'BETWEEN') {
      if (rule.amountValue2 === undefined || rule.amountValue2 < (rule.amountValue ?? 0)) {
        throw new InvalidRuleSetError(`Rule ${rule.ruleId} has invalid BETWEEN bounds.`);
      }
    } else if (rule.amountValue2 !== undefined) {
      throw new InvalidRuleSetError(`Rule ${rule.ruleId} cannot use Amount Value 2.`);
    }

    if (rule.enabled && !rule.descriptionMatch && !rule.transactionTypeMatch && !hasAmount) {
      throw new InvalidRuleSetError(`Rule ${rule.ruleId} requires at least one predicate.`);
    }
  }
}

export function ruleFromRecord(record: Readonly<Record<string, SheetValue>>): MerchantCategoryRule {
  const descriptionMatch = optionalText(record['Description Match'], 'Description Match');
  const descriptionMatchType = matchKind(
    record['Description Match Type'],
    'Description Match Type',
  );
  const transactionTypeMatch = optionalText(
    record['Transaction Type Match'],
    'Transaction Type Match',
  );
  const transactionTypeMatchType = matchKind(
    record['Transaction Type Match Type'],
    'Transaction Type Match Type',
  );
  const amountOperator = amountOperatorValue(record['Amount Operator']);
  const rule: MerchantCategoryRule = {
    ruleId: requiredText(record['Rule ID'], 'Rule ID'),
    enabled: requiredBoolean(record.Enabled, 'Enabled'),
    priority: requiredPositiveInteger(record.Priority, 'Priority'),
    descriptionMatch,
    descriptionMatchType,
    transactionTypeMatch,
    transactionTypeMatchType,
    amountOperator,
    amountValue: optionalNumber(record['Amount Value'], 'Amount Value'),
    amountValue2: optionalNumber(record['Amount Value 2'], 'Amount Value 2'),
    merchantDisplay: optionalText(record['Merchant Display'], 'Merchant Display'),
    category: optionalText(record.Category, 'Category') ?? '',
    budgetItemId: optionalText(record['Budget Item ID'], 'Budget Item ID'),
  };
  return rule;
}

function amountOperatorValue(value: SheetValue): AmountOperator | undefined {
  return amountOperator(value);
}

export function ruleToRecord(rule: MerchantCategoryRule): Record<string, SheetValue> {
  return {
    'Rule ID': rule.ruleId,
    Enabled: rule.enabled,
    Priority: rule.priority,
    'Description Match': rule.descriptionMatch ?? null,
    'Description Match Type': rule.descriptionMatchType ?? null,
    'Transaction Type Match': rule.transactionTypeMatch ?? null,
    'Transaction Type Match Type': rule.transactionTypeMatchType ?? null,
    'Amount Operator': rule.amountOperator ?? null,
    'Amount Value': rule.amountValue ?? null,
    'Amount Value 2': rule.amountValue2 ?? null,
    'Merchant Display': rule.merchantDisplay ?? null,
    Category: rule.category || null,
    'Budget Item ID': rule.budgetItemId ?? null,
  };
}
