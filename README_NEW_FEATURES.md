# Nouvelles fonctionnalités — Data Contract Catalog

> Mise à jour : Juin 2026

---

## Légende

- ✅ Implémenté
- 🔄 En cours
- 📅 Planifié

---

## EPIC 01 : Gestion des accès (RBAC)

### ✅ RBAC-01 · Access policies (remplace l'ancien système de rôles)

**Statut : ✅ Implémenté**

L'ancien système basé sur `roles` + `user_roles` a été remplacé par un système plus simple et plus flexible basé sur les `access_policies`.

**Fichiers :**
- `prisma/schema.prisma` — Table `access_policies`
- `src/lib/rbac.ts` — `getUserPermissions()` lit les policies globales
- `src/lib/catalog-filter.ts` — `filterCatalogCards()` applique le filtrage domaine/contexte
- `src/lib/access-control.ts` — CRUD des policies
- `app/api/admin/policies/route.ts` — API REST
- `app/admin/policies/page.tsx` — Interface admin

**Fonctionnalités :**
- **Permissions globales** (`domain_scope = NULL`, `context_scope = NULL`) : `admin`, `editor`, `reader`
- **Permissions par domaine** (ex: domaine `CRM` uniquement)
- **Permissions par domaine + contexte** (ex: domaine `CRM`, contexte `RELATION_CLIENT`)
- Les utilisateurs avec `admin` global voient tout
- Les utilisateurs avec `reader` global voient tout le catalogue
- Les utilisateurs avec permissions limitées (scope) ne voient que les contracts correspondant à leur scope

**Seed automatique au démarrage :**
- Si aucune `access_policy` n'existe en base, les utilisateurs Keycloak connus sont seedés avec leurs permissions par défaut :
  - `admin.user` → `admin` (global)
  - `editor.user` → `editor` (global)
  - `contract.user`, `reader.user`, `data_owner.user`, `de1`-`de5` → `reader` (global)

---

### ✅ RBAC-02 · Groupes d'utilisateurs

**Statut : ✅ Implémenté**

**Fichiers :**
- `prisma/schema.prisma` — Tables `groups`, `user_group`
- `src/lib/access-control.ts` — CRUD des groupes et membres
- `app/api/admin/groups/route.ts` — API REST
- `app/api/admin/groups/[id]/members/route.ts` — API REST
- `app/api/admin/groups/memberships/route.ts` — API REST
- `app/admin/groups/page.tsx` — Interface admin

**Fonctionnalités :**
- Créer un groupe (ex: `data_engineering`)
- Ajouter/retirer des membres d'un groupe (modal avec liste à cocher de tous les utilisateurs connus)
- Supprimer un groupe avec confirmation
- Tableau listant les groupes, leurs membres, et les actions
- Popover "+N more" pour voir tous les membres d'un groupe
- Les policies peuvent être assignées à un groupe (via scope ou global)

---

### ✅ RBAC-03 · Filtrage du catalogue selon les droits

**Statut : ✅ Implémenté**

**Fichiers :**
- `src/lib/catalog-filter.ts` — Logique de filtrage
- `app/page.tsx` — Filtrage appliqué au catalogue

**Fonctionnalités :**
- Filtrage par **domaine** et **contexte** du contract
- Un utilisateur voit un contract s'il a une policy correspondant à son (domaine, contexte)
- Héritage : policy `(null, null)` → tous les contracts ; `(CRM, null)` → tous les contracts CRM ; `(CRM, RELATION_CLIENT)` → ce contexte seulement
- Les utilisateurs avec permission `admin` globale voient tout
- Safety net : si aucune policy n'existe dans le système (base vierge), tous les contracts sont visibles

---

### ✅ Audit log

**Statut : ✅ Implémenté** (transversal, inclus dans RBAC)

**Fichiers :**
- `src/lib/audit.ts` — Helper d'écriture
- `app/admin/page.tsx` — Dashboard avec audit log

**Actions tracées :**
| Action | Description |
|---|---|
| `policy.create` | Création d'une access policy |
| `policy.delete` | Suppression d'une access policy |
| `group.create` | Création d'un groupe |
| `group.delete` | Suppression d'un groupe |
| `group.add_member` | Ajout d'un membre à un groupe |
| `group.remove_member` | Retrait d'un membre d'un groupe |

