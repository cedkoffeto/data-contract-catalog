# Data Contract Hub - Next.js

Application Next.js de catalogue, consultation et edition de data contracts YAML.

Ce projet est pense pour afficher un catalogue de contrats, ouvrir le detail d'un contrat, consulter son historique GitLab, afficher sa documentation API, et proposer un workspace d'edition base sur schema.

## Objectif du projet

Le projet remplace une ancienne version plus statique par une application React/Next.js plus maintenable, avec:

- une UI composee en composants React
- une authentification centralisee via Keycloak et NextAuth
- une source de verite basee sur des fichiers versionnes dans Git/GitLab
- une API interne documentee via OpenAPI
- un editeur de contrat capable de travailler a partir des schemas du repository

Note: les data contracts vivent dans le repository (localement ou via GitLab API). Une base SQLite legere (prisma/data/rbac.db) est utilisee pour la gestion des droits d'acces (RBAC) et les notifications, via sql.js.

## Lecture rapide pour un nouveau dev

Si tu onboardes sur le projet, voici l'ordre conseille:

1. Lire cette page en entier une premiere fois.
2. Installer les dependances et lancer l'app.
3. Demarrer Keycloak local via Docker Compose.
4. Se connecter avec l'utilisateur de demo.
5. Parcourir les pages `/`, `/:slug`, `/editor`, `/docs`.
6. Lire ensuite les fichiers d'entree:
   - [app/layout.tsx](app/layout.tsx)
   - [app/page.tsx](app/page.tsx)
   - [app/editor/page.tsx](app/editor/page.tsx)
   - [src/auth.ts](src/auth.ts)
   - [src/lib/contracts.ts](src/lib/contracts.ts)
   - [src/lib/gitlab.ts](src/lib/gitlab.ts)
   - [src/lib/editor-schema.ts](src/lib/editor-schema.ts)

## Stack technique

### Runtime et framework

- `Next.js 14.2.5`
- `React 18.3.1`
- `TypeScript 5`
- App Router pour les pages principales
- Route Handlers Next.js pour l'API interne

### Authentification

- `next-auth`
- `Keycloak`
- double approche d'auth:
  - provider Keycloak standard
  - provider `Credentials` pour le formulaire login local, qui appelle l'endpoint token Keycloak en server-side

### Data contracts et schemas

- contrats stockes sous `contracts/`
- schemas stockes sous `schema/`
- parsing YAML via `js-yaml`
- validation / generation de formulaire via `react-jsonschema-form`

### Git / repository access

- `@gitbeaker/rest` pour appeler GitLab
- lecture possible:
  - depuis le filesystem local
  - ou depuis GitLab API si les variables d'environnement GitLab sont presentes

### API et documentation

- `zod`
- `@asteasolutions/zod-to-openapi`

### UI, composants et edition

- composants React maison dans `src/components`
- `@rjsf/core`, `@rjsf/shadcn`, `@rjsf/validator-ajv8` pour le form generator
- `@uiw/react-codemirror` pour l'edition YAML
- `@codemirror/lang-yaml` pour le support de syntaxe YAML
- `react-resizable-panels` pour le layout resizable du workspace

### Styles

- CSS global dans `app/globals.css`
- stylesheet compilee importee depuis `app/output.css`
- theme RJSF specifique dans `app/rjsf-shadcn.css`
- polices via `next/font/google`:
  - `Manrope`
  - `IBM Plex Mono`

## Main libs par responsabilite

### Front

- `next`, `react`, `react-dom`
- `react-resizable-panels`
- `@uiw/react-codemirror`

### Form / schema-driven UI

- `@rjsf/core`
- `@rjsf/shadcn`
- `@rjsf/utils`
- `@rjsf/validator-ajv8`

### Git / repository

- `@gitbeaker/rest`

### Format / parsing

- `js-yaml`

### API contract / typed schema

- `zod`
- `@asteasolutions/zod-to-openapi`

## Approche produit et technique

### Source of truth

L'application est repository-based:

- les contrats sont des fichiers YAML versionnes
- les schemas sont des fichiers du repository
- l'historique d'un contrat vient du Git history GitLab
- le contenu d'une version historique est relu via GitLab API a partir d'un `ref`
- une base SQLite (prisma/data/rbac.db) gere les droits d'acces et notifications

### Pourquoi cette approche

Cette approche permet:

- une tracabilite native via Git
- des diffs et reviews standards
- une integration simple avec les workflows existants de data governance
- pas de couche de persistence supplementaire a maintenir

### Fallback local vs GitLab

Le projet sait fonctionner dans deux modes:

- mode local:
  - lecture des contrats et schemas directement depuis le repository local
- mode GitLab:
  - lecture des contrats, de l'arborescence et de l'historique via l'API GitLab

En pratique:

- le catalogue peut fonctionner localement
- l'historique Git et le chargement de versions repository necessitent la config GitLab

## Structure du projet

