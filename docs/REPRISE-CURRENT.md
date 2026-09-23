# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-23  
**Lot actif :** M-002 — Référentiel Produits / Produits canoniques  
**Branche à conserver :** `feature/m002-catalogue-produits`  
**Checkpoint code avant cette synchronisation documentaire :** `b904d8d8a818f461a49e060bd45758c63b11bea7`  
**Écart avec main à ce checkpoint :** 105 commits en avance, 0 en retard.

## 1. Autorité de reprise

Ordre impératif :

```text
KB-START-HERE
→ GitHub réel
→ code / contraintes DB
→ tests réellement exécutés
→ contrats M-002
→ Core exact intégré
→ documentation de reprise
```

Ne jamais annoncer un test, lint, build, E2E ou gate vert sans exécution réelle sur le HEAD courant.

## 2. Core intégré

```text
repository : greg44500/saas-core-api
version    : 1.2.0
tag        : v1.2.0
commit     : c428fbec1edfa21a8860fcf8283072e45719832b
```

M-002 réutilise notamment Application Global authorization et le téléversement temporaire sécurisé du Core. Le lot Présentation/Gammes n'a démontré aucun nouveau besoin générique Core.

## 3. État Git

Ne pas repartir de `main`, ne pas créer de nouvelle branche et ne pas ouvrir de micro-PR.

```text
feature/m002-catalogue-produits
→ tests locaux
→ gates
→ QA visuelle
→ corrections uniquement si démontrées
→ une seule PR M-002
→ une seule fusion
```

Aucune PR/fusion M-002 ne doit être faite tant que les tests et la QA visuelle de ce HEAD ne sont pas validés.

## 4. Contrat M-002 courant

Le référentiel partagé reste global au SaaS :

```text
CanonicalProduct
→ identité Produit globale

ProductVariant
→ déclinaison globale

WorkspaceProduct
→ ownership Workspace
→ sélection d'une ProductVariant dans Mon référentiel

ProductCategory
→ catégorie globale
```

Lifecycle global :

```text
ACTIVE ↔ ARCHIVED
```

Le workflow PENDING_REVIEW / approve / reject n'appartient plus au parcours courant.

Une création Workspace autorisée :

```text
recherche anti-doublon
→ catégorie ACTIVE
→ CanonicalProduct ACTIVE
→ ProductVariant ACTIVE
→ WorkspaceProduct ACTIVE
```

La nouvelle identité est immédiatement visible dans le Référentiel global.

## 5. Vocabulaire UX désormais validé

Le terme **catalogue** est réservé aux catalogues fournisseurs de M-003.

Dans M-002 :

```text
Référentiel global
Mon référentiel
Produit
Présentation
Gamme
État / transformation
```

Sur la page Workspace Produits :

```text
Référentiel global | Mon référentiel

Produit | Présentation | Gamme | Actions
```

Il n'y a plus :

- colonne « Mon référentiel » redondante ;
- filtre Dans/Retiré redondant ;
- colonne Statut ACTIVE redondante.

Les actions compactes restent `+` / `−` avec infobulles Ajouter/Retirer de Mon référentiel.

## 6. Tri et visibilité opérationnelle

Le tri Produit est garanti côté backend **avant pagination** sur le nom normalisé.

Les deux listes opérationnelles affichent uniquement :

```text
CanonicalProduct ACTIVE
+
ProductVariant ACTIVE
```

Une référence globale ARCHIVED :

- reste conservée en base ;
- reste disponible pour l'historique et les contrats d'administration ;
- disparaît du Référentiel global Workspace ;
- disparaît de Mon référentiel Workspace.

## 7. Nouveau contrat ProductVariant

Les anciens champs opérationnels :

```text
form
preservation
```

sont remplacés par :

```text
presentation
foodRange
processingState
referenceUnit
yieldPercent
```

Règles :

- **Présentation** remplace « Forme » ;
- le champ **Conservation** est supprimé ;
- la **Gamme** est obligatoire pour toute nouvelle déclinaison créée via les API courantes ;
- **État / transformation** dépend de la Gamme ;
- le backend reste l'autorité de la nomenclature ;
- le frontend ne contient aucune liste de Gammes statique ;
- l'unité de référence reste obligatoire ;
- le rendement reste facultatif et n'est jamais déduit de la Gamme.

## 8. Nomenclature backend-driven

Le registre backend expose :

| Gamme | Nom | État / transformation initial |
| --- | --- | --- |
| 1 | Frais | Produit frais |
| 2 | Conserves | Conserve |
| 3 | Surgelés | Surgelé |
| 4 | Sous-vide cru / épluchés | Sous-vide cru / épluché |
| 5 | Sous-vide cuit | Sous-vide cuit |
| 6 | PAI / PAE | PAI / PAE |

