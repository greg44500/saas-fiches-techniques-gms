# M-002 — Critères d'acceptation et ordre d'implémentation

**Statut : BACKEND IMPLÉMENTÉ — exécution locale des gates backend requise avant handoff frontend**
**Module : Catalogue Produits / Produits canoniques**

## 1. Condition de démarrage du code

Aucun modèle Mongoose M-002 avant validation explicite du cadrage complet :

- Scope / domaine ;
- autorisation / gouvernance ;
- validation / doublons ;
- API REST ;
- UX ;
- bootstrap / migrations ;
- stratégie de tests.

La branche unique existe déjà :

```text
feature/m002-catalogue-produits
```

Une seule PR fonctionnelle sera créée à la fin du lot.

## 2. Critères Domaine

- [x] Produit canonique global sans ownership Workspace ;
- [x] Déclinaison séparée de l'identité canonique ;
- [x] WorkspaceProduct référence une déclinaison sans copie d'identité ;
- [x] catégorie globale mono-catégorie V1 ;
- [x] rendement porté par la déclinaison et jamais deviné ;
- [x] unité normalisée backend-driven ;
- [x] aucun prix/fournisseur/conditionnement M-003 dans le modèle M-002.

## 3. Critères Gouvernance

- [x] contribution Workspace PENDING_REVIEW ;
- [x] PENDING visible uniquement au Workspace contributeur + Platform ;
- [x] validation Platform avant exposition globale ACTIVE ;
- [x] correction globale réservée à Platform ;
- [x] aucun edit global arbitraire via permission Workspace ;
- [x] archive globale non destructive ;
- [x] fusion destructive différée tant que le graphe M-003/M-004 n'est pas complet.

## 4. Critères Doublons

- [x] normalisation backend unique ;
- [x] searchKeys uniques ;
- [x] aliases ;
- [x] recherche de proximité ;
- [x] exact match impossible à recréer ;
- [x] near match impose une revue explicite ;
- [x] serveur recalcule les candidats lors de la contribution ;
- [x] signature de déclinaison unique par Produit.

## 5. Critères RBAC

Workspace :

- [x] `product:read` ;
- [x] `product:catalog:manage` ;
- [x] `product:contribute` ;
- [x] owner enrichi via le descriptor produit.

Platform :

- [x] `platform:products:read` ;
- [x] `platform:products:manage` ;
- [x] gestion enregistrée via le point d'extension Platform du Core.

## 6. Critères API

Workspace :

- [x] metadata ;
- [x] search ;
- [x] detail ;
- [x] duplicate-check ;
- [x] contribution Produit ;
- [x] contribution Déclinaison ;
- [x] ajout catalogue ;
- [x] retrait catalogue.

Platform :

- [x] list/detail ;
- [x] catégories ;
- [x] update Produit ;
- [x] approve/reject Produit ;
- [x] lifecycle Produit ;
- [x] update/approve/reject/lifecycle Déclinaison.

## 7. Critères Frontend

- [ ] navigation Produits ;
- [ ] page Mon catalogue / Tout le référentiel ;
- [ ] recherche serveur ;
- [ ] filtres/pagination ;
- [ ] drawer Produit ;
- [ ] ajout/retrait catalogue ;
- [ ] flow contribution avec doublons ;
- [ ] état En validation ;
- [ ] page Platform gouvernance ;
- [ ] catégories Platform ;
- [ ] widget Dashboard.

## 8. Critères Bootstrap

- [x] seed versionné ;
- [x] idempotent ;
- [x] mêmes invariants que runtime ;
- [ ] dataset nettoyé/revu — volontairement différé : `m002-reference.v1.json` reste `ready: false` ;
- [x] aucune donnée M-003 injectée comme attribut Produit ;
- [x] migration indexes idempotente ;
- [x] manifest migration synchronisé.

## 9. Critères Import

- [x] CSV / XLS / XLSX Produits pris en charge par un pipeline M-002 ;
- [x] mapping de colonnes avant import ;
- [x] prévisualisation obligatoire ;
- [x] exact duplicates rattachés, jamais recréés ;
- [x] near duplicates nécessitent une revue ;
- [x] nouvelles identités/déclinaisons passent par PENDING_REVIEW ;
- [x] lignes ambiguës non créées automatiquement ;
- [x] données fournisseur/prix détectées comme hors périmètre M-002 ;
- [x] aucun fichier source durable n'est créé uniquement pour l'import ;
- [x] contrat M-003 figé : catalogue fournisseur partagé au Workspace, conditions locales par Dossier sans duplication du catalogue.

## 10. Critères Tests

- [x] normalisation ;
- [x] models/indexes ;
- [x] services ;
- [x] transaction rollback ;
- [x] tenancy ;
- [x] Workspace RBAC ;
- [x] Platform RBAC ;
- [x] API ;
- [ ] frontend RTL ;
- [ ] 4 E2E critiques ;
- [x] bootstrap/migration.

## 11. Ordre d'implémentation après validation

```text
Étape 1
→ registries / permissions / normalisation

Étape 2
→ modèles + indexes
→ CanonicalProduct
→ ProductVariant
→ WorkspaceProduct
→ ProductCategory
→ ProductReferenceEvent

Étape 3
→ services dedup/search

Étape 4
→ services contribution/catalogue

Étape 5
→ services gouvernance Platform

Étape 6
→ validations / serializers / controllers / routes

Étape 7
→ migration indexes + manifest

Étape 8
→ tests backend complets

Étape 9
→ RTK Query + composition routes/navigation/dashboard

Étape 10
→ frontend Workspace

Étape 11
→ frontend Platform

Étape 12
→ tests frontend

Étape 13
→ import Produits CSV / XLS / XLSX
→ analyse / mapping / prévisualisation / commit

Étape 14
→ bootstrap initial versionné

Étape 15
→ E2E

Étape 16
→ release:check

Étape 17
→ validation visuelle

Étape 18
→ documentation finale
→ UNE SEULE PR M-002
```

## 12. Règle de lot

Aucune micro-PR.

Les commits intermédiaires sont autorisés sur la branche pour préserver une histoire lisible, mais le lot n'est proposé à la fusion qu'une seule fois, après validation fonctionnelle et technique complète.
