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

Note: les data contracts vivent dans le repository (localement ou via GitLab API). Une base PostgreSQL légère (`docker compose up postgres`) est utilisée pour la gestion des droits d'accès (RBAC), les notifications et les commentaires, via Prisma ORM.

## Lecture rapide pour un nouveau dev

Si tu onboardes sur le projet, voici l'ordre conseille:

1. Lire cette page en entier une premiere fois.
2. Installer les dependances et lancer l'app.
3. Demarrer Keycloak local via Docker Compose.
4. Se connecter avec l'utilisateur de demo.
5. Parcourir les pages `/`, `/contracts/:slug`, `/editor`, `/docs`.
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
- une base PostgreSQL (Prisma ORM) gere les droits d'acces, notifications, commentaires et audit

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
  [slug]/                            # Detail d'un contrat
  admin/                             # Dashboard, groupes, polices d'accès
  api/                               # Route handlers Next.js (46 endpoints)
  data-model/                        # Visualisation graphe du data model
  docs/                              # Documentation API (Swagger)
  editor/                            # Workspace d'edition
  login/                             # Page de connexion
  layout.tsx                         # Layout racine
  page.tsx                           # Catalogue

src/
  auth.ts                            # Config NextAuth + Keycloak
  components/
    admin/                           # UI admin (PolicyTable, GroupForm, Dashboard)
    catalog/                         # Pages/composants catalogue
    contract/                        # Rendu detail d'un contrat
    data-model/                      # Graphe React Flow (ModelGraph, nodes, edges)
    editor/                          # Workspace d'edition YAML + formulaire
    layout/                          # Navbar, shell, login, footer
    ui/                              # Composants UI reutilisables
  lib/                               # 34 modules (voir tableau ci-dessous)

contracts/                           # Data contracts YAML
data-model/                          # Relations inter-contrats (bronze/silver/gold)
schema/                              # Schemas et templates
keycloak/                            # Export de realm pour dev local
prisma/                              # Schema Prisma + migrations PostgreSQL
public/                              # Assets statiques
tests/                               # Tests unitaires et API (vitest)
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

- route: `/contracts/:slug`
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

### 3. Demarrer les services (PostgreSQL + Keycloak)

```bash
docker compose up
```

La base PostgreSQL est accessible sur `localhost:5433` (utilisateur `user`, mot de passe `password`, base `data_contract_catalog`).

