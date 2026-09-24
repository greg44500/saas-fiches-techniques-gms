# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-24  
**Lot actif :** M-002 — Référentiel Produits / Produits canoniques  
**Branche à conserver :** `feature/m002-catalogue-produits`  
**Checkpoint code avant la validation locale finale :** `d063380b39dbae0fb36424bf70fe55fe7b3b3463`  
**Écart avec main à ce checkpoint :** 171 commits en avance, 0 en retard.

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

ProductVariety
→ variété/cultivar global rattaché à un Produit

ProductCharacteristic
→ caractéristique globale contrôlée
→ PRESENTATION | COMMERCIAL_TYPE | SIZE_FORMAT | COLOR | QUALITY_DESIGNATION

ProductVariant
→ déclinaison globale structurée par IDs de Variété/Caractéristiques

WorkspaceProduct
→ ownership Workspace
→ sélection d'une ProductVariant dans Mon référentiel

ProductCategory
→ catégorie globale

ReferenceContribution
→ proposition Workspace nécessitant éventuellement une revue globale
→ ressource distincte des références réelles
```

Lifecycle des références réelles :

```text
ACTIVE ↔ ARCHIVED
```

Lifecycle d'une contribution humaine :

```text
PENDING_REVIEW
→ APPROVED
ou
→ REJECTED
```

Un nouveau `CanonicalProduct` proposé depuis un Workspace suit désormais :

```text
recherche anti-doublon
→ validation Zod
→ product:contribute + product_contribution
→ classification REVIEW_REQUIRED par défaut
→ ReferenceContribution PENDING_REVIEW
→ gouverneur Application Global
→ revalidation transactionnelle
→ APPROVED : CanonicalProduct + première ProductVariant ACTIVE
→ REJECTED : aucune référence publiée
```

L'approbation ne crée pas d'ownership Workspace sur la référence globale. Après publication, le Workspace peut rattacher la déclinaison à **Mon référentiel** via `WorkspaceProduct`.

Pour un Produit existant, une nouvelle Variété ou Caractéristique passe par le même moteur : `EXISTING / AUTO_PUBLISHABLE / REVIEW_REQUIRED / INVALID`.

## 5. Vocabulaire UX désormais validé

Le terme **catalogue** est réservé aux catalogues fournisseurs de M-003.

Dans M-002 :

```text
Référentiel global
Mon référentiel
Produit
Variété
Caractéristique
Déclinaison
Présentation
Gamme
État / transformation
Contribution
Synonymes métier
```

Sur la page Workspace Produits :

```text
Référentiel global | Mon référentiel

