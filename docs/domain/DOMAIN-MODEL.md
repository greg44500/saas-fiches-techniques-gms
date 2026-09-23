# SAAS-FICHES-TECHNIQUES-GMS — Modèle de domaine

**Statut :** VALIDÉ — modèle conceptuel transversal approuvé avant M-001  
**Dernière mise à jour :** 2026-09-23  
**Important :** ce document décrit des concepts métier et leurs relations. Il ne constitue pas un schéma Mongoose.

---

## 1. Objectif

Décrire les concepts nécessaires au produit avant toute implémentation afin de :

- préserver la frontière Core / métier ;
- éviter la duplication des données ;
- garantir la fiabilité des calculs ;
- permettre l'historisation ;
- rendre possibles les extensions futures sans imposer leur développement immédiat.

---

## 2. Vue d'ensemble

```text
SaaS
│
├── Référentiel Produit canonique partagé
│   ├── identité Produit unique
│   ├── alias / normalisation de recherche
│   └── déclinaisons structurées lorsque pertinentes
│       ├── forme
│       ├── état / transformation
│       └── conservation
│
└── Workspace
    │
    ├── Référentiel Produit Workspace
    │   └── références vers les Produits canoniques utilisés
    │
    ├── Fournisseurs
    │
    ├── Articles / offres fournisseur
    │   ├── Produit / déclinaison concerné
    │   ├── Référence fournisseur
    │   ├── Conditionnement
    │   ├── Poids net / égoutté si applicable
    │   └── Conditions commerciales par magasin
    │       ├── Prix
    │       ├── Disponibilité
    │       ├── Date d'effet
    │       └── Historique
    │
    ├── Dossiers magasin
    │   ├── Fiches techniques
    │   │   ├── Composition
    │   │   ├── Valorisations
    │   │   ├── Emballages / économat
    │   │   └── Historique
    │   │
    │   └── Fiches process
    │
    └── Audit / traçabilité
```

---

## 3. Workspace

Le Workspace est la frontière de tenancy héritée du Core.

Invariant de tenancy :

```text
donnée métier privée d'un client
→ ownership Workspace explicite

donnée de référence canonique partagée
→ portée SaaS explicite
→ aucune donnée commerciale ou confidentielle tenant
```

Les ressources métier appartenant au Workspace doivent utiliser l'ownership explicite prévu par le Core.

Le référentiel Produit canonique constitue une donnée de référence commune au SaaS et non la propriété d'un Workspace. Un Workspace ne copie pas le Produit : il référence les identités canoniques qu'il utilise via son référentiel Produit Workspace.

`createdBy` / `updatedBy` servent à l'audit et ne remplacent jamais l'ownership ou la portée explicite de la ressource.

---


## 4. Dossier / magasin

Le dossier fournit le contexte métier durable d'un magasin.

Relations :

```text
Workspace
1
→ plusieurs Dossiers

Dossier
→ exactement 1 magasin en V1
```

Le dossier contextualise notamment :

- conditions commerciales ;
- références favorites / fréquentes ;
- Fiches techniques ;
- Fiches process ;
- membres autorisés ;
- coordonnées et responsable métier ;
- état opérationnel.

Données conceptuelles identifiées :

```text
nom                                 obligatoire en saisie métier
enseigne                            facultative
adresse                             facultative
code postal                         facultatif
ville                               facultative
identifiant géographique normalisé  facultatif
email documents                     facultatif
téléphone                            facultatif
responsable / interlocuteur          facultatif
status                               système / lifecycle
audit création / modification        système
```

Le responsable métier n'est pas `createdBy`.

Les coordonnées nominatives éventuelles doivent rester minimisées et protégées par les contrôles d'accès. Elles ne deviennent obligatoires que lorsqu'une fonctionnalité qui en dépend l'exige explicitement.

Les informations opérationnelles sont modifiables sans changer l'identité du dossier ni réécrire ses historiques.

La localisation doit pouvoir être assistée par autocomplétion à partir d'une source publique fiable. Le fournisseur technique exact sera fixé lors du cadrage du module.

### 4.1 Isolation du contexte magasin

Un utilisateur peut disposer d'un accès à plusieurs magasins, mais une opération métier sur une Fiche technique s'exécute toujours dans un **contexte magasin unique**.

Invariant :

```text
accès multi-magasins
≠
mélange des données entre magasins
```

Toutes les données commerciales contextualisées utilisées pour valoriser une fiche doivent appartenir au même magasin que la fiche.

Un Tarif négocié ou Prix facturé d'un autre magasin ne peut jamais être utilisé comme fallback.

Le backend doit imposer cette isolation indépendamment de l'état du frontend.

### 4.2 Cycle de vie du dossier

États :

```text
ACTIVE
PAUSED
ARCHIVED
DELETED
```

`PAUSED` suspend le travail opérationnel sans détruire les affectations.

`ARCHIVED` sort le dossier de l'usage courant tout en conservant l'historique et une consultation contrôlée.

`DELETED` est une suppression logique forte : le contexte devient inaccessible dans les flux métier normaux et tous les `DossierAccessGrant ACTIVE` sont révoqués dans la même transaction. Les données enfants conservent leur état historique réel.

Une Fiche technique VALIDATED d'un dossier supprimé reste historiquement VALIDATED ; elle devient inaccessible parce que son conteneur est supprimé.

La restauration d'un dossier supprimé revient vers `PAUSED` afin d'imposer une vérification avant remise en production. Elle ne restaure aucun ancien grant révoqué.

La purge définitive reste une opération séparée, auditée et soumise à la politique de rétention.

### 4.3 Accès au dossier

Le Role Workspace et le périmètre dossier sont orthogonaux.

