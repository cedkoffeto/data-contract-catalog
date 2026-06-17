# Diff / Comparaison de versions — Todo List

## Objectif
Ajouter une vue de comparaison visuelle entre deux versions d'un contrat de données, sur la page détail et dans l'éditeur.

## Étapes

- [x] Créer ce todolist.md
- [x] Installer la dépendance `diff` (LCS, diffLines)
- [x] Créer `src/lib/diff.ts` — fonctions de diff (unified LCS, side-by-side, structural)
- [x] Créer `app/api/contracts/[slug]/diff/route.ts` — API endpoint
- [x] Créer les composants UI :
  - `src/components/contract/diff/DiffView.tsx` — conteneur principal (3 modes)
  - `src/components/contract/diff/DiffSideBySide.tsx` — vue côte à côte
  - `src/components/contract/diff/DiffStructural.tsx` — vue arborescente des changements
- [x] Créer `src/components/contract/ContractDiffDialog.tsx` — dialogue modal
- [x] Modifier `src/components/contract/ContractPageClient.tsx` — intégrer le diff dans le panneau latéral
- [x] Modifier `src/components/editor/ContractEditorClient.tsx` — remplacer `createUnifiedDiff` naïve
- [x] Ajouter le CSS nécessaire dans `app/globals.css`
- [x] Vérifier : `npm run typecheck` ✅
