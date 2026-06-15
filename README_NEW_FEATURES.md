# Nouvelles fonctionnalités — Data Contract Catalog

> Mise à jour : Juin 2026 — Branch `feat/add_rbac`

---

## Légende

- ✅ Implémenté
- 🔄 En cours
- 📅 Planifié

---

## EPIC 01 : Gestion des rôles et des accès (RBAC)

### ✅ RBAC-01 · Créer et gérer des rôles

**Statut : ✅ Implémenté**

**Fichiers :**
- `rbac/roles.yaml` — Définition des rôles (versionné dans Git)
- `prisma/schema.prisma` — Table `roles`
- `src/lib/rbac.ts` — CRUD complet
- `app/api/admin/roles/route.ts` — API REST
- `app/api/admin/roles/[name]/route.ts` — API REST
- `app/admin/roles/page.tsx` — Interface admin

**Fonctionnalités :**
- Créer un rôle avec un nom et une liste de permissions (`read`, `write`, `admin`)
- Modifier les permissions d'un rôle (toggle)
- Supprimer un rôle (bloqué si des utilisateurs y sont assignés)
- 4 rôles pré-définis : `admin`, `editor`, `reader`, `data_owner`

---

### ✅ RBAC-02 · Assigner des rôles à un utilisateur

**Statut : ✅ Implémenté**

**Fichiers :**
- `prisma/schema.prisma` — Table `user_roles`
- `src/lib/rbac.ts` — Assignation / révocation
- `app/api/admin/users/[id]/roles/route.ts` — API REST
- `app/api/admin/users/assignments/route.ts` — API REST
- `app/admin/users/page.tsx` — Interface admin

**Fonctionnalités :**
- Assigner un rôle à un utilisateur (par email ou ID Keycloak)
- Un utilisateur peut avoir plusieurs rôles
- Révoquer un rôle
- Rechercher des assignations par utilisateur
- Liste complète de toutes les assignations

---

### ✅ RBAC-03 · Filtrage du catalogue selon les droits

**Statut : ✅ Implémenté**

**Fichiers :**
- `src/lib/catalog-filter.ts` — Logique de filtrage
- `app/page.tsx` — Filtrage appliqué au catalogue
- `app/api/contracts/route.ts` — Filtrage API
- `app/api/contracts/search/route.ts` — Filtrage API

**Fonctionnalités :**
- Les contrats marqués `confidential` ou `restricted` sont masqués pour les rôles sans permission `write`
- Les utilisateurs avec permission `admin` voient tout
- Les utilisateurs avec permission `read` uniquement ne voient que les contrats `public` / `internal`

---

### ✅ Audit log

**Statut : ✅ Implémenté** (transversal, inclus dans RBAC)

**Fichiers :**
- `src/lib/audit.ts` — Helper d'écriture
- `prisma/schema.prisma` — Table `audit_log`
- `app/admin/page.tsx` — Affichage des 10 dernières entrées

**Actions tracées :**
| Action | Description |
|---|---|
| `role.create` | Création d'un rôle |
| `role.update` | Modification des permissions |
| `role.delete` | Suppression d'un rôle |
| `user.assign` | Assignation d'un rôle à un utilisateur |
| `user.revoke` | Révocation d'un rôle |

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

### ✅ Synchronisation rôles YAML → DB

**Statut : ✅ Implémenté**

- Fichier source : `rbac/roles.yaml` (versionné dans Git)
- Sync au démarrage via `src/lib/startup.ts` → `src/lib/rbac-sync.ts`
- Les rôles YAML sont la source de vérité pour la *définition* des rôles
- Les assignations sont en DB uniquement

### ✅ Interface Admin

**Statut : ✅ Implémenté**

- `/admin` — Dashboard (stats, audit log)
- `/admin/roles` — Gestion des rôles
- `/admin/users` — Assignation des rôles aux utilisateurs

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

### Assigner un rôle à un utilisateur

**Via l'interface admin :**
1. Va sur `/admin/users`
2. Saisis l'email ou l'ID Keycloak de l'utilisateur
3. Sélectionne un rôle dans la liste
4. Clique "Assign"
5. Pour révoquer, clique "Revoke" sur la ligne correspondante

