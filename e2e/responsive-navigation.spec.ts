import { test, expect, Page } from '@playwright/test';

/**
 * Visual regression and responsive navigation test suite (#319).
 * 
 * Verifies:
 * - Desktop expanded and collapsed navigation states
 * - Mobile navigation header and offscreen drawer states
 * - Mobile drawer open, backdrop overlay, and scroll-lock behavior
 * - Narrow-height / virtual-keyboard open responsive states
 * - Strict assertion that horizontal overflow does not occur in any state
 * - Strict assertion that navigation elements and main content do not occlude unexpectedly
 */

const TESTNET_USER = {
  id: 'usr-nav-01',
  email: 'pilot@example.test',
  name: 'Navigation Pilot',
  address: 'GBRPYHIL2CI3FNQ4AFIXFKVKGMWVDWDBCAGA6XVZZDAML7THV7CANUBB',
  publicKey: 'GBRPYHIL2CI3FNQ4AFIXFKVKGMWVDWDBCAGA6XVZZDAML7THV7CANUBB',
  isDeployed: true,
  isFunded: true,
  tokenType: 'XLM',
  authProvider: 'email',
  isEmailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const MOCK_CONVERSATIONS = [
  {
    id: 'conv-101',
    title: 'DeFi Swap Inquiry',
    updatedAt: '2026-01-01T12:00:00Z',
    messages: [
      { id: 'm1', content: 'Swap 50 XLM to USDC', timestamp: '2026-01-01T12:00:00Z', type: 'user' },
      { id: 'm2', content: 'Swap simulated successfully', timestamp: '2026-01-01T12:01:00Z', type: 'agent' },
    ],
  },
  {
    id: 'conv-102',
    title: 'Account Funding Check',
    updatedAt: '2026-01-01T11:00:00Z',
    messages: [
      { id: 'm3', content: 'What is my current XLM balance?', timestamp: '2026-01-01T11:00:00Z', type: 'user' },
    ],
  },
];

/**
 * Asserts that the viewport and document root have zero unexpected horizontal overflow.
 */
async function assertNoHorizontalOverflow(page: Page, stateDescription: string) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const windowWidth = window.innerWidth;
    const docScrollWidth = doc.scrollWidth;
    const bodyScrollWidth = body.scrollWidth;

    return {
      docScrollWidth,
      bodyScrollWidth,
      windowWidth,
      hasDocOverflow: docScrollWidth > windowWidth + 1,
      hasBodyOverflow: bodyScrollWidth > windowWidth + 1,
    };
  });

  expect(
    metrics.hasDocOverflow,
    `Unexpected horizontal document overflow in state [${stateDescription}]: docScrollWidth=${metrics.docScrollWidth}px exceeds windowWidth=${metrics.windowWidth}px`,
  ).toBe(false);

  expect(
    metrics.hasBodyOverflow,
    `Unexpected horizontal body overflow in state [${stateDescription}]: bodyScrollWidth=${metrics.bodyScrollWidth}px exceeds windowWidth=${metrics.windowWidth}px`,
  ).toBe(false);
}

