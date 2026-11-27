import { test, expect } from '@playwright/test';

/**
 * Keyboard-only payment flow (#555).
 *
 * Uses deterministic testnet fixtures and intercepted backend responses; it
 * never uses mainnet credentials, seeds, or a live payment endpoint.
 */

const TESTNET_USER = {
  id: 'usr-testnet-keyboard',
  email: 'keyboard.contributor@example.test',
  name: 'Keyboard Pilot',
  address: 'GBRPYHIL2CI3FNQ4AFIXFKVKGMWVDWDBCAGA6XVZZDAML7THV7CANUBB',
  publicKey: 'GBRPYHIL2CI3FNQ4AFIXFKVKGMWVDWDBCAGA6XVZZDAML7THV7CANUBB',
  tokenType: 'XLM',
  authProvider: 'email',
  isDeployed: true,
  isFunded: true,
  isEmailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const RECIPIENT = 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2UROW6MDQKVMJYOCSFJSC';

test.describe('Payment form keyboard flow (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((user) => {
      window.localStorage.setItem('auth_token', 'mock-testnet-keyboard-token');
      window.localStorage.setItem('user_data', JSON.stringify(user));
    }, TESTNET_USER);

    await page.route('**/contacts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route('**/account/*/transactions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { transactions: [], total: 0, page: 1, limit: 10 },
        }),
      });
    });

    await page.route('**/api/fund', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, txHash: 'testnet-fund-hash' }),
      });
    });
  });

  test('tab order, validation announcements, confirmation, and failure recovery', async ({ page }) => {
    let paymentAttempts = 0;

    await page.route('**/payments', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      paymentAttempts += 1;
      if (paymentAttempts === 1) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Service temporarily unavailable' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { status: 'submitted', transactionHash: 'testnet-payment-hash' },
        }),
      });
    });

    await page.route('**/payments/status*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { status: 'confirmed', transactionHash: 'testnet-payment-hash' },
        }),
      });
    });

    await page.goto('/send');

    const recipient = page.getByLabel('Recipient Address');
    const amount = page.getByLabel('Amount', { exact: true });
    const tokenType = page.getByLabel('Token type');
    const submit = page.getByRole('button', { name: /send payment/i });

    await expect(recipient).toBeVisible();

    // Keyboard entry: invalid values first so validation is announced before
    // the user ever reaches the confirmation control.
    await recipient.focus();
    await page.keyboard.type('not-a-stellar-address');
    await page.keyboard.press('Tab');
    await page.keyboard.type('0');
    await page.keyboard.press('Tab');
    await expect(tokenType).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(submit).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('alert').first()).toBeVisible();

    // Recover entirely from the keyboard: correct both fields, review the
    // confirmation control, then submit.
    await recipient.focus();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type(RECIPIENT);
    await amount.focus();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('10.1234567');
    await expect(submit).toBeEnabled();
    await submit.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText(/service temporarily unavailable/i).first()).toBeVisible();

    // Retry with the same idempotency key retained by the form; the mocked
    // backend now succeeds and reveals a status action.
    await submit.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText(/testnet-payment-hash/i).first()).toBeVisible();
    expect(paymentAttempts).toBe(2);
  });
});
