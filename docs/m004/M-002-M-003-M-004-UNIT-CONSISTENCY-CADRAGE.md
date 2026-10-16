# M-002 / M-003 / M-004 — Cohérence des unités, conditionnements et valorisation

**Statut : QUATRE RÈGLES MÉTIER VALIDÉES PAR L'UTILISATEUR LE 2026-10-16 — IMPLÉMENTATION EN ATTENTE DE TESTS LOCAUX ET QA.**  
**Date : 2026-10-16**  
**Branche de travail :** `feature/m002-m003-m004-unit-consistency`  
**Core intégré :** v1.2.1 (`core-origin.json`, sans changement prévu)

## 1. Problème observé et preuve

Cas de QA : Article BRIDOR réf. 43279 « Croissant 120 g », rattaché à la Référence Produit « Croissant individuel PAI ».

- Colis : 36 éléments × 120 g = 4 320 g.
- Tarif observé : 6,50 € HT par carton.
- Le module Articles M-003 présente 6,50 / 36 = 0,180555… € HT par pièce, arrondi à 0,181 €.
- La Fiche technique M-004 présente une unité `g` pour ce Produit ; une quantité saisie « 1 » signifie donc 1 g et non 1 croissant.
- **Il reste à vérifier les données MongoDB réelles :** l'unité `G` du `ProductVariant` n'a pas été lue directement.

### Constat de code

- `ProductVariant.referenceUnit` (M-002) est l'autorité de l'unité de recette.
- `technicalSheetComposition.service.js` persiste toujours `inputUnit = variant.referenceUnit`.
- `technicalSheetValuation.service.js` utilise le Prix applicable normalisé par M-003.
- `supplierArticlePresentation.service.js` calcule actuellement un `pieceAmount` pour la **présentation** commerciale ; cette projection ne constitue pas un prix M-003 normalisé pour M-004.
- `normalizeSupplierPrice` et `convertQuantity` n'autorisent que les conversions entre unités d'une même dimension. `G/KG` et `UNIT` sont incompatibles sans règle métier supplémentaire.
- L'éditeur Article `supplier-article-edit-dialog.jsx` expose le code brut `UNIT`, libellé « Nombre d'unités », titre générique et longue explication permanente. La présentation M-002 traduit déjà `UNIT` en « pièce » : l'incohérence UX est locale, pas une raison de renommer le code backend.

## 2. Invariants à maintenir

1. **Une seule unité de recette gouvernée par Référence Produit (M-002)** : `ProductVariant.referenceUnit`. Une Fiche M-004 affiche cette unité et ne propose pas de sélecteur libre.
2. **`UNIT` demeure la valeur technique stable**. UI française : « Pièce » par défaut ; pour une Référence dénombrable, utiliser ses libellés singulier/pluriel (`pièce(s)`, `œuf(s)`, `tranche(s)`, etc.).
3. Le nombre d'éléments d'un colis M-003 ne prouve **pas** à lui seul le nombre d'unités de recette : un colis peut contenir des paquets, des sachets, des tranches ou des pièces de plusieurs tailles.
4. Une approximation (par exemple « environ six citrons par kg ») **n'est pas une conversion autorisée** pour la valorisation. Aucun rapprochement masse↔pièce silencieux.
5. M-003 conserve la source tarifaire, la portée Workspace/Dossier, les droits, les conditions applicables et l'historique de conditionnement des tarifs. M-004 conserve les versions validées immuables.
6. M-005 doit continuer à déléguer le calcul économique à M-004, sans moteur d'équivalence parallèle.
7. Pas d'évolution Core présumée ; tous les besoins décrits sont spécifiques au domaine alimentaire.

## 3. Séparation des informations