```text
Role
→ ce que le membre peut faire

Affectation dossier
→ où il peut le faire
```

Après acceptation d'une invitation Core et création du WorkspaceMember, le Workspace Owner affecte les dossiers/magasins autorisés.

Un membre peut avoir zéro, un ou plusieurs dossiers.

Le Workspace Owner possède implicitement tous les dossiers du Workspace et ne dépend pas d'une ligne d'affectation par magasin.

La persistance des affectations utilise une relation métier dédiée de type conceptuel `DossierAccessGrant`, sans modifier le modèle `WorkspaceMember` Core.

Invariants du `DossierAccessGrant` :

```text
grant.workspace = dossier.workspace = workspaceMember.workspace

1 WorkspaceMember + 1 Dossier
→ 1 affectation courante

Workspace Owner
→ accès implicite à tous les Dossiers
→ aucun grant individuel requis

révocation
→ accès coupé immédiatement
→ traçabilité conservée
```

L'autorisation effective d'une ressource magasin combine :

```text
membership actif
+ permission du Role
+ affectation dossier
+ état du dossier / ressource
+ capability éventuelle
+ invariants métier
```

### 4.4 Consultation, édition et espace de travail

Le drawer d'un dossier est une surface de consultation / navigation / administration légère. Son ouverture ne modifie jamais le contexte magasin actif.

En M-001, il expose les informations générales, les accès, l'activité métier et les actions lifecycle autorisées.

La création et la modification des informations générales sont réalisées dans un Dialog métier basé sur les primitives de Dialog déjà fournies par le Core frontend. Le formulaire Dossier est réutilisable entre création et édition.

L'action « Ouvrir le dossier » navigue vers la vraie page métier :

```text
/workspaces/:workspaceId/dossiers/:dossierId
```

Seul un Dossier ACTIVE peut devenir un espace de travail opérationnel.

```text
ACTIVE
→ drawer + page de travail

PAUSED
→ drawer / administration
→ pas de page de travail opérationnelle

ARCHIVED
→ consultation historique contrôlée
→ pas de page de travail opérationnelle

DELETED
→ administration/restauration contrôlée
→ pas de page de travail opérationnelle
```

La page Dossier est destinée à accueillir progressivement les modules métier contextualisés : vue d'ensemble, Fiches techniques, Produits/références magasin, Process et extensions futures.

Le contexte est exprimé par `workspaceId + dossierId` dans l'URL. Aucun état frontend persistant ne constitue une preuve d'autorisation.

Depuis un dossier ouvert, le Dashboard Workspace doit rester accessible en un clic.

## 4.5 Activité métier

Le produit possède une primitive transversale `BusinessActivityEvent`, distincte de l'`AuditLog` Core.

Elle trace les faits métier effectivement réalisés dans le Workspace et, lorsque pertinent, dans un Dossier.

Pour M-001 :

```text
DOSSIER_CREATED
DOSSIER_UPDATED
DOSSIER_STATUS_CHANGED
DOSSIER_ACCESS_GRANTED
DOSSIER_ACCESS_REVOKED
```

Les événements sont immuables, portent des metadata minimales construites par le backend et sont écrits dans la même transaction que la mutation métier correspondante.

La lecture respecte à la fois les permissions Workspace et le scope Dossier ; une activité d'affectation exige notamment l'autorité `dossier:access:read`.

---

## 5. Produit

Le référentiel Produit M-002 est une donnée de référence globale du SaaS. Les identités génériques sont partagées entre Workspaces ; les données commerciales restent hors de ce périmètre.

### 5.1 Modèle M-002 confirmé

```text
CanonicalProduct
→ identité racine globale
→ nom / alias / clés de recherche
→ catégorie
→ ACTIVE | ARCHIVED

ProductVariant
→ déclinaison globale d'un CanonicalProduct
→ presentation
→ foodRange
→ processingState dérivé/validé depuis foodRange
→ referenceUnit
→ yieldPercent
→ ACTIVE | ARCHIVED

WorkspaceProduct
→ ownership Workspace
→ référence une ProductVariant
→ matérialise Mon référentiel
→ ne copie pas l'identité Produit
```

`createdBy` et `updatedBy` restent de l'audit. `contributedFromWorkspace` conserve éventuellement l'origine historique d'une création sans devenir un ownership du Produit.

Les anciens champs `form`, `normalizedForm`, `preservation` et `normalizedPreservation` sont retirés du modèle opérationnel. Une migration les convertit ou les supprime de façon contrôlée.

### 5.2 Anti-doublon et création

Invariant :

```text
même réalité Produit canonique
→ une seule identité dans le SaaS
```

Avant création : normalisation, recherche exacte, alias, proximité, revue explicite des candidats puis création uniquement si aucun équivalent crédible n'est retenu.

Une création Workspace autorisée produit :

```text
CanonicalProduct ACTIVE
+ ProductVariant ACTIVE
+ WorkspaceProduct ACTIVE
```

Une création globale produit le `CanonicalProduct` et sa première `ProductVariant` sans `WorkspaceProduct`.

### 5.3 Catégories

`ProductCategory` est globale. Une catégorie `ACTIVE` est obligatoire pour créer une identité Produit `ACTIVE`.

### 5.4 Déclinaisons

Signature métier courante :

```text
canonicalProduct
+ normalized(presentation)
+ foodRange
+ normalized(processingState)
```

Le backend expose les six gammes et leurs états associés via les métadonnées :

```text
1 → Frais → Produit frais
2 → Conserves → Conserve
3 → Surgelés → Surgelé
4 → Sous-vide cru / épluchés → Sous-vide cru / épluché
5 → Sous-vide cuit → Sous-vide cuit
6 → PAI / PAE → PAI / PAE
```

