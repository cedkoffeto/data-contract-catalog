# Data Product Contract Catalog - Next.js

Next.js migration of the data contract catalog with a fully React, componentized architecture.

## Authentication

The platform is protected with Keycloak via NextAuth.
The default login page uses a local username/password form and validates credentials against Keycloak with the confidential client secret on the server.

Required environment variables:

```bash
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=replace-with-a-long-random-secret
AUTH_KEYCLOAK_ID=data-contract-hub
AUTH_KEYCLOAK_SECRET=local-dev-secret
AUTH_KEYCLOAK_ISSUER=http://localhost:8080/realms/data-contracts
```

Keycloak callback URL:

```bash
http://localhost:3000/api/auth/callback/keycloak
```

In production, replace the host with your deployed URL.

For the local username/password form, keep `Direct Access Grants` enabled on the Keycloak client.

For a local Keycloak instance:

```bash
docker compose up
```

If you already started Keycloak before changing the realm or hostname config, recreate the local volume so the realm is imported again:

```bash
docker compose down -v
docker compose up
```

Then open the app on `http://localhost:3000`. The local realm contains:

```text
user: contract.user
password: password
```

Keycloak admin console:

```text
http://localhost:8080
admin / admin
```

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
