# M-002 — Critères d'acceptation et ordre de finalisation

**Statut : CLÔTURE FONCTIONNELLE ACCEPTÉE — intégration finale soumise à la Core Gate de PR**

**Contrat canonique :** `docs/m002/M-002-FINAL-CONTRACT.md`

## 1. Discipline

Un seul lot M-002, puis une seule PR finale. Pas de micro-PR de réparation.

## 2. Architecture conservée

- [x] `CanonicalProduct` global ;
- [x] `ProductVariety` ;
- [x] `ProductCharacteristic` gouverné ;
- [x] `ProductVariant` conservé techniquement ;
- [x] rôle métier de `ProductVariant` = Référence Produit ;
- [x] `WorkspaceProduct` réutilisé comme lien de Favori ;
- [x] `ReferenceContribution` ;
- [x] Application Global authorization ;
- [x] imports sécurisés ;
- [x] lifecycle `ACTIVE ↔ ARCHIVED`.

## 3. Contrat Référence Produit

- [x] nom métier persistant ;
- [x] `normalizedName` ;
- [x] index unique sur le nom normalisé actif ;
- [x] Conservation obligatoire ;
- [x] Unité obligatoire ;
- [x] Catégorie facultative ;
- [x] Gamme facultative ;
- [x] Gammes 1..6 ;
- [x] Gamme 6 = PAI / PAE ;
- [x] `usageType` retiré du contrat actif ;
- [x] `processingState` facultatif et indépendant de la Gamme ;
- [x] dimensions avancées facultatives ;
- [x] nom visible non construit depuis les dimensions.

## 4. Migration et seed

- [x] migrations historiques conservées ;
- [x] migration additionnelle du contrat Référence Produit ;
- [x] stratégie fail-closed sur les données ambiguës ;
- [x] seed `m002-reference-v6` construit uniquement depuis le PDF alimentaire ;
- [x] v1/v2/v3 immuables ;
- [x] v6 sans collision de nom détectée ;
- [x] v6 : 264 Références, aucune reprise automatique d'une Référence v1-v5 absente du PDF ;
- [x] migration de réconciliation des anciens seeds et archivage des Favoris obsolètes ;
- [x] reset M-002 local sécurisé disponible pour les bases de développement pré-release ;
- [ ] reset M-002 local exécuté sur la base de développement actuelle ;
- [ ] exécution réelle de `npm run migration:m002-catalog` après reset ;
- [ ] exécution réelle de `npm run seed:m002-reference` après migration.

## 5. Backend

- [x] sérialisation du nom persistant ;
- [x] filtre Conservation ;
- [x] filtre Gamme ;
- [x] recherche par nom de Référence et dimensions ;
- [x] déduplication exacte sur le nom de Référence ;
- [x] import réutilisant une Référence exacte existante ;
- [x] catégorie facultative ;
- [x] métadonnées Conservation ;
- [x] `usageType` absent des métadonnées actives.

## 6. Frontend

- [x] onglets `Tous les produits | Favoris` ;
- [x] liste `Produit | Conservation | Actions` ;
- [x] filtres de liste limités à Recherche, Catégorie et Conservation ;
- [x] ordre alphabétique par défaut sans contrôle de tri visible ;
- [x] champ de recherche prioritaire et élargi dans la toolbar ;
- [x] aucune Gamme affichée, éditée, filtrée ou mappée dans le frontend actif ;
- [x] `foodRange` conservé uniquement comme capacité backend compatible ;
- [x] formulaire simplifié ;
- [x] nom Référence persistant ;
- [x] vocabulaire utilisateur « Référence » ;
- [x] dashboard `Favoris Produits` ;
- [x] administration globale sans `usageType`.

## 7. Frontière M-003

- [x] fournisseur hors M-002 ;
- [x] référence fournisseur hors M-002 ;
- [x] conditionnement commercial hors M-002 ;
- [x] prix hors M-002 ;
- [x] colonnes commerciales détectées par l'import mais non absorbées.

## 8. QA et décision de clôture

La QA visuelle fonctionnelle a été acceptée par le porteur produit le 2026-09-25. Les dernières décisions incluent :

- recherche élargie ;
- filtres Workspace limités à Recherche, Catégorie et Conservation ;
- ordre alphabétique par défaut sans contrôle de tri ;
- aucune Gamme affichée, éditée, filtrée ou mappée par le frontend ;
- séparation explicite entre import Produits M-002 et catalogue fournisseur M-003.

Les éventuels raffinements purement design restants sont non bloquants et suivis par `GMS-UX-001`.

## 9. Gate d'intégration

Aucun statut CI vert ne doit être inventé. La preuve finale est fournie par le workflow GitHub `Core Gate`, qui exécute `npm run release:check` sur le HEAD de la PR.

Critère de fusion :

```text
PR finale unique M-002
→ Core Gate PR = success
→ merge
→ Core Gate post-merge = success
```

## 10. Clôture

M-002 est gelé fonctionnellement. Après fusion, le prochain lot est le cadrage détaillé M-003. Toute évolution fonctionnelle supplémentaire du Référentiel Produit doit être un besoin explicitement cadré ; un simple enrichissement des données du référentiel n'implique pas la réouverture du module.
