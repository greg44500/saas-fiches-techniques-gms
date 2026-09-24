# M-002 — Critères d'acceptation et ordre de finalisation

**Statut : CONTRAT FINAL IMPLÉMENTÉ — QA visuelle et gates finaux requis avant PR**

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
- [x] seed `m002-reference-v5` alimentaire ;
- [x] v1/v2/v3 immuables ;
- [x] v5 sans collision de nom détectée ;
- [x] v5 sans Produit orphelin et sans non-alimentaire ;
- [ ] exécution réelle de `npm run migration:m002-catalog` sur la base locale ;
- [ ] exécution réelle de `npm run seed:m002-reference` sur la base locale.

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
- [x] filtre Conservation ;
- [x] Gamme facultative ;
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

## 8. Tests et gates à exécuter

Aucun statut vert final ne doit être annoncé avant exécution réelle de :

```bash
npm run migration:m002-catalog
npm run seed:m002-reference

npm run release:verify
npm run lint
npm test -- --no-file-parallelism

cd frontend
npm run lint
npm test
npm run build
cd ..

npm run test:e2e
```

État actuel :

- [x] tests backend/front/E2E réalignés dans le code ;
- [ ] migration locale exécutée ;
- [ ] seed local exécuté ;
- [ ] backend global vert ;
- [ ] frontend lint vert ;
- [ ] frontend tests verts ;
- [ ] frontend build vert ;
- [ ] E2E verts ;
- [ ] `release:verify` vert.

## 9. QA visuelle

À contrôler avant PR finale :

- [ ] aucun nom fabriqué du type `Carotte carottes des sables` ;
- [ ] références distinctes lisibles ;
- [ ] Conservation visible et correcte ;
- [ ] Gamme 6 affichée comme PAI / PAE ;
- [ ] Catégorie réellement facultative ;
- [ ] Gamme réellement facultative ;
- [ ] drawer sans bruit de champs vides ;
- [ ] recherche prédictive cohérente ;
- [ ] ajout/retrait des Favoris ;
- [ ] gouvernance globale en vocabulaire Référence ;
- [ ] aucune donnée M-003 visible dans le modèle Produit.

## 10. Clôture

Après QA visuelle et gates réellement verts :

```text
corrections finales éventuelles
→ documentation de clôture
→ une seule PR M-002
→ Core Gate
→ merge
```