test.describe('Responsive Navigation & Drawer Visual Regression (#319)', () => {
  test.beforeEach(async ({ page }) => {
    // Inject authenticated session into localStorage
    await page.addInitScript((user) => {
      window.localStorage.setItem('auth_token', 'mock-testnet-jwt-token');
      window.localStorage.setItem('user_data', JSON.stringify(user));
    }, TESTNET_USER);

    // Mock auth/me and activity
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: TESTNET_USER }),
      });
    });

    // Mock query/conversations if queried
    await page.route('**/chat/conversations*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CONVERSATIONS }),
      });
    });
  });

  test('Desktop viewport: expanded and collapsed navigation states with no overflow or occlusion', async ({ page }) => {
    // Standard desktop resolution
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/chat');

    const sidebar = page.locator('[data-testid="sidebar-navigation"]');
    const mobileHeader = page.locator('[data-testid="mobile-header"]');
    const mainContent = page.locator('#main-content');

    // Desktop assertions
    await expect(sidebar).toBeVisible();
    await expect(mobileHeader).toBeHidden();
    await expect(mainContent).toBeVisible();

    // Verify sidebar and main content do not occlude each other on desktop
    const sidebarBox = await sidebar.boundingBox();
    const mainBox = await mainContent.boundingBox();

    expect(sidebarBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    if (sidebarBox && mainBox) {
      expect(sidebarBox.width).toBeGreaterThan(200); // Expanded w-72
      expect(mainBox.x).toBeGreaterThanOrEqual(sidebarBox.x + sidebarBox.width - 2); // Main starts at or after sidebar
    }

    await assertNoHorizontalOverflow(page, 'Desktop expanded navigation');

    // Visual screenshot for desktop expanded state
    await page.screenshot({
      path: 'e2e/screenshots/desktop-navigation-expanded.png',
      fullPage: false,
    });

    // Collapse sidebar
    const collapseBtn = page.locator('[data-testid="collapse-sidebar-button"]');
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      await page.waitForTimeout(350); // wait for CSS transform/transition

      const collapsedBox = await sidebar.boundingBox();
      expect(collapsedBox).not.toBeNull();
      if (collapsedBox) {
        expect(collapsedBox.width).toBeLessThanOrEqual(80); // Collapsed w-16 is 64px
      }

      await assertNoHorizontalOverflow(page, 'Desktop collapsed navigation');

      // Visual screenshot for desktop collapsed state
      await page.screenshot({
        path: 'e2e/screenshots/desktop-navigation-collapsed.png',
        fullPage: false,
      });
    }
  });

  test('Mobile viewport: closed header, open drawer, overlay and body scroll-lock', async ({ page }) => {
    // Standard mobile resolution (e.g. iPhone / Android portrait)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/chat');

    const mobileHeader = page.locator('[data-testid="mobile-header"]');
    const menuBtn = page.locator('#mobile-menu-button');
    const sidebar = page.locator('[data-testid="sidebar-navigation"]');
    const overlay = page.locator('[data-testid="sidebar-overlay"]');

    // 1. Mobile Closed State
    await expect(mobileHeader).toBeVisible();
    await expect(menuBtn).toBeVisible();
    await expect(overlay).toBeHidden();

    // Verify sidebar is hidden/offscreen on mobile closed state
    const isSidebarOffscreenOrHidden = await sidebar.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.right <= 0 || style.visibility === 'hidden' || style.display === 'none';
    });
    expect(isSidebarOffscreenOrHidden, 'Sidebar must be off-screen or invisible when closed on mobile').toBe(true);

    await assertNoHorizontalOverflow(page, 'Mobile closed navigation');

    await page.screenshot({
      path: 'e2e/screenshots/mobile-navigation-closed.png',
      fullPage: false,
    });

    // 2. Open Mobile Drawer
    await menuBtn.click();
    await page.waitForTimeout(350); // wait for transition

    await expect(overlay).toBeVisible();
    await expect(sidebar).toBeVisible();

    // Verify sidebar has slid into view
    const openSidebarBox = await sidebar.boundingBox();
    expect(openSidebarBox).not.toBeNull();
    if (openSidebarBox) {
      expect(openSidebarBox.x).toBeGreaterThanOrEqual(0);
      expect(openSidebarBox.width).toBeGreaterThan(200);
    }

    // Verify body scroll-lock class is applied
    const isBodyLocked = await page.evaluate(() => document.body.classList.contains('sidebar-open'));
    expect(isBodyLocked, 'Body must have sidebar-open class while mobile drawer is open').toBe(true);

    await assertNoHorizontalOverflow(page, 'Mobile drawer open');

    await page.screenshot({
      path: 'e2e/screenshots/mobile-drawer-open.png',
      fullPage: false,
    });

    // 3. Close Drawer via Close Button
    const closeBtn = page.locator('[data-testid="close-sidebar-button"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await page.waitForTimeout(350);

    await expect(overlay).toBeHidden();
    const isBodyUnlocked = await page.evaluate(() => document.body.classList.contains('sidebar-open'));
    expect(isBodyUnlocked, 'Body must remove sidebar-open class when drawer is closed').toBe(false);

    await assertNoHorizontalOverflow(page, 'Mobile drawer closed via button');
  });

  test('Narrow-height / keyboard-open mobile viewport: responsive scroll and no occlusion', async ({ page }) => {
    // Narrow vertical height simulates mobile device when virtual keyboard is raised (e.g. 375x380)
    await page.setViewportSize({ width: 375, height: 380 });
    await page.goto('/chat');

    const mobileHeader = page.locator('[data-testid="mobile-header"]');
    const menuBtn = page.locator('#mobile-menu-button');
    const sidebar = page.locator('[data-testid="sidebar-navigation"]');

    await expect(mobileHeader).toBeVisible();
    await expect(menuBtn).toBeVisible();

    await assertNoHorizontalOverflow(page, 'Narrow height mobile closed');

    await page.screenshot({
      path: 'e2e/screenshots/mobile-narrow-height-closed.png',
      fullPage: false,
    });

    // Open drawer under narrow height
    await menuBtn.click();
    await page.waitForTimeout(350);

    await expect(sidebar).toBeVisible();

    // Verify header, action button, and profile footer in sidebar remain reachable without mutual occlusion
    const newChatBtn = page.locator('[data-testid="new-chat-button"]');
    const profileBtn = page.locator('[data-testid="profile-menu-button"]');

    await expect(newChatBtn).toBeVisible();
    await expect(profileBtn).toBeVisible();

    const newChatBox = await newChatBtn.boundingBox();
    const profileBox = await profileBtn.boundingBox();

    expect(newChatBox).not.toBeNull();
    expect(profileBox).not.toBeNull();
    if (newChatBox && profileBox) {
      // Ensure elements don't overlap vertically
      expect(profileBox.y).toBeGreaterThanOrEqual(newChatBox.y + newChatBox.height);
    }

    await assertNoHorizontalOverflow(page, 'Narrow height mobile drawer open');

    await page.screenshot({
      path: 'e2e/screenshots/mobile-narrow-height-drawer-open.png',
      fullPage: false,
    });
  });
});
