const { test, expect } = require('./fixtures');

const BOOK = 'https://www.vagaro.com/raecohairstudio/book-now';
const isMobile = (page) => (page.viewportSize()?.width ?? 1280) <= 900;

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text()) && errors.push(m.text()));
  page.errors = errors;
  await page.goto('/');
});
test.afterEach(async ({ page }) => { expect(page.errors).toEqual([]); });

test.describe('page basics', () => {
  test('title, hero, notice', async ({ page }) => {
    await expect(page).toHaveTitle(/Rae\+Co Hair Studio/);
    await expect(page.locator('h1')).toContainText('Where confidence begins');
    await expect(page.locator('.notice')).toContainText('hair extension');
  });

  test('all images load', async ({ page }) => {
    const broken = await page.evaluate(async () => {
      const imgs = [...document.images].filter(i => i.closest('#lb') === null);
      imgs.forEach(i => (i.loading = 'eager'));
      await Promise.all(imgs.map(i => i.decode().catch(() => {})));
      return imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src);
    });
    expect(broken).toEqual([]);
  });

  test('footer year is current', async ({ page }) => {
    await expect(page.locator('#yr')).toHaveText(String(new Date().getFullYear()));
  });

  test('exactly one h1 and sections have headings', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1);
    for (const id of ['about', 'team', 'services', 'work', 'weddings', 'promotions', 'join', 'contact'])
      await expect(page.locator(`#${id} h2`)).toHaveCount(1);
  });
});

test.describe('booking and contact links', () => {
  test('all Book Now buttons point to Vagaro and open in a new tab', async ({ page }) => {
    const links = page.locator(`a.btn[href="${BOOK}"]`);
    expect(await links.count()).toBeGreaterThanOrEqual(4);
    for (const l of await links.all()) {
      await expect(l).toHaveAttribute('target', '_blank');
      await expect(l).toHaveAttribute('rel', /noopener/);
    }
  });

  test('contact details', async ({ page }) => {
    await expect(page.locator('#contact')).toContainText('1175 Main Street');
    await expect(page.locator('#contact a[href="mailto:RaeandcoMa@gmail.com"]')).toBeVisible();
    await expect(page.locator('#contact a[href="tel:+19787331126"]')).toHaveText('978-733-1126');
    await expect(page.locator('#contact a[href^="https://www.google.com/maps"]')).toHaveAttribute('href', /1175\+Main\+Street/);
    await expect(page.locator('#weddings a[href="tel:+19788551507"]')).toBeVisible();
  });

  test('map iframe is titled and lazy', async ({ page }) => {
    const f = page.locator('iframe');
    await expect(f).toHaveAttribute('title', 'Map');
    await expect(f).toHaveAttribute('loading', 'lazy');
  });
});

test.describe('team', () => {
  const names = ['Beth', 'Maggie', 'Saraya', 'Shirley', 'Katie', 'Lotty', 'Jurnee'];

  test('renders all seven members with image, role, bio, and CTA', async ({ page }) => {
    const cards = page.locator('.member');
    await expect(cards).toHaveCount(7);
    for (const [i, n] of names.entries()) {
      const c = cards.nth(i);
      await expect(c.locator('h3')).toHaveText(n);
      await expect(c.locator('img')).toHaveAttribute('alt', n);
      await expect(c.locator('.role')).not.toBeEmpty();
      await expect(c.locator('p')).not.toBeEmpty();
      await expect(c.locator('a.btn')).toBeVisible();
    }
  });

  test('CTAs go to the right place', async ({ page }) => {
    const cta = (n) => page.locator('.member', { has: page.locator(`h3:text-is("${n}")`) }).locator('a.btn');
    await expect(cta('Beth')).toHaveAttribute('href', BOOK);
    await expect(cta('Maggie')).toHaveAttribute('href', 'tel:+19788551507');
    await expect(cta('Jurnee')).toHaveAttribute('href', 'https://www.vagaro.com/badgalesthetics/book-now');
    await expect(cta('Maggie')).not.toHaveAttribute('target', /.*/);
    await expect(cta('Beth')).toHaveAttribute('target', '_blank');
  });

  test('Instagram links are well-formed and open safely', async ({ page }) => {
    const igs = page.locator('.member a.pill[href*="instagram.com"]');
    await expect(igs).toHaveCount(7);
    for (const a of await igs.all()) {
      await expect(a).toHaveAttribute('href', /^https:\/\/www\.instagram\.com\/[\w.]+\/$/);
      await expect(a).toHaveAttribute('rel', /noopener/);
    }
  });
});