Le frontend ne définit aucune liste métier parallèle. Le choix de Gamme alimente l'autocomplétion d'État / transformation ; le backend valide la combinaison.

Le rendement et l'unité restent des attributs de la déclinaison mais ne sont pas déduits de la Gamme.

Les listes Workspace et globales sont ordonnées par Produit alphabétiquement avant pagination.

### 5.5 Référentiel Produit Workspace

`WorkspaceProduct` est la relation tenant-scoped entre un Workspace et une `ProductVariant`.

```text
Workspace
1
→ plusieurs WorkspaceProduct
→ chacun référence une ProductVariant globale
```

Le retrait de Mon référentiel archive la relation d'usage sans supprimer le Produit global.

Un Dossier utilise le référentiel Produit de son Workspace ; M-002 ne crée pas de Produit Dossier-owned.

### 5.6 Lifecycle et historique

Lifecycle opérationnel :

```text
ACTIVE ↔ ARCHIVED
```

Les anciennes valeurs de développement `PENDING_REVIEW` et `REJECTED` sont traitées par la migration M-002 de compatibilité. Elles ne font plus partie du registre opérationnel courant.

`ProductReferenceEvent` conserve l'historique métier des créations, corrections, archives/réactivations et opérations de gouvernance nécessaires.

### 5.7 Autorité globale du référentiel

Le référentiel global n'appartient pas à l'administration Platform.

Autorité :

```text
ApplicationGlobalRole
ApplicationGlobalMember
product:reference:read
product:reference:manage
```

Invariant :

```text
Super Admin Platform
≠ gouverneur Produit automatique

Owner Workspace
≠ gouverneur Produit automatique
```

Un membre Platform peut alimenter le référentiel commun uniquement si un membership Application Global Produit lui attribue explicitement cette autorité.

### 5.8 Import Produit

M-002 possède deux usages du même pipeline Produit sécurisé :

```text
Workspace
→ import Produit générique
→ rattachement existant ou création contrôlée
→ nouvelles créations ajoutées au référentiel Workspace

Application Global
→ import Produit générique
→ alimentation directe du référentiel
→ aucun WorkspaceProduct créé
```

Les fichiers CSV/XLS/XLSX sont temporaires de traitement. Ils ne deviennent pas des documents métier persistants pour le seul import.

Les colonnes commerciales détectées — Fournisseur, référence fournisseur, conditionnement, prix — restent hors M-002 et préparent M-003.

### 5.9 Frontière M-003

M-002 ne porte jamais :

- Fournisseur ;
- identité/édition de catalogue fournisseur ;
- Article fournisseur ;
- référence fournisseur ;
- conditionnement commercial ;
- prix catalogue ;
- prix négocié ;
- prix facturé.

M-003 devra conserver explicitement l'origine commerciale d'un Article :

```text
Fournisseur
→ Catalogue / édition identifié
→ Article fournisseur
→ référence + désignation + conditionnement
→ rattachement à ProductVariant
→ tarifs
```

L'interface devra permettre de filtrer par Fournisseur puis de sélectionner un catalogue/une édition identifiée. Un import SYSCO, par exemple, doit conserver SYSCO comme Fournisseur du catalogue et ne doit jamais perdre cette provenance lors du rapprochement Produit.


## 6. Fournisseur

Un Fournisseur est un acteur commercial du Workspace pouvant proposer des Articles rattachés aux Produits canoniques utilisés par ce Workspace.

Le fournisseur ne doit pas être codé comme une liste fermée : les exemples Sysco et SCAL ne constituent pas les seuls fournisseurs possibles.

Le client doit pouvoir créer ses fournisseurs.

**À cadrer :**

- données minimales fournisseur ;
- archivage ;
- unicité ;
- gestion des doublons.

---

## 7. Article fournisseur

Le domaine sépare le Produit de sa représentation commerciale chez un Fournisseur.

Relations conceptuelles :

```text
Produit
1
→ 0..n Articles fournisseur

Fournisseur
1
→ 0..n Articles fournisseur
```

Règle validée :

> Un même Produit peut avoir plusieurs Articles fournisseur actifs chez un même Fournisseur.

Cela permet de représenter des références ou conditionnements différents sans dupliquer le Produit métier.

Un Article fournisseur peut porter :

- référence fournisseur ;
- désignation fournisseur originale ;
- marque éventuelle ;
- conditionnement structuré ;
- libellé fournisseur du conditionnement ;
- poids net ;
- poids net égoutté si applicable ;
- statut ;
- createdAt / updatedAt ;
- createdBy / updatedBy.

Le modèle doit aussi permettre qu'un même Produit soit proposé par plusieurs Fournisseurs.

**À valider avant implémentation :**

- règles exactes d'unicité ;
- lifecycle d'une référence remplacée.

La sélection opérationnelle n'est plus modélisée par un unique « Article privilégié » générique : le magasin dispose de Références favorites pouvant contenir plusieurs Articles d'un même Produit. Une éventuelle notion future de référence par défaut ne sera ajoutée que si un besoin distinct est démontré.

---

## 8. Conditionnement

Le conditionnement décrit la façon dont un Article fournisseur est acheté.

Le domaine doit stocker des données structurées suffisantes pour les calculs.

Exemples :

```text
type : carton
nombre d'unités : 4
quantité par unité : 2,5
unité : kg

total calculé
→ 10 kg
```

Autres cas :

```text
sac de 25 kg
carton de 6 × 1 L
carton de 24 × 125 g
```

Invariant :

> Le conditionnement commercial doit pouvoir être converti vers l'unité de référence lorsque les données disponibles sont suffisantes.

Le libellé fournisseur d'origine (`5/1`, `4/4`, etc.) peut être conservé pour la traçabilité sans devenir l'unique source de calcul.

