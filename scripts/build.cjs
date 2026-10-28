const fs = require('node:fs');
const path = require('node:path');
const { root, loadSite } = require('./site.cjs');

const mode = process.argv[2] || '--build';
if (!['--build', '--generate', '--check'].includes(mode)) throw new Error(`Unknown mode: ${mode}`);
// Render and validate every page before writing any output.
const { pages, brands } = loadSite();
if (mode === '--check') {
  const stale = [...pages].filter(([file, content]) => {
    const target = path.join(root, file);
    return !fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content;
  }).map(([file]) => file);
  if (stale.length) throw new Error(`Generated pages are out of date: ${stale.join(', ')}. Run npm run generate.`);
  console.log(`All ${pages.size} generated pages are up to date.`);
} else {
  const destination = mode === '--generate' ? root : path.join(root, 'dist');
  for (const [file, content] of pages) {
    const target = path.join(destination, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  if (mode === '--build') {
    fs.cpSync(path.join(root, 'assets'), path.join(destination, 'assets'), { recursive: true });
    for (const logo of new Set(Object.values(brands).map(brand => brand.logo))) {
      fs.copyFileSync(path.join(root, logo), path.join(destination, logo));
    }
  }
  console.log(`${mode === '--generate' ? 'Generated' : 'Built'} ${pages.size} pages in ${path.relative(root, destination) || '.'}.`);
}