```text
app/
  api/                               # Route handlers Next.js
  docs/                              # Documentation API
  editor/                            # Workspace d'edition
  [slug]/                            # Detail d'un contrat
  layout.tsx                         # Layout racine
  page.tsx                           # Catalogue

src/
  auth.ts                            # Config NextAuth + Keycloak
  components/
    catalog/                         # Pages/composants catalogue
    contract/                        # Rendu detail d'un contrat
    editor/                          # Workspace d'edition YAML + formulaire
    layout/                          # Navbar, shell, login, footer
    ui/                              # Composants UI reutilisables
  lib/
    contracts.ts                     # Lecture/aggregation des contrats
    gitlab.ts                        # Historique et lecture GitLab
    git-source.ts                    # Resolution de ref Git
    editor-schema.ts                 # Schema de l'editeur
    openapi.ts                       # Generation du spec OpenAPI
    require-auth.ts                  # Garde API
    types.ts                         # Types metier

contracts/                           # Data contracts YAML
schema/                              # Schemas et templates
keycloak/                            # Export de realm pour dev local
public/                              # Assets statiques
```

## Pages et parcours utilisateur

### Catalogue

- route: `/`
- point d'entree: [app/page.tsx](app/page.tsx)
- composants principaux:
  - [src/components/catalog/CatalogPage.tsx](src/components/catalog/CatalogPage.tsx)
  - `CatalogClient`
  - `CatalogCard`

Responsabilite:

- charger la liste des contrats
- afficher les cartes du catalogue
- permettre la navigation vers le detail

### Detail contrat

- route: `/:slug`
- point d'entree: `app/[slug]/page.tsx`
- composants principaux dans `src/components/contract/`

Responsabilite:

- afficher le YAML parse
- rendre les sections metier du contrat
- exposer la consultation du YAML et de l'historique

### Workspace editeur

- route: `/editor`
- point d'entree: [app/editor/page.tsx](app/editor/page.tsx)
- composant cle: [src/components/editor/ContractEditorClient.tsx](src/components/editor/ContractEditorClient.tsx)

Responsabilite:

- afficher un explorateur de fichiers logique
- ouvrir un contrat
- basculer entre vue formulaire et vue YAML
- guider l'edition a partir d'un schema JSON adapte au contenu existant
- afficher validation et historique

### Documentation API

- route: `/docs`
- source OpenAPI: `/api/openapi`

Responsabilite:

- exposer la spec generee a partir des schemas Zod
- servir de reference pour les consommateurs de l'API

## Architecture applicative

### App Router + composants server/client

Le projet suit un decoupage simple:

- les pages Next.js server-side chargent la data
- les composants clients gerent interaction, edition et etat local

Exemples:

- `app/page.tsx` charge les cards et rend `CatalogPage`
- `app/editor/page.tsx` charge schema + repository files + draft, puis rend `ContractEditorPage`

### Couche `src/lib`

`src/lib` contient la logique metier et les integrations:

- `contracts.ts`:
  - lecture des contrats
  - fallback local/GitLab
  - transformation vers cartes catalogue
- `gitlab.ts`:
  - historique d'un fichier
  - lecture du contenu a un `ref`
  - resolution de fallback sur ancien path si le fichier a ete renomme
- `editor-schema.ts`:
  - charge le schema repository
  - l'assouplit pour mieux coller a l'existant
  - enrichit certaines enums selon les contrats reels
- `openapi.ts`:
  - decrit les endpoints via Zod
  - genere le document OpenAPI

## Authentification

L'application est protegee par middleware et session NextAuth.

Pieces importantes:

- [src/auth.ts](src/auth.ts)
- [middleware.ts](middleware.ts)
- [src/lib/require-auth.ts](src/lib/require-auth.ts)

Fonctionnement:

- les pages sont redirigees vers `/login` si l'utilisateur n'est pas authentifie
- les routes API proteges repondent `401`
- le formulaire local appelle Keycloak en grant type `password`
- les tokens/session sont geres par NextAuth en strategy JWT

## Variables d'environnement

### Obligatoires pour l'auth

```bash
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=replace-with-a-long-random-secret
AUTH_KEYCLOAK_ID=data-contract-hub
AUTH_KEYCLOAK_SECRET=local-dev-secret
AUTH_KEYCLOAK_ISSUER=http://localhost:8080/realms/data-contracts
```

Callback URL Keycloak:

```bash
http://localhost:3000/api/auth/callback/keycloak
```

### Optionnelles pour l'integration GitLab

```bash
GITLAB_BASE_URL=https://gitlab.example.com
GITLAB_PROJECT_ID=my-group/data-contracts
GITLAB_REPOSITORY_URL=https://gitlab.example.com/my-group/data-contracts
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxx
GITLAB_REF=main
```

Notes:

- `GITLAB_TOKEN` est utilise uniquement cote serveur
- `GITLAB_PROJECT_ID` peut etre un id numerique ou un path `group/project`
- `GITLAB_REF` est optionnel et vaut `main` par defaut

## Demarrage local

### 1. Installer les dependances

```bash
npm install
```

### 2. Configurer les variables d'environnement

Creer un fichier `.env.local` avec les variables d'auth minimum.

