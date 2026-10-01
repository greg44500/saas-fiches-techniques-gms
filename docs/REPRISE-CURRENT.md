# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-10-01  
**Lot précédent clôturé :** intégration Core post-tag v1.2.1 + stabilisation autosave M-004 — PR #26/#27  
**Lot courant :** Platform — Gestion des référentiels Produits / Fournisseurs  
**Branche :** `feature/platform-reference-management`  
**Base :** `main@70da4bb1b9c055ee977f685d7de2e326761a75a2`

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
commit     = d3b9891bc2a32705a0a99b2ed62bed60caf653ca
~~~

Ce commit est postérieur au tag v1.2.1 et correspond aux PR Core #45/#46/#47. La Core Gate post-merge Core #90 est verte sur ce SHA.

Décision :

- aucune nouvelle version Core ;
- aucun nouveau tag ;
- aucune GitHub Release ;
- aucune migration DB nouvelle pour ce lot ;
- provenance enregistrée par SHA exact.

## 4. Adaptations incluses dans l’intégration

### Workspace

- Tableau de bord Core conservé comme première entrée car il compose les widgets Core et métier ;
- Dossiers, Produits et Fournisseurs immédiatement après, sans titre ni espace artificiel ;
- séparateur « Administration de l’espace » après les modules métier ;
- Membres, Rôles et permissions, Paramètres, Abonnement et Activité conservés sous cette séparation ;
- entrée `Fichiers` masquée uniquement dans la navigation de ce produit ; les primitives File Core restent présentes ;
- groupes repliables avec animation fluide et respect de reduced motion ;
- badge statut regroupé avec le nom du Workspace sous la forme `Nom | statut` ;
- rôle Workspace et plan effectif dans l’identité utilisateur selon les droits ;
- widgets Dashboard Core et widgets métier toujours composés ensemble ;
- suppression de la recherche globale Workspace.

Les recherches restent locales aux pages métier concernées.

La vue Abonnement reçoit désormais les métadonnées de présentation du registre actif afin d’afficher les libellés français des capabilities/métriques métier au lieu de leurs clés techniques.

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

## 6. Lot courant — Platform : Gestion des référentiels

L'audit du 2026-10-01 confirme qu'aucune nouvelle primitive Core n'est nécessaire. Le Core intégré au SHA `d3b9891...` sait déjà composer une entrée applicative, appliquer le séparateur Platform et filtrer sa visibilité depuis les permissions Application Global.

Le lot reste donc strictement produit :

~~~text
sidebar Platform existante
→ séparateur Core existant
→ une entrée « Gestion des référentiels »
→ route authentifiée /reference-management/:section?
→ onglet Produits si product:reference:read
→ onglet Fournisseurs si supplier:reference:read
~~~

Les pages `ProductReferencePage` et `SupplierReferencePage`, leurs APIs et leurs guards backend sont réutilisés. Aucun endpoint, modèle MongoDB, registre de permission ou système de gouvernance supplémentaire n'est introduit.

Comportement d'autorisation attendu :

~~~text
Produits uniquement     → onglet Produits
Fournisseurs uniquement → onglet Fournisseurs
les deux                → les deux onglets
aucun                   → accès refusé
URL d’un onglet refusé  → redirection vers le premier onglet autorisé
~~~

Les anciennes routes autonomes restent disponibles pendant ce lot pour compatibilité, mais ne sont plus exposées dans la navigation Platform.

### Priorité suivante — enrichissement du référentiel initial

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

### Validation visuelle du shell déjà intégré

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


## 9. Validation du lot courant

Avant merge :

~~~text
tests ciblés frontend
→ lint / tests globaux applicables
→ build
→ E2E si la gate canonique les exécute
→ Core Gate PR verte
→ validation utilisateur
~~~

Aucun merge ne doit être effectué tant que les tests/gates requis ne sont pas verts. L'utilisateur communique lui-même le résultat des Core Gates ; ne pas les relancer ni les sonder périodiquement.

Après merge validé, reprendre la priorité suivante de la roadmap sans modifier `core-origin.json`, car ce lot n'intègre aucun nouveau commit Core.
