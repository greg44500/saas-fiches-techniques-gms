# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-30  
**Lot précédent clôturé :** M-002 → M-004 hors exports — PR #25  
**Lot courant :** intégration Core post-tag v1.2.1 — shell Workspace / navigation / Help Center  
**Branche :** `core-update/post-v1.2.1-a9d99aa`  
**Base :** `main@588612ba987c4a91951d4939231f9f44881c50d8`

## 1. Autorité

~~~text
Git/code/DB
→ tests et Core Gates réellement exécutés
→ contrats M-001/M-002/M-003/M-004
→ Core réellement intégré
→ dette active
→ présente reprise
~~~

## 2. État produit validé avant l’upgrade

Le lot M-002 à M-004 est fusionné et validé :

~~~text
PR #25
Core Gate PR #145 : success
merge : 588612ba987c4a91951d4939231f9f44881c50d8
Core Gate post-merge #146 : success
lint / tests globaux / build : verts localement
E2E Playwright : 22/22 verts
~~~

M-001, M-002, M-003 et M-004 hors exports ne doivent pas être réimplémentés dans une future reprise.

## 3. Core intégré par ce lot

~~~text
repository = greg44500/saas-core-api
version    = 1.2.1
tag        = v1.2.1
commit     = a9d99aa6307a6e7adf884e949cebc4059549824e
~~~

Ce commit est postérieur au tag v1.2.1 et correspond aux PR Core #45/#46.

Décision :

- aucune nouvelle version Core ;
- aucun nouveau tag ;
- aucune GitHub Release ;
- aucune migration DB nouvelle pour ce lot ;
- provenance enregistrée par SHA exact.

## 4. Adaptations incluses dans l’intégration

### Workspace

- fonctions métier déclarées par le produit avant la navigation Core ;
- séparateur « Administration de l’espace » ;
- navigation Core plate : Tableau de bord, Fichiers, Membres, Rôles et permissions, Paramètres, Abonnement, Activité ;
- groupes repliables avec animation fluide et respect de reduced motion ;
- badge statut Workspace dans la topbar ;
- rôle Workspace et plan effectif dans l’identité utilisateur selon les droits ;
- suppression des widgets Dashboard redondants Statut du workspace / Votre rôle ;
- suppression de la recherche globale Workspace.

Les recherches restent locales aux pages métier concernées.

### Platform

- navigation Core conservée ;
- séparateur visuel avant les modules applicatifs ;
- modules globaux Produits/Fournisseurs conservés selon leurs permissions Application Global ;
- accès rapide Platform construit uniquement depuis les destinations autorisées.

Il ne s’agit pas d’une recherche plein texte dans les données.

### Help Center

Le Core et le produit partagent une seule expérience d’aide.

Modules métier composés : Dossiers, Produits, Fournisseurs & prix, Fiches techniques, Référentiel Produits Platform et Référentiel Fournisseurs Platform.

Les permissions Workspace, Platform et Application Global restent strictement séparées.

## 5. État fonctionnel à ne pas rouvrir

### M-002

- gouvernance non bloquante ;
- `PROVISIONAL` utilisable immédiatement dans le Workspace contributeur ;
- isolation inter-Workspace ;
- revue/fusion/rejet Application Global ;
- snapshots `TechnicalSheetValidation` immuables ;
- seed actif actuel : `m002-reference.v6`.

### M-003

- Fournisseur / Article / Catalogue / Prix distincts ;
- imports CSV/XLS/XLSX ;
- catalogues Workspace privés et catalogues globaux partagés ;
- prix Dossier strictement isolés ;
- Prix applicable résolu par le backend ;
- Prix indicatif Dossier puis Workspace comme dernier recours.

### M-004

- Fiche durable + brouillon courant + validation courante + historique immuable ;
- valorisation M-002/M-003 ;
- copie inter-Dossier sans finance source ;
- quota `technical_sheets` ;
- corbeille, restauration et purge ;
- exports V1 toujours séparés.

## 6. Prochaines étapes produit après validation de l’upgrade

### Priorité A — UX/UI Platform : Gestion des référentiels

Créer un lot produit séparé, sans rouvrir M-002/M-003 :

~~~text
sidebar Platform existante
→ séparateur simple pour la gestion des référentiels
→ entrée unique « Gestion des référentiels »
→ vue à onglets
   - Produits
   - Fournisseurs
~~~

La visibilité doit utiliser les permissions Application Global effectives et les guards existants.

Pour Produits, réutiliser les surfaces/API déjà livrées : Référentiel, Contributions, Catégories, Produits, Variétés, Caractéristiques et Références/Variantes.

Types de caractéristiques déjà supportés : Présentation, Pièce / découpe, Type commercial, Calibre / format, Couleur, Désignation de qualité.

Pour Fournisseurs, réutiliser le référentiel global M-003 existant.

Ne pas créer un deuxième système de gouvernance ni dupliquer les pages existantes : la prochaine tâche est une recomposition UX.

### Priorité B — enrichissement du référentiel initial

État actuel vérifié de `m002-reference.v6.json` :

~~~text
14 catégories
264 Produits
264 Variantes
0 Variété
0 Caractéristique
~~~

Créer ultérieurement une nouvelle version de dataset, par exemple `m002-reference.v7.json`, au lieu de modifier v6.

Objectif : offrir dès la première mise à disposition un référentiel global nettement plus riche, incluant selon les Produits des variétés, présentations, découpes, calibres/formats, couleurs et autres valeurs validées.

Le mécanisme de seed est versionné/hashé : une version déjà enregistrée ne doit jamais être réécrite silencieusement.

### Priorité C — validation visuelle du nouveau shell

Après fusion de l’upgrade Core, vérifier avec `npm run dev` :

Workspace : métier avant Administration de l’espace, séparateur discret, animation smooth, badge statut, rôle/plan dans l’identité, aucune carte statut/rôle et aucune recherche globale.

Platform : navigation Core inchangée, séparateur avant les entrées applicatives, accès rapide fonctionnel et aucune permission globale héritée implicitement du rôle Platform.

Help : aide Core + métier dans le même centre et aucune fuite de fiche non autorisée.

## 7. Lots explicitement séparés

- exports/diffusion M-004 : CSV, XLSX, PDF, impression, e-mail ;
- enrichissement massif du seed M-002 ;
- dette Core DataTable `GMS-CORE-UX-001` sur le survol canonique des lignes ;
- sujets production : billing, observabilité, stockage production, conformité.

## 8. Discipline de reprise

~~~text
un lot cohérent
→ une branche
→ tests
→ une PR
→ une Core Gate
→ un merge
~~~

Ne pas créer de micro-PR de correction. Ne pas relancer périodiquement les Core Gates : l’utilisateur communique leur résultat.

La prochaine conversation doit d’abord vérifier GitHub réel et l’état de l’intégration Core avant de commencer la vue Platform « Gestion des référentiels ».
