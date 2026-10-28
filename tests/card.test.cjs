const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createVCard, escapeVCard, foldLine } = require('../assets/js/card.js');
const root = path.resolve(__dirname, '..');

test('vCard escapes separators, backslashes and injected newlines', () => {
  assert.equal(escapeVCard('A,B;C\\D\nEND:VCARD'), 'A\\,B\\;C\\\\D\\nEND:VCARD');
});

test('UTF-8 line folding preserves content and the 75-byte limit', () => {
  const original = 'FN:' + 'বাংলা España '.repeat(30);
  const folded = foldLine(original);
  assert.equal(folded.replace(/\r\n /g, ''), original);
  for (const line of folded.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
});

test('contact export has valid structured address fields and CRLF endings', () => {
  const card = createVCard({ name: 'Test User', phone: '+880123456', email: 'test@example.com', company: 'NDS9', job: 'IT', address: 'Dhaka, Bangladesh', website: 'https://example.com' });
  assert.ok(card.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n'));
  assert.ok(card.endsWith('END:VCARD\r\n'));
  assert.ok(card.includes('ADR;TYPE=WORK;CHARSET=UTF-8:;;Dhaka\\, Bangladesh;;;;\r\n'));
  assert.ok(card.includes('N;CHARSET=UTF-8:;Test User;;;\r\n'));
  assert.ok(!card.replace(/\r\n/g, '').includes('\n'));
});

const pages = require('../scripts/site.cjs').loadSite().cards.map(card => `${card.slug}.html`);
for (const page of pages) {
  test(`${page}: shared assets, accessible controls, unique IDs and complete contact`, () => {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.ok(!/onclick=|<style>|<script>/.test(html));
    assert.equal((html.match(/<main\b/g) || []).length, 1);
    assert.equal((html.match(/<\/main>/g) || []).length, 1);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(html.includes('data-download-contact'));
    assert.ok(html.includes('aria-label="Open office location in maps"'));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const key of ['name', 'phone', 'email', 'company', 'job', 'address', 'website']) {
      assert.match(html, new RegExp(`id="${key}" value="[^"]+"`));
    }
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (/^(https?:|tel:|mailto:|#)/.test(match[1])) continue;
      assert.ok(fs.existsSync(path.resolve(root, path.dirname(page), match[1])), `Missing asset: ${match[1]}`);
    }
  });
}
