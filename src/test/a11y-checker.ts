export interface A11yViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  selector: string;
}

/**
 * Lightweight deterministic accessibility auditor for representative DOM/HTML views
 * covering auth, contacts, send, and dialog surfaces (#346).
 */
export function auditHtmlAccessibility(html: string): A11yViolation[] {
  const violations: A11yViolation[] = [];

  const imgRegex = /<img\b(?![^>]*\balt=)[^>]*>/gi;
  for (const m of html.matchAll(imgRegex)) {
    violations.push({
      id: 'image-alt',
      impact: 'critical',
      description: 'Images must have an alt attribute',
      selector: m[0],
    });
  }

  const buttonRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  for (const m of html.matchAll(buttonRegex)) {
    const attrs = m[1] || '';
    const inner = (m[2] || '').replace(/<[^>]+>/g, '').trim();
    const hasAriaLabel = /\baria-label\s*=\s*["'][^"']+["']/i.test(attrs) || /\baria-labelledby\s*=\s*["'][^"']+["']/i.test(attrs);
    if (!inner && !hasAriaLabel) {
      violations.push({
        id: 'button-name',
        impact: 'critical',
        description: 'Buttons must have discernible text or aria-label',
        selector: m[0],
      });
    }
  }

  const dialogRegex = /<div\b([^>]*\brole\s*=\s*["'](?:dialog|alertdialog)["'][^>]*)>/gi;
  for (const m of html.matchAll(dialogRegex)) {
    const attrs = m[1] || '';
    const hasLabel = /\baria-label\s*=\s*["'][^"']+["']/i.test(attrs) || /\baria-labelledby\s*=\s*["'][^"']+["']/i.test(attrs);
    if (!hasLabel) {
      violations.push({
        id: 'aria-dialog-name',
        impact: 'serious',
        description: 'ARIA dialog elements must have an accessible name via aria-label or aria-labelledby',
        selector: m[0],
      });
    }
  }

  return violations;
}