Pour les produits concernés, poids net et poids net égoutté doivent pouvoir être conservés.

### 8.1 Prix source et prix normalisé

Le prix source reste conservé tel qu'il est exprimé commercialement :

```text
40,625 € HT / sac
3,560 € HT / boîte
52,000 € HT / carton
```

Lorsque le conditionnement le permet, le moteur calcule un prix normalisé dans l'unité de référence.

Exemple :

```text
sac 25 kg
prix source : 40,625 € HT / sac

prix normalisé
→ 1,625 €/kg HT
```

S'il manque une donnée fiable, le prix normalisé reste indisponible.

### 8.2 Précision

Règle validée :

- prix d'achat unitaire affiché avec exactement 3 décimales ;
- prix normalisé affiché avec exactement 3 décimales ;
- précision interne conservée pour éviter les arrondis intermédiaires non maîtrisés.

Les règles d'arrondi des montants agrégés et prix de vente restent à cadrer.

---

## 9. Données tarifaires

Le prix n'est jamais une propriété directe et intemporelle du Produit.

Le domaine distingue trois réalités tarifaires.

### 9.1 Tarif fournisseur de référence

Prix provenant d'un catalogue ou d'une mercuriale Fournisseur.

Il peut exister sans connaître de magasin.

Les catalogues Sysco et SYCAL disponibles sont traités comme des sources tarifaires Fournisseur de référence tant qu'aucune information plus précise n'est démontrée.

### 9.2 Tarif spécifique magasin

Prix connu pour un Article fournisseur dans un magasin donné.

Il est enregistré séparément du Tarif fournisseur de référence.

### 9.3 Prix observé

Prix réellement constaté, notamment sur une facture.

Il peut être contextualisé par magasin lorsque celui-ci est identifiable.

Chaque donnée tarifaire doit pouvoir porter conceptuellement :

- Article fournisseur ;
- montant source ;
- base / unité du prix ;
- devise ;
- date ou période ;
- provenance ;
- contexte magasin éventuel ;
- prix normalisé calculé lorsque possible ;
- traçabilité de création / modification.

Provenances identifiées :

- catalogue fournisseur ;
- mercuriale ;
- tarif spécifique magasin ;
- facture ;
- saisie manuelle ;
- import fichier ;
- futur OCR.

### 9.4 Politique de prix du Workspace

La stratégie de sélection du Prix applicable est un paramètre du Workspace.

Modes retenus :

~~~text
Tarif fournisseur
Tarif négocié
Prix facturé
~~~

Valeur standard :

~~~text
Tarif négocié
~~~

Règles de résolution :

~~~text
Tarif fournisseur
→ Tarif fournisseur de référence applicable

Tarif négocié
→ Tarif négocié valide du même magasin
→ sinon Tarif fournisseur de référence

Prix facturé
→ dernier Prix facturé VALIDE, exploitable et suffisamment frais du même magasin
→ sinon Tarif négocié valide du même magasin
→ sinon Tarif fournisseur de référence
~~~

Le backend est la seule autorité de résolution et expose la source, la valeur, le fallback, sa raison et les alertes utiles.

### 9.5 Valorisabilité contextuelle

La capacité à valoriser une ligne dépend de :

~~~text
Produit
× Article fournisseur
× magasin/dossier
× politique Workspace
× date
~~~

Un autre magasin n'est jamais une source de fallback.

L'absence de Prix applicable est un état distinct de zéro.

### 9.6 Prix facturé exploitable et fraîcheur

Un Prix facturé doit être correctement rattaché au Fournisseur, à l'Article, au magasin, à la date de facture, au prix source et aux données de normalisation puis explicitement validé.

États :

~~~text
À VALIDER
VALIDÉ
REJETÉ
~~~

Seul VALIDÉ peut participer à la résolution automatique.

La fraîcheur est calculée depuis la date de facture.

Comportement standard :

~~~text
durée de fraîcheur
→ 1 an
~~~

Cette durée est personnalisable au niveau Workspace lorsque la capability correspondante est disponible.

Une donnée trop ancienne reste VALIDÉE et historique mais devient inéligible à l'usage automatique courant. Le moteur applique alors les fallbacks prévus.

### 9.7 Validité commerciale et revue tarifaire

Les temporalités restent distinctes :

~~~text
catalogue fournisseur
→ édition / période de validité

Tarif négocié
→ période commerciale

Prix facturé
→ fraîcheur depuis la facture

revue tarifaire
→ date d'un contrôle opérationnel
~~~

Une revue n'étend jamais artificiellement la validité commerciale.

### 9.8 Catalogue fournisseur de référence

Un Fournisseur peut posséder plusieurs éditions historiques de catalogue.

Une nouvelle édition ajoute une nouvelle réalité et ne remplace pas destructivement l'ancienne.

Un catalogue hors période peut rester consultable et éventuellement servir de dernier fallback de référence, à condition que son édition et son état hors validité soient explicitement exposés.

Deux portées conceptuelles sont retenues :

```text
GLOBAL_SHARED
→ édition de référence partageable
→ aucune donnée commerciale confidentielle tenant

WORKSPACE_PRIVATE
→ édition importée dans un Workspace
→ inaccessible aux autres Workspaces
```

Un import Workspace est privé par défaut. Le caractère global exige une provenance et un droit de partage établis.

Une édition globale est stockée une seule fois et peut être référencée par plusieurs Workspaces sans recopier ses lignes.

Un import CSV/XLS/XLSX crée une nouvelle édition après staging, mapping, contrôles, aperçu et validation.

Invariant :

```text
1 ligne de catalogue
≠ 1 Produit canonique créé automatiquement
```

