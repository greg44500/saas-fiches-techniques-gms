# M-002 — Critères d'acceptation et ordre de finalisation

> **CONTRAT FINAL 2026-09-24** — La source de vérité actuelle est `docs/m002/M-002-FINAL-CONTRACT.md`. Toute section historique de ce document qui décrit `Gamme 1..5 + usageType PAI/PAE`, un nom de référence calculé, une catégorie obligatoire, un seed v3 final ou « Mon référentiel » est obsolète lorsqu'elle contredit ce contrat final.

**Statut : RECADRAGE QA VALIDÉ — ancien bloc largement implémenté, adaptations A→F encore à réaliser**

## 1. Discipline

Un seul bloc M-002, puis une seule PR M-002. Pas de micro-PR de réparation.

## 2. Éléments conservés

- CanonicalProduct global ;
- ProductVariety ;
- ProductCharacteristic gouverné ;
- WorkspaceProduct ;
- ReferenceContribution ;
- Application Global authorization ;
- imports sécurisés ;
- normalisation/déduplication ;
- lifecycle ACTIVE ↔ ARCHIVED ;
- contributions PENDING_REVIEW / APPROVED / REJECTED.

## 3. Adaptations obligatoires avant validation finale

- [ ] ajouter `CUT` / Pièce-découpe ;
- [ ] autoriser CanonicalProduct sans ProductVariant ;
- [ ] supprimer Gamme 6 du registre courant ;
- [ ] séparer PAI/PAE dans une classification d'usage ;
- [ ] inclure cette classification dans la signature de variante ;
- [ ] migration fail-closed des données Gamme 6 ;
- [ ] créer `m002-reference-v3` ;
- [ ] corriger les catégories/variantes du seed ;
- [ ] placeholder `Rechercher un produit…` ;
- [ ] liste groupée par Produit ;
- [ ] pagination backend par Produit ;
- [ ] recherche précise ouvrant/filtrant les variantes pertinentes ;
- [ ] mapping import CUT + PAI/PAE ;
- [ ] point d'extension Core de navigation Platform ;
- [ ] entrée `Référentiel Produits` visible pour le gouverneur habilité ;
- [ ] confirmer le bootstrap Fondateur `product_reference_governor`.

## 4. Dépendance Core

Avant le code métier restant : une PR Core unique, sans version/tag/release, puis intégration produit du SHA exact.

## 5. Gates finales

Après implémentation complète : migration/seed v3, backend ciblé, frontend ciblé, lint/build, suites globales, E2E complet, `release:verify`, QA visuelle.

## 6. QA finale

Vérifier notamment Carotte groupée, recherche Carotte râpée, Bœuf avec enrichissement Pièce/découpe, Gammes 1..5, PAI/PAE indépendant, catégories Charcuteries/aides culinaires, accès Platform à la gouvernance, correction d'une référence par le gouverneur et absence de données M-003.
