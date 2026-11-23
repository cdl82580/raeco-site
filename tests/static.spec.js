const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const attrs = (re) => [...html.matchAll(re)].map(m => m[1]);

test.describe('static integrity', () => {
  test('has required head metadata', () => {
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toMatch(/<html lang="en">/);
    expect(html).toMatch(/<meta name="viewport"/);
    expect(html).toMatch(/<title>[^<]{10,}<\/title>/);
    expect(html).toMatch(/<meta name="description" content="[^"]{50,}"/);
  });

  test('every local img/ reference exists on disk', () => {
    const refs = new Set(attrs(/(?:src|href)="(img\/[^"]+)"/g));
    for (let i = 1; i <= 12; i++) refs.add(`img/g${i}.jpg`); // gallery built in JS
    const teamImgs = attrs(/img:'(img\/[^']+)'/g);
    teamImgs.forEach(r => refs.add(r));
    expect(refs.size).toBeGreaterThan(15);
    for (const r of refs) expect(fs.existsSync(path.join(root, r)), r).toBe(true);
  });

  test('no orphaned images in img/', () => {
    const used = new Set(html.match(/img\/[\w.-]+\.(?:jpg|png)/g));
    for (let i = 1; i <= 12; i++) used.add(`img/g${i}.jpg`);
    const orphans = fs.readdirSync(path.join(root, 'img'))
      .filter(f => /\.(jpg|png)$/.test(f))
      .filter(f => !used.has(`img/${f}`) && f !== 'apple-touch-icon.png' && f !== 'icon-192.png' && f !== 'favicon-32.png');
    expect(orphans).toEqual([]);
  });

  test('ids are unique', () => {
    const ids = attrs(/\sid="([^"]+)"/g);
    expect(ids.filter((v, i) => ids.indexOf(v) !== i)).toEqual([]);
  });

  test('every in-page anchor has a target', () => {
    const ids = new Set(attrs(/\sid="([^"]+)"/g));
    for (const a of attrs(/href="#([^"]+)"/g)) expect(ids.has(a), `#${a}`).toBe(true);
  });

  test('external links open safely', () => {
    const tags = html.match(/<a [^>]*target="_blank"[^>]*>/g) || [];
    expect(tags.length).toBeGreaterThan(10);
    for (const t of tags) expect(t, t).toMatch(/rel="noopener/);
    const tpl = html.match(/target="_blank" rel="noopener"/g) || [];
    expect(tpl.length).toBeGreaterThan(0);
  });

  test('phone numbers are consistent between tel: links and display text', () => {
    expect(html).toContain('tel:+19787331126');
    expect(html).toContain('978-733-1126');
    expect(html).toContain('tel:+19788551507');
    expect(html).toContain('978-855-1507');
    const tels = new Set(attrs(/href="tel:(\+1\d{10})"/g));
    for (const t of tels) expect(t).toMatch(/^\+1\d{10}$/);
  });

  test('all static <img> have alt text', () => {
    for (const tag of html.match(/<img [^>]*>/g)) expect(tag, tag).toMatch(/\balt=/);
  });

  test('booking URLs are https vagaro', () => {
    for (const u of html.match(/https:\/\/www\.vagaro\.com\/[^'"]+/g)) {
      expect(u).toMatch(/^https:\/\/www\.vagaro\.com\/(raecohairstudio|badgalesthetics)\/book-now$/);
    }
  });

  test('no leftover placeholders', () => {
    expect(html).not.toMatch(/lorem ipsum|TODO|FIXME|undefined|\[object Object\]/i);
  });

  test('image files are reasonably sized', () => {
    for (const f of fs.readdirSync(path.join(root, 'img'))) {
      const size = fs.statSync(path.join(root, 'img', f)).size;
      expect(size, `${f} is ${(size / 1024 / 1024).toFixed(1)}MB`).toBeLessThan(2 * 1024 * 1024);
    }
  });

  test('mailto form encodes subject and body', () => {
    expect(html).toMatch(/mailto:RaeandcoMa@gmail\.com\?subject=\$\{encodeURIComponent\('Station rental inquiry'\)\}&body=\$\{encodeURIComponent\(/);
  });
});
