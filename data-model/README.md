# Data Model Editor — Interactive Lineage Visualizer

Visualise et explore le graphe de dépendances (lineage) entre les contrats de données du catalogue à partir d'un fichier d'index JSON global généré depuis les ~1000 fichiers YAML.

## Architecture des données

### Source

Les fichiers YAML de contrats sont stockés dans un dépôt Git externe :

- **Chemin :** `contracts/published/{bronze,silver,gold}/`
- **Volume :** ~1018 fichiers (1001 bronze, 13 silver, 4 gold)
- **Format :** Data Contract YAML v3 avec sections `asset`, `contract`, `quality`, `security`, `inputs`, `output`, `serving`, `operations`, `lineage`

### Index JSON global

Un index JSON (`data-model-index.json`) est généré à partir des 1018 fichiers YAML, contenant pour chaque contrat :

```typescript
interface DataModelContract {
  slug: string;
  maturity: "bronze" | "silver" | "gold";
  domain: string;
  context: string;
  name: string;
  fields: Array<{ name: string; type: string; description?: string }>;
}
```

### Relations (Lineage)

Les relations entre contrats sont définies dans des fichiers YAML dédiés sous `data-model/` :

- `model-global.yaml` — fichier racine qui importe les fichiers par domaine
- `model-{domaine}.yaml` — un fichier par domaine métier

#### Format d'une relation

```yaml
relations:
  - ref_name: "customer_reference"
    ref: "[domain:context:]slug.field <signe> [domain:context:]slug.field"
```

**Signes supportés :**

| Signe | Cardinalité | Signification |
|-------|-------------|---------------|
| `>` | Many-to-One | La source référence une cible unique |
| `<` | One-to-Many | La source est référencée par plusieurs cibles |
| `-` | One-to-One | Correspondance exacte |

**Résolution des noms relatifs :**

Quand `domain` et `context` sont omis devant un slug, ils sont déduits du fichier domaine courant (déclarés en haut du fichier YAML via les champs `domain:` / `context:`).

### Exemple

```yaml
# data-model/model-crm.yaml
domain: CRM
context: RELATION_CLIENT

relations:
  - ref_name: "customer_reference"
    ref: "FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host < crm_ov.numero_personne_host"

  - ref_name: "feeds_gold"
    ref: "crm_ov.row_id > gold/crm.customer_id"
```

## Fonctionnalités du composant DataModelEditor

### Moteur graphique

- **React Flow** pour le rendu et la manipulation du graphe (nœuds, arêtes, zoom/pan)
- **dagre** pour l'auto-layout (disposition hiérarchique) avec Web Worker pour éviter de bloquer le thread principal

### Interactivité

| Action | Comportement |
|--------|-------------|
| **Zoom/Pan** | Navigation fluide, performance maintenue pour ~1000 nœuds |
| **Clic sur un nœud** | Ouvre un SidePanel (Drawer/Sheet) avec les détails du contrat (slug, domaine, champs, relations) |
| **Survol d'un nœud** | Surligne les relations entrantes et sortantes directes, grise le reste |
| **Recherche** | Barre de filtrage par domaine ou nom de contrat |

### Représentation visuelle

- Couleurs par domaine (palette arbitraire générée automatiquement)
- Arêtes orientées avec libellé du `ref_name`
- Badge de maturité (bronze/silver/gold) sur chaque nœud
- Design minimaliste, typographie système, espacement Tailwind, bordures fines

## Implémentation technique

### Pipeline de données

```
1018 fichiers YAML
      ↓ (parse + extrais slug, domain, context, fields)
index JSON global (data-model-index.json)
      ↓ (parse + resolve relations)
parseContractsToGraph(data)
      ↓
{ nodes: Node[], edges: Edge[] } ← format React Flow
```

### Fonctions utilitaires

| Fonction | Rôle |
|----------|------|
| `parseContractsToGraph(index, modelFiles)` | Transforme l'index JSON + les fichiers `model-*.yaml` en nœuds/arêtes React Flow avec résolution des noms relatifs |
| `resolveSlug(slug, defaultDomain, defaultContext, index)` | Résout un slug relatif en contrat concret |

### Composants React

| Composant | Rôle |
|-----------|------|
| `ModelGraph.tsx` | Conteneur React Flow + auto-layout dagre + events |
| `ContractNode.tsx` | Nœud personnalisé (icône domaine, nom, badge maturité) |
| `ContractEdge.tsx` | Arête personnalisée (libellé, highlight au hover) |
| `SidePanel.tsx` | Drawer Next.js avec détails du contrat sélectionné |
| `FilterBar.tsx` | Barre de recherche/filtre par domaine ou nom |

### Optimisations performance

- **React.memo** sur chaque nœud et arête
- **Dagre en Web Worker** pour le layout (évite de bloquer le thread principal)
- **Virtualisation** du SidePanel si les champs sont nombreux
- **Chargement asynchrone** du fichier JSON + des modèles YAML

### Palette de couleurs par domaine

Les couleurs sont générées par une fonction de hash du nom du domaine vers une teinte HSL, garantissant une répartition uniforme sans collision :

```typescript
function domainColor(domain: string): string {
  let hash = 0;
  for (let i = 0; i < domain.length; i++)
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${hash % 360}, 55%, 50%)`;
}
```

## Pages et routes

| Route | Composant | Description |
|-------|-----------|-------------|
| `/data-model` | `ModelGraph` | Visualisation du graphe complet |
| API `GET /api/data-model` | — | Retourne l'index JSON + les relations résolues |

Le layout s'intègre dans le thème Admin Dashboard existant (Tailwind, espacement cohérent).
