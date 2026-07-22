# Data Model Viewer — Corrections & Améliorations

## Corrections (bugs connus)

### Edge alignment — drift vertical au resize
- [x] `useEffect` → `useLayoutEffect` dans `ContractTableNode` pour mesure synchrone
- [x] Ajouter `nodeHeights` dans `FieldPosCtx` (vraie hauteur DOM vs `measured.height` stale)
- [x] `RelationEdge` utilise `nodeHeights` au lieu de `srcMeas.height`
- [ ] **Vérifier** que le `useMemo` des offsets dans `RelationEdge` se déclenche bien quand `fieldPositions` change (les deps sont correctes ?)

### Edge alignment — constantes vs DOM
- [x] `HEADER_H`, `FIELD_H`, `SUMMARY_ROW_H` supprimés dans `RelationEdge` (remplacés par mesures DOM)
- [x] `nodeHeight()` dans `data-model.ts` corrigé : `chromeH = 40`, `fieldH = 33`
- [ ] **Vérifier** que `nodeHeight()` correspond toujours à la hauteur réelle après ajout du `NodeResizeControl`

### Positionnement des liens sur les champs
- [ ] Passer à des `<Handle>` par champ (un `id` par field name) pour que React Flow connecte automatiquement au bon endroit
- [ ] Conserver `sourceHandle` / `targetHandle` dans le merge des edges (`data-model.ts:301` — destructuring les supprime)
- [ ] Simplifier `RelationEdge` : supprimer le calcul manuel de `sx`/`sy`/`tx`/`ty`/offsets, utiliser les positions fournies par React Flow

### Liens avec champs src/dest inexistants
- [ ] Filtrer les edges dont le `sourceHandle` (champ source) ou `targetHandle` (champ cible) n'existe pas dans les fields du noeud correspondant
- [ ] Afficher un warning/indicator quand des edges sont masqués à cause de champs inexistants (similaire au badge "broken references")
- [ ] Log/console.warn quand un edge référence un champ introuvable (debug)

### Badge counts contextes (Multicritère)
- [x] `CatalogClient.tsx:601` — `contextCountsFiltered[context]` → `contextCounts[context]`

---

## Améliorations UI/UX

### Tables
- [x] Tables redimensionnables en largeur (180px–600px) via `NodeResizeControl`
- [x] `_customWidth` persisté dans le node data (survit au relayout dagre)
- [x] Barres de resize invisibles (`opacity-0`), apparition au hover
- [x] Ligne "N connected · M hidden" cliquable (ouvre le SidePanel)
- [x] Nombre de champs affiché dans le footer du SidePanel

### Barre de zoom
- [x] Réordonnée : − | pourcentage | +

### Layout & espacement
- [x] `nodesep` (vertical) : 20px
- [x] `ranksep` (horizontal LR) : 60px
- [x] `DOMAIN_GAP_X` : 60px
- [x] `VERTICAL_GAP` (layer/domain) : 20px
- [x] Orphan grid gap : 20px

### Navigation
- [ ] Ajouter "Center on table" depuis le SidePanel (appelé `onCenterView` mais pas encore branché sur les champs)
- [ ] Ajouter un bouton "Fit to selection" pour zoomer sur les nodes sélectionnés
- [ ] Raccourci clavier pour toggle detailed/compact (ex: `D` / `C`)

### SidePanel
- [ ] Rendre le SidePanel redimensionnable en largeur (drag handle à gauche)
- [ ] Ajouter un onglet "Lineage" avec visualisation graphe des upstream/downstream
- [ ] Afficher les tags/labels du contrat dans le SidePanel

---

## Améliorations techniques

### Performance
- [ ] Évaluer `onlyRenderVisibleElements={true}` — vérifier que les edges ne disparaissent pas au bord de l'écran
- [ ] Debounce des mesures DOM dans `ContractTableNode` (mesure à chaque render = coûteux avec beaucoup de noeuds)
- [ ] Memoiser le `nodeMap` dans `HighlightCtx` avec un `Map` stable (évite re-renders des edges)
- [ ] Passer à `React.memo` avec comparateur personnalisé sur les edges (vérifier si `RelationEdge` est bien memoized)

### Prisma / Backend
- [ ] Vérifier que la migration Prisma 6→7 fonctionne en production (driver adapter, `prisma+postgres://`)
- [ ] Ajouter des tests pour les endpoints API (pas de tests unitaires actuellement)
- [ ] Vérifier le seed (`prisma/seed.ts`) avec la nouvelle version de Prisma

### Code quality
- [ ] Supprimer les `console.log` résiduels
- [ ] Supprimer les variables inutilisées (`isCompact` supprimé, `FIELD_H`/`HEADER_H` supprimés — vérifier qu'il n'en reste pas)
- [ ] Corriger les warnings lint existants (`layerStroke`, `layerStrokeLight` inutilisés dans `data-model.ts`)
- [ ] Ajouter des types TypeScript stricts (éviter les `any` dans `edgeData.parsed`)

---

## priorité haute

1. Passer à des `<Handle>` par champ — correction fondamentale du positionnement des edges
2. Conserver `sourceHandle`/`targetHandle` dans le merge des edges
3. Debounce des mesures DOM (performance)
4. Vérifier Prisma 7 en production