---

## EPIC 02 : Correctif de l'historique des contrats

### 📅 HIST-01 · Affichage complet de l'historique

**Statut : 📅 Planifié**

À implémenter :
- Pagination de l'historique GitLab (paramètres `page`, `perPage`)
- Filtres par auteur et plage de dates
- Mise à jour du composant `ContractPageClient`

---

## EPIC 03 : Serving — Accès outillé à la donnée

### 📅 SERV-01 · Outils de requête recommandés

**Statut : 📅 Planifié**

À implémenter :
- Mapping format de stockage → outils recommandés (ex: ICEBERG → Trino, Spark)
- Affichage dans `ServingSection.tsx`

---

## EPIC 04 : Fonctionnalité "S'abonner" à un contrat

### 📅 SUB-01 · S'abonner à un contrat

**Statut : 📅 Planifié**

Tables déjà créées dans le schéma (`subscriptions`, `notifications`), UI à implémenter :
- Bouton toggle "Souscrire / Souscrit" sur la fiche contrat
- Page "Mes abonnements"
- Notifications in-app

### 📅 SUB-02 · Consulter la liste des abonnés

**Statut : 📅 Planifié**

---

## EPIC 05 : Éditeur — Créer / Modifier un contrat

### 📅 EDIT-01 · Créer un nouveau contrat

**Statut : 📅 Planifié**

### 📅 EDIT-02 · Modifier un contrat existant

**Statut : 📅 Planifié**

---

## Infrastructure

### ✅ Seed automatique des utilisateurs Keycloak

**Statut : ✅ Implémenté**

- Script : `scripts/seed-keycloak.mjs` (Node.js cross-platform)
- Commande : `npm run seed:kc` ou `npm run dc:up`
- Source des utilisateurs : `keycloak/realm-export.json` (champ `users`)
- Crée ou réinitialise les utilisateurs trouvés dans le fichier (utilise le mot de passe défini dans `credentials[0].value`, ou `password` par défaut)
- Idempotent : peut être exécuté plusieurs fois sans副作用
- Pour ajouter un utilisateur : édite `keycloak/realm-export.json` et relance `npm run seed:kc`

### ✅ Base de données SQLite

**Statut : ✅ Implémenté**

- Fichier : `prisma/data/rbac.db` (ignoré par git)
- Driver : `sql.js` (pur JS, WASM, pas de binaire natif)
- ORM : Schéma défini dans `prisma/schema.prisma` (source de vérité)
- Migration initiale : `prisma/migrations/20260615141647_init/`

### ✅ Migration automatique des anciens rôles

**Statut : ✅ Implémenté**

- Au démarrage, si les tables `roles` / `user_roles` existent et contiennent des données, une migration crée les `access_policies` correspondantes
- Les permissions `admin`, `write`, `read` sont mappées depuis l'ancien format JSON vers les nouvelles permissions `admin`, `editor`, `reader`
- La migration ne s'exécute qu'une fois (détecte si des policies existent déjà)

### ✅ Seed automatique des access policies

**Statut : ✅ Implémenté**

- Si aucune `access_policy` n'existe en base, les utilisateurs Keycloak connus sont seedés automatiquement au démarrage
- Défini dans `src/lib/migrate.ts` → `seedDefaultPolicies()`
- Sources des utilisateurs : `keycloak/realm-export.json` (10 utilisateurs)

### ✅ Interface Admin

**Statut : ✅ Implémenté**

- `/admin` — Dashboard (stats groups/memberships/policies, audit log)
- `/admin/groups` — Gestion des groupes et membres
- `/admin/policies` — Gestion des access policies

---

## Guide d'utilisation

### Créer un utilisateur dans Keycloak

```bash
# 1. Obtenir un token admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H "content-type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=admin-cli&username=admin&password=admin" \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).access_token))")

# 2. Créer un utilisateur
curl -s -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "mon.user",
    "enabled": true,
    "emailVerified": true,
    "firstName": "Mon",
    "lastName": "User",
    "email": "mon.user@example.com",
    "credentials": [{"type": "password", "value": "password", "temporary": false}]
  }' \
  http://localhost:8080/admin/realms/data-contracts/users
```

### Créer une access policy (global)

