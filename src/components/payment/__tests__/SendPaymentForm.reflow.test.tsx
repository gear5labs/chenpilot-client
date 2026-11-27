import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const root = process.cwd();
const source = readFileSync(path.resolve(root, 'src/components/payment/SendPaymentForm.tsx'), 'utf8');

describe('#313 — SendPaymentForm zoom / text-scaling reflow', () => {
  it('keeps the amount row shrinkable so controls do not overlap at 320px / 200% zoom', () => {
    expect(source).toContain('className="flex space-x-2 min-w-0"');
    expect(source).toContain('className="flex-1 min-w-0"');
    expect(source).toContain(
      'className="min-w-0 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"',
    );
  });

  it('renders readable field labels and inline errors', () => {
    expect(source).toContain('htmlFor="recipient-address"');
    expect(source).toContain('{t("payment.recipientAddress")}');
    expect(source).toContain('{t("payment.amount")}');
    expect(source).toContain('{t("payment.memoOptional")}');
    expect(source).toContain('role="alert"');
  });
});