Une ligne d'édition peut rester non rapprochée tant qu'aucune correspondance Produit/Article suffisamment fiable n'a été validée.

Lorsqu'une référence Article du même Fournisseur possède déjà un mapping validé vers un Produit/déclinaison, les éditions suivantes réutilisent cette correspondance.

Le rapprochement suit conceptuellement :

```text
Fournisseur + référence Article connue
→ désignation normalisée
→ alias
→ proximité
→ validation utilisateur
→ nouvelle identité seulement si nécessaire
```

Les mappings Fournisseur ainsi que les correspondances `Article fournisseur → Produit/déclinaison` doivent pouvoir être mémorisés et réutilisés.

### 9.8.1 Recherche transverse Produits / catalogues / références

Le produit expose conceptuellement une recherche unifiée, avec au moins deux axes.

Portée :

```text
Mon Workspace
Référentiel global autorisé
```

Source :

```text
Toutes
Produits canoniques
Catalogues fournisseurs
Références / Articles fournisseur
```

Cette recherche agrège des ressources de natures différentes sans les confondre.

Un résultat issu d'un catalogue conserve son Fournisseur, son édition, sa référence et son libellé source. Lorsqu'un mapping canonique existe, il pointe vers le Produit/déclinaison correspondant.

La portée globale n'expose jamais les catalogues privés, prix négociés, prix facturés ou historiques commerciaux d'un autre tenant.

### 9.9 Résolution des Articles fournisseur

Un Produit peut avoir plusieurs Articles exploitables dans un même magasin.

Le moteur ne choisit jamais automatiquement le moins cher.

Un Article explicitement sélectionné reste attaché à la version concernée.

S'il n'existe qu'un seul candidat exploitable, le backend peut le résoudre automatiquement. S'il existe plusieurs candidats sans décision explicite, une sélection utilisateur est requise.

Un changement de prix du même Article est une revalorisation ; un changement d'Article est une modification d'approvisionnement distincte.

### 9.10 Références du magasin

La relation opérationnelle utile est une référence favorite de magasin vers un Article fournisseur précis.

~~~text
Référence favorite
→ Article fournisseur × magasin
~~~

Le prix n'est pas dupliqué dans cette relation ; il est résolu au moment de l'usage.

Plusieurs Articles favoris peuvent correspondre au même Produit.

Le backend calcule également un statut « fréquemment utilisée » à partir de Fiches techniques VALIDÉES distinctes du magasin.

La politique Workspace peut fonctionner en mode manuel, suggestion ou ajout automatique aux favoris. Le seuil est configurable ; sa valeur standard définitive reste à fixer.

Un retrait manuel est respecté et une baisse de fréquence ne retire pas automatiquement un favori.

### 9.11 Carte d'identité Produit / Article

Chaque Produit ou Article proposé dans un sélecteur doit pouvoir être présenté avec une carte d'identité fournie par le backend.

Elle doit exposer les informations nécessaires à une sélection fiable, notamment identité Produit, Fournisseur, référence, désignation fournisseur, marque éventuelle, conditionnement, Prix applicable du magasin courant, source, temporalité et alertes.

Le frontend ne reconstruit ni la valorisabilité, ni le statut favori/fréquent, ni le Prix applicable.

---


### 9.12 Détail Produit / Magasin

Le Produit reste global au Workspace, mais sa projection opérationnelle dans un Dossier/Magasin expose des informations contextualisées.

```text
Produit
× Dossier/Magasin
→ Prix applicable HT courant
→ historique graphique du Prix applicable HT
→ nombre de Fiches techniques courantes utilisant le Produit
→ liste des Fiches techniques concernées
```

Le compteur principal repose sur les fiches courantes non archivées et ne compte pas plusieurs fois une même fiche à cause de ses versions historiques.

Les fiches archivées peuvent être incluses via un filtre distinct.

La courbe principale utilise le Prix applicable HT résolu par le backend dans le temps. Toute série commerciale complémentaire reste soumise aux permissions et à l'isolation du magasin.

## 10. Historique tarifaire

Une nouvelle donnée tarifaire ajoute une nouvelle réalité temporelle ; elle ne détruit pas l'ancienne.

Le modèle doit pouvoir répondre à :

- quel était le tarif de référence à une date donnée ?
- quel tarif spécifique était connu pour un magasin ?
- quel prix a réellement été observé sur une facture ?
- quel est le prix normalisé ?
- quel est l'écart absolu et relatif ?
- quelles fiches peuvent être impactées ?

L'historique doit préserver :

- valeur source ;
- unité d'expression ;
- valeur normalisée lorsque disponible ;
- date / période ;
- provenance ;
- contexte magasin éventuel.

L'extension OCR doit alimenter ce même historique après contrôles et ne pas créer un second mécanisme de prix.

---

## 11. Fiche technique

Une Fiche technique appartient à un dossier/magasin et possède une identité durable avec des versions successives.

Conceptuellement :

~~~text
Dossier
1
→ 0..n Fiches techniques

Fiche technique
1
→ 1..n versions

Version
→ lignes d'ingrédients
→ lignes d'Économat
→ snapshot de valorisation
~~~

### 11.0 Éligibilité d'une ligne

Une ligne ne peut être officiellement validée que si le backend peut résoudre un Article fournisseur autorisé et un Prix applicable dans le magasin courant.

Un DRAFT peut temporairement être incomplet ou non valorisable.

### 11.1 Ligne d'ingrédient

L'utilisateur renseigne le Produit, la quantité nette et, lorsqu'une ambiguïté existe, l'Article fournisseur choisi.

Le système récupère ou calcule unité, rendement, quantité brute, pourcentage de recette, Prix applicable normalisé et coût HT.

### 11.2 Quantité nette