| Information | Autorité | Exemple |
| --- | --- | --- |
| Unité de recette officielle | M-002 Référence Produit | `UNIT` (« pièce ») |
| Libellés singulier/pluriel | M-002 Référence Produit | « pièce », « pièces » |
| Nombre d'éléments commerciaux / colis | M-003 Article | 36 |
| Quantité/poids par élément commercial | M-003 Article | 120 g |
| Prix source et période | M-003 Tarif | 6,50 € HT / carton |
| Correspondance **vérifiée** éléments commerciaux ↔ unités de recette | M-003, **règle nouvelle à arbitrer** | 36 pièces de recette / carton |
| Quantité de recette | M-004 Fiche | 2 pièces |
| Coût historique validé | M-004 snapshot | 2 × (6,50 / 36) |

Aucun champ « unité de Fiche » libre ne sera ajouté à l'Article ; M-003 peut **présenter en lecture seule** l'unité de la Référence Produit associée et donner accès au parcours M-002 autorisé.

## 4. Correspondances poids / pièce : propositions à arbitrer

### 4.1 Cas certain

Si la Référence Produit est dénombrable et qu'une source structurée permet de garantir **combien d'unités de recette** contient un colis, le résolveur M-003 doit pouvoir déterminer le coût d'une unité à partir du prix applicable et du conditionnement historique correspondant.

Exemple « 36 croissants de 120 g, 6,50 € / carton » :
- conditionnement : 36 unités commerciales ; masse totale 4,320 kg ;
- équivalence explicite à valider : 36 **pièces de recette** par carton ;
- prix normalisé en `UNIT`, si le tarif s'applique et si la source est cohérente : `6,50 / 36` € HT / pièce ;
- fiche : quantité 1, 2 ou 3 pièces ; pas de sélection d'unité ;
- ne pas arrondir le montant normalisé avant le calcul final.

**Proposition de conception :** si le conditionnement ne suffit pas à prouver cette équivalence, recueillir une confirmation contextuelle des unités de recette par colis lors de l'association ou de la correction de l'Article ; proposer éventuellement le nombre commercial existant, **sans le valider automatiquement**. Il faut arbitrer la persistance et la photographie historique de cette équivalence avant le code. Vérifier la compatibilité de ce choix avec toutes les origines de Prix applicable (Catalogue, liste, négocié, facturé, indicatif).

### 4.2 Cas variable ou incertain

Exemple « citron : environ six pièces pour 1 kg » : cette relation est indicative et varie avec le calibre, le lot et la nature de l'approvisionnement.

- Elle ne modifie pas `referenceUnit`.
- Elle n'est jamais utilisée automatiquement pour valoriser la Fiche.
- Si M-002 impose `KG` ou `G`, la Fiche reste au poids.
- Si M-002 impose `UNIT`, la Fiche reste en pièces **mais** une offre uniquement tarifée au kg sans nombre de pièces réellement fiable ne peut pas être valorisée en pièces ; signaler le prix indisponible plutôt que l'inventer.
- Les éventuelles correspondances indicatives de poids moyen constituent un besoin distinct, différé ou à cadrer explicitement.

### 4.3 Cas interdits sans données dédiées

- Prix au kg → coût par pièce avec coefficient de masse moyen non vérifié.
- « `unitCount = 36` » → « 36 pièces de recette » si le colis contient 36 sachets de plusieurs portions.
- Passage global de `G` à `UNIT` sur une Référence Produit déjà utilisée, sans audit des autres Articles, des brouillons et des tarifs.
- Réécriture des snapshots M-004 validés.

## 5. Parcours Produit / Article / Fiche

1. Lors de la création ou de la gouvernance M-002, l'unité de référence est fixée. Le changement sur une Référence déjà utilisée exige une revue d'impact ; ne pas effectuer de migration automatique masse↔pièce.
2. Dans l'Article fournisseur, l'unité de recette du Produit lié est **visible en lecture seule** ; si aucune association, afficher « Associer une Référence Produit » selon droits existants.
3. Lorsque l'unité M-002 est `UNIT` mais qu'un prix de source physique doit servir à la valorisation, proposer seulement une confirmation d'équivalence métier adaptée ; ne pas ajouter de champ obligatoire sur les autres Articles.
4. La Fiche M-004 ne demande que la quantité dans son unité officielle. Le prix M-003 est résolu dans le Dossier et n'est accepté que s'il est normalisable sans ambiguïté.
5. Si l'Article, le tarif ou le conditionnement historique change, revaloriser les brouillons sous les règles existantes ; conserver les validations passées inchangées.

