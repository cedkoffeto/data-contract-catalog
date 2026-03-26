# Data Product Contract Catalog - Next.js

Next.js migration of the data contract catalog with a fully React, componentized architecture.

## Endpoints (clean URLs)

- `/` : catalog
- `/:slug` : contract detail
- `/api/contracts` : contracts JSON
- `/api/contracts/:slug/history` : GitLab-backed file history
- `/api/contracts/:slug/repository-content?ref=<sha>` : GitLab-backed file content
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

If you want repository-backed contract history and file lookup, configure the GitLab app token in your environment before starting the app:

```bash
GITLAB_BASE_URL=https://gitlab.example.com
GITLAB_PROJECT_ID=my-group/data-contracts
GITLAB_REPOSITORY_URL=https://gitlab.example.com/my-group/data-contracts
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxx
GITLAB_REF=main
```

Notes:

- `GITLAB_TOKEN` is an app-level token used server-side only.
- `GITLAB_PROJECT_ID` can be either the numeric project id or the `group/project` path.
- `GITLAB_REF` is optional and defaults to `main`.

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