La quantité saisie représente la quantité nette réellement présente dans la recette.

### 11.3 Quantité brute

~~~text
quantité brute
=
quantité nette / rendement
~~~

### 11.4 Pourcentage de recette

Le pourcentage est calculé sur les quantités nettes et n'est pas saisi librement.

### 11.5 Coût matière de ligne

~~~text
quantité brute
× Prix applicable HT normalisé
= coût matière HT
~~~

### 11.6 Coût Matière

~~~text
CM HT
=
somme des coûts HT des lignes d'ingrédients
~~~

### 11.7 Ligne d'Économat

Les consommables sont valorisés séparément des ingrédients tout en pouvant partager Fournisseur, Article, conditionnement, tarifs et historique.

### 11.8 Coût total de fabrication

~~~text
Coût total de fabrication HT
=
CM HT + Économat HT
~~~

L'énergie est exclue.



### 11.9 TVA et chaîne économique

Le Coût Matière, l'Économat et le Coût total de fabrication restent calculés en HT.

Convention d'Objectif de marge :

```text
Objectif de marge
=
(Prix de vente HT - Coût total de fabrication HT)
/
Prix de vente HT
```

Coefficient :

```text
coefficient = 1 / (1 - objectif de marge)
```

Prix théorique :

```text
Prix théorique HT
=
Coût total de fabrication HT × coefficient
```

Le Prix théorique TTC est calculé avec la TVA de la fiche.

La règle d'arrondi effective du Workspace produit ensuite le Prix conseillé TTC.

Règle standard :

```text
Prix conseillé TTC
=
multiple de 0,50 € immédiatement supérieur ou égal
au Prix théorique TTC
```

Invariants :

```text
Prix conseillé TTC >= Prix théorique TTC
Prix définitif TTC >= Prix conseillé TTC
```

Le Prix définitif reste une décision humaine.

Marge réelle :

```text
Marge réelle %
=
(Prix définitif HT - Coût total de fabrication HT)
/
Prix définitif HT
× 100
```

```text
Marge réelle €
=
Prix définitif HT - Coût total de fabrication HT
```

La marge semi-nette reste non définie et explicitement différée.

Une version VALIDATED conserve le snapshot nécessaire à l'explication de cette chaîne économique.

## 12. Composition, valorisation et concurrence

Composition et valorisation sont distinctes.

Une mise à jour tarifaire ne modifie jamais silencieusement une fiche ouverte ou une version déjà validée.

Avant validation, le backend recontrôle les Prix applicables. Si un prix a changé, une revalorisation explicite est requise.

Un changement d'Article est distingué d'une revalorisation du même Article.

## 12.1 Copie inter-magasin

La copie transporte la structure de composition réutilisable mais aucun prix, valorisation ni historique économique du magasin source.

Le magasin cible résout ses propres Articles et Prix et démarre son propre historique.

## 12.2 Versionnement

États conceptuels :

~~~text
DRAFT
VALIDATED
ARCHIVED
~~~

Une version VALIDATED est historiquement immuable.

Modifier une fiche validée ouvre/crée une nouvelle version DRAFT.

Une revalorisation peut produire un nouveau DRAFT avec composition identique et valorisation courante.

Chaque version validée conserve le snapshot économique nécessaire à sa reproductibilité.

Le backend doit pouvoir expliquer la nature des différences entre versions.

## 12.3 Validation

La validation vérifie au minimum :

- permissions et accès dossier ;
- complétude ;
- cohérence des quantités ;
- Articles utilisables ;
- Prix applicables de chaque ligne requise ;
- cohérence de la valorisation avec l'état courant ;
- absence de conflit incompatible.

Les invariants s'appliquent également au Workspace Owner.

Un prix absent n'est jamais représenté par 0.

## 12.4 Archivage et suppression

L'archivage conserve l'historique et la valorisation.

Aucune Fiche technique VALIDATED n'est purgée automatiquement uniquement par l'âge.

Un DRAFT actif reste conservé quelle que soit son ancienneté. Lorsqu'un DRAFT est explicitement supprimé, il relève de la corbeille métier du Workspace et devient purgeable à l'échéance de la durée effective.

La suppression définitive éventuelle d'une fiche VALIDATED reste réservée au Workspace Owner dans le cadrage actuel, après archivage, contrôles backend, audit et contrat spécifique du module.

La fiche et ses versions sont traitées comme un ensemble cohérent.


## 12.5 Atelier d'optimisation

L'Atelier d'optimisation est une capability payante distincte de l'édition ordinaire d'une fiche.

Il opère uniquement sur un DRAFT ou une simulation issue d'un DRAFT.

Conceptuellement, une ligne d'ingrédient modulable peut porter pour l'optimisation :

```text
quantité de référence
minimum autorisé
maximum autorisé
verrouillage
```

Les pièces / unités et lignes déclarées fixes restent verrouillées.

Invariant :

```text
composition totale = 100 %
```

Lorsque la quantité finale est verrouillée, toute diminution d'une ligne doit être compensée par une augmentation conforme d'une ou plusieurs autres lignes modulables.

Les bornes sont configurables, mais le backend applique également des limites de sécurité propres au moteur afin d'empêcher des valeurs incohérentes ou dangereuses même si elles sont envoyées directement à l'API.

Le moteur doit préserver l'enveloppe de qualité perçue et peut conclure qu'un objectif est impossible.

La couche UX transpose un environnement de retouche paramétrique professionnel :

- sliders globaux ;
- courbe d'équilibre multipoints ;
- histogramme composition/coût ;
- réglages fins par ingrédient ;
- visualisation des bornes atteintes ;
- comparaison avant / après ;
- scénarios/presets uniquement lorsqu'ils correspondent à des règles mathématiques explicables.

