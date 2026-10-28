# Digital Card

Digital business cards for NDS9 and Dunamiss. One shared template generates all cards while preserving the existing designs and `.html` URLs. Pages work without a framework or JavaScript-based rendering.

## Structure

```text
src/
  data/
    cards/         Individual people: name, job, phone, email, URL slug
    brands/        Company details, addresses, logos, social links
  templates/       Shared HTML layout
  icons/           Shared SVG icons with original license comments
assets/
  css/card.css     Shared styles and brand themes
  js/card.js       Contact download behavior
scripts/           Validation, rendering, and build commands
tests/             Page, data, rendering, and vCard checks
*.html             Generated cards retained for existing hosting
st-old/            Generated legacy card URLs
dist/              Deployment output, ignored by Git
```

Spreadsheets and `list.txt` remain reference material. They are not used to generate cards and are not copied into `dist/`.

## Edit a card

Edit `src/data/cards/shabuz.json`, for example:

```json
{
  "slug": "shabuz",
  "brand": "nds9",
  "name": "Shabuz Hossain",
  "job": "Sr. Merchandiser",
  "phone": "+8801736287411",
  "email": "shabuz@nds9.co"
}
```

Then run `npm run generate` and `npm run check`. These same values populate visible details, call/email actions, and downloaded contacts. Do not edit generated HTML directly: generation overwrites it. Keep existing slugs to preserve printed QR codes and bookmarks.

## Add a card

Copy a JSON file inside `src/data/cards/`, use a unique slug, and replace the person's details. Set `brand` to `nds9` or `dunamiss`, then generate and check. Legacy slugs use `st-old/name` to produce `st-old/name.html`.

Optional fields include `displayName`, `displayJob`, and `pageTitle` for display variations, plus `company`, `address`, and `website` to override brand defaults. A `rows` array overrides the brand info rows when a card needs different locations or links; see legacy card sources for examples.

## Update company details or design

- Shared layout: `src/templates/card.html`.
- Colors, spacing, and themes: `assets/css/card.css`.
- Company addresses, logos, and social links: `src/data/brands/nds9.json` or `dunamiss.json`.
- Icons: `src/icons/`.

Info rows can reference contact values such as `{{phone}}`, `{{email}}`, and `{{job}}`. The renderer escapes text, checks link schemes, and assigns unique SVG IDs. Run generation after editing data, templates, or icons.

## Build and preview

Use Node.js 20 or later. No dependency installation is needed.

```sh
npm run generate  # Refresh root and legacy HTML pages
npm run check     # Check generated pages and run all tests
npm run build     # Create deployment output in dist/
```

Open a generated page directly, or serve `dist/` with a static HTTP server. For example, if Python is available:

```sh
python3 -m http.server 8000 --directory dist
```

Visit `http://localhost:8000/shabuz.html` or `/akshay.html`. There is no default `index.html`.

Checks cover invalid contacts and slugs, missing assets, duplicate SVG IDs, stale generated pages, escaped output, and vCard Unicode, line folding, and delimiter handling.

## Hosting

Publish `dist/` using a static host. Existing hosting from the repository root remains supported: commit generated pages together with source changes and shared assets. Build commands do not publish or deploy automatically.

Vercel settings are included in `vercel.json`. Public card links use clean paths such as `/shabuz`, `/sohel`, and `/akshay`, without `.html`. Vercel redirects the old `.html` links to their clean equivalents. Direct file previews and basic static servers still use the generated `.html` filenames.
