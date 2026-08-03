# Data Model Viewer — Ce qui a été implémenté

## Corrections

- [x] `nodeHeight()` dans `data-model.ts` corrigé : `chromeH = 40`, `fieldH = 33`
- [x] Badge counts contextes (Multicritère) fixé
- [x] `<Handle>` par champ avec `id=fieldName` — React Flow connecte automatiquement
- [x] `sourceHandle`/`targetHandle` préservés dans le merge des edges
- [x] `RelationEdge` simplifié : utilise `sourceX/Y` de React Flow, plus de calcul manuel
- [x] `FieldPosCtx`, `fieldPositions`, `nodeHeights`, `portX`, `portY` supprimés

## Filtrage des edges orphelins

- [x] Filtrer les edges dont `sourceHandle`/`targetHandle` n'existe pas dans les fields du noeud
- [x] Badge "filtered edges" (amber) affiché quand des edges sont masqués
- [x] `orphanEdgeRefs` retourné par `buildGraph()` et propagé jusqu'à `ModelGraph`

## Tables

- [x] Tables redimensionnables en largeur (180px–600px) via `NodeResizeControl`
- [x] `_customWidth` persisté dans le node data
- [x] Ligne "N connected · M hidden" cliquable (ouvre SidePanel)
- [x] Nombre de champs affiché dans le footer du SidePanel

## Layout & navigation

- [x] `nodesep` : 20px, `ranksep` : 60px, `DOMAIN_GAP_X` : 60px, `VERTICAL_GAP` : 20px
- [x] Zoom controls réordonnées : − | pourcentage | +
- [x] `panOnScrollMode` : `Free` → `Vertical` (supprime les sauts au scroll)

## Performance

- [x] Highlight store (ref + `useSyncExternalStore`) au lieu de React Context — ModelGraph ne re-render plus au hover
- [x] Wheel-event flag (`isScrollingRef`) supprime les highlights pendant le scroll
- [x] Debounce re-layout (300ms) après resize de table via `customWidthsRef`

## GitLab retry

- [x] `POST /api/contracts/retry-git` : reset error flag + re-fetch
- [x] Bannière avec bouton "Réessayer" + auto-retry 30s, masquage au succès

## A faire (reste)

- [ ] Supprimer les `console.log` résiduels
- [ ] Supprimer les variables/imports inutilisés
- [ ] Corriger les warnings lint (`layerStroke` inutilisé dans `data-model.ts`)
- [ ] Types TypeScript stricts (éviter les `any` dans `edgeData.parsed`)
- [ ] Debounce des mesures DOM dans `ContractTableNode`
- [ ] SidePanel redimensionnable en largeur
- [ ] Navigation : "Center on table" depuis SidePanel
- [ ] Vérifier Prisma 7 en production
