# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-27  
**Lot clôturé :** M-002 — Référentiel Produits  
**Lot courant :** M-003 — Fournisseurs + Articles + conditionnements + prix/catalogues  
**État M-003 :** cadrage détaillé VALIDÉ — implémentation autorisée  
**Branche préparée :** `feature/m003-suppliers-catalogs-pricing`

## 1. Ordre d'autorité

~~~text
KB-START-HERE
→ GitHub réel
→ code / contraintes DB
→ tests réellement exécutés
→ docs/m003/M-003-FINAL-CONTRACT.md
→ contrats M-002 nécessaires à la frontière Produit
→ Core réellement intégré
→ présente reprise
~~~

En cas de contradiction, Git/code/tests priment.

## 2. Point de départ Git vérifié

Dépôt :

~~~text
greg44500/saas-fiches-techniques-gms
~~~

Main de départ du cadrage M-003 :

~~~text
386e64cacd97cab15e712697c2d7fdd985a4f62e
Merge PR #20 — feat(m002): deliver the shared product reference catalog
~~~

Preuves de clôture M-002 :

~~~text
Core Gate PR #130
→ success

Core Gate post-merge #131
→ success
~~~

La branche M-003 a été créée depuis ce HEAD.

Toujours revérifier GitHub au début de la prochaine conversation avant toute modification.

## 3. Core intégré

~~~text
repository = greg44500/saas-core-api
version    = 1.2.1
tag        = v1.2.1
commit     = d90d8f1e6034cbbf4f63de2be7312eae69b1d698
~~~

Les points d'extension nécessaires sont disponibles :

- RBAC Workspace ;
- capabilities ;
- routes backend ;
- routes frontend ;
- navigation Workspace ;
- navigation Platform ;
- Dashboard ;
- Application Global authorization ;
- lifecycle WorkspaceMember lorsque pertinent.

Aucune évolution Core n'est actuellement identifiée comme nécessaire pour M-003.

Si l'implémentation démontre un manque générique, ne pas le corriger silencieusement dans le produit : retourner dans saas-core-api, tester/versionner puis intégrer par une branche core-update.

## 4. Contrat canonique M-003

Source de vérité :

~~~text
docs/m003/M-003-FINAL-CONTRACT.md
~~~

Le contrat a été explicitement validé le 2026-09-27.

Aucun modèle Mongoose M-003 n'existait au moment de cette validation.

## 5. Frontière M-002 / M-003

M-002 reste gelé :

~~~text
Référence Produit
→ identité Produit exploitable
→ catégorie/conservation/unité
→ favoris Produits Workspace
~~~

M-003 ajoute :

~~~text
Fournisseur
→ Article fournisseur
→ conditionnement
→ édition catalogue
→ Tarif fournisseur
→ Tarif négocié Dossier
→ Prix facturé Dossier
→ Prix applicable
~~~

M-003 ne recrée jamais une identité Produit parallèle.

## 6. Décisions M-003 validées

### Portées

~~~text
GLOBAL_SHARED
→ référentiel commun SaaS

WORKSPACE_PRIVATE
→ données propres à un Workspace
→ jamais exposées hors Workspace
~~~

Un utilisateur peut importer un catalogue spécifique à son Workspace sans le partager au SaaS.

Le SaaS peut parallèlement proposer des catalogues globaux.

Un catalogue Workspace est disponible pour plusieurs Dossiers du même Workspace ; il n'est pas copié par Dossier.

### Données Dossier

Toujours strictement locales :

- Tarif négocié ;
- Prix facturé ;
- Référence favorite ;
- historique commercial Dossier.

Un prix du Dossier A n'est jamais fallback du Dossier B.

### Owner

~~~text
Workspace Owner
→ toutes les permissions métier M-003 de son Workspace
→ tous les Dossiers
→ sans cumul artificiel de rôles métier
~~~

L'Owner reste soumis aux capabilities et n'obtient aucune autorité Application Global.

### Fournisseur

- `GLOBAL_SHARED | WORKSPACE_PRIVATE` ;
- nom obligatoire ;
- code fournisseur / raison sociale / site web facultatifs ;
- `ACTIVE | ARCHIVED`.

### Article fournisseur

~~~text
Fournisseur + référence fournisseur
→ identité baseline
~~~

- référence absente : pas de création automatique ;
- lifecycle `ACTIVE | ARCHIVED` ;
- remplacement possible via `replacedBy`.

### Catalogues

