const SENSITIVE_KEY =
  /(token|secret|authorization|api[-_ ]?key|client[-_ ]?id|password|account(number)?)/i;

export function redactText(value: string, secrets: readonly string[] = []): string {
  let redacted = value;
  for (const secret of secrets) {
    if (secret.length > 0) redacted = redacted.split(secret).join('[REDACTED]');
  }
  return redacted.replace(/(Bearer|Basic)\s+[^\s,}]+/gi, '$1 [REDACTED]');
}

export function redactFields(
  fields: Readonly<Record<string, unknown>>,
  secrets: readonly string[] = [],
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      SENSITIVE_KEY.test(key)
        ? '[REDACTED]'
        : typeof value === 'string'
          ? redactText(value, secrets)
          : typeof value === 'number' || typeof value === 'boolean' || value === null
            ? value
            : '[REDACTED]',
    ]),
  );
}