### 3. Lancer Keycloak local

```bash
docker compose up
```

Si Keycloak a deja tourne avec une ancienne config:

```bash
docker compose down -v
docker compose up
```

Identifiants de demo:

```text
user: contract.user
password: password
```

Admin console:

```text
http://localhost:8080
admin / admin
```

### 4. Lancer l'application

```bash
npm run dev
```

Puis ouvrir:

- [http://localhost:3000](http://localhost:3000)
- [http://localhost:3000/docs](http://localhost:3000/docs)

## Scripts utiles

```bash
npm run dev
npm run build
npm run start
npm run typecheck
```

## Endpoints exposes

### Pages

- `/` : catalogue
- `/:slug` : detail d'un contrat
- `/editor` : workspace d'edition
- `/docs` : documentation Swagger/Scalar
- `/login` : page de connexion

### API

- `/api/healthz` : health check
- `/api/contracts` : liste des contrats
- `/api/contracts/search` : recherche catalogue
- `/api/contracts/:slug` : detail d'un contrat
- `/api/contracts/:slug/history` : historique GitLab du fichier
- `/api/contracts/:slug/repository-content?ref=<sha>` : contenu du fichier a une revision
- `/api/openapi` : specification OpenAPI generee

## Comment les contrats sont charges

Le chargement passe principalement par [src/lib/contracts.ts](src/lib/contracts.ts).

Flux simplifie:

1. L'application cherche les contrats dans `contracts/`.
2. Si GitLab est configure, elle peut aussi lire le contenu repository via API.
3. Chaque YAML est parse en objet TypeScript.
4. Des metadonnees sont derivees pour le catalogue:
   - slug
   - title
   - version
   - owner
   - maturity
   - domain
5. En cas de doublons de noms, un slug desambiguise est genere.

## Comment l'editeur fonctionne

Le workspace d'edition est schema-driven.

Principes:

- un schema JSON est charge depuis `schema/`
- ce schema est ajuste dynamiquement dans `editor-schema.ts`
- certaines contraintes sont assouplies pour accepter l'existant
- les types de champs observes dans les contrats servent a enrichir les enums du formulaire
- l'utilisateur peut editer via formulaire ou YAML

Concretement, `ContractEditorClient` assemble:

- un explorateur logique des fichiers
- un formulaire RJSF
- un editeur CodeMirror YAML
- un panneau de validation
- un panneau d'historique GitLab

## Styles et systeme de composants

Le projet n'utilise pas un framework CSS runtime type Tailwind dans les composants au quotidien. A la place:

- une feuille compilee est importee via `app/output.css`
- le design system applicatif vit surtout dans `app/globals.css`
- les composants UI basiques sont dans `src/components/ui/`

Exemples de composants UI:

- `Button`
- `Input`
- `Checkbox`
- `Badge`
- `Popover`

Direction visuelle actuelle:

- palette claire
- accent orange
- typography `Manrope`
- police mono `IBM Plex Mono` pour les zones techniques

## Conventions utiles pour contribuer

### Quand ajouter de la logique metier

Preferer:

- `src/lib/` pour logique de lecture, transformation, integration externe
- `app/api/` pour exposition HTTP
- `src/components/` pour presentation et interactions UI

### Quand toucher au schema

Verifier l'impact dans:

- `schema/`
- `src/lib/editor-schema.ts`
- `src/components/editor/ContractEditorClient.tsx`

### Quand toucher a l'auth

Verifier l'impact dans:

- `src/auth.ts`
- `middleware.ts`
- `src/lib/require-auth.ts`

### Quand toucher a GitLab

Verifier l'impact dans:

- `src/lib/contracts.ts`
- `src/lib/gitlab.ts`
- les routes `history` et `repository-content`

## Checklist onboarding dev

- cloner le repo
- installer les deps `npm install`
- configurer `.env.local`
- lancer `docker compose up`
- lancer `npm run dev`
- se connecter avec l'utilisateur de demo
- visiter `/`, `/docs`, `/editor`
- lire `src/lib/contracts.ts`, `src/lib/gitlab.ts`, `src/lib/editor-schema.ts`
- lancer `npm run typecheck` avant toute PR

## Risques et points d'attention

- sans config GitLab, certaines features repository avancées ne fonctionneront pas
- l'editeur accepte des schemas assouplis pour rester compatible avec les contrats existants
- l'historique depend du path fichier et contient une logique de fallback si un fichier a ete renomme
- l'auth locale repose sur une config Keycloak correcte, notamment `Direct Access Grants` pour le flux credentials

## Resume court pour prendre la main vite

Si tu dois retenir l'essentiel:

- c'est une app `Next.js + React + TypeScript`
- l'auth passe par `NextAuth + Keycloak`
- les data contracts sont des fichiers YAML versionnes
- une base SQLite legere (RBAC + notifications) via sql.js
- GitLab sert de backend de repository pour l'historique et la lecture a une revision
- l'editeur est base sur `RJSF + CodeMirror`
- l'API est documentee par `Zod -> OpenAPI -> Scalar`