Les sliders et la courbe ne sont pas interchangeables : ils agissent sur des dimensions différentes.

Aucune manipulation ne persiste automatiquement :

```text
simulation
→ Appliquer au DRAFT
→ validation explicite ultérieure
```

Une version VALIDATED n'est jamais modifiée par l'atelier.

## 12.6 Stockage Workspace, corbeille métier et artefacts générés

Le stockage est gouverné au niveau du Workspace et non au niveau du Dossier.

```text
Workspace
→ capacité / quota de stockage

Dossier
→ consommation rattachable
→ aucun quota dur propre en V1
```

Tant que le Workspace dispose de la capacité et des droits nécessaires, ses Dossiers peuvent créer leurs ressources métier et documents associés. Une ventilation de consommation par Dossier peut exister pour le pilotage, sans devenir une limite bloquante.

La politique métier de corbeille est configurable au niveau Workspace selon les capabilities disponibles :

```text
standard : 30 jours
minimum  : 7 jours
maximum  : 90 jours
```

L'échéance effective est figée lors de la suppression de la ressource. Une modification future de la politique n'est pas rétroactive sur les éléments déjà supprimés.

Règles validées :

- DRAFT actif : aucune purge automatique liée à l'âge ;
- DRAFT explicitement supprimé : corbeille puis purge à l'échéance ;
- version VALIDATED : conservation historique, pas de purge automatique par âge ;
- Dossier `DELETED` : suppression logique sans purge automatique dans M-001.

Les formats de sortie reproductibles ne sont pas des ressources métier persistantes :

- CSV / XLS(X) : génération à la demande puis destruction après remise au client ;
- PDF : génération à la demande uniquement comme pièce jointe lors de l'envoi d'un document par e-mail, puis destruction du temporaire après traitement.

La donnée structurée de la Fiche technique et ses versions restent la source de vérité ; les exports ne créent aucun historique de fichiers parallèle.

Le contrat transversal détaillé se trouve dans `docs/domain/STORAGE-RETENTION.md`.

## 13. Valorisation courante et historique

Le domaine distingue :

~~~text
valorisation historique
→ snapshot réellement utilisé par une version

valorisation courante
→ résultat d'une nouvelle résolution des prix applicables
~~~

## 14. Marchandises achetées et Économat

Le domaine reconnaît au moins :

~~~text
Ingrédient
→ Coût Matière

Économat / consommable
→ Économat
~~~

Les deux peuvent partager les mécanismes d'approvisionnement sans partager les attributs alimentaires non pertinents.

---

## 15. Fiche process

Une Fiche process est reliée au travail d'un dossier et décrit la fabrication.

Concepts déjà identifiés :

- étapes ;
- durées ;
- denrées ;
- points critiques ;
- critères d'acceptabilité.

**À cadrer :**

- relation avec la fiche technique ;
- versionnement ;
- réutilisation ;
- données process présentes directement dans la fiche technique.

---

## 16. Traçabilité du Produit

Le domaine doit pouvoir répondre à :

```text
Produit
→ où est-il utilisé ?
→ dans quelles fiches ?
→ avec quels fournisseurs ?
→ avec quelles références ?
→ avec quels prix historiques ?
→ quelles modifications a-t-il subies ?
```

Deux historiques doivent rester conceptuellement distincts :

```text
Historique produit
→ identité / catégorie / rendement / photo / statut

Historique commercial
→ prix / conditionnement / disponibilité / article fournisseur
```

---

## 17. Principe « données saisies vs données calculées »

Classification obligatoire lors du cadrage de chaque champ :

```text
FAIT UTILISATEUR
→ donnée réellement connue uniquement par l'utilisateur

DONNÉE DE RÉFÉRENCE
→ récupérée depuis Produit / Fournisseur / Dossier / configuration

DONNÉE CALCULÉE
→ produite par le backend, non saisie librement

SNAPSHOT HISTORIQUE
→ valeur conservée pour expliquer un état passé
```

Une donnée calculée ne doit pas devenir une saisie utilisateur simplement parce qu'un tableur historique comportait une cellule modifiable.

---


## 18. Paramètres métier

Le Workspace possède une configuration métier centrale avec des comportements standards immédiatement utilisables.

Pour chaque paramètre :

~~~text
standardValue
configuredValue éventuelle
effectiveValue
customizationAllowed
~~~

Le backend calcule et expose la valeur effective. Le frontend ne code aucune règle commerciale selon un nom de plan.

Principe commercial :

~~~text
Free
→ valeurs standards
→ panneau visible
→ personnalisation verrouillée selon capabilities

Trial
→ valeurs standards au démarrage
→ personnalisation facultative disponible pour évaluer l'offre

Payant
→ personnalisation des paramètres autorisés
~~~

Un downgrade ne détruit pas la configuration personnalisée ; elle peut devenir inactive pendant que les valeurs standards redeviennent effectives.

Paramètres déjà identifiés : politique de prix, fraîcheur des Prix facturés, favoris/fréquence, cycle de vie des fiches, TVA, Objectif de marge, coefficient et arrondis.

Les préférences d'affichage utilisateur sont séparées de cette configuration métier.

Le Dashboard Workspace réutilise le registre Core de widgets. Les modules métier ajoutent leurs descriptors ; les permissions et capabilities déterminent les widgets accessibles ; les préférences utilisateur déterminent ensuite les widgets visibles.

Le Core v1.1.0 utilise `hiddenWidgetIds = []` par défaut : tous les widgets accessibles sont initialement visibles. Un widget configurable peut ensuite être masqué ou réaffiché ; un widget non configurable reste visible.

## 19. Extensibilité

Le modèle doit préserver les extensions identifiées sans les implémenter prématurément :

