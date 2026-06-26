# Data Model Editor — Todo & Improvements

## Fait ✓

- Vue graphe avec layout dagre (LR / TB)
- Nœuds personnalisés (ContractTableNode) avec bordures, en-tête coloré, colonnes
- Arêtes personnalisées (RelationEdge) avec flèches, labels, hover (gras + ombre)
- Mode compact : affiche uniquement les champs reliés (fallback sur tous si aucun ne match)
- Filtres : panneau latéral repliable avec recherche, filtre par layer (Bronze/Silver/Gold avec couleurs)
- Regroupement des tables par domaine avec badges (ex: `CRM 5/20`)
- Visibilité individuelle des tables (œil) + tout montrer/cacher
- Boutons de zoom, mode vue (Detailed/Compact), direction (LR/TB) dans le coin bas-gauche
- Data Model dans la navigation principale (plus sous Admin)
- Page full screen sans scroll, footer fixé en bas

## Reste à faire

### 1. Chargement des data models depuis Git (ZIP + hash)

Actuellement, les fichiers de data model (`data-model/**/*.yaml`) sont lus depuis le filesystem local. Il faut les charger depuis le même dépôt Git que les contracts, avec le même mécanisme :

- Télécharger l'archive tar.gz du dépôt au premier appel
- Calculer le hash du commit (SHA de la branche)
- Filtrer pour ne garder que les fichiers sous `data-model/`
- Cache en mémoire avec TTL (1h) + invalidation si le SHA change
- Fallback : lecture locale si pas de config Git

**Fichiers à créer/modifier :**
- `src/lib/data-models.ts` — nouveau module calqué sur `src/lib/contracts.ts`
  - `getDataModels()` — fonction lazy avec cache + SHA
  - `downloadGitLabArchive()` — réutilisation ou adaptation
  - `readLocalDataModels()` — fallback local
- `app/api/data-model/route.ts` — modifier pour utiliser `getDataModels()` au lieu de lire le FS directement
- `.env` — les mêmes vars `GITLAB_*` sont déjà utilisées

### 2. Déboguer l'affichage des arêtes

Certaines relations ne créent pas d'arêtes car les contrats référencés n'existent pas dans le dépôt (ex: `bronze_aml_aml_job_009`). Vérifier :

- Lister toutes les relations sans correspondance contract
- Afficher un warning ou un indicateur visuel pour les références manquantes
- Vérifier que les noms de champs dans les relations (`ref`) correspondent aux `fields.name` des contrats (ex: `fiche_signaletique.numero_personne_host` vs `numero_personne`)

### 3. Mode compact — amélioration

- En mode compact, si un nœud n'a que 1-2 champs reliés, la carte est très petite. Ajouter une hauteur minimale.
- Ajouter un indicateur "N connected fields" quand des champs sont masqués.

### 4. Survol de nœud — mise en évidence des arêtes

Actuellement, le survol d'un nœud grise les nœuds non connectés. Ajouter :

- Mise en évidence des arêtes connectées au nœud survolé (plus épaisses, colorées)
- Opacité réduite sur les autres arêtes

## Suggestions d'améliorations

### Recherche cross-tables
- Barre de recherche globale qui filtre à la fois la liste et centre le graphe sur les résultats
- Mise en surbrillance des nœuds matching dans le graphe

### Mini-carte détaillée
- La mini-carte actuelle montre juste les boîtes. Ajouter les noms des domaines en labels.

### Export / Capture
- Bouton pour exporter le graphe en PNG/SVG
- Bouton pour copier le chemin d'une relation

### Side panel enrichi
- Au clic sur une table, le panneau latéral montre :
  - Les champs avec leurs types
  - Les relations entrantes/sortantes listées
  - Un lien vers le détail du contrat

### Navigation contextuelle
- Ctrl+Click sur une table pour naviguer vers la page de détail du contrat

### Historique des vues
- Sauvegarder le layer filter, le mode compact, la position des nœuds dans le localStorage

### Mode sombre
- Support du dark mode pour le graphe
