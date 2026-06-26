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

### Fichiers de relations (Lineage)

Les relations entre contrats sont définies dans des fichiers YAML dédiés sous `data-model/` :

```
data-model/
  model-global.yaml          ← fichier racine qui importe tous les domaines
  bronze/                    ← domaines auto-générés (layer inféré du dossier)
    model-aml.yaml
    model-crm.yaml
    …
  silver/                    ← domaines métier silver/gold (curation manuelle)
    model-crm.yaml
    model-dat.yaml
    …
  gold/                      ← domaines gold uniquement
    model-credit.yaml
    model-gestionnaire2.yaml
```

- **Layer** déduit du sous-dossier parent (`bronze/`, `silver/`, `gold/`)
- **Domain** vient du champ `domain:` dans le fichier
- **Context** vient du champ `context:` dans le fichier

#### Format d'une relation

```yaml
relations:
  - ref_name: "customer_reference"
    ref: "[layer:][domain:][context:]slug.champ <signe> [layer:][domain:][context:]slug.champ"
```

**Signes supportés :**

| Signe | Cardinalité | Signification |
|-------|-------------|---------------|
| `>` | Many-to-One | La source référence une cible unique |
| `<` | One-to-Many | La source est référencée par plusieurs cibles |
| `-` | One-to-One | Correspondance exacte |

#### Résolution du préfixe

Le préfixe optionnel est décomposé par `:` dans l'ordre **layer → domain → context** :

- `slug.field` → tous les défauts du fichier
- `DOMAINE:slug.field` → même layer, domain surchargé, même context
- `DOMAINE:CONTEXTE:slug.field` → même layer, domain et context surchargés
- `layer:DOMAINE:CONTEXTE:slug.field` → tout est surchargé
- `layer:slug.field` → layer surchargé, domain et context inchangés

**Règle de désambiguïsation :** si le premier mot-clé est `bronze`, `silver` ou `gold`, c'est le layer. Les parties suivantes (jusqu'au slug) sont `domain` puis `context`. Quand seul le context diffère, le domain est aussi inclus pour éviter l'ambiguïté.

#### Exemples

```yaml
# silver/model-crm.yaml — defaults: layer=silver, domain=CRM, context=RELATION_CLIENT
domain: CRM
context: RELATION_CLIENT

relations:
  # Même layer, domain, context → juste slug.field
  - ref_name: "customer_reference"
    ref: "crm_activities.numero_personne_host > FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host"

  # Cross-layer : layer=gold, domain=CRM, context par défaut (RELATION_CLIENT)
  - ref_name: "feeds_gold"
    ref: "crm_ov.row_id > gold:CRM:crm.row_id"

  # Cross-domain : domain=GESTIONNAIRE, même context
  - ref_name: "assigned_manager"
    ref: "GESTIONNAIRE:gestionnaire.manager_id - crm_comptes_rendu.row_id"
```

```yaml
# bronze/model-aml.yaml — defaults: layer=bronze, domain=aml, context=aml_job
domain: aml
context: aml_job

relations:
  # Intra-contexte : même layer, domaine, contexte
  - ref_name: "aml_job_partition"
    ref: "bronze_aml_aml_job_009.ID > bronze_aml_aml_job_013.ID"

  # Cross-contexte : domain et context explicites (contexte différent)
  - ref_name: "cross_aml_aml_logs"
    ref: "bronze_aml_aml_job_009.ID > aml:aml_logs:bronze_aml_aml_logs_013.ID"
```

```yaml
# gold/model-credit.yaml — defaults: layer=gold, domain=CREDIT, context=ENGAGEMENT
domain: CREDIT
context: ENGAGEMENT

relations:
  # Tout est différent des défauts → préfixe complet
  - ref_name: "feeds_gold"
    ref: "silver:PNB:RENTABILITE:pnb.numero_contrat > credit_engagement.engagement_id"
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
      ↓ (parse + resolve relations depuis bronze/*, silver/*, gold/*)
parseContractsToGraph(data)
      ↓
{ nodes: Node[], edges: Edge[] } ← format React Flow
```

### Fonctions utilitaires

| Fonction | Rôle |
|----------|------|
| `parseContractsToGraph(index, modelFiles)` | Transforme l'index JSON + les fichiers `model-*.yaml` en nœuds/arêtes React Flow avec résolution des préfixes relatifs |
| `expand(side, defaults)` | Résout un préfixe `[layer:][domain:][context:]slug.field` en `{layer,domain,context,slug,field}` |
| `parseRef(refStr, defaults)` | Parse `"gauche > droite"` en `{left, sign, right}` avec résolution des préfixes |

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
