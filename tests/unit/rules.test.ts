import { describe, expect, it } from 'vitest';
import {
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