**Via l'interface admin :**
1. Va sur `/admin/policies`
2. Sélectionne "For a user" ou "For a group"
3. Saisis l'ID utilisateur ou le groupe
4. Choisis la permission (`admin`, `editor`, `reader`)
5. Laisse Domain et Context vides pour un accès global
6. Clique "Create"

**Via l'API :**
```bash
curl -X POST http://localhost:3000/api/admin/policies \
  -H "Content-Type: application/json" \
  -d '{"userId": "mon.user", "permissionId": 3, "domainScope": null, "contextScope": null}'
```

### Créer une access policy (scope domaine/contexte)

Pour limiter l'accès à un domaine spécifique :
```bash
curl -X POST http://localhost:3000/api/admin/policies \
  -H "Content-Type: application/json" \
  -d '{"userId": "mon.user", "permissionId": 3, "domainScope": "CRM", "contextScope": null}'
```

### Créer un groupe et ajouter des membres

1. Va sur `/admin/groups`
2. Saisis le nom du groupe et clique "Create"
3. Clique "Manage" sur le groupe
4. Coche les utilisateurs dans la liste et clique "Save"

### Assigner une policy à un groupe

```bash
curl -X POST http://localhost:3000/api/admin/policies \
  -H "Content-Type: application/json" \
  -d '{"groupId": 1, "permissionId": 3, "domainScope": null, "contextScope": null}'
```

### Seed des utilisateurs Keycloak

Les 10 utilisateurs sont définis dans `keycloak/realm-export.json`. Pour les créer/réinitialiser :

```bash
# Démarrage rapide (Keycloak + seed automatique)
npm run dc:up

# Reset complet (supprime le volume Keycloak + recrée tout)
npm run dc:reset

# Seed uniquement (si Keycloak est déjà lancé)
node scripts/seed-keycloak.mjs
```

**Scripts npm disponibles** (dans `package.json`) :

| Commande | Description |
|---|---|
| `npm run dev` | Lance Next.js uniquement |
| `npm run seed:kc` | Seed des utilisateurs Keycloak |
| `npm run dc:up` | `docker compose up -d` + seed automatique |
| `npm run dc:reset` | `docker compose down -v` + `up -d` + seed (reset complet) |

### Réinitialiser la base RBAC

```bash
rm -f prisma/data/rbac.db
# Au prochain démarrage, les migrations et le seed s'exécutent automatiquement
npm run dev
```

**Attention :** les utilisateurs Keycloak et les access policies sont deux choses distinctes.
- Keycloak gère **l'authentification** (qui peut se connecter)
- La base locale gère **les permissions** (ce que chaque utilisateur a le droit de faire)

---

## Architecture technique

```
                              ┌─────────────────────┐
                              │   Keycloak 25        │
                              │  (OIDC Provider)     │
                              └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  NextAuth.js (JWT)   │
                              │  src/auth.ts          │
                              │  enrichit token avec  │
                              │  getUserPermissions() │
                              └──────────┬──────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
         ┌──────────▼──────────┐  ┌──────▼──────┐  ┌────────▼────────┐
         │  API Routes         │  │  Pages      │  │  Middleware     │
         │  /api/admin/policies│  │  /admin/*   │  │  require-admin  │
         │  /api/admin/groups  │  │  /          │  │  catalog-filter │
         │  /api/admin/*       │  │  /editor    │  └────────────────┘
         └──────────┬──────────┘  └──────┬──────┘
                    │                    │
                    └────────────────────┼────────────────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  Business Logic       │
                              │  src/lib/rbac.ts      │
                              │   → getUserPermissions│
                              │  src/lib/catalog-filter│
                              │   → filterCatalogCards│
                              │  src/lib/access-control│
                              │   → CRUD policies/    │
                              │     groups/members    │
                              │  src/lib/audit.ts     │
                              └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  Data Access          │
                              │  src/lib/db.ts         │
                              │  (sql.js — pure JS)   │
                              └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  SQLite Database      │
                              │  prisma/data/rbac.db  │
                              │                       │
                              │  Tables :             │
                              │  - permissions        │
                              │  - access_policies    │
                              │  - groups             │
                              │  - user_group         │
                              │  - audit_log          │
                              │  - subscriptions      │
                              │  - notifications      │
                              └─────────────────────┘
```

## Schéma de la base de données

