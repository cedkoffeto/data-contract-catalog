# Data Product Contract Catalog - Next.js

Next.js migration of the data contract catalog with a fully React, componentized architecture.

## Endpoints (clean URLs)

- `/` : catalog
- `/:slug` : contract detail
- `/api/contracts` : contracts JSON
- `/api/healthz` : health check
- `/api/openapi` : OpenAPI JSON
- `/docs` : Swagger UI docs

Legacy `.html` URLs are redirected to clean endpoints:

- `/index.html` -> `/`
- `/:slug.html` -> `/:slug`

## Structure

```text
app/
  api/
  [slug]/
src/
  components/
    catalog/
    contract/
    layout/
  lib/
contracts/
schema/
```

## Run

```bash
cd data-product-contract-nextjs
npm install
npm run dev
```

Then open:

- [http://localhost:3000](http://localhost:3000)
- [http://localhost:3000/docs](http://localhost:3000/docs)

## Build

```bash
npm run build
npm run start
```

## Notes

- The same design system and classes were preserved by reusing the original compiled Tailwind stylesheet.
- Contract pages are split into isolated React components for maintainability.
- Duplicate contract filenames are auto-disambiguated (e.g. `silver-gestionnaire`, `gold-gestionnaire`).