**En CLI :**
```bash
node -e "
const initSqlJs = require('sql.js');
const fs = require('fs');
(async () => {
  const SQL = await initSqlJs({
    locateFile: (f) => require('path').join(process.cwd(), 'node_modules', 'sql.js', 'dist', f)
  });
  const db = new SQL.Database(fs.readFileSync('prisma/data/rbac.db'));
  db.run('INSERT OR IGNORE INTO user_roles (user_id, role_name, assigned_by) VALUES (?, ?, ?)', 
    ['mon.user@example.com', 'editor', 'admin']);
  fs.writeFileSync('prisma/data/rbac.db', Buffer.from(db.export()));
  console.log('OK');
})();
"
```

### Créer un rôle personnalisé

**Via l'interface admin :**
1. Va sur `/admin/roles`
2. Saisis le nom du rôle
3. Coche les permissions souhaitées
4. Clique "Create"

**Via l'API :**
```bash
curl -X POST http://localhost:3000/api/admin/roles \
  -H "Content-Type: application/json" \
  -d '{"name": "viewer", "permissions": ["read"]}'
```

### Modifier les rôles par défaut

1. Édite `rbac/roles.yaml`
2. Commit et push (la sync se fait automatiquement au redémarrage)

### Réinitialiser la base RBAC

```bash
rm -f prisma/data/rbac.db
npx prisma migrate dev --name init
node -e "
const initSqlJs = require('sql.js');
const fs = require('fs');
(async () => {
  const SQL = await initSqlJs({
    locateFile: (f) => require('path').join(process.cwd(), 'node_modules', 'sql.js', 'dist', f)
  });
  const db = new SQL.Database(fs.readFileSync('prisma/data/rbac.db'));
  db.run('INSERT OR IGNORE INTO roles (name, permissions) VALUES (\"admin\", \"[\\\"read\\\",\\\"write\\\",\\\"admin\\\"]\")');
  db.run('INSERT OR IGNORE INTO roles (name, permissions) VALUES (\"editor\", \"[\\\"read\\\",\\\"write\\\"]\")');
  db.run('INSERT OR IGNORE INTO roles (name, permissions) VALUES (\"reader\", \"[\\\"read\\\"]\")');
  db.run('INSERT OR IGNORE INTO roles (name, permissions) VALUES (\"data_owner\", \"[\\\"read\\\",\\\"write\\\"]\")');
  fs.writeFileSync('prisma/data/rbac.db', Buffer.from(db.export()));
  console.log('OK');
})();
"
```

### Seed des utilisateurs Keycloak

Les 5 utilisateurs sont définis dans `scripts/seed-keycloak.mjs`. Pour les créer/réinitialiser :

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

### Assigner les rôles RBAC

Les rôles RBAC sont assignés dans la base locale via l'interface admin :
1. Va sur `/admin/roles` (connecté en tant qu'admin) pour voir/créer les rôles
2. Va sur `/admin/users` pour assigner les utilisateurs aux rôles

**Attention :** les utilisateurs Keycloak et les rôles RBAC sont deux choses distinctes.
- Keycloak gère **l'authentification** (qui peut se connecter)
- La base RBAC locale gère **les permissions** (ce que chaque utilisateur a le droit de faire)

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
                              └──────────┬──────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
         ┌──────────▼──────────┐  ┌──────▼──────┐  ┌────────▼────────┐
         │  API Routes         │  │  Pages      │  │  Middleware     │
         │  app/api/admin/*    │  │  /admin/*   │  │  require-admin  │
         │  app/api/contracts/*│  │  /          │  │  catalog-filter │
         └──────────┬──────────┘  └──────┬──────┘  └────────┬────────┘
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  Business Logic       │
                              │  src/lib/rbac.ts      │
                              │  src/lib/audit.ts     │
                              │  src/lib/catalog-filter│
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
                              └─────────────────────┘
```

Source de vérité définitions rôles :
```
rbac/roles.yaml  ──(sync au startup)──>  SQLite (roles)
Keycloak                                 SQLite (user_roles, audit_log)
```
