# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-10-01  
**Lot courant :** stabilisation M-004 — création, quantité produite et calcul économique automatique  
**Branche :** `feature/m004-valuation-ux-stabilization`  
**Base :** `main@957438c8f522b9e342158a17a7a4a6aa4bd7d3a2`  
**PR :** aucune — QA visuelle utilisateur requise avant finalisation

## 1. Autorité

~~~text
Git/code/DB
→ tests et Core Gates réellement exécutés
→ contrats M-001/M-002/M-003/M-004
→ Core réellement intégré
→ dette active
→ présente reprise
~~~

## 2. Stabilisation M-004 en cours

Le lot corrige le parcours observé avant les exports, sans évolution Core.

Décisions actives :

~~~text
Dossier
→ nom + marge cible par défaut obligatoires à la création

Nouvelle Fiche
→ nom
→ quantité produite
→ unité de production
→ TVA
→ marge cible lue depuis le réglage M-004 courant du Dossier lorsqu'elle existe
→ affichage explicite « Marge du Dossier »
→ sinon marge saisie pour la Fiche en création sans modifier le Dossier
→ l'explication de consommation de capacité est portée par une infobulle
→ ouverture du poste de travail seulement avec ces paramètres

Fiche
→ ancien champ Portions supprimé
→ quantité produite = dénominateur des résultats unitaires
→ composition modifiable uniquement avec paramètres complets
→ sauvegarde automatique du brouillon
→ recalcul économique automatique après sauvegarde
→ plus de bouton Valoriser / Revaloriser dans le parcours normal

Prix applicable
→ résolution M-003 inchangée
→ les Prix indicatifs Dossier / Workspace restent les fallbacks lorsque les sources commerciales ne sont pas exploitables
~~~

Le Prix conseillé, le Prix final et le plancher économique sont désormais calculés par unité produite. Les coûts matière, Économat et fabrication totaux restent disponibles pour expliquer le coût complet de la production.

Compatibilité legacy :

~~~text
migration:m004-production-quantity
→ reprend portions uniquement si productionQuantity est absente
→ supprime ensuite le champ portions des brouillons et snapshots historiques
→ ne remplace jamais une productionQuantity déjà existante
~~~

État de validation au moment de cette reprise :

~~~text
main de base                         : 957438c8f522b9e342158a17a7a4a6aa4bd7d3a2
Core Gate post-merge de cette base   : #167 SUCCESS
implémentation branche               : réalisée
tests automatisés de la branche      : NON EXÉCUTÉS / NON REVENDIQUÉS
QA visuelle utilisateur              : À FAIRE
PR / merge                           : NON CRÉÉS
~~~

La prochaine étape est volontairement la QA locale du parcours avant toute PR : création Dossier, création Fiche, ajout d'un Produit avec Prix indicatif, recalcul automatique, modification quantité/marge/TVA et contrôle du menu Actions.

---

## 3. BLOC A définitivement clôturé

Le BLOC A et son correctif de stabilité sont fusionnés et validés :

~~~text
PR #30
→ Core Gate PR #159 : success
→ merge 42f91e844974e2d0c6d374f2bb307077210b2614

PR #31
→ Core Gate PR #163 : success
→ merge 7c3ae1d4ae5a5600d95198bab0b890d88269d39f
→ Core Gate post-merge #164 : success
~~~

Provenance Core active :

~~~text
repository = greg44500/saas-core-api
version    = 1.2.1
tag        = v1.2.1
commit     = 6581e573c6a6885790b23fe502bd34d8199ea6ba
~~~

Le tag `v1.2.1` reste inchangé.

## 4. Objectif du BLOC B

Unifier dans la surface Platform les deux référentiels globaux déjà implémentés :

~~~text
avant
→ Référentiel Produits
→ Référentiel Fournisseurs

cible
→ section GMS
   → Gestion des référentiels

page
→ [ Produits | Fournisseurs ]
~~~

Ce bloc ne recrée ni M-002 ni M-003. Il compose leurs surfaces existantes.

## 5. Architecture retenue

Nouveau module frontend :

~~~text
frontend/src/features/reference-management/
├── components/reference-management-route.jsx
├── components/reference-management-route.test.jsx
├── reference-management.constants.js
├── reference-management-platform-navigation.js
└── reference-management-routes.js
~~~

Route Platform canonique :

