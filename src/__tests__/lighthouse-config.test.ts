import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Lighthouse CI route performance and accessibility configuration (#341)', () => {
  const root = path.resolve(__dirname, '../..');

  it('defines deterministic route targets and performance/accessibility budgets in lighthouserc.json', () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(root, 'lighthouserc.json'), 'utf8'));
    expect(cfg.ci.collect.url).toContain('http://localhost:3000/');
    expect(cfg.ci.collect.url).toContain('http://localhost:3000/auth/login');
    expect(cfg.ci.collect.url).toContain('http://localhost:3000/dashboard');
    expect(cfg.ci.assert.assertions['categories:accessibility'][0]).toBe('error');
    expect(cfg.ci.assert.assertions['categories:performance'][0]).toBe('warn');
  });
});