**Point d'attention :** le fallback actuel de présentation `tariff.packagingSnapshot ?? article.packaging` et la couverture des anciens tarifs dépourvus de snapshot doivent être audités avant toute garantie d'invariance historique, sans corriger rétrospectivement des données par supposition.

## 6. Corrections UX déjà demandées

Dialogue existant : `frontend/src/features/suppliers/components/supplier-article-edit-dialog.jsx`.

- Titre : **« Modifier les informations de : [Désignation de l'Article] — réf. [référence fournisseur] »**, avec retour à la ligne possible pour les noms longs.
- Fournisseur : sous-titre court « BRIDOR » (ou valeur effective), sans répéter les informations du titre.
- Phrase de précaution : déplacer dans `InfoTooltip` accessible par survol, clavier et lecteur d'écran. Proposition : « Vous pouvez corriger le conditionnement de cet article. Les anciens tarifs doivent conserver les données de conditionnement utilisées lors de leur enregistrement. » Valider le comportement historique réel avant d'affirmer cette garantie comme acquise.
- « Nombre d'unités » → **« Nb d'unités par colis »** (ou forme longue si la largeur le permet).
- `UNIT` visible → **« Pièce »** dans les listes, tout en conservant `UNIT` dans les données et les API.
- Montrer « Unité utilisée en fiche technique : Pièce » en lecture seule, provenant du Produit lié. Si non associé, état explicite.
- Pas de nouveau champ systématiquement obligatoire, pas de deuxième source de vérité ; garder l'éditeur compact.

## 7. Impact technique attendu après validation

**M-002 :** sérialisation/lecture de l'unité et labels existants, gouvernance d'un éventuel changement d'unité sur une référence utilisée, audit de la référence « Croissant individuel PAI ».  
**M-003 :** modal de modification, représentation du conditionnement, validation d'une éventuelle équivalence explicite, snapshots de tarif, normalisation déterministe et résolveur de Prix applicable.  
**M-004 :** quantité en unité officielle, coûts, snapshots, revalorisation, copie, substitution Produit/Article, erreurs d'incompatibilité.  
**M-005 :** tests de non-régression des simulations et bornes de quantité.  
**Core :** aucun changement anticipé.

Avant toute migration, établir un inventaire **en lecture seule** des Références affectées, de leurs Articles, tarifs et Fiches, y compris données historiques. Aucune réécriture automatique de la base locale ou des validations.

## 8. Plan de tests et gates

- **Unitaires backend :** conversions compatibles, masse↔pièce refusée sans preuve, carton connu et prix exact non arrondi, colis ambigus refusés, écart poids déclaré/calculé.
- **Intégration/API :** privilèges M-002/M-003/M-004, isolation Workspace/Dossier, toutes les origines de tarifs disponibles, historisation du conditionnement, changement d'Article, absence de coût fictif.
- **Frontend :** titre et infobulle, `UNIT` présenté « Pièce », libellés au singulier/pluriel, champ « Nb d'unités par colis », unité de recette en lecture seule, états sans association et sans prix.
- **E2E :** association de la référence, carton 36 × 120 g, valorisation de 1 puis 2 pièces, citron à conversion non prouvée, immutabilité d'une validation, simulation M-005.
- **Qualité locale utilisateur :** tests ciblés, `npm run lint`, `npm test`, `npm --prefix frontend run lint`, `npm --prefix frontend run test`, `npm --prefix frontend run build`, `npm run test:e2e`, puis `npm run release:check`. Aucune exécution ni gate verte n'est présumée.

Conserver une **seule branche et une seule PR** pour ce lot ; les correctifs issus des tests locaux restent sur cette branche.

## 9. Décisions métier validées (2026-10-16)

1. Confirmer que l'unité affichée dans l'Article est **en lecture seule**, issue de M-002, jamais une unité libre concurrente.
2. Valider le principe d'une correspondance **explicite et vérifiée** « unités de recette / colis » pour rendre calculable le prix en `UNIT` lorsque le conditionnement source est en masse ou volume, avec saisie conditionnelle seulement dans les cas nécessaires.
3. Confirmer qu'une équivalence approximative (citron « environ 6/kg ») **n'autorise jamais** une valorisation automatique.
4. Décider du parcours de correction des Références Produit historiquement enregistrées avec la mauvaise dimension (`G` → `UNIT`) après audit des usages, sans altérer les versions validées.

**Décisions confirmées :** aucun sélecteur d'unité en fiche ; unité M-002 visible en lecture seule dans l'Article ; correspondance pièce/colis explicitement confirmée ; poids moyens approximatifs exclus des coûts ; correction des dimensions existantes contrôlée et précédée d'un audit.

## 10. Contrat technique de ce lot

- Article `SupplierArticle.recipeUnitEquivalence` facultatif : `unitsPerPackage` positif, `productVariant`, `packagingSignature`, `verifiedBy`, `verifiedAt`. Le champ indique le nombre **vérifié** d'unités de recette dénombrables contenues dans le colis, et non le nombre de sachets.
- La confirmation est permise uniquement pour une Référence Produit `UNIT` et un colis avec au moins deux éléments, quantité physique unitaire connue et conditionnement cohérent. Les cas hors de ce périmètre restent non convertibles ; pas de conversion par poids moyen.
- Le PATCH Article exige `recipeUnitsPerPackage` et `confirmRecipeUnits: true` ; une nouvelle modification du conditionnement ou de la Référence invalide la correspondance précédente. Un audit métier `ARTICLE_UPDATED` est enregistré.
- M-003 normalise les sources en `UNIT` depuis un prix par colis ou une base physique uniquement si la preuve correspond **exactement** au conditionnement considéré et à la Référence Produit. Les tarifs fournisseur réutilisent le `packagingSnapshot` ; sans historique exploitable, le résultat reste `null`. Les prix négociés/facturés nouveaux figent le conditionnement et la preuve, en plus de leur prix normalisé. Les Prix indicatifs restent sous le contrat physique strict initial, sans équivalence inférée.
- M-004 persiste `UNIT` et affiche le libellé métier M-002, sans nouveau sélecteur ni second moteur de calcul. Le résolveur M-003 reste l'autorité pour le coût. Le montant normalisé utilise la précision décimale existante (pas l'affichage 0,181 €).
- L'édition M-002 interdit une mutation de dimension (ex. `G` → `UNIT`) lorsqu'une Fiche brouillon, validation historique, Article fournisseur ou Prix indicatif référence déjà ce Produit. Ne pas contourner ce garde-fou par une mutation DB : auditer, arbitrer et éventuellement créer une nouvelle Référence.
- Les anciennes données ne sont **pas** automatiquement requalifiées. Le cas BRIDOR doit être audité localement avant toute correction :
  `npm run audit:recipe-unit-usage -- "Croissant individuel PAI"` (lecture seule, vérifier d'abord `MONGODB_URI`).
- Aucun modèle Core, capability ou rôle nouveau. Nouveau sous-document métier M-003 facultatif, sans index supplémentaire ; aucun backfill automatique. Les tests/gates doivent être exécutés localement par l'utilisateur avant PR.

## 11. État de livraison

Modifications code et tests préparés sur la branche `feature/m002-m003-m004-unit-consistency`. **Aucun test local, lint, build ni E2E n'est prétendu vert.** Les corrections découvertes à la QA restent sur cette même branche, puis une seule PR après accord explicite.