Chaque définition exposée dans `metadata.foodRanges` contient :

```text
value
label
name
processingStates[]
defaultProcessingState
```

Le frontend :

1. charge ces métadonnées ;
2. affiche les Gammes reçues ;
3. au choix de la Gamme, préremplit l'État / transformation ;
4. propose les états reçus via l'autocomplétion ;
5. envoie la valeur au backend.

Le backend canonise/refuse la combinaison. Aucune liste métier parallèle n'est tolérée dans le frontend.

## 9. Signature de déclinaison

Nouvelle identité de déclinaison :

```text
canonicalProduct
+ normalized(presentation)
+ foodRange
+ normalized(processingState)
```

L'unité et le rendement ne participent pas à la signature.

## 10. Migration M-002

Commande unique :

```powershell
npm run migration:m002-catalog
```

Le runner exécute dans cet ordre :

1. backfill lifecycle legacy ;
2. migration de sémantique des ProductVariant ;
3. vérification/création des indexes ;
4. synchronisation des permissions Workspace système enregistrées.

Migration de sémantique :

```text
form → presentation
suppression normalizedForm
suppression preservation / normalizedPreservation
foodRange existant conservé
processingState recalculé depuis la Gamme lorsqu'elle existe
normalizedSignature recalculée
```

Garde-fous :

- aucune Gamme absente n'est inventée pour une ancienne donnée ;
- les signatures finales sont vérifiées avant écriture ;
- deux variantes actives qui deviendraient identiques font échouer la migration ;
- les variantes à migrer passent transactionnellement par une signature temporaire unique afin d'éviter une collision transitoire avec l'ancien index unique ;
- second passage idempotent : aucune réécriture attendue.

Si la migration échoue avec deux IDs de variantes en collision, **ne pas contourner l'erreur** : conserver les IDs et reprendre l'analyse métier de ces deux déclinaisons.

## 11. Imports M-002 / frontière M-003

Import M-002 accepte :

```text
Produit
Alias
Catégorie
Présentation
Gamme
État / transformation
Unité
Rendement
```

La Gamme est requise pour une ligne qui crée une nouvelle déclinaison, soit via mapping, soit via valeur par défaut.

Restent strictement M-003 :

```text
Fournisseur
Catalogue / édition fournisseur
Référence Article fournisseur
Conditionnement commercial
Prix catalogue
Prix négocié
Prix facturé
```

Le cas SYSCO/SCAL doit donc rester traité en M-003 si le fichier porte ces dimensions commerciales.

## 12. Autorité globale Produit

Route :

```text
/product-reference
```

API :

```text
/api/product-reference
```

Permissions :

```text
product:reference:read
product:reference:manage
```

Autorité :

```text
ApplicationGlobalRole
ApplicationGlobalMember
```

Invariant :

```text
Super Admin Platform ≠ gouverneur Produit automatique
Owner Workspace       ≠ gouverneur Produit automatique
```

Le Fondateur peut tester cette surface lorsqu'il a reçu explicitement le membership Application Global Produit, notamment via :

```powershell
npm run seed:m002-governance
```

## 13. Vérité des tests au checkpoint

Des suites ont été déclarées vertes par l'utilisateur plus tôt dans le développement M-002, avant le présent sous-lot Présentation/Gammes.

**Aucune de ces exécutions antérieures ne prouve le HEAD courant.**

Depuis ces résultats ont été modifiés notamment :

- modèle ProductVariant ;
- validation Zod ;
- normalisation/signature ;
- migration M-002 ;
- import ;
- seed ;
- metadata ;
- formulaires frontend ;
- tableaux Produits ;
- E2E.

Le HEAD courant doit donc être entièrement revalidé.

Le risque historique de parallélisme backend reste connu : les fichiers de tests partagent une base `_test` et le setup vide les collections. Pour la campagne M-002 ciblée, conserver `--no-file-parallelism`.

## 14. Ordre de validation à reprendre dans la prochaine conversation

### Étape A — récupérer le HEAD

```powershell
git switch feature/m002-catalogue-produits
git pull --ff-only
git rev-parse HEAD
```

Le SHA attendu après la synchronisation documentaire sera communiqué dans la conversation qui suit le commit de ce document.

### Étape B — migrer la base de développement

```powershell
npm run migration:m002-catalog
npm run seed:m002-governance
```

Ne pas lancer `seed:m002-reference` : le dataset bêta reste volontairement `ready: false`.

### Étape C — backend M-002 ciblé