- plusieurs éditions historiques ;
- `GLOBAL_SHARED | WORKSPACE_PRIVATE` ;
- nouvelle édition = nouvelle réalité ;
- réimport même édition = réconciliation sans doublon ;
- formats V1 : CSV/XLS/XLSX ;
- PDF libre/OCR différés.

### Conditionnement

Structuré pour permettre la normalisation lorsque les données sont fiables.

Aucune donnée manquante n'est inventée.

### Prix

Tarif fournisseur :

~~~text
Article × édition
~~~

Tarif négocié :

~~~text
Dossier × Article × période
~~~

Prix facturé :

~~~text
Dossier × Article × date facture
~~~

Fraîcheur baseline du Prix facturé :

~~~text
12 mois calendaires depuis invoiceDate
~~~

Baseline Tarif négocié :

~~~text
même Dossier + même Article
→ périodes actives chevauchantes refusées
~~~

### Prix applicable

~~~text
Mode Tarif fournisseur
→ Tarif fournisseur

Mode Tarif négocié
→ Tarif négocié Dossier
→ sinon Tarif fournisseur

Mode Prix facturé
→ Prix facturé VALIDATED et frais du Dossier
→ sinon Tarif négocié Dossier
→ sinon Tarif fournisseur
~~~

Backend seule autorité.

Jamais de fallback inter-Dossier.

### Références favorites

~~~text
Dossier × Article fournisseur
~~~

Le prix n'est pas stocké dans le favori.

Baseline initiale : mode manuel. Aucun seuil de fréquence arbitraire ne doit bloquer le début de M-003.

### Capability

L'import d'un catalogue `WORKSPACE_PRIVATE` est une capability métier dédiée et payante dans la baseline V1.

RBAC et capability restent distincts.

## 7. Baseline V1 révisable

Peuvent évoluer après tests métier réels :

- champs Fournisseur facultatifs ;
- UX ;
- workflow de rapprochement ;
- replacedBy ;
- durée standard de fraîcheur ;
- ergonomie des périodes ;
- capabilities commerciales ;
- filtres ;
- seuil de fréquence ;
- modes suggestion/automatique ;
- nouveaux conditionnements rencontrés.

Ces ajustements ne doivent pas être considérés comme des blocages avant l'implémentation.

En revanche, ne pas contourner les invariants de tenancy, isolation Dossier, sécurité et historisation.

## 8. Travail à réaliser dans la prochaine conversation

Avant toute modification importante :

1. relire KB-START-HERE ;
2. vérifier GitHub réel et la branche M-003 ;
3. relire `docs/m003/M-003-FINAL-CONTRACT.md` ;
4. vérifier `core-origin.json` ;
5. vérifier la Core Gate et les scripts réellement exécutés ;
6. inspecter l'architecture M-001/M-002 existante afin de réutiliser les patterns produit et les points d'extension Core.

Puis implémenter M-003 par lot cohérent.

Ordre prévu :

~~~text
1. constantes / registres
2. permissions / capabilities
3. modèles + indexes
4. migrations
5. services métier
6. validations Zod
7. controllers/routes
8. tests backend
9. frontend Workspace
10. administration globale nécessaire
11. tests frontend
12. E2E critiques
13. tests métier sur catalogues/cas réels
14. corrections justifiées
15. release:check / Core Gate
16. validation visuelle par le porteur produit
17. une PR M-003
18. merge
19. documentation de clôture
~~~

## 9. Discipline d'implémentation

- un bloc M-003 cohérent ;
- pas de micro-PR pour chaque sous-partie ;
- ne pas modifier directement `main` ;
- ne pas créer une primitive Core parallèle ;
- ne pas faire de logique métier lourde dans routes/controllers ;
- ownership explicite sur chaque donnée ;
- backend autorité sur tenancy, prix, résolution et validations ;
- tests métier propres à M-003, les tests Core ne les remplacent pas ;
- les tests réels du porteur produit peuvent conduire à optimiser les baselines V1 avant la PR finale.

## 10. Validation utilisateur

Le porteur produit souhaite effectuer des tests visuels/réels depuis son clone local.

Quand un état suffisamment complet et cohérent du frontend est disponible pour une validation visuelle, indiquer explicitement quand effectuer le pull et lancer l'application.

Ne pas demander au porteur produit de relancer périodiquement des tests ou Core Gates : il signalera lui-même leurs résultats lorsque son intervention est nécessaire.

## 11. Interdiction immédiate

Ne pas démarrer M-004.

Ne pas modifier les contrats M-002 gelés sauf incompatibilité démontrée.

Ne pas créer de modèle M-003 en dehors de la branche M-003 préparée.

Le prochain travail est l'implémentation M-003 à partir du contrat validé.
