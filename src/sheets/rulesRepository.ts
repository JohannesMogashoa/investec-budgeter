import type { SheetGateway, SheetValue } from '../platform/ports';
import {
  ruleFromRecord,
  ruleToRecord,
  validateRuleSet,
  type MerchantCategoryRule,
} from '../domain/merchantCategoryRules';
import { getSchema } from './schemaManifest';
import { indexBy, readStoredRecords, requireSheet, valuesForRecord } from './repositorySupport';

const schema = getSchema('Rules');

export class RulesRepository {
  private readonly sheet;

  constructor(gateway: SheetGateway) {
    this.sheet = requireSheet(gateway, schema);
  }

  list(): MerchantCategoryRule[] {
    const rules = readStoredRecords(this.sheet, schema.headers).map(({ record }) =>
      ruleFromRecord(record),
    );
    validateRuleSet(rules);
    return rules;
  }

  upsert(rules: readonly MerchantCategoryRule[]): void {
    validateRuleSet(rules);
    const stored = readStoredRecords(this.sheet, schema.headers);
    const existing = indexBy(stored, 'Rule ID');
    const existingRules = stored.map(({ record }) => ruleFromRecord(record));
    const replacements = new Map(rules.map((rule) => [rule.ruleId, rule]));
    const merged = existingRules.map((rule) => replacements.get(rule.ruleId) ?? rule);
    for (const rule of rules) {
      if (!existing.has(rule.ruleId)) merged.push(rule);
    }
    validateRuleSet(merged);
    for (const rule of rules) {
      const prior = existing.get(rule.ruleId);
      const values: SheetValue[] = valuesForRecord(ruleToRecord(rule), schema.headers);
      if (prior) this.sheet.writeValues(prior.rowNumber, 1, [values]);
      else this.sheet.appendValues([values]);
    }
  }
}
