# Aligner les colonnes des tableaux du dialogue de conflit

## Objectif
Les deux tableaux (New policy et Existing policies affected) doivent avoir les mêmes colonnes `Target | Permission | Scope` pour qu'ils s'alignent visuellement.

## Changement

### Fichier : `app/admin/policies/page.tsx`

**Lignes ~658-687** — Tableau "Existing policies affected"

Remplacer les colonnes de `# | Permission | Scope` par `Target | Permission | Scope` :

```tsx
{/* Avant : */}
<th className="py-1 pr-4">#</th>
<th className="py-1 pr-4">Permission</th>
<th className="py-1">Scope</th>
...
<td className="py-1 pr-4 text-xs text-gray-400">{p.id}</td>
```

```tsx
{/* Après : */}
<th className="py-1 pr-4">Target</th>
<th className="py-1 pr-4">Permission</th>
<th className="py-1">Scope</th>
...
<td className="py-1 pr-4 font-mono text-xs text-gray-500">{conflictDialog.newPolicy?.assignTo ?? ""}</td>
```

## Impact
- Les deux tableaux auront exactement les mêmes en-têtes de colonnes
- La colonne Target affiche le même `assignTo` (user/group) pour toutes les lignes des policies affectées
- Suppression de la colonne `#` (ID technique non nécessaire)
