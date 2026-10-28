const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

function interpolate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template field: ${key}`);
    return values[key];
  });
}

function validateCard(card, brands) {
  if (!/^(?:st-old\/)?[a-z0-9]+(?:-[a-z0-9]+)*$/.test(card.slug)) {
    throw new Error(`Invalid card slug: ${card.slug}`);
  }
  if (!Object.hasOwn(brands, card.brand)) throw new Error(`Unknown brand: ${card.brand}`);
  for (const key of ['name', 'job', 'phone', 'email']) {
    if (typeof card[key] !== 'string' || !card[key].trim()) throw new Error(`${card.slug}: missing ${key}`);
  }
  if (!/^\+?[\d ()-]+$/.test(card.phone)) throw new Error(`${card.slug}: invalid phone`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(card.email)) throw new Error(`${card.slug}: invalid email`);
}

function renderCard(card, brand, template, icons) {
  const contact = { ...brand, ...card };
  const prefix = '../'.repeat(card.slug.split('/').length - 1);
  let iconIndex = 0;
  const icon = name => {
    if (!Object.hasOwn(icons, name)) throw new Error(`Unknown icon: ${name}`);
    const suffix = `-${iconIndex++}`;
    return icons[name].trim().replace(/id="([^"]+)"/g, `id="$1${suffix}"`)
      .replace(/url\(#([^)]+)\)/g, `url(#$1${suffix})`);
  };
  const safeHref = href => {
    if (!/^(https?:\/\/|mailto:|tel:)/.test(href)) throw new Error(`Unsupported link: ${href}`);
    return escapeHtml(href);
  };
  const actions = [
    { href: `tel:${contact.phone}`, label: 'Call contact' },
    { href: `mailto:${contact.email}`, label: 'Email contact' },
    { href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`, label: 'Open office location in maps' },
  ].map((action, index) => `      <a class="action-btn" href="${safeHref(action.href)}" aria-label="${action.label}">${icon(brand.actions[index])}</a>`).join('\n');

  const row = item => {
    const href = item.href && safeHref(interpolate(item.href, contact));
    const tag = href ? 'a' : 'div';
    const rowValues = { ...contact, job: card.displayJob || card.job };
    const value = item.lines.map(line => escapeHtml(interpolate(line, rowValues))).join('<br>');
    return `      <${tag} class="info-item"${href ? ` href="${href}"` : ''}>\n        <div class="info-icon">${icon(item.icon)}</div>\n        <div class="info-text">\n          <small>${escapeHtml(item.label)}</small>\n          <strong${item.label === 'Phone' ? ' class="phone-value"' : ''}>${value}</strong>\n        </div>\n      </${tag}>`;
  };
  const rows = card.rows || brand.rows;
  const details = rows.filter(item => !item.social).map(row).join('\n');
  const social = rows.filter(item => item.social).map(row).join('\n');
  const contactFields = ['name', 'phone', 'email', 'company', 'job', 'address', 'website']
    .map(key => `  <input type="hidden" id="${key}" value="${escapeHtml(contact[key])}">`).join('\n');
  return interpolate(template, {
    pageTitle: escapeHtml(card.pageTitle || `${card.displayName || card.name} - Digital Card`),
    prefix, bodyClass: card.brand === 'dunamiss' ? ' class="theme-dunamiss"' : '',
    logo: escapeHtml(brand.logo), logoAlt: escapeHtml(brand.logoAlt),
    displayName: escapeHtml(card.displayName || card.name),
    displayJob: escapeHtml(card.displayJob || card.job),
    actions, details, social, contactFields,
  });
}

function loadSite() {
  const brands = Object.fromEntries(fs.readdirSync(path.join(root, 'src/data/brands')).filter(file => file.endsWith('.json'))
    .map(file => [path.basename(file, '.json'), json(`src/data/brands/${file}`)]));
  const cards = fs.readdirSync(path.join(root, 'src/data/cards')).filter(file => file.endsWith('.json')).sort()
    .map(file => json(`src/data/cards/${file}`));
  const icons = Object.fromEntries(fs.readdirSync(path.join(root, 'src/icons')).filter(file => file.endsWith('.svg'))
    .map(file => [path.basename(file, '.svg'), read(`src/icons/${file}`)]));
  const pages = new Map();
  const template = read('src/templates/card.html');
  for (const card of cards) {
    validateCard(card, brands);
    if (pages.has(`${card.slug}.html`)) throw new Error(`Duplicate slug: ${card.slug}`);
    pages.set(`${card.slug}.html`, renderCard(card, brands[card.brand], template, icons));
  }
  return { cards, brands, pages };
}

module.exports = { root, escapeHtml, interpolate, validateCard, renderCard, loadSite };