Produit | Déclinaison | Gamme | Actions
```

Il n'y a plus :

- colonne « Mon référentiel » redondante ;
- filtre Dans/Retiré redondant ;
- colonne Statut ACTIVE redondante ;
- champ Alias dans les formulaires Workspace ordinaires.

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

`ProductVariant` ne persiste plus une Présentation textuelle comme identité.

Contrat persistant courant :

```text
variety                 → ObjectId ProductVariety nullable
characteristics[]       → ObjectId ProductCharacteristic
processingState
foodRange
referenceUnit
yieldPercent
```

Règles :

- une Variété est facultative ;
- une déclinaison porte au maximum une Caractéristique de chaque `kind` ;
- la Présentation historique est représentée par `ProductCharacteristic(kind=PRESENTATION)` ;
- la Gamme est obligatoire pour toute nouvelle déclinaison courante ;
- État / transformation dépend de la Gamme ;
- le backend reste l'autorité de la nomenclature ;
- l'unité de référence reste obligatoire ;
- le rendement reste facultatif et n'est jamais inventé.

Le payload de création d'un nouveau Produit peut encore accepter une `presentation` initiale comme commodité de saisie ; elle est convertie en Caractéristique structurée dans la transaction de publication et n'est pas persistée dans `ProductVariant.presentation`.

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

Identité d'une déclinaison :

```text
canonicalProduct
+ varietyId ou _
+ characteristicIds ordonnés par kind
+ foodRange
+ normalized(processingState)
```

La signature repose sur les identifiants stables des Variétés/Caractéristiques. Un renommage n'altère donc pas artificiellement l'identité d'une déclinaison.

`referenceUnit` et `yieldPercent` ne participent pas à la signature.

## 10. Migration M-002

Commande unique :

```powershell
npm run migration:m002-catalog
```

Le runner exécute dans cet ordre :

1. backfill lifecycle legacy ;
2. migration de sémantique des anciennes déclinaisons ;
3. migration de la Présentation historique vers `ProductCharacteristic(PRESENTATION)` et recalcul des signatures structurées ;
4. vérification/création des indexes ;
5. synchronisation des permissions Workspace système enregistrées.

Garde-fous :

- aucune Gamme absente n'est inventée ;
- aucune Variété n'est inventée pour l'historique ;
- les signatures finales sont contrôlées avant écriture ;
- aucune collision n'est fusionnée silencieusement ;
- la migration est transactionnelle et idempotente.

## 11. Imports M-002 / frontière M-003

Import M-002 peut mapper :

```text
Produit
Catégorie
Variété
Présentation
Type commercial
Calibre / format
Couleur
Désignation de qualité
Gamme
État / transformation
Unité
Rendement
```

Les imports Workspace ne créent pas librement de synonymes métier. La preview résout les dimensions existantes et utilise le moteur de contribution pour distinguer existant, auto-publication autorisée, revue globale et invalidité.

Restent strictement M-003 : Fournisseur, catalogue/édition fournisseur, référence Article fournisseur, conditionnement commercial et prix.

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

Le corpus de tests a été réaligné sur le nouveau contrat structuré : modèles Variété/Caractéristique, contributions, revalidation atomique, import structuré, seed réel, frontend dimensions et E2E Workspace → revue globale → publication.

**Aucun test, lint, build, E2E ou gate n'est déclaré vert sur le HEAD courant.**

Le HEAD `d063380b39dbae0fb36424bf70fe55fe7b3b3463` ne possède ni statut CI GitHub ni workflow associé.

Pour les tests backend ciblés, conserver `--no-file-parallelism` afin d'éviter le risque historique lié au nettoyage partagé de la base `_test`.

## 14. Ordre de validation à reprendre

### Étape A — récupérer le HEAD

```powershell
git switch feature/m002-catalogue-produits
git pull --ff-only
git rev-parse HEAD
```

### Étape B — migrer et initialiser la base

```powershell
npm run migration:m002-catalog
npm run seed:m002-governance
npm run seed:m002-reference
```

Le dataset `m002-reference-v1` est `ready:true` avec 39 Produits de la catégorie **Fruits et légumes**, Variétés/Caractéristiques structurées et aucun rendement inventé.

### Étape C — backend M-002 ciblé

```powershell
npx vitest run backend/tests/modules/productCatalog/productCatalog.registry.test.js backend/tests/modules/productCatalog/productCatalog.normalization.test.js backend/tests/modules/productCatalog/productVariantSemantics.test.js backend/tests/modules/productCatalog/productCatalog.validation.test.js backend/tests/modules/productCatalog/productCatalog.models.test.js backend/tests/modules/productCatalog/productCatalog.integration.test.js backend/tests/modules/productCatalog/productCatalog.http.test.js backend/tests/modules/productCatalog/productCatalogGovernance.integration.test.js backend/tests/modules/productCatalog/productCatalogGlobal.http.test.js backend/tests/modules/productCatalog/productCatalogImport.integration.test.js backend/tests/modules/productCatalog/productCatalogImportAccess.service.test.js backend/tests/modules/productCatalog/productReferenceContribution.integration.test.js backend/tests/modules/productCatalog/productReferenceDimension.integration.test.js backend/tests/migrations/m002ProductLifecycleBackfill.migration.test.js backend/tests/migrations/m002VariantSemantics.migration.test.js backend/tests/migrations/m002VariantCharacteristics.migration.test.js backend/tests/migrations/m002Catalog.migration.test.js backend/tests/seeds/m002Reference.seed.test.js --no-file-parallelism
```

### Étape D — frontend ciblé

```powershell
npm --prefix frontend run test -- src/features/products
npm --prefix frontend run lint
npm --prefix frontend run build
```

### Étape E — gates plus larges

```powershell
npm run lint
npm test -- --no-file-parallelism
npm --prefix frontend run test
npm run test:e2e
npm run release:verify
```

Ne jamais déclarer une commande verte sans l'avoir exécutée.

## 15. QA visuelle obligatoire avant PR

Lancer séparément :

```powershell
npm run dev
npm --prefix frontend run dev
```

Vérifier au minimum :

- Référentiel global / Mon référentiel ;
- recherche complexe : carotte, carottes, carote, carotte botte, mini carotte, carotte nantaise, carotte surgelée ;
- tableau `Produit | Déclinaison | Gamme | Actions` ;
- aucun champ Alias Workspace ;
- nouveau Produit Workspace → **Soumettre la proposition** ;
- toast **Proposition envoyée en revue** ;
- onglet global **Contributions** et décisions Approuver/Refuser ;
- Pomme : Golden / Gala / Granny Smith ;
- Carotte : Nantaise, En botte avec fanes, Mini, Râpée, Carottes des sables ;
- ajout Reinette et résolution de la faute Reinnette ;
- lifecycle Variétés/Caractéristiques ;
- six Gammes backend-driven ;
- import structuré et frontière M-003 ;
- seed réel ;
- responsive dialogs/drawers/tableaux.

## 16. E2E courants

Deux scénarios Playwright critiques sont présents :

1. Owner Workspace soumet un nouveau Produit → gouverneur Application Global l'approuve → le Produit devient visible globalement → le Workspace le rattache à Mon référentiel ;
2. utilisateur explicitement habilité Application Global crée directement catégorie + Produit dans le Référentiel global.

Ils ne sont pas considérés verts tant que `npm run test:e2e` n'a pas été exécuté sur le HEAD final.

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