- **pgAdmin** : [http://localhost:5050](http://localhost:5050) — `admin@admin.com` / `admin`
- **pgAdmin — Connexion PostgreSQL** : automatiquement pré-configurée via `pgadmin-servers.json.template` (variables substituées par `pgadmin-entrypoint.sh` au démarrage). Les credentials sont définis dans `docker-compose.yml` via les variables `PGADMIN_SERVER_*`.

Si les services ont deja tourne avec une ancienne config:

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

### 4. Initialiser la base de donnees

```bash
npm run db:migrate:deploy
npm run db:seed
```

### 5. Lancer l'application

```bash
npm run dev
```

Puis ouvrir:

- [http://localhost:3000](http://localhost:3000)
- [http://localhost:3000/docs](http://localhost:3000/docs)

## Scripts utiles

```bash
npm run dev          # Developpement
npm run build        # Production build
npm run start        # Demarrer en production
npm run typecheck    # Verification TypeScript
npm run db:migrate:dev  # Creer une migration Prisma
npm run db:migrate:deploy  # Appliquer les migrations
npm run db:seed      # Inserer les donnees de base
```

## Pages

| Route | Description |
|---|---|
| `/` | Catalogue des contrats |
| `/contracts/:slug` | Détail d'un contrat |
| `/editor` | Workspace d'édition YAML / formulaire |
| `/editor?file=:path` | Édition d'un fichier spécifique |
| `/data-model` | Visualisation du data model (graphe React Flow) |
| `/docs` | Documentation Swagger / OpenAPI |
| `/login` | Page de connexion |
| `/admin` | Dashboard admin (audit log, stats) |
| `/admin/groups` | Gestion des groupes RBAC |
| `/admin/policies` | Gestion des polices d'accès |

## API — Routes complètes

### Contrats

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/contracts` | Session | Liste des contrats (filtrée par droits) |
| `GET` | `/api/contracts/search?q=` | Session | Recherche full-text |
| `GET` | `/api/contracts/:slug` | Session | Détail d'un contrat |
| `GET` | `/api/contracts/:slug/history` | Session | Historique GitLab du fichier |
| `GET` | `/api/contracts/:slug/repository-content?ref=` | Session | Contenu à une révision |
| `GET` | `/api/contracts/:slug/export?format=` | Session | Export (yaml/csv/html) |
| `POST` | `/api/contracts/:slug/submit` | Session | Soumettre une mise à jour |
| `POST` | `/api/contracts/:slug/preferences` | Session | Sauvegarder préférences (favori, épinglé) |
| `GET` | `/api/contracts/:slug/preferences` | Session | Lire préférences |

### Change Requests

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/contracts/:slug/change-requests` | Session | CR d'un contrat |
| `POST` | `/api/contracts/:slug/change-requests` | Session | Créer un CR (→ GitLab MR) |
| `GET` | `/api/change-requests` | Admin | Tous les CR |
| `PATCH` | `/api/change-requests/:id` | Admin | Merge / reject un CR |
| `POST` | `/api/change-requests/sync` | Admin | Synchroniser CR avec GitLab MR |

### Commentaires & Issues

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/contracts/:slug/comments` | Session | Commentaires d'un contrat |
| `POST` | `/api/contracts/:slug/comments` | Session | Ajouter un commentaire (avec @mentions) |
| `DELETE` | `/api/contracts/:slug/comments/:id` | Session | Supprimer (si propriétaire) |
| `GET` | `/api/contracts/:slug/discussion-summary` | Session | Nb commentaires + issues |
| `GET` | `/api/contracts/:slug/issues` | Session | Issues d'un contrat |
| `POST` | `/api/contracts/:slug/issues` | Session | Créer une issue |
| `PATCH` | `/api/contract-issues/:id` | Session | Changer statut (open/fixed/false_alert) |

### Accès

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/access-requests` | Admin | Liste des demandes |
| `POST` | `/api/access-requests` | Session | Créer une demande d'accès |
| `GET` | `/api/access-requests/my` | Session | Mes demandes |
| `PATCH` | `/api/access-requests/:id` | Admin | Approuver / rejeter |

### Notifications

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Session | Mes notifications (20 dernières) |
| `GET` | `/api/notifications/unread` | Session | Nb non-lues |
| `POST` | `/api/notifications/read` | Session | Marquer comme lues |
| `POST` | `/api/notifications/unread` | Session | Marquer comme non-lues |

### Abonnements

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/subscriptions` | Session | Mes abonnements |
| `GET` | `/api/contracts/:slug/subscription` | Session | État abonnement |
| `POST` | `/api/contracts/:slug/subscription` | Session | S'abonner / se désabonner |

### Admin

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | Admin | Stats + audit log |
| `GET` | `/api/admin/permissions` | Admin | Types de permissions |
| `GET` | `/api/admin/scopes` | Admin | Domaines + contextes existants |
| `GET` | `/api/admin/users/search` | Admin | Rechercher utilisateurs (Keycloak + local) |
| `GET` | `/api/admin/policies` | Admin | Polices d'accès |
| `POST` | `/api/admin/policies` | Admin | Créer une police |
| `PATCH` | `/api/admin/policies/:id` | Admin | Modifier une police |
| `DELETE` | `/api/admin/policies/:id` | Admin | Supprimer une police |
| `GET` | `/api/admin/policies/effective` | Admin | Polices effectives d'un utilisateur |
| `GET` | `/api/admin/groups` | Admin | Groupes |
| `POST` | `/api/admin/groups` | Admin | Créer un groupe |
| `DELETE` | `/api/admin/groups/:id` | Admin | Supprimer un groupe |
| `GET` | `/api/admin/groups/:id/members` | Admin | Membres d'un groupe |
| `POST` | `/api/admin/groups/:id/members` | Admin | Ajouter un membre |
| `DELETE` | `/api/admin/groups/:id/members` | Admin | Retirer un membre |
| `GET` | `/api/admin/groups/memberships` | Admin | Toutes les appartenances |
| `GET` | `/api/admin/contracts` | Admin | Tous les contrats |
| `GET` | `/api/users` | Admin | Liste utilisateurs (recherche) |

### Data Model & Divers

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/data-model` | Session | Graphe du data model |
| `GET` | `/api/openapi` | Publique | Spec OpenAPI générée |
| `GET` | `/api/healthz` | Publique | Health check |
| `GET` | `/api/user/preferences` | Session | Préférences utilisateur |
| `PUT` | `/api/user/preferences` | Session | Màj préférences (canal notification) |

## Système de notifications

Les notifications sont stockées dans la base PostgreSQL et servies via l'API REST. Chaque notification cible un `user_id` spécifique et peut contenir un `contract_slug`, un `type`, un `title`, un `message` et des `metadata` JSON.

### Types de notifications et déclencheurs

| Type | Déclencheur | Destinataire(s) | Navigation au clic |
|---|---|---|---|
| `mention` | @mention dans un commentaire | Utilisateur mentionné | `/contracts/:slug#comment-:id` |
| `comment_reply` | Réponse à un commentaire | Auteur du commentaire parent | `/contracts/:slug#comment-:id` |
| `contract.created` | Nouveau contrat soumis | Admins + users scope | `/contracts/:slug` |
| `contract.submitted` | Contrat existant mis à jour | Admins + abonnés (canal `in_app`) | `/contracts/:slug` |
| `contract_updated` | Merge manuel ou sync GitLab | Abonnés du contrat | `/contracts/:slug` |
| `change_request_created` | CR créé (avec ou sans GitLab) | Éditeur + admins | `/admin?tab=changes&highlight=:id` |
| `change_request_merged` | Admin merge un CR | Éditeur du CR | `/admin?tab=changes&highlight=:id` |
| `change_request_approved` | Sync GitLab détecte MR merged | Éditeur du CR | `/admin?tab=changes&highlight=:id` |
| `change_request_rejected` | Admin reject / MR closed | Éditeur du CR | `/admin?tab=changes&highlight=:id` |
| `access_request` | Création / approbation / rejet | Admins (création) / demandeur (statut) | `/contracts/:slug` ou `/admin` |
| `policy_updated` | Création / modification / suppression d'une police d'accès | Utilisateur concerné (ou membres du groupe) | `/admin?tab=policies` |
| `group_membership` | Ajout / retrait d'un groupe | Utilisateur concerné | — (aucune route dédiée) |

### Canaux de notification

Le canal de notification est déterminé par la préférence utilisateur (`user_preferences.notification_channel`) :
- `in_app` : notifications dans l'interface (cloche)
- `email` : (réservé, envoi email non implémenté)
- `both` : les deux

Les abonnements (`subscriptions`) lient un utilisateur à un contrat avec un canal. Seul le canal `in_app` est actif.

### API notifications

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/notifications` | 20 dernières notifications |
| `GET` | `/api/notifications/unread` | Nombre de non-lues |
| `POST` | `/api/notifications/read` | Marquer comme lues |
| `POST` | `/api/notifications/unread` | Marquer comme non-lues |

## RBAC — Contrôle d'accès

Le RBAC utilise 4 tables PostgreSQL : `permissions`, `access_policies`, `groups`, `user_group`.

### Niveaux de scope (hiérarchiques)

1. **Global** — `domain_scope = NULL, context_scope = NULL` (s'applique partout)
2. **Domaine** — `domain_scope = "finance"` (tous les contextes de ce domaine)
3. **Contexte** — `domain_scope + context_scope` (domaine + contexte spécifique)
4. **Contrat** — `domain_scope + context_scope + data_contract_scope` (slug précis)

L'héritage est automatique : un accès Global donne accès à tous les niveaux inférieurs.
Les permissions peuvent cibler un utilisateur (`user_id`) ou un groupe (`group_id`).

### Permissions

| Permission | Priorité | Accès |
|---|---|---|
| `admin` | 3 | Tout voir, tout modifier, gérer les polices/groupes |
| `editor` | 2 | Voir + modifier les contrats de son scope |
| `reader` | 1 | Lecture seule sur son scope |

### Groupes

Les groupes sont des ensembles d'utilisateurs. Une police d'accès attachée à un groupe s'applique à tous ses membres.
La gestion se fait depuis `/admin/groups`.

## Audit log

Chaque action importante est tracée dans la table `audit_log` :

| Champ | Description |
|---|---|
| `action` | Type d'action (19 valeurs : `auth.login`, `policy.create`, `group.add_member`, etc.) |
| `actor_id` | Utilisateur ayant déclenché l'action |
| `target_type` | `user`, `contract`, `policy`, `group`, `system` |
| `target_id` | Identifiant de la cible |
| `details` | JSON libre |
| `session_id` | ID de session côté client (UUID stocké en sessionStorage + cookie) |
| `created_at` | Timestamp |

Le dashboard admin (`/admin`) expose l'audit log avec recherche et pagination.

## Change Requests

Les Change Requests (CR) permettent de proposer des modifications aux contrats via un workflow GitLab :

1. **Création** : l'éditeur soumet son YAML → création d'une branche GitLab + commit + MR
2. **Review** : les admins voient le CR dans `/admin?tab=changes`
3. **Merge** : l'admin merge → le MR GitLab est accepté, la modification est appliquée
4. **Reject** : l'admin reject → le MR GitLab est fermé
5. **Sync** : un job admin scanne les MR GitLab externes pour synchroniser les CR

Sources : `app` (créé depuis l'interface) ou `external` (importé depuis GitLab).

## Data model

Le projet peut visualiser un graphe de data model via `/data-model` grâce à React Flow.

- Les nœuds représentent des contrats (avec leur maturité : bronze/silver/gold)
- Les arêtes représentent des relations (foreign keys)
- 4 modes de layout : Left-Right, Top-Bottom, Layer columns, Domain columns
- Filtres par couche (bronze/silver/gold) et par table
- Chargement depuis `data-model/` (YAML) ou via GitLab

## Abonnements

Un utilisateur peut s'abonner à un contrat pour recevoir des notifications lors des mises à jour.

- `GET /api/subscriptions` — ses abonnements
- `POST /api/contracts/:slug/subscription` — s'abonner / se désabonner (body: `{ channel: "in_app" }` ou `{}`)
- Les abonnés sont notifiés sur `contract.submitted` et `contract_updated`

## Préférences utilisateur

- **Par contrat** : `is_favorite`, `is_pinned` (API `/api/contracts/:slug/preferences`)
- **Globales** : `notification_channel` (`in_app` / `email` / `both`) (API `/api/user/preferences`)

## Variables d'environnement — Référence complète

```bash
# === Authentification (obligatoire) ===
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=replace-with-a-long-random-secret
AUTH_KEYCLOAK_ID=data-contract-hub
AUTH_KEYCLOAK_SECRET=local-dev-secret
AUTH_KEYCLOAK_ISSUER=http://localhost:8080/realms/data-contracts

# === GitLab (optionnel — sans, pas de historique ni MR) ===
GITLAB_BASE_URL=https://gitlab.example.com
GITLAB_PROJECT_ID=my-group/data-contracts
GITLAB_REPOSITORY_URL=https://gitlab.example.com/my-group/data-contracts
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxx
GITLAB_REF=main

# === Keycloak admin (optionnel — pour la recherche d'utilisateurs) ===
KC_ADMIN=admin
KC_ADMIN_PASSWORD=admin

# === Application ===
DATABASE_URL=postgresql://user:password@localhost:5433/data_contract_catalog?schema=public   # URL de connexion PostgreSQL (Prisma)
CONTRACTS_PATH=./contracts                # Dossier des contrats locaux
```

## Librairies `src/lib/`

### Diagramme relationnel de la base

```mermaid
erDiagram
    permissions {
        int id PK
        string name UK
    }
    access_policies {
        int id PK
        string user_id FK "nullable"
        int group_id FK "nullable"
        int permission_id FK
        string domain_scope "nullable"
        string context_scope "nullable"
        datetime created_at
        datetime updated_at
    }
    groups {
        int id PK
        string name UK
    }
    user_group {
        string user_id PK
        int group_id PK FK
    }
    audit_log {
        int id PK
        string action
        string actor_id
        string target_type
        string target_id
        string details
        datetime created_at
    }
    subscriptions {
        string user_id PK
        string contract_slug PK
        string channel
        datetime created_at
    }
    notifications {
        int id PK
        string user_id
        string contract_slug
        string type
        string title
        string message
        string metadata
        int is_read
        datetime created_at
    }
    comment_mentions {
        int comment_id PK FK
        string user_id PK
    }
    contract_comments {
        int id PK
        string contract_slug
        string user_id
        string body
        int parent_id FK "nullable"
        string target_field "nullable"
        datetime created_at
        datetime edited_at "nullable"
    }
    user_preferences {
        string user_id PK
        string notification_channel
    }
    user_contract_preferences {
        string user_id PK
        string contract_slug PK
        int is_favorite
        int is_pinned
    }
    permissions ||--o{ access_policies : permission_id
    groups ||--o{ access_policies : group_id
    groups ||--o{ user_group : group_id
    contract_comments ||--o{ comment_mentions : comment_id
    contract_comments ||--o{ contract_comments : parent_id
```

| Fichier | Rôle |
|---|---|
| `contracts.ts` | Lecture/agrégation des contrats (local + GitLab) |
| `contract-writer.ts` | Écriture des contrats (local + GitLab) |
| `gitlab.ts` | API GitLab (historique, contenu, MR) |
| `git-sync.ts` | Téléchargement archive GitLab tar.gz |
| `git-source.ts` | Résolution de ref Git |
| `access-control.ts` | RBAC : polices, groupes, scopes, conflits |
| `rbac.ts` | Permissions, admin check, recherche utilisateurs |
| `require-auth.ts` | Garde API (session + permissions) |
| `api-error.ts` | Helper d'erreur API générique |
| `csrf.ts` | Validation CSRF (Origin/Referer) |
| `audit.ts` | Écriture de l'audit log |
| `audit-session.ts` | ID de session côté client pour l'audit |
| `notifications.ts` | CRUD notifications |
| `subscriptions.ts` | Abonnements utilisateur ⇔ contrat |
| `comments.ts` | Commentaires, @mentions, réponses |
| `issues.ts` | Issues (open/fixed/false_alert) |
| `change-requests.ts` | Cycle de vie des change requests |
| `preferences.ts` | Préférences utilisateur (favori, épinglé, canal) |
| `data-model.ts` | Graphe React Flow du data model |
| `data-model-sync.ts` | Sync data model (local + GitLab) |
| `editor-schema.ts` | Schema JSON de l'éditeur |
| `openapi.ts` | Génération spec OpenAPI via Zod |
| `diff.ts` | Diffs YAML (unified, side-by-side, structural) |
| `types.ts` | Types métier |
| `catalog-filter.ts` | Filtrage RBAC du catalogue |
| `format.ts` | Utilitaires (clsx, cn, statusColor) |
| `db.ts` | Wrapper PostgreSQL (Prisma) |
| `migrate.ts` | Migrations DB (17 migrations, auto au démarrage) |
| `startup.ts` | Initialisation app (migrations) |
| `i18n.ts` | Dictionnaire i18n en/fr |
| `use-i18n.ts` | Hook i18n pour composants client |

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
- une base PostgreSQL (RBAC + notifications + commentaires) via Prisma ORM
- GitLab sert de backend de repository pour l'historique et la lecture a une revision
- l'editeur est base sur `RJSF + CodeMirror`
- l'API est documentee par `Zod -> OpenAPI -> Scalar`
