# Production Readiness Fixes

This document tracks issues found during the pre-production audit and their fixes.

## Status Legend

- ✅ Done
- ⏭️ Deferred (low risk / not blocking)

---

## HIGH Priority

### 1. Startup env-var validation ✅
**File:** `src/lib/startup.ts:12`
**Problem:** App starts without required env vars, fails at runtime.
**Fix:** `validateEnv()` checks 6 required vars + DATABASE_URL format + AUTH_SECRET length at startup; `process.exit(1)` on failure.

### 2. Healthz endpoint — real DB check ✅
**File:** `app/api/healthz/route.ts:5`
**Problem:** Returns `{ status: "ok" }` without checking DB connectivity.
**Fix:** `SELECT 1` via Prisma; returns 503 + `{ status: "degraded", db: "unreachable" }` on failure.

### 3. Rate limiter max size cap ✅
**File:** `proxy.ts:9`
**Problem:** `rateLimitMap` is unbounded — memory leak under sustained load.
**Fix:** Capped at 10,000 entries (`RATE_LIMIT_MAX_ENTRIES`); evicts oldest entry when full.

### 4. parseTar() bounds checking ✅
**File:** `src/lib/git-sync.ts:8`
**Problem:** `buffer.subarray(offset, offset + size)` can read past buffer end; no max-file-count guard.
**Fix:** Added `offset + size <= buffer.length` check + `MAX_TAR_FILES = 5_000` cap.

### 5. Access-request 404 instead of 500 ✅
**File:** `app/api/access-requests/[id]/route.ts:41`
**Problem:** `prisma.accessRequest.update()` throws if `findUnique` returns null → 500.
**Fix:** Null check after `findUnique`; returns 404 if not found.

---

## MEDIUM Priority

### 6. listChangeRequests pagination ✅
**File:** `src/lib/change-requests.ts:128`
**Problem:** No `take` limit — loads entire table.
**Fix:** Added optional `limit` param (default 200, max 500).

### 7. listContractIssues pagination ✅
**File:** `src/lib/issues.ts:28`
**Problem:** No `take` limit — loads all issues for a contract.
**Fix:** Added optional `limit` param (default 200, max 500).

### 8. safeYamlLoad() input size limit ✅
**File:** `src/lib/contracts.ts:7`
**Problem:** Depth check exists but no input size limit — large YAML can cause memory spike.
**Fix:** Added `MAX_YAML_SIZE = 1MB` check at entry.

### 9. treeCache / repoFolderCache size cap ✅
**File:** `src/lib/contracts.ts:43-44`
**Problem:** Both Maps grow unbounded.
**Fix:** Capped at 1,000 entries each via `evictOldestCache()` helper.

### 10. Notifications cleanup route ✅
**File:** `app/api/notifications/cleanup/route.ts` + `src/lib/notifications.ts`
**Problem:** Referenced in audit but doesn't exist; no way to purge old read notifications.
**Fix:** POST route (admin-only) + `deleteOldReadNotifications(30)` removes read notifications > 30 days old.

---

## LOW Priority

### 11. Graceful shutdown in prisma.ts ✅
**File:** `src/lib/prisma.ts:13`
**Problem:** No `$disconnect()` on process exit.
**Fix:** `SIGTERM`/`SIGINT` handlers call `prisma.$disconnect()`.

### 12. .env.example improvements ✅
**File:** `.env.example`
**Problem:** No comments on production usage; `AUTH_SECRET` placeholder too short.
**Fix:** Section headers, `openssl rand -hex 32` hint, min-length warning, required marker.

---

## Deferred (no action needed now)

| # | Issue | Reason |
|---|-------|--------|
| D1 | `safeYamlLoad` recursive bomb | Already has depth limit (50); recursive refs in YAML extremely rare |
| D2 | CSP `unsafe-inline`/`unsafe-eval` | Required by Next.js + React; tighten after migration to RSC-only pages |
| D3 | Prisma `log: ["warn", "error"]` in prod | Acceptable for current scale; use structured logging later |
