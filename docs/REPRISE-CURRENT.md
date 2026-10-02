# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-10-02  
**Lot courant :** finalisation M-004 — stabilisation UX/UI du poste de travail de valorisation  
**Branche :** `feature/m004-valuation-ux-stabilization`  
**Base :** `main@514462ace3de29fe9f858de53405e9cd8b901275`  
**PR :** à ouvrir — QA visuelle utilisateur validée le 2026-10-02

## 1. Autorité

~~~text
Git/code/DB
→ tests et Core Gates réellement exécutés
→ contrats M-001/M-002/M-003/M-004
→ Core réellement intégré
→ dette active
→ présente reprise
~~~

## 2. Stabilisation M-004 finalisée avant PR

Le lot corrige le parcours observé avant les exports. Les primitives génériques nécessaires ont été intégrées depuis le Core v1.2.1 actif ; les ajustements restants sont strictement métier/UX produit.

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
→ ancien champ ambigu Portions reste supprimé
→ productionQuantity = nombre de pièces fabriquées
→ productionUnit = UNIT, présenté « Pièce »
→ portionsPerProductionUnit = portions contenues dans une pièce
→ totalPortions = productionQuantity × portionsPerProductionUnit
→ base de vente = PIECE | PORTION
→ CM/Pce et CF/Pce divisés par productionQuantity
→ CMU et CFU divisés par totalPortions
→ titre, badges utiles, autosave et panneau de contrôle alignés sur la même ligne du header sticky
→ le badge positif « Valorisée » est masqué ; seuls les états de valorisation nécessitant une attention restent visibles
→ bouton retour aligné devant le titre avec le libellé « Retour vers Dossiers »
→ actions Modifier / Analyse / Infos dossier intégrées au panneau de contrôle stable
→ paramètres séparés en groupes compacts Production / Produits / Vente
→ scope Favoris / Tous les produits rendu avec le SegmentedControl Core
→ TVA métier limitée à 5,5 % ou 10 %, défaut 5,5 %, valeurs exposées par metadata backend
→ six garde-fous économiques visibles : CF HT, CMU HT, CFU HT, Prix retenu TTC, %MR, Écart € vs cible
→ %MR vert au-dessus de la marge cible, rouge en dessous, neutre à l'équilibre ; tooltip explicitant MR = Marge réelle
→ Écart € vs cible = écart HT cumulé sur la production, fourni par le snapshot backend
→ Prix retenu TTC compacté pour préserver la densité du cockpit
→ header du tableau Composition sticky sous le cockpit, avec offset mesuré dynamiquement
→ analyse enrichie par la Marge sur coût de fabrication HT, par unité de vente et sur la production
→ écart à la marge cible conservé en points et en euros dans le drawer Analyse
→ le plancher économique devient un seuil de diagnostic et n'interdit plus d'observer une marge négative
→ drawer Analyse de gestion : Synthèse | Coûts | Prix & marge | Historique
→ drawer Infos dossier : Identité | Prix applicable
→ nom / description modifiés dans un dialogue compact distinct
→ commentaire de validation saisi dans le dialogue de validation
→ composition modifiable uniquement avec paramètres complets
→ unité de ligne imposée par ProductVariant.referenceUnit
→ aucun sélecteur d'unité dans une ligne
→ remplacement Produit : conversion automatique si unités compatibles, avertissement si dimension différente
→ remplacement inline avec action « Annuler » distincte de la croix d'effacement de recherche
→ suppression destructive réservée à la ligne entière
→ sauvegarde automatique du brouillon
→ recalcul économique automatique après sauvegarde
→ plus de bouton Valoriser / Revaloriser dans le parcours normal

Prix applicable
→ résolution M-003 inchangée
→ les Prix indicatifs Dossier / Workspace restent les fallbacks lorsque les sources commerciales ne sont pas exploitables
~~~