### Diagramme relationnel (Mermaid)

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
        datetime created_at
    }

    notifications {
        int id PK
        string user_id
        string contract_slug
        string type
        string title
        string message
        int is_read
        datetime created_at
    }

    permissions ||--o{ access_policies : "permission_id"
    groups ||--o{ access_policies : "group_id"
    groups ||--o{ user_group : "group_id"
```

### Détail des tables

#### `permissions`
| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | INTEGER | PK, AUTOINCREMENT | Identifiant |
| `name` | TEXT | UNIQUE, NOT NULL | `admin`, `editor`, ou `reader` |

Valeurs seedées au démarrage : `admin`(1), `editor`(2), `reader`(3).

---

#### `access_policies`
| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | INTEGER | PK, AUTOINCREMENT | Identifiant |
| `user_id` | TEXT | NULLABLE | Utilisateur cible (si policy individuelle) |
| `group_id` | INTEGER | NULLABLE, FK → `groups.id` | Groupe cible (si policy de groupe) |
| `permission_id` | INTEGER | NOT NULL, FK → `permissions.id` | Niveau de permission |
| `domain_scope` | TEXT | NULLABLE | Domaine limité (ex: `CRM`), NULL = tous |
| `context_scope` | TEXT | NULLABLE | Contexte limité (ex: `RELATION_CLIENT`), NULL = tous |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date de création |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date de modification |

**Règles de scope :**
- `domain_scope = NULL, context_scope = NULL` → accès global
- `domain_scope = 'CRM', context_scope = NULL` → accès à tout le domaine CRM
- `domain_scope = 'CRM', context_scope = 'RELATION_CLIENT'` → accès à ce contexte seulement

Une policy doit cibler **soit** un `user_id`, **soit** un `group_id` (pas les deux).

---

#### `groups`
| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | INTEGER | PK, AUTOINCREMENT | Identifiant |
| `name` | TEXT | UNIQUE, NOT NULL | Nom du groupe (ex: `data_engineering`) |

---

#### `user_group`
| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `user_id` | TEXT | PK, NOT NULL | ID de l'utilisateur Keycloak |
| `group_id` | INTEGER | PK, FK → `groups.id` ON DELETE CASCADE | Référence au groupe |

Table d'association many-to-many entre utilisateurs et groupes.

---

#### `audit_log`
| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | INTEGER | PK, AUTOINCREMENT | Identifiant |
| `action` | TEXT | NOT NULL | Type d'action (ex: `policy.create`) |
| `actor_id` | TEXT | NOT NULL | Utilisateur ayant effectué l'action |
| `target_type` | TEXT | NOT NULL | Type de cible (`policy`, `group`) |
| `target_id` | TEXT | NOT NULL | Identifiant de la cible |
| `details` | TEXT | DEFAULT '{}' | Métadonnées JSON |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date de l'action |

Index : `(actor_id)`, `(target_type, target_id)`, `(created_at)`.

---

#### `subscriptions`
| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `user_id` | TEXT | PK, NOT NULL | Utilisateur abonné |
| `contract_slug` | TEXT | PK, NOT NULL | Contrat auquel il est abonné |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date d'abonnement |

---

#### `notifications`
| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | INTEGER | PK, AUTOINCREMENT | Identifiant |
| `user_id` | TEXT | NOT NULL | Destinataire |
| `contract_slug` | TEXT | NOT NULL | Contrat concerné |
| `type` | TEXT | DEFAULT 'info' | Type de notification |
| `title` | TEXT | NOT NULL | Titre |
| `message` | TEXT | DEFAULT '' | Corps du message |
| `is_read` | INTEGER | DEFAULT 0 | 0 = non lu, 1 = lu |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date d'envoi |

Index : `(user_id, is_read)`.

---

### Flux d'accès

```
Utilisateur se connecte
       │
       ▼
  auth() → JWT token enrichi avec getUserPermissions()
       │
       ├── Page d'accueil : filterCatalogCards(userId, cards, permissions)
       │     ├── admin ? → toutes les cartes
       │     ├── aucune policy en base ? → toutes les cartes (safety net)
       │     ├── global reader/writer → toutes les cartes
       │     └── policies scoped → filtre par (domaine, contexte)
       │
       ├── Pages admin : permissions.includes("admin") ? → accès
       │
       └── Éditeur : permissions.includes("write") || "admin" → accès
```
