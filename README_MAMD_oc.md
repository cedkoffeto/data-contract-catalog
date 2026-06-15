# Data Contract Catalog — Documentation Technique

> **Projet :** Attijariwafa Bank — Catalogage des contrats de données  
> **Stack :** Next.js 14 (App Router) · React 18 · TypeScript 5 · Keycloak 25 · GitLab  
> **Version :** 0.1.0

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Architecture](#2-architecture)
3. [Stack technique](#3-stack-technique)
4. [Structure du projet](#4-structure-du-projet)
5. [Authentification & Autorisation](#5-authentification--autorisation)
6. [API Routes](#6-api-routes)
7. [Composants UI](#7-composants-ui)
8. [Modèle de données](#8-modèle-de-données)
9. [Intégration GitLab](#9-intégration-gitlab)
10. [Éditeur de contrats](#10-éditeur-de-contrats)
11. [Docker & Déploiement](#11-docker--déploiement)
12. [Variables d'environnement](#12-variables-denvironnement)
13. [Tests](#13-tests)
14. [Guide de développement](#14-guide-de-développement)

---

## 1. Présentation générale

Application web de **catalogage, consultation et édition** de contrats de données d'entreprise. Les contrats sont stockés sous forme de fichiers YAML versionnés dans un dépôt Git (local ou GitLab). **Aucune base de données externe** n'est utilisée — Git sert de source de vérité unique, offrant traçabilité, historique des modifications et workflows de revue.

### Fonctionnalités principales

- **Catalogue** — Liste + recherche/filtre des contrats par domaine, maturité, mot-clé
- **Détail d'un contrat** — Affichage structuré avec sections Info, Modèle, Qualité, Sécurité, SLA, Serving, Inputs
- **Historique** — Parcours des versions Git d'un contrat avec navigation par commit
- **Éditeur** — Workspace complet avec explorateur de fichiers, éditeur YAML/Formulaire, prévisualisation et historique
- **Documentation API** — Page OpenAPI/Swagger générée automatiquement
- **Authentification** — Keycloak (OIDC) + formulaire Credentials

---

## 2. Architecture

```
Browser
├── / (Catalog)          → Server Component → CatalogPage → CatalogClient (client-side)
├── /:slug (Detail)      → Server Component → ContractPage → ContractPageClient
├── /editor              → Server Component → ContractEditorPage → ContractEditorClient
├── /docs                → Swagger UI (client-side, GET /api/openapi)
└── /login               → LoginForm + LoginRedirect (Keycloak SSO)

API Layer (Route Handlers /app/api/)
├── /healthz              [Public]
├── /openapi              [Auth] → Zod → OpenAPI 3.0.3
├── /contracts            [Auth] → contracts.ts
├── /contracts/search     [Auth]
├── /contracts/:slug      [Auth]
├── /contracts/:slug/history           [Auth] → gitlab.ts
└── /contracts/:slug/repository-content [Auth] → gitlab.ts

Auth Layer
├── middleware.ts          → JWT check → redirect /login
├── src/auth.ts            → NextAuth (Keycloak + Credentials)
└── src/lib/require-auth.ts → API guard 401

Data Sources
├── contracts/             → Fichiers YAML locaux
├── schema/                → JSON Schema + templates
└── GitLab API             → Remote file / history (@gitbeaker/rest)

Infrastructure
└── Docker Compose         → Keycloak 25.0
```

---

## 3. Stack technique

### Runtime & Framework

| Technologie | Version | Usage |
|---|---|---|
| Next.js | 14.2.5 | App Router, Server Components, Route Handlers |
| React | 18.3.1 | Server & Client Components |
| TypeScript | 5.5.4 | Strict mode, target ES2022 |

### Authentification

| Technologie | Version | Usage |
|---|---|---|
| next-auth | 4.24.14 | JWT sessions, Keycloak + Credentials providers |
| Keycloak | 25.0 | Serveur OIDC (Docker) |

### Éditeur & Formulaires

| Technologie | Version | Usage |
|---|---|---|
| @rjsf/core / shadcn / utils / validator-ajv8 | 6.4.1 | React JSON Schema Form |
| @uiw/react-codemirror | 4.25.8 | Éditeur de code YAML |
| @codemirror/lang-yaml | 6.1.3 | Coloration syntaxique YAML |
| @codemirror/theme-one-dark | 6.1.3 | Thème sombre |
| react-resizable-panels | 2.1.7 | Panneaux redimensionnables |
| js-yaml | 4.1.0 | Parsing/sérialisation YAML |

### Git & API

| Technologie | Version | Usage |
|---|---|---|
| @gitbeaker/rest | 43.8.0 | Client API GitLab |
| zod | 4.1.5 | Validation runtime & inférence TypeScript |
| @asteasolutions/zod-to-openapi | 8.1.0 | Génération OpenAPI depuis Zod |

### Polices & Design

- **Manrope** (sans-serif) — textes génériques
- **IBM Plex Mono** (monospace) — code/YAML
- **Thème clair** — accent orange `#f97316`
- **CSS pur** — pas de Tailwind CSS runtime

---

## 4. Structure du projet

```
/
├── app/                          # Next.js App Router
│   ├── [slug]/page.tsx          # Page détail contrat
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth handler
│   │   ├── contracts/
│   │   │   ├── [slug]/
│   │   │   │   ├── history/
│   │   │   │   ├── repository-content/
│   │   │   │   └── route.ts
│   │   │   ├── search/route.ts
│   │   │   └── route.ts
│   │   ├── healthz/route.ts
│   │   └── openapi/route.ts
│   ├── docs/                    # Page documentation API
│   ├── editor/page.tsx          # Page éditeur
│   ├── login/page.tsx           # Page connexion
│   ├── globals.css              # Design system (2868 lignes)
│   ├── layout.tsx               # Layout racine
│   └── page.tsx                 # Catalogue
│
├── contracts/                   # Contrats YAML
│   ├── bronze/                  # 1 contrat
│   ├── silver/                  # 13 contrats
│   └── gold/                    # 4 contrats
│
├── schema/
│   ├── contract_schema.json     # JSON Schema complet
│   ├── domains.v1.json          # Hiérarchie domaines bancaires
│   └── template.v3.yaml         # Template de contrat
│
├── src/
│   ├── auth.ts                  # Configuration NextAuth
│   ├── components/
│   │   ├── catalog/             # Catalogue (Card, Client, Page)
│   │   ├── contract/            # Détail contrat (10 composants)
│   │   ├── editor/              # Éditeur (Client + Page)
│   │   ├── layout/              # Navbar, Footer, Login, UserMenu
│   │   └── ui/                  # Atomes (Badge, Button, Checkbox, Input, Popover)
│   └── lib/
│       ├── contracts.ts         # Lecture & agrégation des contrats
│       ├── editor-schema.ts     # Chargement & relaxation du JSON Schema
│       ├── format.ts            # Utilitaires (clsx, cn, toArray, statusColor)
│       ├── git-source.ts        # Résolution de la ref Git
│       ├── gitlab.ts            # Client GitLab (histoire, contenu, path)
│       ├── openapi.ts           # Génération OpenAPI via Zod
│       ├── require-auth.ts      # Guard d'authentification API
│       └── types.ts             # Types TypeScript
│
├── keycloak/
│   └── realm-export.json        # Realm pré-configuré
├── docker-compose.yml           # Keycloak 25.0
├── middleware.ts                # Middleware auth
└── next.config.mjs              # Redirects /index.html → /
```

---

## 5. Authentification & Autorisation

### Providers NextAuth

**KeycloakProvider** — Flux OIDC standard (redirect vers Keycloak)
- `AUTH_KEYCLOAK_ID` : `data-contract-hub`
- `AUTH_KEYCLOAK_SECRET` : `local-dev-secret`
- `AUTH_KEYCLOAK_ISSUER` : `http://localhost:8080/realms/data-contracts`

**CredentialsProvider** — Login form → appelle l'endpoint token de Keycloak (`grant_type=password`)
- Utilise le Direct Access Grant de Keycloak
- Récupère le userinfo après obtention du token

### Middleware (`middleware.ts`)

- Routes protégées : **toutes sauf** `/login` et `/api/healthz`
- Pas de token JWT valide → redirect `/login?callbackUrl=...`
- Déjà connecté sur `/login` → redirect `/`
- Nettoie les cookies auth sur `/login`
- Matcher exclut `_next/static`, `_next/image`, favicon, fichiers statiques

### API Guard (`src/lib/require-auth.ts`)

- `requireApiAuth()` → appelle `auth()` (getServerSession)
- Retourne `401 { error: "Authentication required" }` si pas de session

### Utilisateur démo Keycloak

- Login : `contract.user`
- Mot de passe : `password`

---

## 6. API Routes

| Endpoint | Méthode | Auth | Description |
|---|---|---|---|
| `/api/healthz` | GET | ❌ | `{ status: "ok" }` |
| `/api/openapi` | GET | ✅ | Spécification OpenAPI 3.0.3 générée |
| `/api/contracts` | GET | ✅ | Liste tous les contrats (catalogue) |
| `/api/contracts/search?q=&domain=&maturity=` | GET | ✅ | Recherche/filtre contrats |
| `/api/contracts/:slug` | GET | ✅ | Détail complet d'un contrat |
| `/api/contracts/:slug/history` | GET | ✅ | Historique Git (max 50 commits) |
| `/api/contracts/:slug/repository-content?ref=` | GET | ✅ | Contenu fichier à une ref donnée |

Tous les endpoints contrats retournent `404` si introuvable, `503` si GitLab mal configuré.

---

## 7. Composants UI

### Layout (`src/components/layout/`)

| Composant | Type | Rôle |
|---|---|---|
| `PageShell` | Server | Wrapper navbar + footer |
| `Navbar` | Server | Logo, navigation, UserMenu |
| `Footer` | Server | Pied de page avec version |
| `UserMenu` | Client | Dropdown utilisateur (avatar, nom, logout) |
| `LoginForm` | Client | Formulaire identifiant/mot de passe |
| `LoginRedirect` | Client | Bouton SSO Keycloak |
| `SignOutButton` | Client | Déconnexion |

### Catalogue (`src/components/catalog/`)

| Composant | Type | Rôle |
|---|---|---|
| `CatalogPage` | Server | Page catalogue complète |
| `CatalogClient` | Client | Barre recherche, filtres, grille de cartes |
| `CatalogCard` | Server | Carte individuelles (badge maturité/domaine, version, titre) |

### Détail contrat (`src/components/contract/`)

| Composant | Type | Rôle |
|---|---|---|
| `ContractPage` | Server | Fetch contrat + historique, rend ContractPageClient |
| `ContractPageClient` | Client | Layout détail : bannière, header, summary, body + side panel |
| `ContractHeader` | Server | Hero section (titre, description, métadonnées, tags) |
| `ContractBody` | Server | Assemble toutes les sections |
| `InfoSection` | Server | Infos asset + propriétaires |
| `ModelsSection` | Server | Modèle de données (PK, grain) |
| `ModelFieldsTable` | Client | Table arborescente des champs avec indicateurs PII |
| `InputsSection` | Server | Pipeline : Sources → Transformations → Output |
| `QualitySection` | Server | Règles qualité + action on-failure |
| `SecuritySection` | Server | Classification, PII, politiques d'accès |
| `ServiceLevelsSection` | Server | Métriques SLA |
| `ServingSection` | Server | Infos stockage (table, format, partitionnement) |
| `YamlDialogButton` | Client | Modale YAML brut + bouton copie |

### UI Atomes (`src/components/ui/`)

| Composant | Rôle |
|---|---|
| `Badge` | Badge simple |
| `Button` | Variantes outline, ghost, chip |
| `Checkbox` | Checkbox personnalisée |
| `Input` | Input avec icône optionnelle |
| `Popover` | Popover avec dismiss au clic extérieur |

---

## 8. Modèle de données

**Aucune base de données.** Le modèle est défini en TypeScript dans `src/lib/types.ts` et validé par un JSON Schema (`schema/contract_schema.json`).

### Structure `DataContract`

```typescript
interface DataContract {
  asset?: {
    id: string;
    name: string;
    maturity: "bronze" | "silver" | "gold";
    domain: string;
    context: string;
    type: "dataset" | "data_product" | "file";
    description: string;
    version: string;
    status: "active" | "deprecated" | "inactive";
    tags: string[];
    owners: Owner[];
  };
  contract?: {
    primary_key: string;
    grain: string;
    refresh?: { frequency: string };
    sla?: { availability: string; ready_by: string; max_delay_minutes: number };
    schema?: { fields: ContractField[] };
  };
  quality?: {
    checks: QualityCheck[];
    on_failure?: { action: string; notify: string[] };
  };
  security?: {
    classification: "public" | "internal" | "confidential" | "restricted";
    pii: boolean;
    access_policies?: RolePolicy[];
  };
  serving?: {
    technology?: { type: string; enabled: boolean; name?: string; notes?: string };
  };
  output?: {
    location: string;
    storage_format: "ICEBERG" | "PARQUET" | "ORC" | "ORACLE";
    table_name: string;
    partitioning: string[];
    retention: number;
  };
  inputs?: {
    sources: SourceDependency[];
    transformations: Transformation[];
  };
  operations?: {
    airflow_dag_id: string;
    schedule_cron: string;
    expected_runtime_minutes: number;
    alerts_channel: string;
  };
  lineage?: {
    upstream: string[];
    downstream: string[];
    documentation_links: string[];
  };
  extra_properties?: Record<string, unknown>;
}
```

### Contrats disponibles (18)

| Maturité | Nombre | Exemples |
|---|---|---|
| **Bronze** | 1 | `ebk_web_device_history` |
| **Silver** | 13 | `carte`, `crm_ov`, `gestionnaire`, `pnb`, `titres`, … |
| **Gold** | 4 | `crm`, `dat`, `gestionnaire`, `credit_engagement` |

---

## 9. Intégration GitLab

### Modes de fonctionnement

**Mode local** (par défaut)
- Lecture depuis le dossier `contracts/` du filesystem
- Pas de configuration GitLab nécessaire
- Historique non disponible

**Mode GitLab** (activé si vars configurées)
- Utilise `@gitbeaker/rest`
- Liste l'arbre du dépôt, lit les fichiers, fetch l'historique des commits
- Fallback automatique vers le filesystem local si GitLab échoue

### Résolution de ref (`src/lib/git-source.ts`)

Priorité : `GITLAB_REF` > `VERCEL_GIT_COMMIT_REF` > `CI_COMMIT_REF_NAME` > `"main"`

### API Historique

- Filtrage des commits par chemin de fichier
- Gestion des renommages de fichier via analyse des diffs de commit

---

## 10. Éditeur de contrats

### Workspace (`ContractEditorClient` — 1788 lignes)

Interface à **3 panneaux redimensionnables** :

```
┌─────────────────┬──────────────────────┬─────────────────┐
│  Explorateur    │  Éditeur             │  Prévisualisation│
│  ├─ drafts/     │  ├─ CodeMirror YAML  │  Rendu du        │
│  ├─ schema/     │  ├─ RJSF Form (tab)  │  contrat comme   │
│  ├─ contracts/  │  └─ Barre validation │  sur la page     │
│  └─ docs/      │                     │  détail          │
├─────────────────┴──────────────────────┴─────────────────┤
│  Panneau inférieur : erreurs validation + historique Git │
└──────────────────────────────────────────────────────────┘
```

### Fonctionnalités

- Explorateur de fichiers (workspace, drafts, schémas, contrats par maturité, docs)
- Éditeur YAML (CodeMirror) avec surlignage d'erreurs
- Formulaire généré depuis JSON Schema (RJSF + thème shadcn)
- Prévisualisation live (mêmes composants que la page détail)
- Navigation dans l'historique Git (visionner, comparer avec le current via diff unifié)
- Drafts : créer, copier, télécharger, réinitialiser, appliquer YAML, soumettre
- Validation des erreurs en temps réel

---

## 11. Docker & Déploiement

### Docker Compose

```yaml
services:
  keycloak:
    image: quay.io/keycloak/keycloak:25.0
    command: start-dev --import-realm
    environment:
      KC_HOSTNAME: localhost
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
    ports:
      - "8080:8080"
    volumes:
      - ./keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json
      - keycloak-data:/opt/keycloak/data
```

**Commandes :**

```bash
docker compose up          # Démarrer Keycloak
docker compose down -v     # Arrêter + nettoyer volume
```

### Scripts npm

```bash
npm run dev        # next dev (développement)
npm run build      # next build (production)
npm run start      # next start
npm run typecheck  # tsc --noEmit
```

> ⚠️ **Pas de Dockerfile** pour l'application Next.js — elle s'exécute directement via Node.js.

---

## 12. Variables d'environnement

### Requises (authentification)

| Variable | Défaut | Description |
|---|---|---|
| `NEXTAUTH_URL` | `http://localhost:3000` | URL publique NextAuth |
| `AUTH_SECRET` | — | Clé secrète JWT |
| `AUTH_KEYCLOAK_ID` | `data-contract-hub` | Client ID Keycloak |
| `AUTH_KEYCLOAK_SECRET` | `local-dev-secret` | Client secret Keycloak |
| `AUTH_KEYCLOAK_ISSUER` | `http://localhost:8080/realms/data-contracts` | Issuer URL du realm |

### Optionnelles (GitLab)

| Variable | Défaut | Description |
|---|---|---|
| `GITLAB_BASE_URL` | — | URL instance GitLab |
| `GITLAB_PROJECT_ID` | — | ID projet (numérique ou chemin) |
| `GITLAB_REPOSITORY_URL` | — | URL complète du dépôt |
| `GITLAB_TOKEN` | — | Token d'accès personnel GitLab |
| `GITLAB_REF` | `main` | Branche/tag/commit ref |

---

## 13. Tests

**Aucun framework de test n'est configuré.** Aucun fichier `.test.ts`, `.spec.ts`, ou dossier `__tests__/` présent.

La seule vérification qualité est le **typecheck TypeScript** :

```bash
npm run typecheck
```

---

## 14. Guide de développement

### Prérequis

- Node.js 18+
- npm
- Docker Compose (pour Keycloak)

### Installation

```bash
# 1. Cloner le dépôt
git clone <repo-url>
cd data-contract-catalog

# 2. Installer les dépendances
npm install

# 3. Copier les variables d'environnement
cp .env.example .env
# Éditer .env si nécessaire

# 4. Démarrer Keycloak
docker compose up -d

# 5. Lancer l'application
npm run dev
```

### Accès

| Service | URL |
|---|---|
| Application | http://localhost:3000 |
| Keycloak Admin | http://localhost:8080 (admin/admin) |
| Login démo | contract.user / password |

### Conventions de code

- TypeScript strict mode
- Composants Server par défaut, Client uniquement si interactivité nécessaire
- Pas de Tailwind — CSS global dans `app/globals.css`
- Pas de base de données — tout est fichier YAML + Git
- Les imports suivent l'ordre : React/Next → librairies → composants internes → styles

---

> Document généré le 15/06/2026 — Projet Data Contract Catalog v0.1.0
