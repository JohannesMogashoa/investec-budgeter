import { describe, expect, it } from 'vitest';
import {
  evaluateMerchantCategoryRules,
  InvalidRuleSetError,
  validateRuleSet,
  type MerchantCategoryRule,
} from '../../src/domain/merchantCategoryRules';
import { setupWorkbook } from '../../src/application/setupWorkbook';
import { RulesRepository } from '../../src/sheets/rulesRepository';
import { FakeSheetGateway } from '../fakes/platform';

const validRule: MerchantCategoryRule = {
  ruleId: 'groceries',
  enabled: true,
  priority: 10,
  descriptionMatch: 'MARKET',
  descriptionMatchType: 'CONTAINS',
  amountOperator: 'LESS_THAN',
  amountValue: 0,
  merchantDisplay: 'Grocery store',
  category: 'Needs',
  budgetItemId: 'food',
};

describe('merchant category rule validation', () => {
  it('round-trips a valid rule through the workbook repository', () => {
    const gateway = new FakeSheetGateway();
    setupWorkbook(gateway);
    const repository = new RulesRepository(gateway);

    repository.upsert([validRule]);

    expect(repository.list()).toEqual([validRule]);
  });

  it('rejects duplicate rule IDs and leaves transactions untouched', () => {
    const gateway = new FakeSheetGateway();
    setupWorkbook(gateway);
    const repository = new RulesRepository(gateway);

    expect(() => repository.upsert([validRule, { ...validRule, priority: 20 }])).toThrow(
      InvalidRuleSetError,
    );
    expect(gateway.getSheet('Transactions')?.readValues()).toHaveLength(1);
    expect(gateway.getSheet('Rules')?.readValues()).toHaveLength(1);
  });

  it('rejects duplicate enabled priorities and unsupported match types', () => {
    expect(() =>
      validateRuleSet([validRule, { ...validRule, ruleId: 'transport', priority: 10 }]),
    ).toThrow('Duplicate enabled priority');

    expect(() =>
      validateRuleSet([{ ...validRule, descriptionMatchType: 'REGEX' as never }]),
    ).toThrow('Description Match Type must be EXACT or CONTAINS');
  });

  it('rejects incomplete predicates, invalid amounts, and enabled rules without predicates', () => {
    expect(() => validateRuleSet([{ ...validRule, descriptionMatch: undefined }])).toThrow(
      'Description Match match type requires a match value',
    );

    expect(() => validateRuleSet([{ ...validRule, amountValue: 1.001 }])).toThrow(
      'Amount Value must use at most two decimal places',
    );

    expect(() =>
      validateRuleSet([
        {
          ...validRule,
          descriptionMatch: undefined,
          descriptionMatchType: undefined,
          amountOperator: undefined,
          amountValue: undefined,
        },
      ]),
    ).toThrow('requires at least one predicate');
  });

  it('writes formula-like rule text as literal text', () => {
    const gateway = new FakeSheetGateway();
    setupWorkbook(gateway);
    const repository = new RulesRepository(gateway);

    repository.upsert([{ ...validRule, merchantDisplay: '=HYPERLINK("https://evil.example")' }]);

    expect(repository.list()[0]?.merchantDisplay).toBe('=HYPERLINK("https://evil.example")');
    expect(gateway.getSheet('Rules')?.readValues()[1]?.[10]).toBe(
      '\'=HYPERLINK("https://evil.example")',
    );
  });
});