- import de catalogues structurés ;
- OCR ;
- assistance IA ;
- alertes et graphiques ;
- comparaison fournisseur ;
- optimisation de marge ;
- reverse recipe ;
- analyses transversales ;
- infographies process.

L'IA peut proposer ou assister mais ne remplace jamais les contrôles métier ni une validation nécessaire.

## 19.1 Rôles métier et périmètres

Le produit étend le RBAC Workspace du Core ; il ne crée pas un RBAC parallèle.

### Workspace Owner

Le rôle système `owner` du Workspace reste générique et inchangé côté Core. Le produit reconnaît le Workspace Owner comme autorité métier complète dans CE Workspace et lui donne implicitement accès à tous les Dossiers, sans transformer `owner` en rôle métier GMS.

Il reste soumis aux invariants, capabilities, quotas et règles de sécurité.

Il ne faut pas le confondre avec un PlatformRole.

### PlatformRole

Un rôle Platform ne donne aucun accès implicite aux données métier d'un Workspace.

### Autres membres

Le Core v1.1.0 fournit la primitive générique `Role` et porte un seul Role par WorkspaceMember.

Les rôles système Core restent génériques. Les profils métier GMS sont des rôles personnalisés définis par le produit en utilisant cette primitive générique. Les responsabilités multiples sont représentées par un rôle métier personnalisé combinant les permissions nécessaires, et non par l'ajout de nouveaux rôles système Core.

Profils types retenus pour le cadrage :

- Acheteur / Responsable achats ;
- Économe / Gestionnaire des prix ;
- Responsable fiches techniques ;
- Contributeur fiches techniques ;
- Lecteur métier lorsque nécessaire.

Le mécanisme Core d'invitation conserve le choix d'un roleId puis affecte ce rôle au WorkspaceMember lors de l'acceptation.

Le périmètre dossier reste une donnée métier séparée du rôle :

~~~text
Role
→ ce que le membre peut faire

Dossiers autorisés
→ où il peut le faire
~~~

L'autorisation effective combine membership, permission, accès dossier, état de ressource, capability éventuelle et invariants.

---



## 19.2 Baseline RBAC des rôles types

La baseline fonctionnelle est validée :

- Owner : toutes les permissions métier et tous les Dossiers ;
- Acheteur : gestion Produits selon baseline, Fournisseurs, Articles, catalogues et Tarifs négociés ;
- Économe : gestion/validation des Prix facturés, revues tarifaires et revalorisation, sans validation FT par défaut ;
- Responsable FT : création, édition, validation, archivage/restauration des Fiches techniques ;
- Contributeur FT : création et modification de ses DRAFTS, revalorisation de ses fiches, sans administration tarifaire ;
- Lecteur : consultation des ressources autorisées sans historique commercial détaillé par défaut.

Contributeur et Lecteur peuvent recevoir le Prix applicable nécessaire sans recevoir l'historique commercial confidentiel.

Administration du Dossier et affectations restent Owner-only par défaut.

Les rôles personnalisés combinent les permissions lorsque plusieurs responsabilités sont requises.

## 20. Invariants métier déjà établis

- Workspace = frontière de tenancy ;
- 1 dossier = 1 magasin en V1 ;
- un contexte magasin actif à la fois pour le travail métier ;
- aucune donnée commerciale d'un autre magasin comme fallback ;
- le Role définit « quoi », l'affectation dossier définit « où » ;
- invitation Workspace et affectation magasin sont deux étapes distinctes ;
- le Workspace Owner possède implicitement tous les dossiers ;
- un dossier PAUSED / ARCHIVED / DELETED restreint ou coupe les actions indépendamment du Role ;
- la suppression logique d'un dossier coupe les accès sans réécrire l'état historique de ses ressources ;
- quantité nette saisie, quantité brute calculée ;
- composition recette calculée sur le net ;
- CM HT + Économat HT = Coût total de fabrication HT ;
- TVA distincte du coût de fabrication HT ;
- une version VALIDATED est immuable ;
- absence de prix ≠ prix à zéro ;
- l'Objectif de marge est une cible métier distincte de la marge obtenue ;
- l'Atelier d'optimisation est non destructif jusqu'à « Appliquer au DRAFT » ;
- l'optimisation ne peut pas dépasser ses bornes métier ni les limites de sécurité backend ;
- lorsqu'un poids final est verrouillé, la composition optimisée reste à 100 % ;
- une pièce / unité verrouillée n'est jamais ajustée par le moteur ;
- un objectif impossible doit être signalé, jamais atteint en dégradant silencieusement la qualité perçue ;
- masquer un KPI ne désactive aucune règle métier ;
- les invariants s'appliquent au Workspace Owner comme aux autres membres.



## 21. Questions de domaine encore ouvertes

### Bloqueurs restants avant cadrage M-001

- champs obligatoires minimaux du Dossier ;
- représentation/persistance exacte des affectations Dossier ;
- vérification des contraintes réglementaires réellement structurantes pour M-001 ;
- validation documentaire globale.

### À cadrer avant les modules concernés

- M-002 : cadrage Produit fermé ; validation finale du lot en cours ;
- données minimales Fournisseur, identité Catalogue et lifecycle Article avant M-003 ;
- convention technique de fraîcheur Prix facturé et revues tarifaires avant M-003/M-004 ;
- types/motifs finaux de versions avant M-004 ;
- marge semi-nette lorsqu'une définition métier fiable sera disponible ;
- paramètres mathématiques fins et garde-fous de l'Atelier avant M-005 ;
- Fiche process avant son module ;
- purge/rétention physique avant implémentation ;
- quotas et capabilities supplémentaires lorsqu'un besoin réel est démontré.
