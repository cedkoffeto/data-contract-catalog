# Data Model Editor — Interactive Lineage Visualizer

Visualise et explore le graphe de dépendances (lineage) entre les contrats de données du catalogue.

## Architecture des données

### Source

Les fichiers YAML de contrats sont stockés localement sous `contracts/` (ou chargés depuis un dépôt Git distant via `GITLAB_*`).

Les relations entre contrats sont définies dans des fichiers YAML dédiés sous `data-model/` :

```
data-model/
  model-global.yaml          ← fichier racine qui importe tous les domaines
  bronze/                    ← domaines bronze
    model-aml.yaml
    model-agriculture.yaml
    …
  silver/                    ← domaines silver (curation manuelle)
    model-crm.yaml
    model-dat.yaml
    …
  gold/                      ← domaines gold
    model-credit.yaml
    model-gestionnaire2.yaml
```

### Types

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

### Fichiers de relations

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

**Règle de désambiguïsation :** si le premier mot-clé est `bronze`, `silver` ou `gold`, c'est le layer.

#### Exemples

```yaml
# silver/model-crm.yaml
domain: CRM
context: RELATION_CLIENT

relations:
  - ref_name: "customer_reference"
    ref: "crm_activities.numero_personne_host > FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host"
  - ref_name: "feeds_gold"
    ref: "crm_ov.row_id > gold:CRM:crm.row_id"
  - ref_name: "assigned_manager"
    ref: "GESTIONNAIRE:gestionnaire.manager_id - crm_comptes_rendu.row_id"
```

```yaml
# bronze/model-aml.yaml
domain: aml
context: aml_job

relations:
  - ref_name: "cross_aml_aml_logs"
    ref: "bronze_aml_aml_job_009.ID > aml:aml_logs:bronze_aml_aml_logs_013.ID"
```

```yaml
# gold/model-credit.yaml
domain: CREDIT
context: ENGAGEMENT

relations:
  - ref_name: "feeds_gold"
    ref: "silver:PNB:RENTABILITE:pnb.numero_contrat > credit_engagement.engagement_id"
```

## Fonctionnalités

### Moteur graphique

- **React Flow** pour le rendu et la manipulation du graphe (nœuds, arêtes, zoom/pan)
- **dagre** pour l'auto-layout hiérarchique (LR ou TB)

### Interface

| Élément | Description |
|---------|-------------|
| **Panneau latéral gauche** | Collapsible, filtre par layer (Bronze/Silver/Gold) avec couleurs, recherche, liste des tables groupées par domaine, œil pour masquer/afficher chaque table, bouton tout masquer/afficher |
| **Contrôles bas-gauche** | Zoom +/-, Fit view, boutons Detailed/Compact, boutons Left→Right / Top→Bottom |
| **Side panel (drawer)** | Détails du contrat au clic sur un nœud |

### Modes de vue

- **Detailed** : affiche tous les champs de chaque contrat
- **Compact** : affiche uniquement les champs reliés par au moins une relation (fallback sur tous si aucun champ ne match)

### Interactivité

| Action | Comportement |
|--------|-------------|
| **Zoom/Pan** | Navigation fluide |
| **Clic sur un nœud** | Ouvre le SidePanel avec les détails du contrat |
| **Survol d'un nœud** | Surligne les voisins directs, grise le reste |
| **Survol d'une arête** | Met le trait en gras (4px) avec drop-shadow, agrandit le label avec fond bleuté |
| **Toggle œil** | Masque/affiche une table du graphe |
| **Filtre layer** | Restreint la liste et le graphe à un layer |

### Représentation visuelle

- Couleurs par domaine (palette générée par hash HSL)
- Arêtes orientées (flèches `MarkerType.ArrowClosed`) avec libellé du `ref_name`
- Badge de maturité coloré (bronze/ambre, silver/gris, gold/jaune) sur chaque nœud
- Arêtes pleines si actives (`>` ou `<`), pointillées si statiques (`-`)

## Pipeline de données

```
API GET /api/data-model
  ├── contracts/ → DataModelContract[]
  └── data-model/*.yaml → LoadedModel[] (domain, context, layer, relations)
              ↓
parseContractsToGraph(contracts, models)
  ├── expand() — résout les préfixes des refs
  └── parseRef() — décompose "gauche > droite"
              ↓
{ nodes: Node[], edges: Edge[] } ← format React Flow
              ↓
layoutGraph() — dagre (positionnement)
              ↓
ModelGraph — React Flow avec ContractTableNode + RelationEdge
```

## Composants React

| Composant | Rôle |
|-----------|------|
| `ModelGraph.tsx` | Conteneur React Flow, filtres visibilité, layout |
| `ContractTableNode.tsx` | Nœud personnalisé avec tableau de champs, handles |
| `RelationEdge.tsx` | Arête personnalisée avec hover (bold + shadow + label agrandi) |
| `FilterPanel.tsx` | Panneau latéral : filtre layer, recherche, liste groupée par domaine, toggles visibilité |
| `GraphControls.tsx` | Contrôles superposés : zoom, mode vue, direction |
| `SidePanel.tsx` | Drawer avec détails du contrat sélectionné |
| `DataModelEditor.tsx` | Orchestrateur : state, layout, visibilité |

## API

| Route | Description |
|-------|-------------|
| `GET /api/data-model` | Retourne `{ contracts, models }` — tous les contrats + les fichiers de relations parsés |

## Pages

| Route | Description |
|-------|-------------|
| `/data-model` | Visualisation du graphe complet avec panneau de filtres |