test.describe('services pricing tabs', () => {
  test('defaults to Beth with 3 sections', async ({ page }) => {
    await expect(page.locator('.tab[aria-selected="true"]')).toHaveText("Beth's pricing");
    await expect(page.locator('#menu h3')).toHaveText(['Hair', 'Color', 'Extensions']);
    await expect(page.locator('#menu').getByText('Haircut (includes blow dry)')).toBeVisible();
  });

  test('exactly one tab selected at a time; menu and note switch', async ({ page }) => {
    await page.getByRole('tab', { name: "Saraya's pricing" }).click();
    await expect(page.locator('.tab[aria-selected="true"]')).toHaveCount(1);
    await expect(page.locator('#menu h3')).toHaveText(['Hair design', 'Color', 'Highlights']);
    await expect(page.locator('#menuNote')).toHaveText('Bangs & Balayage by Saraya.');
  });

  test('providers without published prices show a fallback', async ({ page }) => {
    for (const n of ['Lotty', 'Jurnee']) {
      await page.getByRole('tab', { name: `${n}'s pricing` }).click();
      await expect(page.locator('#menu')).toContainText(`Pricing for ${n}'s services is available when you book.`);
      await expect(page.locator('#menu .row')).toHaveCount(0);
    }
  });

  test('every price row has a $ amount', async ({ page }) => {
    for (const tab of await page.locator('.tab').all()) {
      await tab.click();
      for (const b of await page.locator('#menu .row b').allTextContents()) expect(b).toMatch(/^\$\d+/);
    }
  });

  test('"View pricing" on a team card selects that provider and scrolls to services', async ({ page }) => {
    await page.locator('.member', { has: page.locator('h3:text-is("Katie")') }).locator('a[data-svc]').click();
    await expect(page.locator('.tab[aria-selected="true"]')).toHaveText("Katie's pricing");
    await expect(page).toHaveURL(/#services$/);
    await expect(page.locator('#menuNote')).toContainText('Renew');
  });

  test('tabs have roles and a tablist', async ({ page }) => {
    await expect(page.getByRole('tablist')).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(7);
  });
});

test.describe('gallery and lightbox', () => {
  test('renders 12 images with alt text', async ({ page }) => {
    const imgs = page.locator('#gallery img');
    await expect(imgs).toHaveCount(12);
    for (const i of await imgs.all()) await expect(i).toHaveAttribute('alt', /.+/);
  });

  test('click opens lightbox with the same image; click closes', async ({ page }) => {
    const lb = page.locator('#lb');
    await expect(lb).toBeHidden();
    const img = page.locator('#gallery img').nth(2);
    await img.scrollIntoViewIfNeeded();
    await img.click();
    await expect(lb).toBeVisible();
    await expect(lb.locator('img')).toHaveAttribute('src', /img\/g3\.jpg$/);
    await lb.click();
    await expect(lb).toBeHidden();
  });

  test('Escape closes lightbox', async ({ page }) => {
    const img = page.locator('#gallery img').first();
    await img.scrollIntoViewIfNeeded();
    await img.click();
    await expect(page.locator('#lb')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#lb')).toBeHidden();
  });

  test('social links', async ({ page }) => {
    const s = page.locator('.socials a');
    await expect(s).toHaveCount(10);
    for (const a of await s.all()) {
      await expect(a).toHaveAttribute('href', /^https:\/\/www\.instagram\.com\/[\w.]+\/?$/);
      await expect(a).toHaveAttribute('rel', /noopener/);
    }
  });
});

test.describe('navigation', () => {
  test('header becomes solid after scrolling', async ({ page }) => {
    await expect(page.locator('#hdr')).not.toHaveClass(/solid/);
    await page.evaluate(() => scrollTo(0, 300));
    await expect(page.locator('#hdr')).toHaveClass(/solid/);
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page.locator('#hdr')).not.toHaveClass(/solid/);
  });

  test('nav links scroll to their sections', async ({ page }) => {
    // Eager-load so layout shift from lazy images doesn't cut the smooth scroll short.
    await page.evaluate(async () => {
      const imgs = [...document.images].filter(i => !i.closest('#lb'));
      imgs.forEach(i => (i.loading = 'eager'));
      await Promise.all(imgs.map(i => i.decode().catch(() => {})));
    });
    if (isMobile(page)) await page.locator('#burger').click();
    await page.locator('#nav a[href="#contact"]').click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator('#contact h2')).toBeInViewport();
  });

  test('nav link lands on section even with lazy images', async ({ page }) => {
    if (isMobile(page)) await page.locator('#burger').click();
    await page.locator('#nav a[href="#contact"]').click();
    await page.waitForTimeout(2500);
    await expect(page.locator('#contact h2')).toBeInViewport();
  });

  test('nav has all 8 sections', async ({ page }) => {
    await expect(page.locator('#nav a')).toHaveText(['About', 'Team', 'Services', 'Our Work', 'Weddings', 'Promotions', 'Join Us', 'Contact']);
  });
});