Le Prix de vente calculé, le Prix conseillé, le Prix retenu et le plancher économique sont calculés selon la base de vente choisie : pièce ou portion. Les coûts matière, Économat et fabrication totaux restent disponibles pour expliquer le coût complet de la production.

Sécurité : `sanitizeFilter` reste activé globalement et les filtres Mongoose du module M-004 sont explicitement approuvés avec `mongoose.trusted(...)`. Les listes métier utilisées par le frontend proviennent des metadata backend.

Dépendances Core issues de la QA UX : intégrées.

- `SegmentedControl` est consommé depuis la primitive Core ;
- la variante sémantique `warning` du bouton est consommée depuis le Core ;
- `WorkspaceQuickAccess` reste fourni par le shell Core et filtré selon les permissions/features effectives ;
- aucune duplication produit de ces primitives génériques n'est conservée.

Compatibilité legacy :

~~~text
migration:m004-production-quantity
→ reprend portions uniquement si productionQuantity est absente
→ supprime ensuite le champ portions des brouillons et snapshots historiques
→ ne remplace jamais une productionQuantity déjà existante
~~~

État de validation au moment de cette reprise :

~~~text
main de base                         : 514462ace3de29fe9f858de53405e9cd8b901275
Core actif                           : v1.2.1 @ 054ecd5bff1f3e61e7e1871700fae05bcdc0bdd3
implémentation branche               : stabilisation Pièce/Portion + cockpit sticky + analyse économique + QA UX/UI
dernier commit métier avant docs     : 5a9da267fe41a3ff7605cf30b35af6a0f198f8aa
tests automatisés ajoutés / adaptés  : OUI (backend, frontend et E2E M-004)
tests automatisés exécutés           : NON EXÉCUTÉS / NON REVENDIQUÉS
raison                               : validation finale portée par la Core Gate de la PR (`npm run release:check`)
QA visuelle utilisateur              : VALIDÉE le 2026-10-02
PR / merge                           : PR à ouvrir ; merge en attente de Core Gate
~~~

La prochaine étape est l'ouverture de la PR unique M-004, puis l'attente de la Core Gate avant merge. Après validation GitHub et merge, une nouvelle amorce de reprise doit être générée avant d'ouvrir le lot suivant.

Contrôles visuels validés :

~~~text
création Fiche
→ Unité de production = Pièce depuis metadata backend
→ Portions / pièce = 1 par défaut
→ Base de vente = Pièce par défaut

poste de travail
→ header compact avec Retour au Dossier, Modifier, Analyse, Infos dossier et actions globales
→ modification Quantité produite / Portions par pièce
→ Total portions affiché depuis la réponse backend
→ bascule Base de vente Pièce ↔ Portion
→ CMU HT / CFU HT distincts du coût par pièce
→ garde-fous visibles sans dashboard lourd
→ valeurs indisponibles affichées NC, jamais 0 inventé
→ changement de calcul : valeurs précédentes conservées pendant « Actualisation… »

Analyse
→ Synthèse : CF HT, CFU HT, Prix retenu TTC, marge réelle, production, structure Matières/Économat, cible vs réelle
→ Coûts : CM, CE, CF, coûts par pièce et par portion
→ Prix & marge : Prix de vente calculé HT/TTC, conseillé, retenu, plancher, marges
→ Historique : validations et commentaires

Infos dossier
→ identité magasin
→ marge cible par défaut
→ vérification du Prix applicable M-003

composition
→ sections et sources de prix alimentées par metadata backend
→ scopes Tous les produits / Favoris alimentés par metadata Produit
→ ajout/remplacement Produit et conversion d'unité inchangés
→ Prix indicatif Dossier / Workspace toujours exploitable
→ menu Actions et sourcing inchangés

legacy
→ aucune ancienne unité physique n'est convertie implicitement en Pièce
~~~

Le scénario Playwright M-004 a été adapté au nouveau formulaire, mais il n'a pas été exécuté dans cette session.

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
commit     = 054ecd5bff1f3e61e7e1871700fae05bcdc0bdd3
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