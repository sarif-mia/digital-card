const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { root, loadSite, validateCard, escapeHtml, interpolate, renderCard } = require('../scripts/site.cjs');

test('every source card produces its checked-in page without unresolved placeholders', () => {
  const { cards, pages } = loadSite();
  assert.ok(cards.length > 0);
  assert.equal(cards.length, pages.size);
  for (const [file, html] of pages) {
    assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), html, file);
    assert.ok(!/\{\{\w+\}\}/.test(html), file);
  }
});

test('validation rejects unsafe paths, unknown brands and malformed contacts', () => {
  const card = { slug: 'sample', brand: 'nds9', name: 'A', job: 'B', phone: '+880123', email: 'a@example.com' };
  const brands = { nds9: {} };
  for (const slug of ['../outside', '/absolute', 'nested/card', 'a/../../b']) assert.throws(() => validateCard({ ...card, slug }, brands), /Invalid card slug/);
  assert.throws(() => validateCard({ ...card, brand: 'missing' }, brands), /Unknown brand/);
  assert.throws(() => validateCard({ ...card, email: 'hr@@example.com' }, brands), /invalid email/);
  assert.throws(() => validateCard({ ...card, phone: '+880123\u202c' }, brands), /invalid phone/);
  assert.throws(() => validateCard({ ...card, name: '' }, brands), /missing name/);
});

test('HTML values are escaped and unknown template fields fail', () => {
  assert.equal(escapeHtml('<script>"&\''), '&lt;script&gt;&quot;&amp;&#39;');
  assert.throws(() => interpolate('{{missing}}', {}), /Unknown template field/);
});

test('renderer escapes card values and rejects unsafe social URLs', () => {
  const { cards, brands } = loadSite();
  const card = { ...cards[0], name: '<img src=x onerror=alert(1)>' };
  const template = fs.readFileSync(path.join(root, 'src/templates/card.html'), 'utf8');
  const icons = Object.fromEntries(fs.readdirSync(path.join(root, 'src/icons')).map(file => [path.basename(file, '.svg'), fs.readFileSync(path.join(root, 'src/icons', file), 'utf8')]));
  const html = renderCard(card, brands[card.brand], template, icons);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x'));
  assert.throws(() => renderCard({ ...card, rows: [{ href: 'javascript:alert(1)', lines: ['x'], label: 'Bad', icon: 'phone' }] }, brands[card.brand], template, icons), /Unsupported link/);
});