~~~text
/platform/reference-management/:section?
~~~

Sections :

~~~text
products
suppliers
~~~

Les routes historiques restent conservées :

~~~text
/product-reference
/supplier-reference
~~~

Motif : elles restent utilisables par une autorité Application Global authentifiée même si elle n'appartient pas à la Platform. Le BLOC B ne réduit pas un contrat d'accès existant.

## 6. Autorisation

La navigation Platform utilise uniquement les permissions Application Global exposées dans le contexte Platform pour décider de la visibilité.

La page commune revalide ensuite l'accès avec les endpoints métier existants :

~~~text
/product-reference/access
/supplier-reference/access
~~~

Règles :

~~~text
product:reference:read seul
→ onglet Produits uniquement

supplier:reference:read seul
→ onglet Fournisseurs uniquement

les deux
→ deux onglets

aucun
→ aucune entrée Platform
→ route métier commune refusée / retour Workspaces
~~~

Les permissions `*:manage` pilotent uniquement les actions de gestion dans les pages existantes.

Un rôle Platform, y compris élevé, n'accorde aucun droit métier implicite.

## 7. Navigation Core utilisée

Le BLOC B consomme la primitive Core post-`v1.2.1` :

~~~text
type: 'section'
~~~

Le renderer Core n'est pas modifié.

La composition Produit fournit :

~~~text
section : GMS
item    : Gestion des référentiels
route   : /platform/reference-management
~~~

Les anciens descriptors Platform séparés Produits/Fournisseurs sont retirés de la composition afin d'éviter deux chemins de navigation concurrents.

## 8. Centre d'aide métier

Le moteur d'aide reste celui du Core générique. Seule la composition métier du produit est adaptée au BLOC B.

Avant le BLOC B, la surface Platform exposait deux catégories distinctes :

~~~text
Référentiel Produits
Référentiel Fournisseurs
~~~

Elles sont désormais regroupées sous une catégorie Produit unique :

~~~text
Gestion des référentiels
→ Consulter le référentiel Produits
→ Gouverner les contributions Produit
→ Consulter le référentiel Fournisseurs
→ Gérer le référentiel Fournisseurs
~~~

Implémentation :

~~~text
backend/modules/referenceManagement/referenceManagementHelp.registry.js
→ catégorie Platform partagée

productCatalogHelp.registry.js
supplierCatalogHelp.registry.js
→ fiches métier rattachées à cette catégorie
~~~

Les parcours d'aide suivent maintenant l'interface réelle :

~~~text
Platform
→ GMS
→ Gestion des référentiels
→ Produits ou Fournisseurs
~~~

Les catégories Workspace restent séparées :

~~~text
Produits
Fournisseurs & prix
~~~

Le filtrage serveur par permissions Application Global est conservé. Un utilisateur ne voit donc dans la catégorie commune que les fiches correspondant réellement à ses droits métier.

## 9. Validation finale

État du BLOC B avant PR :

~~~text
implémentation frontend : réalisée
aide métier Platform    : alignée
tests ajoutés / adaptés : réalisés
QA visuelle utilisateur : validée le 2026-10-01
~~~

Scénarios couverts par le lot :

1. Produits seul ;
2. Fournisseurs seul ;
3. Produits + Fournisseurs ;
4. aucun droit Application Global ;
5. administrateur Platform sans droit métier ;
6. route racine redirigée vers le premier onglet autorisé ;
7. tentative d'accès à un onglet non autorisé redirigée vers l'onglet autorisé ;
8. anciennes routes globales toujours fonctionnelles ;
9. Help Center Platform : une seule catégorie Gestion des référentiels, avec uniquement les fiches autorisées.

La validation automatisée finale est portée par la **Core Gate de la PR**. Le workflow canonique installe ses dépendances d'infrastructure puis exécute :

~~~text
npm run release:check
~~~

Cette commande couvre `release:verify`, lint backend, tests backend, lint frontend, tests frontend, build frontend et E2E Playwright.

Aucun résultat vert n'est présumé avant le résultat réel de cette Core Gate.

## 9. Séquence de sortie

~~~text
QA visuelle utilisateur : validée
→ PR unique BLOC B
→ Core Gate PR = npm run release:check
→ merge si verte
→ Core Gate post-merge
→ clôture BLOC B
~~~

Ne pas ouvrir de second lot fonctionnel avant cette clôture.