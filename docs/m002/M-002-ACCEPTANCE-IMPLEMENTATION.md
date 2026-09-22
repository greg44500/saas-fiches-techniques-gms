# M-002 — Critères d'acceptation et ordre d'implémentation

**Statut : PROPOSÉ — attente de validation métier globale**
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

- [ ] Produit canonique global sans ownership Workspace ;
- [ ] Déclinaison séparée de l'identité canonique ;
- [ ] WorkspaceProduct référence une déclinaison sans copie d'identité ;
- [ ] catégorie globale mono-catégorie V1 ;
- [ ] rendement porté par la déclinaison et jamais deviné ;
- [ ] unité normalisée backend-driven ;
- [ ] aucun prix/fournisseur/conditionnement M-003 dans le modèle M-002.

## 3. Critères Gouvernance

- [ ] contribution Workspace PENDING_REVIEW ;
- [ ] PENDING visible uniquement au Workspace contributeur + Platform ;
- [ ] validation Platform avant exposition globale ACTIVE ;
- [ ] correction globale réservée à Platform ;
- [ ] aucun edit global arbitraire via permission Workspace ;
- [ ] archive globale non destructive ;
- [ ] fusion destructive différée tant que le graphe M-003/M-004 n'est pas complet.

## 4. Critères Doublons

- [ ] normalisation backend unique ;
- [ ] searchKeys uniques ;
- [ ] aliases ;
- [ ] recherche de proximité ;
- [ ] exact match impossible à recréer ;
- [ ] near match impose une revue explicite ;
- [ ] serveur recalcule les candidats lors de la contribution ;
- [ ] signature de déclinaison unique par Produit.

## 5. Critères RBAC

Workspace :

- [ ] `product:read` ;
- [ ] `product:catalog:manage` ;
- [ ] `product:contribute` ;
- [ ] owner enrichi via le descriptor produit.

Platform :

- [ ] `platform:products:read` ;
- [ ] `platform:products:manage` ;
- [ ] gestion enregistrée via le point d'extension Platform du Core.

## 6. Critères API

Workspace :

- [ ] metadata ;
- [ ] search ;
- [ ] detail ;
- [ ] duplicate-check ;
- [ ] contribution Produit ;
- [ ] contribution Déclinaison ;
- [ ] ajout catalogue ;
- [ ] retrait catalogue.

Platform :

- [ ] list/detail ;
- [ ] catégories ;
- [ ] update Produit ;
- [ ] approve/reject Produit ;
- [ ] lifecycle Produit ;
- [ ] update/approve/reject/lifecycle Déclinaison.

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

- [ ] seed versionné ;
- [ ] idempotent ;
- [ ] mêmes invariants que runtime ;
- [ ] dataset nettoyé/revu ;
- [ ] aucune donnée M-003 injectée comme attribut Produit ;
- [ ] migration indexes idempotente ;
- [ ] manifest migration synchronisé.

## 9. Critères Tests

- [ ] normalisation ;
- [ ] models/indexes ;
- [ ] services ;
- [ ] transaction rollback ;
- [ ] tenancy ;
- [ ] Workspace RBAC ;
- [ ] Platform RBAC ;
- [ ] API ;
- [ ] frontend RTL ;
- [ ] 4 E2E critiques ;
- [ ] bootstrap/migration.

## 10. Ordre d'implémentation après validation

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
→ bootstrap initial versionné

Étape 14
→ E2E

Étape 15
→ release:check

Étape 16
→ validation visuelle

Étape 17
→ documentation finale
→ UNE SEULE PR M-002
```

## 11. Règle de lot

Aucune micro-PR.

Les commits intermédiaires sont autorisés sur la branche pour préserver une histoire lisible, mais le lot n'est proposé à la fusion qu'une seule fois, après validation fonctionnelle et technique complète.
