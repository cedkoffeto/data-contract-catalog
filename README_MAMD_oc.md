# Data Contract Catalog — Documentation Technique

> **Projet :** Attijariwafa Bank — Catalogage des contrats de données  
> **Stack :** Next.js 16 (App Router) · React 18 · TypeScript 5 · Keycloak 25 · GitLab · SQLite (sql.js)  
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
9. [Base de données SQLite (RBAC)](#9-base-de-données-sqlite-rbac)
10. [RBAC — Contrôle d'accès fin](#10-rbac--contrôle-daccès-fin)
11. [Administration](#11-administration)
12. [Intégration GitLab](#12-intégration-gitlab)
13. [Éditeur de contrats](#13-éditeur-de-contrats)
14. [Docker & Déploiement](#14-docker--déploiement)
15. [Variables d'environnement](#15-variables-denvironnement)
16. [Tests](#16-tests)
17. [Guide de développement](#17-guide-de-développement)
18. [Scripts & Seed](#18-scripts--seed)

---

## 1. Présentation générale

Application web de **catalogage, consultation et édition** de contrats de données d'entreprise. Les contrats sont stockés sous forme de fichiers YAML versionnés dans un dépôt Git (local ou GitLab). **Git sert de source de vérité** pour les contrats (traçabilité, historique, workflows de revue). Une **base SQLite légère** (`prisma/data/rbac.db`) gère les droits d'accès (RBAC), les groupes, les abonnements, les notifications et l'audit.

### Fonctionnalités principales

- **Catalogue** — Liste + recherche/filtre des contrats par domaine, maturité, mot-clé
- **Détail d'un contrat** — Affichage structuré avec sections Info, Modèle, Qualité, Sécurité, SLA, Serving, Inputs
- **Historique** — Parcours des versions Git d'un contrat avec navigation par commit
- **Éditeur** — Workspace complet avec explorateur de fichiers, éditeur YAML/Formulaire, prévisualisation et historique
- **Documentation API** — Page OpenAPI/Swagger générée automatiquement
- **Administration** — Dashboard, gestion des groupes d'utilisateurs, gestion des politiques d'accès (RBAC)
- **RBAC** — Contrôle d'accès fin par domaine/contexte avec 3 niveaux : admin, editor, reader
- **Audit log** — Traçabilité complète des actions d'administration
- **Authentification** — Keycloak (OIDC) + formulaire Credentials

---

## 2. Architecture

```
Browser
├── / (Catalog)          → Server Component → CatalogPage → CatalogClient (client-side)
├── /:slug (Detail)      → Server Component → ContractPage → ContractPageClient
├── /editor              → Server Component → ContractEditorPage → ContractEditorClient
├── /docs                → Swagger UI (client-side, GET /api/openapi)
├── /login               → LoginForm + LoginRedirect (Keycloak SSO)
└── /admin/*             → AdminLayout (admin guard) → Dashboard / Groups / Policies

API Layer (Route Handlers /app/api/)
├── /healthz                               [Public]
├── /openapi                               [Auth] → Zod → OpenAPI 3.0.3
├── /auth/[...nextauth]                    [Public] → NextAuth handler
├── /contracts                             [Auth] → contracts.ts
├── /contracts/search                      [Auth]
├── /contracts/:slug                       [Auth]
├── /contracts/:slug/history               [Auth] → gitlab.ts
├── /contracts/:slug/repository-content    [Auth] → gitlab.ts
├── /admin/dashboard                       [Admin]
├── /admin/groups                          [Admin]
├── /admin/groups/:id                      [Admin]
├── /admin/groups/:id/members              [Admin]
├── /admin/groups/memberships              [Admin]
├── /admin/policies                        [Admin]
├── /admin/policies/:id                    [Admin]
├── /admin/permissions                     [Admin]
├── /admin/scopes                          [Admin]
└── /admin/users/search                    [Admin]

Auth Layer
├── middleware.ts          → JWT check → redirect /login
├── src/auth.ts            → NextAuth (Keycloak + Credentials)
├── src/lib/require-auth.ts → API guard 401
└── src/lib/require-admin.ts → API guard 403

Data Sources
├── contracts/             → Fichiers YAML locaux (bronze/ silver/ gold/)
├── schema/                → JSON Schema + templates
├── GitLab API             → Remote file / history (@gitbeaker/rest)
└── SQLite (sql.js)        → RBAC, audit, subscriptions, notifications

Infrastructure
└── Docker Compose         → Keycloak 25.0
```

---

## 3. Stack technique

### Runtime & Framework

| Technologie | Version | Usage |
|---|---|---|
| Next.js | 16.2.9 | App Router, Server Components, Route Handlers |
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

### Base de données & RBAC

| Technologie | Version | Usage |
|---|---|---|
| sql.js | 1.14.1 | Driver SQLite pur JS (WASM) |
| prisma | 6.19.3 | Schéma et migrations (devDependency) |

### Polices & Design

- **Manrope** (sans-serif) — textes génériques
- **IBM Plex Mono** (monospace) — code/YAML
- **Thème clair** — accent orange `#f97316`
- **CSS global** dans `app/globals.css` (2868+ lignes)
- **Tailwind CSS** 3.4 — feuille compilée `app/output.css`
- **RJSF** — styles spécifiques dans `app/rjsf-shadcn.css`

---

## 4. Structure du projet

```
/
├── app/                          # Next.js App Router
│   ├── [slug]/page.tsx          # Page détail contrat
│   ├── admin/                   # Interface d'administration
│   │   ├── layout.tsx           # Layout admin (guard + nav)
│   │   ├── page.tsx             # Dashboard (stats + audit log)
│   │   ├── groups/page.tsx      # Gestion des groupes
│   │   └── policies/page.tsx    # Gestion des access policies
│   ├── api/
│   │   ├── admin/
│   │   │   ├── dashboard/route.ts
│   │   │   ├── groups/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── members/route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   ├── memberships/route.ts
│   │   │   │   └── route.ts
│   │   │   ├── permissions/route.ts
│   │   │   ├── policies/
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── route.ts
│   │   │   ├── scopes/route.ts
│   │   │   └── users/search/route.ts
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth handler
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
│   │   ├── page.tsx
│   │   └── SwaggerDocsClient.tsx
│   ├── editor/page.tsx          # Page éditeur
│   ├── login/page.tsx           # Page connexion
│   ├── globals.css              # Design system
│   ├── layout.tsx               # Layout racine (appelle ensureStartup)
│   ├── loading.tsx              # Loading skeleton
│   ├── not-found.tsx            # Page 404 personnalisée
│   ├── output.css               # Tailwind CSS compilé
│   ├── page.tsx                 # Catalogue
│   └── rjsf-shadcn.css          # Styles RJSF
│
├── pages/                       # Pages Router (minimal)
│   └── _document.tsx            # Document HTML personnalisé
│
├── contracts/                   # Contrats YAML (18 contrats)
│   ├── bronze/                  # 1 contrat
│   ├── silver/                  # 13 contrats
│   └── gold/                    # 4 contrats
│
├── schema/
│   ├── contract_schema.json     # JSON Schema complet
│   ├── domains.v1.json          # Hiérarchie domaines bancaires
│   └── template.v3.yaml         # Template de contrat
│
├── prisma/
│   ├── schema.prisma            # Schéma Prisma (7 modèles)
│   ├── data/rbac.db             # Base SQLite (ignorée par git)
│   └── migrations/
│       ├── 20260615140000_init/
│       └── 20260615150000_fine_grained_access/
│
├── scripts/
│   └── seed-keycloak.mjs        # Seed automatique des utilisateurs Keycloak
│
├── src/
│   ├── auth.ts                  # Configuration NextAuth
│   ├── components/
│   │   ├── catalog/             # Catalogue (Card, Client, Page)
│   │   ├── contract/            # Détail contrat (12 composants)
│   │   ├── editor/              # Éditeur (Client + Page)
│   │   ├── layout/              # Navbar, Footer, Login, UserMenu, AdminMenu
│   │   └── ui/                  # Atomes (Badge, Button, Checkbox, ConfirmDialog,
│   │                           #   Input, Popover, Toast, UserMultiSelect)
│   └── lib/
│       ├── access-control.ts    # CRUD policies, groupes, conflits
│       ├── audit.ts             # Écriture audit log
│       ├── catalog-filter.ts    # Filtrage catalogue par droits
│       ├── contracts.ts         # Lecture & agrégation des contrats
│       ├── db.ts                # Wrapper SQLite (sql.js)
│       ├── editor-schema.ts     # Chargement & relaxation du JSON Schema
│       ├── format.ts            # Utilitaires (clsx, cn, toArray, statusColor)
│       ├── git-source.ts        # Résolution de la ref Git
│       ├── gitlab.ts            # Client GitLab (histoire, contenu, path)
│       ├── migrate.ts           # Migrations SQL + seed policies
│       ├── openapi.ts           # Génération OpenAPI via Zod
│       ├── rbac.ts              # getUserPermissions, searchAllUsers
│       ├── require-admin.ts     # Guard admin API (401/403)
│       ├── require-auth.ts      # Guard authentification API
│       ├── startup.ts           # ensureStartup (migrations au boot)
│       └── types.ts             # Types TypeScript
│
├── keycloak/
│   └── realm-export.json        # Realm pré-configuré (10 utilisateurs)
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

### API Guards

- `requireApiAuth()` (`src/lib/require-auth.ts`) → `401 { error: "Authentication required" }`
- `requireAdmin()` (`src/lib/require-admin.ts`) → `401` si non auth, `403` si pas admin

### Utilisateurs Keycloak (10 utilisateurs)

| Login | Rôle par défaut | Description |
|---|---|---|
| `admin.user` | admin | Accès total |
| `editor.user` | editor | Peut lire et écrire |
| `contract.user` | reader | Accès en lecture |
| `reader.user` | reader | Accès en lecture |
| `data_owner.user` | reader | Accès en lecture |
| `de1` — `de5` | reader | Utilisateurs data engineering |

Tous : mot de passe `password`

---

## 6. API Routes

### Routes publiques

| Endpoint | Méthode | Auth | Description |
|---|---|---|---|
| `/api/healthz` | GET | ❌ | `{ status: "ok" }` |
| `/api/auth/[...nextauth]` | * | ❌ | NextAuth handler (Keycloak callback, signin, etc.) |

### Routes contrats

| Endpoint | Méthode | Auth | Description |
|---|---|---|---|
| `/api/openapi` | GET | ✅ | Spécification OpenAPI 3.0.3 générée |
| `/api/contracts` | GET | ✅ | Liste tous les contrats (filtré par RBAC) |
| `/api/contracts/search?q=&domain=&maturity=` | GET | ✅ | Recherche/filtre contrats |
| `/api/contracts/:slug` | GET | ✅ | Détail complet d'un contrat |
| `/api/contracts/:slug/history` | GET | ✅ | Historique Git (max 50 commits) |
| `/api/contracts/:slug/repository-content?ref=` | GET | ✅ | Contenu fichier à une ref donnée |

### Routes administration (requièrent permission `admin`)

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/admin/dashboard` | GET | Stats (groups, memberships, policies) + audit log |
| `/api/admin/groups` | GET | Liste des groupes |
| `/api/admin/groups` | POST | Créer un groupe |
| `/api/admin/groups/:id` | DELETE | Supprimer un groupe |
| `/api/admin/groups/:id/members` | POST | Ajouter un membre |
| `/api/admin/groups/:id/members` | DELETE | Retirer un membre |
| `/api/admin/groups/memberships` | GET | Toutes les appartenances user→group |
| `/api/admin/policies` | GET | Liste des access policies |
| `/api/admin/policies` | POST | Créer une policy (avec détection conflit) |
| `/api/admin/policies/:id` | PATCH | Modifier une policy |
| `/api/admin/policies/:id` | DELETE | Supprimer une policy |
| `/api/admin/permissions` | GET | Liste des niveaux de permission (admin/editor/reader) |
| `/api/admin/scopes` | GET | Domaines/contextes distincts des contrats |
| `/api/admin/users/search?q=` | GET | Recherche utilisateurs (Keycloak + local) |

Tous les endpoints contrats retournent `404` si introuvable, `503` si GitLab mal configuré.

---

## 7. Composants UI

### Layout (`src/components/layout/`)

| Composant | Type | Rôle |
|---|---|---|
| `PageShell` | Server | Wrapper navbar + footer |
| `Navbar` | Server | Logo, navigation, UserMenu, AdminMenu |
| `Footer` | Server | Pied de page avec version |
| `UserMenu` | Client | Dropdown utilisateur (avatar, nom, logout) |
| `AdminMenu` | Client | Dropdown navigation admin (Dashboard, Groups, Policies) |
| `LoginForm` | Client | Formulaire identifiant/mot de passe |
| `LoginRedirect` | Client | Bouton SSO Keycloak |
| `SignOutButton` | Client | Déconnexion |

### Catalogue (`src/components/catalog/`)

| Composant | Type | Rôle |
|---|---|---|
| `CatalogPage` | Server | Page catalogue complète |
| `CatalogClient` | Client | Barre recherche, filtres, grille de cartes |
| `CatalogCard` | Server | Carte individuelle (badge maturité/domaine, version, titre) |

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
| `ConfirmDialog` | Dialogue de confirmation modal (avec auto-close progress bar) |
| `Input` | Input avec icône optionnelle |
| `Popover` | Popover avec dismiss au clic extérieur |
| `Toast` | Notification toast (success/error, auto-dismiss 10s, slide animation) |
| `UserMultiSelect` | Sélecteur multi-utilisateurs avec autocomplete (admin groups/policies) |

---

## 8. Modèle de données

**Les contrats :** fichiers YAML versionnés dans `contracts/`, validés par JSON Schema (`schema/contract_schema.json`).  
**Le RBAC :** base SQLite (`prisma/data/rbac.db`). Aucune base de données externe pour les contrats.

### Structure `DataContract` (TypeScript — `src/lib/types.ts`)

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
  quality?: { checks: QualityCheck[]; on_failure?: { action: string; notify: string[] } };
  security?: {
    classification: "public" | "internal" | "confidential" | "restricted";
    pii: boolean;
    access_policies?: RolePolicy[];
  };
  serving?: { technology?: { type: string; enabled: boolean; name?: string; notes?: string } };
  output?: {
    location: string;
    storage_format: "ICEBERG" | "PARQUET" | "ORC" | "ORACLE";
    table_name: string;
    partitioning: string[];
    retention: number;
  };
  inputs?: { sources: SourceDependency[]; transformations: Transformation[] };
  operations?: { airflow_dag_id: string; schedule_cron: string; expected_runtime_minutes: number; alerts_channel: string };
  lineage?: { upstream: string[]; downstream: string[]; documentation_links: string[] };
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

## 9. Base de données SQLite (RBAC)

Fichier : `prisma/data/rbac.db`  
Driver : **sql.js** (WASM, pur JS, pas de binaire natif)  
ORM : Schéma défini dans `prisma/schema.prisma` (source de vérité pour les migrations)

### Tables

| Table | Description |
|---|---|
| `permissions` | Niveaux de permission : `admin`(1), `editor`(2), `reader`(3) |
| `access_policies` | Policies d'accès (user ou group, scope domaine/contexte) |
| `groups` | Groupes d'utilisateurs |
| `user_group` | Association many-to-many users ↔ groups |
| `audit_log` | Traçabilité des actions admin |
| `subscriptions` | Abonnements aux contrats (table prête, UI à venir) |
| `notifications` | Notifications in-app (table prête, UI à venir) |

### Migration automatique au démarrage

Appelée par `ensureStartup()` dans le layout racine :

1. Crée les tables si absentes (migration SQL séquentielle)
2. Migre les anciennes tables `roles`/`user_roles` vers `access_policies` (si présentes)
3. Seed les politiques par défaut pour les 10 utilisateurs Keycloak (si base vierge)

---

## 10. RBAC — Contrôle d'accès fin

### Niveaux de permission

| Permission | Accès |
|---|---|
| `admin` | Tout voir, tout modifier, accès administration |
| `editor` | Lecture + écriture (catalogue + éditeur) |
| `reader` | Lecture seule (catalogue, détail) |

### Héritage de scope (hiérarchique)

```
Niveau 1 (Global)      : domain_scope = NULL, context_scope = NULL
Niveau 2 (Domaine)     : domain_scope = 'CRM',  context_scope = NULL
Niveau 3 (Contexte)    : domain_scope = 'CRM',  context_scope = 'RELATION_CLIENT'
```

- Un utilisateur avec `admin` global voit tout
- Un utilisateur avec `reader` sur `CRM` ne voit que les contrats du domaine CRM
- Un utilisateur avec `editor` sur `CRM/RELATION_CLIENT` ne voit/modifie que ce contexte

### Détection de conflits

Lors de la création/édition d'une policy, le système détecte :
- **duplicate** : même scope + même permission → refus
- **weaker** : même scope + permission plus faible → refus
- **overlap** : même scope + permission plus forte → confirmation → upgrade
- **broader** : scope plus large → confirmation → extension
- **narrower** : scope plus étroit déjà couvert → refus

### Filtrage catalogue

`catalog-filter.ts` applique le RBAC au catalogue :
- Admin global → toutes les cartes
- Aucune policy en base (safety net) → toutes les cartes
- Policy globale → toutes les cartes
- Policies scopées → filtre par (domaine, contexte)

### Flux d'accès

```
Utilisateur connecté → auth() → JWT enrichi getUserPermissions()
  ├── / (catalogue) : filterCatalogCards(userId, cards, permissions)
  ├── /:slug (détail) : authorize(userId, domain, context, "read")
  ├── /editor : authorize(userId, domain, context, "write")
  └── /admin/* : getUserPermissions().includes("admin")
```

---

## 11. Administration

Trois pages accessibles via `/admin/*` (protégées : permission `admin` requise).

### Dashboard (`/admin`)

- Cartes statistiques : nombre de groupes, memberships, policies
- Tableau de l'audit log avec recherche, tri (Date/Action/Actor/Target) et pagination

### Groupes (`/admin/groups`)

- Créer un groupe (nom)
- Gérer les membres d'un groupe (modale avec recherche, sélection par checkbox, indicateurs new/member)
- Supprimer un groupe avec confirmation
- Vue "N members" avec popover liste complète

### Policies (`/admin/policies`)

- Créer une policy : choix user ou group, autocomplete utilisateur, sélection permission, scope (domaine + contexte avec datalist)
- Détection de conflit avec dialogue de confirmation (overlap/broader → force)
- Édition et suppression de policy
- Tableau filtré avec indicateurs colorés par niveau

---

## 12. Intégration GitLab

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
- Pagination paramétrable (page, perPage)

---

## 13. Éditeur de contrats

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
- Toggle de mise en page (layout)
- Paramètre `?contract=` pour ouvrir directement un contrat

---

## 14. Docker & Déploiement

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
npm run seed:kc    # Seed utilisateurs Keycloak
npm run dc:up      # docker compose up -d + seed Keycloak
npm run dc:reset   # docker compose down -v + up -d + seed
```

> ⚠️ **Pas de Dockerfile** pour l'application Next.js — elle s'exécute directement via Node.js.

---

## 15. Variables d'environnement

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

### Optionnelles (base de données)

| Variable | Défaut | Description |
|---|---|---|
| `DATABASE_URL` | `file:./data/rbac.db` | Chemin base SQLite (Prisma) |
| `DB_PATH` | `prisma/data/rbac.db` | Chemin base SQLite (runtime sql.js) |

### Optionnelles (Keycloak admin pour seed)

| Variable | Défaut | Description |
|---|---|---|
| `KC_BASE_URL` | `http://localhost:8080` | URL Keycloak pour le seed |
| `KC_REALM` | `data-contracts` | Realm pour le seed |
| `KC_ADMIN` | `admin` | Admin user Keycloak |
| `KC_ADMIN_PASSWORD` | `admin` | Admin password Keycloak |

---

## 16. Tests

**Aucun framework de test n'est configuré.** Aucun fichier `.test.ts`, `.spec.ts`, ou dossier `__tests__/` présent.

La seule vérification qualité est le **typecheck TypeScript** :

```bash
npm run typecheck
```

---

## 17. Guide de développement

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

# 4. Démarrer Keycloak + seed utilisateurs
npm run dc:up

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
- Pas de base de données pour les contrats — tout est fichier YAML + Git
- Base SQLite uniquement pour RBAC, audit, subscriptions, notifications
- CSS global dans `app/globals.css` + Tailwind compilé dans `app/output.css`
- Les imports suivent l'ordre : React/Next → librairies → composants internes → styles

### Réinitialiser la base RBAC

```bash
rm -f prisma/data/rbac.db
# Les migrations et le seed s'exécutent automatiquement au prochain démarrage
npm run dev
```

---

## 18. Scripts & Seed

### Seed des utilisateurs Keycloak

Le script `scripts/seed-keycloak.mjs` lit le fichier `keycloak/realm-export.json` et crée/réinitialise les 10 utilisateurs via l'API Admin Keycloak.

```bash
# Seed uniquement (Keycloak déjà lancé)
npm run seed:kc

# Démarrage complet (Keycloak + seed)
npm run dc:up

# Reset complet (supprime volume Keycloak + recrée tout)
npm run dc:reset
```

### Résumé des scripts npm

| Commande | Description |
|---|---|
| `npm run dev` | Lance Next.js en mode développement |
| `npm run build` | Build de production Next.js |
| `npm run start` | Lance le serveur de production |
| `npm run typecheck` | Vérification TypeScript (`tsc --noEmit`) |
| `npm run seed:kc` | Seed des utilisateurs Keycloak |
| `npm run dc:up` | `docker compose up -d` + seed Keycloak |
| `npm run dc:reset` | Reset complet Keycloak + seed |

---

> Document généré le 16/06/2026 — Projet Data Contract Catalog v0.1.0