```powershell
npx vitest run backend/tests/modules/productCatalog/productCatalog.registry.test.js backend/tests/modules/productCatalog/productCatalog.normalization.test.js backend/tests/modules/productCatalog/productVariantSemantics.test.js backend/tests/modules/productCatalog/productCatalog.validation.test.js backend/tests/modules/productCatalog/productCatalog.models.test.js backend/tests/modules/productCatalog/productCatalog.integration.test.js backend/tests/modules/productCatalog/productCatalog.http.test.js backend/tests/modules/productCatalog/productCatalogGovernance.integration.test.js backend/tests/modules/productCatalog/productCatalogGlobal.http.test.js backend/tests/modules/productCatalog/productCatalogImport.integration.test.js backend/tests/modules/productCatalog/productCatalogImportAccess.service.test.js backend/tests/migrations/m002ProductLifecycleBackfill.migration.test.js backend/tests/migrations/m002VariantSemantics.migration.test.js backend/tests/migrations/m002Catalog.migration.test.js --no-file-parallelism
```

### Étape D — frontend ciblé

```powershell
npm --prefix frontend run test -- src/features/products
npm --prefix frontend run lint
npm --prefix frontend run build
```

### Étape E — gates plus larges

Après les campagnes ciblées vertes :

```powershell
npm run lint
npm test -- --no-file-parallelism
npm --prefix frontend run test
npm run test:e2e
npm run release:verify
```

Ne pas déclarer `release:check` vert sans l'exécuter. Si le seul échec vient du parallélisme backend connu, l'isoler avant toute décision de modification.

## 15. QA visuelle obligatoire avant PR

Lancer :

```powershell
npm run dev
```

Vérifier au minimum :

- Référentiel global en premier onglet ;
- Mon référentiel en second ;
- recherche prédictive ;
- champ recherche et bouton alignés ;
- ordre alphabétique Produit ;
- aucune colonne Statut ;
- aucune colonne Mon référentiel ;
- aucun filtre d'état Workspace ;
- colonnes Produit / Présentation / Gamme / Actions ;
- Gamme 1 à 6 reçues du backend ;
- choix Gamme 1 → État « Produit frais » ;
- choix Gamme 2 → « Conserve » ;
- choix Gamme 3 → « Surgelé » ;
- choix Gamme 4 → « Sous-vide cru / épluché » ;
- choix Gamme 5 → « Sous-vide cuit » ;
- choix Gamme 6 → « PAI / PAE » ;
- champ Conservation absent ;
- Présentation saisissable : entière, râpée, émincée, etc. ;
- création impossible sans catégorie + Gamme + unité ;
- création immédiate ACTIVE ;
- ajout/retrait `+` / `−` de Mon référentiel ;
- référence globale archivée absente des deux tableaux opérationnels ;
- `/product-reference` accessible uniquement avec Application Global Produit ;
- catégories globales ;
- création/correction de déclinaison avec le même contrat ;
- import Workspace/global avec Gamme ;
- absence de tout vocabulaire de validation humaine.

## 16. E2E courants

Deux scénarios Playwright sont présents :

1. Owner Workspace crée un Produit ACTIVE, choisit une Gamme et le retrouve dans Mon référentiel ;
2. utilisateur explicitement habilité Application Global crée catégorie + Produit dans le Référentiel global.

Ils ne sont pas considérés verts sur ce nouveau HEAD tant que `npm run test:e2e` n'a pas été réellement exécuté.

## 17. Prochaine étape produit après clôture M-002

Ne pas commencer M-003 avant :

```text
migration locale OK
→ backend ciblé vert
→ frontend ciblé + lint + build verts
→ gates applicables vertes
→ E2E vert
→ QA visuelle validée par l'utilisateur
→ une PR M-002
→ Core Gate / gate produit
→ une fusion
```

Puis cadrer M-003 autour de :

```text
Supplier
→ Catalogue fournisseur / édition identifiée et versionnée
→ SupplierArticle
→ référence / désignation / conditionnement
→ rattachement ProductVariant
→ tarifs
→ filtres Fournisseur / Catalogue
```

Exigence déjà validée : un catalogue SYSCO doit rester identifiable comme SYSCO, ses références conservent leur provenance et l'utilisateur doit pouvoir filtrer d'abord par Fournisseur puis par Catalogue.

## 18. Règles de conduite pour la reprise

- ne pas modifier `main` directement ;
- ne pas créer de nouvelle branche ;
- ne pas créer de micro-PR ;
- ne pas corriger un besoin Core générique dans le produit ;
- ne pas réintroduire `Forme` ou `Conservation` comme champs opérationnels ;
- ne pas coder les Gammes en dur dans le frontend ;
- ne pas ajouter des données Fournisseur à `CanonicalProduct` ou `ProductVariant` ;
- ne pas annoncer de test vert sans preuve ;
- attendre la validation visuelle utilisateur avant la PR/fusion finale.
