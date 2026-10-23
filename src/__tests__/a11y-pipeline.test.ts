import { describe, it, expect } from 'vitest';
import { auditHtmlAccessibility } from '../test/a11y-checker';

describe('automated accessibility checks across representative views (#346)', () => {
  it('passes compliant auth, contacts, send, and dialog markup with zero critical/serious violations', () => {
    const compliantMarkup = `
      <main aria-label="Authentication and Send View">
        <form aria-label="Login Form">
          <label for="email">Email</label>
          <input id="email" type="email" />
          <button type="submit">Sign In</button>
        </form>
        <section aria-label="Contacts">
          <img src="/avatar.png" alt="Contact Avatar" />
          <button type="button" aria-label="Send Payment">Send</button>
        </section>
        <div role="dialog" aria-labelledby="confirm-title" aria-modal="true">
          <h2 id="confirm-title">Confirm Transaction</h2>
        </div>
      </main>
    `;
    expect(auditHtmlAccessibility(compliantMarkup)).toEqual([]);
  });

  it('flags missing img alt, unlabeled buttons, and unlabeled dialogs as serious/critical violations', () => {
    const brokenMarkup = `
      <img src="/logo.png" />
      <button type="button"><svg></svg></button>
      <div role="dialog"><p>Missing accessible label</p></div>
    `;
    const violations = auditHtmlAccessibility(brokenMarkup);
    expect(violations.map((v) => v.id)).toEqual(['image-alt', 'button-name', 'aria-dialog-name']);
  });
});