describe('merchant category rule evaluation', () => {
  const transaction = {
    descriptionRaw: '  Fresh Market Johannesburg  ',
    transactionType: 'CardPurchases',
    amount: -125.5,
  };

  it('AC-2.1: applies description, transaction type, amount, category, and budget suggestions', () => {
    const result = evaluateMerchantCategoryRules(transaction, [
      { ...validRule, transactionTypeMatch: 'cardpurchases', transactionTypeMatchType: 'EXACT' },
    ]);

    expect(result).toEqual({
      outcome: 'APPLIED',
      matchedRuleId: 'groceries',
      suggestedCategory: 'Needs',
      suggestedBudgetItemId: 'food',
      merchantDisplay: 'Grocery store',
    });
  });

  it('AC-2.2: evaluates the same transaction and rules deterministically', () => {
    const first = evaluateMerchantCategoryRules(transaction, [validRule]);
    const second = evaluateMerchantCategoryRules(transaction, [validRule]);

    expect(second).toEqual(first);
  });

  it('matches literal EXACT and CONTAINS text case-insensitively after trimming', () => {
    expect(
      evaluateMerchantCategoryRules({ ...transaction, descriptionRaw: '  FRESH MARKET  ' }, [
        { ...validRule, descriptionMatch: ' fresh market ', descriptionMatchType: 'EXACT' },
      ]).outcome,
    ).toBe('APPLIED');
    expect(
      evaluateMerchantCategoryRules(transaction, [
        { ...validRule, descriptionMatch: 'market joh', descriptionMatchType: 'CONTAINS' },
      ]).outcome,
    ).toBe('APPLIED');
  });

  it('returns NO_MATCH and the raw description when no enabled rule matches', () => {
    const result = evaluateMerchantCategoryRules(transaction, [
      { ...validRule, descriptionMatch: 'pharmacy', descriptionMatchType: 'CONTAINS' },
    ]);

    expect(result).toEqual({ outcome: 'NO_MATCH', merchantDisplay: transaction.descriptionRaw });
  });

  it('AC-2.3: routes equal-priority eligible rules to review in stable order', () => {
    const result = evaluateMerchantCategoryRules(transaction, [
      { ...validRule, ruleId: 'z-rule', priority: 20 },
      { ...validRule, ruleId: 'a-rule', priority: 20 },
    ]);

    expect(result).toEqual({
      outcome: 'REVIEW_REQUIRED',
      candidateRuleIds: ['a-rule', 'z-rule'],
      merchantDisplay: transaction.descriptionRaw,
    });
  });

  it('AC-2.4: derives merchant display without changing raw transaction data', () => {
    const original = structuredClone(transaction);
    const result = evaluateMerchantCategoryRules(transaction, [validRule]);

    expect(result.merchantDisplay).toBe('Grocery store');
    expect(transaction).toEqual(original);
  });

  it('AC-2.4: falls back to the raw description without a merchant cleanup rule', () => {
    const result = evaluateMerchantCategoryRules(transaction, [
      { ...validRule, merchantDisplay: undefined },
    ]);

    expect(result.merchantDisplay).toBe(transaction.descriptionRaw);
  });

  it.each([
    ['EQUALS', -125.5, true],
    ['GREATER_THAN', -125.5, false],
    ['GREATER_OR_EQUAL', -125.5, true],
    ['LESS_THAN', -125.5, false],
    ['LESS_OR_EQUAL', -125.5, true],
  ] as const)('AC-2.5: applies %s boundary semantics', (operator, amount, matches) => {
    const result = evaluateMerchantCategoryRules({ ...transaction, amount }, [
      {
        ...validRule,
        descriptionMatch: undefined,
        descriptionMatchType: undefined,
        amountOperator: operator,
        amountValue: -125.5,
      },
    ]);

    expect(result.outcome === 'APPLIED').toBe(matches);
  });

  it('AC-2.5: treats BETWEEN bounds as inclusive', () => {
    const rule = {
      ...validRule,
      descriptionMatch: undefined,
      descriptionMatchType: undefined,
      amountOperator: 'BETWEEN' as const,
      amountValue: -125.5,
      amountValue2: -100,
    };

    expect(evaluateMerchantCategoryRules({ ...transaction, amount: -125.5 }, [rule]).outcome).toBe(
      'APPLIED',
    );
    expect(evaluateMerchantCategoryRules({ ...transaction, amount: -100 }, [rule]).outcome).toBe(
      'APPLIED',
    );
    expect(evaluateMerchantCategoryRules({ ...transaction, amount: -99.99 }, [rule]).outcome).toBe(
      'NO_MATCH',
    );
  });

  it('selects the lowest priority eligible rule and leaves the raw description as fallback', () => {
    const result = evaluateMerchantCategoryRules(transaction, [
      { ...validRule, ruleId: 'later', priority: 20, merchantDisplay: undefined },
      { ...validRule, ruleId: 'first', priority: 5, merchantDisplay: undefined },
    ]);

    expect(result).toMatchObject({
      outcome: 'APPLIED',
      matchedRuleId: 'first',
      merchantDisplay: transaction.descriptionRaw,
    });
  });
});