test.describe('rental inquiry form', () => {
  test('requires name and email', async ({ page }) => {
    const form = page.locator('#rentForm');
    await form.scrollIntoViewIfNeeded();
    await form.getByRole('button', { name: 'Contact us' }).click();
    await expect(page.locator('#ok')).toBeHidden();
    expect(await form.locator('[name=name]').evaluate(e => e.validity.valueMissing)).toBe(true);
    await form.locator('[name=name]').fill('Pat');
    await form.locator('[name=email]').fill('not-an-email');
    await form.getByRole('button', { name: 'Contact us' }).click();
    expect(await form.locator('[name=email]').evaluate(e => e.validity.typeMismatch)).toBe(true);
    await expect(page.locator('#ok')).toBeHidden();
  });

  test('valid submit shows confirmation', async ({ page }) => {
    // The handler assigns location.href = mailto:..., which can't be intercepted
    // (no navigation/request event), so the encoding is covered in static.spec.js.
    const f = page.locator('#rentForm');
    await f.locator('[name=name]').fill('Pat & Sam');
    await f.locator('[name=email]').fill('pat@example.com');
    await f.locator('[name=message]').fill('Hello');
    await f.getByRole('button', { name: 'Contact us' }).click();
    await expect(page.locator('#ok')).toBeVisible();
    await expect(page.locator('#ok')).toContainText('Thank you');
  });
});

test.describe('theming', () => {
  test('dark mode applies dark palette', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(20, 26, 23)');
  });

  test('light mode applies light palette', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(250, 246, 240)');
  });
});

test.describe('content integrity', () => {
  test('promos and join section', async ({ page }) => {
    await expect(page.locator('.promo')).toHaveCount(3);
    await expect(page.locator('.promo .tag')).toHaveText(['New', 'Coming soon', 'Seasonal']);
    await expect(page.locator('#join .list li')).toHaveCount(7);
    await expect(page.locator('#join')).toContainText('Rentals are currently full');
  });

  test('perks and pillars', async ({ page }) => {
    await expect(page.locator('.perk')).toHaveCount(5);
    await expect(page.locator('.pillars > div')).toHaveCount(4);
  });
});
