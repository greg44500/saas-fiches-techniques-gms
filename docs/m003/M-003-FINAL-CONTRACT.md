# M-003 — Fournisseurs, Articles, conditionnements, prix et catalogues

**Statut : VALIDÉ ET LIVRÉ — baseline M-003 + complément PR #44 fusionnés le 2026-10-14**  
**Date de validation : 2026-09-27**  
**Prérequis : M-001 et M-002 clôturés**  
**Core référencé au moment du cadrage : v1.2.1 — d90d8f1e6034cbbf4f63de2be7312eae69b1d698**  
**Core effectivement intégré : v1.2.1 — 054ecd5bff1f3e61e7e1871700fae05bcdc0bdd3 (`core-origin.json`)**

> Ce contrat est la source de vérité fonctionnelle de M-003.
> Les choix explicitement qualifiés de baseline V1 sont révisables après tests métier réels.
> Les invariants de tenancy, d'isolation Dossier et d'historisation ne sont pas des préférences UX.
> Aucun modèle Mongoose M-003 ne doit précéder ce contrat ; l'implémentation peut commencer après sa validation.

> Complément UX M-002/M-003 du 2026-10-14, en QA sur une branche
> distincte : `docs/m003/M-003-ARTICLE-PRODUCT-CREATION-ADDENDUM.md`.
> Il ne modifie pas les invariants de la baseline déjà fusionnée.

---

## État d'implémentation et clôture — 2026-10-14

Les décisions et avenants métier ci-dessous restent les contrats de
référence ; les formulations initiales « à implémenter » reflètent leur
date de rédaction, pas l'état présent.

La [PR #44](https://github.com/greg44500/saas-fiches-techniques-gms/pull/44)
est fusionnée sur `main` au commit
`962177905bcc198e439a316d9610b23c60dd53cd`.
Core Gate PR `38537453030` : success ;
Core Gate post-merge `38539141748` : success à la **tentative 2**,
après une première tentative perturbée par un test M-004 intermittent.

Le complément livré inclut les imports directs d'Articles, les tarifs
de mercuriales autonomes, l'association différée, les corrections
historisées de prix/période des listes privées, la présentation des
prix expirés et les projections de conditionnement. La suppression
contrôlée des catalogues, le renouvellement prospectif des mercuriales
et l'arbitrage des conflits privé/global restent en dette, sans
altérer les invariants de tenancy, RBAC et audit.

---

## 1. Objectif

M-003 répond à la question :

~~~text
Comment un Dossier achète-t-il une Référence Produit M-002 ?
~~~

Le module introduit :

- Fournisseurs ;
- Articles fournisseur ;
- conditionnements commerciaux ;
- éditions de catalogues fournisseur ;
- import CSV/XLS/XLSX de catalogues ;
- Tarifs fournisseur de référence ;
- Tarifs négociés ;
- Prix facturés ;
- Prix normalisé ;
- résolution backend du Prix applicable ;
- références favorites du Dossier ;
- historique économique nécessaire aux futurs modules de Fiches techniques.

M-003 ne redéfinit jamais l'identité Produit construite par M-002.

---

## 2. Architecture métier cible

~~~text
Référence Produit M-002
        ↓
0..n Articles fournisseur
        ↓
Fournisseur
        ↓
éditions de catalogues
        ↓
Tarifs fournisseur de référence

Dossier
        ↓
Tarifs négociés
Prix facturés
Références favorites
        ↓
Prix applicable
~~~

Le Prix applicable n'est jamais une propriété intemporelle de la Référence Produit.

---

## 3. Portées et tenancy

### 3.1 GLOBAL_SHARED

Le SaaS peut administrer des Fournisseurs et éditions de catalogues partagés.

~~~text
GLOBAL_SHARED
→ référentiel commun
→ réutilisable par plusieurs Workspaces
→ stocké sans duplication par Workspace
→ aucune donnée commerciale confidentielle d'un Dossier
~~~

### 3.2 WORKSPACE_PRIVATE

Un client peut créer ses propres Fournisseurs et importer ses propres catalogues.

~~~text
WORKSPACE_PRIVATE
→ appartient exactement à un Workspace
→ utilisable par plusieurs Dossiers de ce Workspace
→ jamais visible dans un autre Workspace
→ ne devient jamais global automatiquement
~~~

### 3.3 Données strictement Dossier

Restent strictement propres au Dossier :

- Tarif négocié ;
- Prix facturé ;
- Référence favorite ;
- historique commercial local.

Invariant :

~~~text
Dossier A
→ aucune donnée commerciale du Dossier B comme fallback
~~~

L'accès d'un utilisateur à plusieurs Dossiers permet de changer de contexte, jamais de fusionner leurs données.

---

## 4. Workspace Owner

Le rôle système Core owner n'est pas remplacé par une accumulation artificielle des rôles Acheteur, Économe, Responsable FT, etc.

Dans son Workspace :

~~~text
Owner
→ toutes les permissions métier M-003
→ accès implicite à tous les Dossiers
~~~

L'Owner peut donc, sous réserve des capabilities et invariants applicables :

- créer et gérer les Fournisseurs WORKSPACE_PRIVATE ;
- importer et gérer les catalogues WORKSPACE_PRIVATE ;
- gérer les Articles fournisseur ;
- effectuer les rapprochements ;
- gérer les Tarifs négociés ;
- gérer et valider les Prix facturés ;
- gérer les références favorites ;
- consulter les historiques autorisés.

L'Owner :

- reste soumis aux capabilities commerciales et quotas éventuels ;
- ne contourne aucun invariant ;
- n'obtient aucune permission Application Global.

---

## 5. Fournisseur

### 5.1 Portée

Un Fournisseur possède une portée explicite :

~~~text
GLOBAL_SHARED
WORKSPACE_PRIVATE
~~~

Un Fournisseur global est réutilisable sans duplication.

Un Fournisseur privé appartient à un seul Workspace.

### 5.2 Données V1

Donnée métier obligatoire :

- nom.

Données facultatives :

- code fournisseur ;
- raison sociale ;
- site web ;
- une ou plusieurs catégories Produit fournies.

Les catégories d'un Fournisseur réutilisent exclusivement les catégories actives du référentiel Produit M-002. Elles servent à qualifier son offre pour la recherche et la lecture métier ; elles ne créent aucune taxonomie Fournisseur parallèle, ne remplacent pas le rattachement précis des Articles aux Références Produit et ne modifient aucune règle de prix.

L'affectation est explicite : le système ne déduit pas silencieusement les catégories du Fournisseur à partir de ses Articles ou d'un catalogue importé.

Données système nécessaires :

- nom normalisé ;
- portée ;
- Workspace lorsque la portée est WORKSPACE_PRIVATE ;
- statut ;
- dates et auteurs de création/modification.

M-003 ne transforme pas le Fournisseur en CRM.

### 5.3 Lifecycle

Baseline V1 :

~~~text
ACTIVE
ARCHIVED
~~~

Un Fournisseur archivé reste présent dans l'historique et n'est plus proposé normalement pour de nouveaux usages.

Aucune purge physique automatique n'est introduite en M-003.

---

## 6. Article fournisseur

### 6.1 Définition

Un Article fournisseur est une référence commerciale précise d'une Référence Produit chez un Fournisseur.

~~~text
Référence Produit
1 → 0..n Articles fournisseur

Fournisseur
1 → 0..n Articles fournisseur
~~~

Une même Référence Produit peut avoir plusieurs Articles actifs chez un même Fournisseur et chez plusieurs Fournisseurs.

### 6.2 Identité

Baseline V1 :

~~~text
Fournisseur + référence fournisseur
→ identité métier de l'Article
~~~

La normalisation technique doit empêcher des doublons créés uniquement par casse ou espaces.

### 6.3 Référence absente

Une ligne de catalogue sans référence fournisseur exploitable :

~~~text
→ reste une ligne de catalogue
→ peut être rapprochée manuellement
→ ne crée pas automatiquement un Article fournisseur
~~~

Une simple ressemblance de désignation ne suffit pas à créer une identité Article.

### 6.4 Données conceptuelles

Un Article peut porter :

- Fournisseur ;
- référence fournisseur ;
- désignation fournisseur originale ;
- Référence Produit M-002 associée ;
- marque éventuelle ;
- conditionnement structuré ;
- libellé fournisseur du conditionnement ;
- poids net ;
- poids net égoutté lorsque pertinent ;
- statut ;
- provenance ;
- audit.

### 6.5 Lifecycle et remplacement

Baseline V1 :

~~~text
ACTIVE
ARCHIVED
~~~

Lorsqu'une référence fournisseur est remplacée :

~~~text
ancien Article → ARCHIVED
nouvelle référence → nouvel Article ACTIVE
ancien Article.replacedBy → nouvel Article
~~~

Le lien replacedBy sert à la traçabilité et n'effectue aucun remplacement automatique dans une Fiche technique existante.

---

## 7. Conditionnement

Le conditionnement doit être lisible et structuré pour les calculs.

Exemples :

~~~text
sac 25 kg

carton
→ 6 unités
→ 1 L par unité
→ total 6 L

carton
→ 24 unités
→ 125 g par unité
→ total 3 kg
~~~

Le contrat conceptuel doit pouvoir représenter :

- type/contenant ;
- nombre d'unités ;
- quantité par unité ;
- unité ;
- quantité totale calculée ;
- poids net éventuel ;
- poids net égoutté éventuel ;
- libellé fournisseur d'origine.

Baseline V1 : le modèle structuré porte un seul niveau arithmétique
`nombre d'unités × quantité par unité`. Il ne construit pas d'arbre récursif
de contenants. Un niveau commercial supplémentaire, par exemple
« 1 carton = 8 paquets × 4 tranches », reste conservé sans perte dans le
libellé fournisseur d'origine tandis que les champs structurés portent la
quantité totale réellement normalisable.

Pour `UNIT`, l'unité structurée désigne l'unité de recette M-002
(`tranche`, `œuf`, `pain`, etc.), jamais le paquet ou le carton.

Lorsque les données sont suffisantes, le backend convertit le conditionnement vers l'unité de référence M-002.

Lorsque les données sont insuffisantes, le prix normalisé reste indisponible. Aucune valeur n'est inventée.

---

## 8. Édition de catalogue fournisseur

### 8.1 Historisation

Un Fournisseur peut posséder plusieurs éditions.

Une nouvelle édition ajoute une nouvelle réalité commerciale et ne détruit jamais l'ancienne.

### 8.2 Portée

Une édition est :

~~~text
GLOBAL_SHARED
ou
WORKSPACE_PRIVATE
~~~

Une édition globale est administrée sous autorité Application Global et peut être réutilisée sans recopier ses lignes.

Une édition privée appartient à un seul Workspace et peut servir à plusieurs Dossiers de ce Workspace.

### 8.3 Identité conceptuelle

Une édition doit conserver au minimum :

- Fournisseur ;
- libellé/nom d'édition ;
- date ou millésime lorsque disponible ;
- portée ;
- période de validité lorsqu'elle existe ;
- source ;
- date d'intégration ;
- statut.

### 8.4 Réimport

Nouvelle édition :

~~~text
→ nouvelle ressource historique
→ ancienne édition conservée
~~~

Même édition réimportée :

~~~text
même Fournisseur
+ même édition identifiée
→ réconciliation
→ pas de deuxième catalogue identique
~~~

Le réimport doit réutiliser les Articles et mappings déjà validés.

Une correction d'une édition ne doit pas effacer silencieusement la traçabilité antérieure.

---

## 9. Ligne de catalogue

Une ligne de catalogue est distincte :

- d'une Référence Produit ;
- d'un Article fournisseur ;
- d'un Tarif négocié.

Elle peut porter :

- référence fournisseur source ;
- désignation source ;
- marque ;
- conditionnement source ;
- prix source ;
- unité d'expression ;
- Article rapproché éventuel ;
- Référence Produit rapprochée éventuelle ;
- statut de rapprochement ;
- provenance.

Une ligne peut rester non rapprochée.

---

## 10. Import catalogue

### 10.1 Formats V1

~~~text
CSV
XLS
XLSX
~~~

L'import utilisateur libre de PDF non structuré et l'OCR sont hors M-003 V1.

### 10.2 Pipeline

~~~text
téléversement temporaire sécurisé
→ inspection
→ Fournisseur
→ édition
→ portée
→ détection des colonnes
→ mapping
→ prévisualisation
→ normalisation
→ Articles existants
→ mappings existants
→ rapprochement M-002
→ ambiguïtés
→ confirmation
→ écriture transactionnelle
→ nettoyage du temporaire
~~~

La confirmation est l'étape d'écriture définitive.

Baseline V1 de devise :

~~~text
EUR
~~~

L'interface d'import ne demande pas de mapper une devise en V1 : l'euro est appliqué explicitement par défaut. Le modèle conserve néanmoins une devise structurée afin de ne pas mélanger montant et unité d'expression et de permettre une évolution contractuelle ultérieure sans réécrire l'historique.

Pour le mapping tarifaire, l'interface distingue :

~~~text
Prix HT
→ montant source

Unité du prix (Kilo, Pièce, etc.)
→ base d'expression du montant : colis, kg, L, pièce...
~~~

### 10.3 Rapprochement

Ordre conceptuel :

~~~text
Fournisseur + référence Article connue
→ mapping validé existant

sinon
→ désignation normalisée
→ conditionnement
→ correspondances M-002
→ proximité
→ validation humaine lorsque nécessaire
~~~

Invariant :

~~~text
ambiguïté
→ aucune création automatique dangereuse
~~~

### 10.4 Stockage

Le fichier d'import est un temporaire technique.

Il ne devient pas automatiquement un document utilisateur durable et ne crée pas un second système de stockage documentaire.

---

## 11. Tarif fournisseur de référence

Le Tarif fournisseur provient d'une édition de catalogue ou d'une mercuriale.

Il peut exister sans Dossier.

Il conserve conceptuellement :

- Article fournisseur ;
- édition ;
- montant source ;
- unité/base d'expression ;
- devise ;
- période/date pertinente ;
- provenance.

Un tarif ancien reste historique.

Une édition hors période peut rester consultable. Si elle sert exceptionnellement de dernier fallback, son ancienneté et son édition doivent être signalées.

---

## 12. Tarif négocié

Le Tarif négocié appartient strictement à :

~~~text
Dossier
× Article fournisseur
× période de validité
~~~

Il n'est jamais partagé entre Dossiers.

Baseline V1 :

~~~text
même Dossier
+ même Article
+ périodes actives qui se chevauchent
→ refus
~~~

Une correction ou un remplacement de période doit rester explicite et historisable.

---

## 13. Prix facturé

Le Prix facturé représente une observation réellement constatée.

Il appartient strictement à :

~~~text
Dossier
× Fournisseur
× Article fournisseur
× date de facture
~~~

Il conserve notamment :

- montant source ;
- unité d'expression ;
- prix normalisé lorsque calculable ;
- date de facture ;
- provenance ;
- contexte Dossier ;
- audit.

Statuts V1 :

~~~text
PENDING_VALIDATION
VALIDATED
REJECTED
~~~

Seul VALIDATED peut participer à la résolution automatique.

### 13.1 Fraîcheur

Baseline V1 :

~~~text
12 mois calendaires
à partir de la date de facture
~~~

Exemple :

~~~text
15/09/2026
→ frais jusqu'au 15/09/2027
~~~

Un Prix facturé qui perd sa fraîcheur :

- reste VALIDATED ;
- reste historique ;
- devient inéligible à l'usage automatique courant.

Cette durée standard reste révisable à partir des tests métier réels.

---

## 13.2 Prix indicatif

Le Prix indicatif est une estimation interne explicite. Il n'est ni un Tarif fournisseur, ni un Tarif négocié, ni un Prix facturé.

Trois portées sont autorisées :

~~~text
Global × Référence Produit
→ Prix repère partagé en lecture seule avec les Workspaces

Workspace × Référence Produit
→ estimation commune à l'espace de travail

Dossier × Référence Produit
→ surcharge locale facultative pour un magasin
~~~

Le Prix indicatif ne dépend pas obligatoirement d'un Article fournisseur. Il existe précisément pour permettre de valoriser une Référence Produit lorsqu'aucune donnée commerciale exploitable n'est encore disponible.

Règles :

- un seul Prix indicatif `ACTIVE` par portée et Référence Produit ;
- une modification archive l'ancien enregistrement puis crée une nouvelle réalité historisée ;
- la devise V1 est `EUR` ;
- l'unité du prix doit être compatible avec l'unité de référence du Produit ;
- le Prix indicatif Dossier n'est jamais partagé avec un autre Dossier ;
- le Prix indicatif Workspace peut être utilisé par les Dossiers du même Workspace ;
- le Prix repère global peut être lu par un Workspace sans exiger que la
  Référence Produit soit un Favori ;
- un Prix indicatif n'est jamais promu silencieusement en Tarif fournisseur ou Tarif négocié.

Le montant source peut être exprimé par unité M-002 ou par
`PACKAGE`. Dans ce dernier cas, le conditionnement plat complet est requis
pour calculer le prix normalisé. Une provenance structurée peut conserver
l'organisation source, une URL, la date d'observation et une note libre ;
aucun de ces champs ne constitue à lui seul une preuve de marché.

---

## 14. Prix normalisé et précision

Le prix source est conservé tel qu'exprimé commercialement.

Exemple :

~~~text
40,625 € HT / sac de 25 kg
→ 1,625 €/kg HT
~~~

Lorsque les données du conditionnement sont insuffisantes, le prix normalisé est indisponible.

Règles d'affichage déjà validées :

- prix d'achat unitaire : exactement 3 décimales ;
- prix normalisé : exactement 3 décimales.

La précision interne ne doit pas être arrondie prématurément.

---

## 15. Politique de Prix applicable

La politique appartient au Workspace.

Modes :

~~~text
Tarif fournisseur
Tarif négocié
Prix facturé
~~~

Valeur standard :

~~~text
Tarif négocié
~~~

Résolution :

~~~text
Mode Tarif fournisseur
→ Tarif fournisseur applicable

Mode Tarif négocié
→ Tarif négocié valide du Dossier
→ sinon Tarif fournisseur applicable

Mode Prix facturé
→ Prix facturé VALIDATED suffisamment frais du Dossier
→ sinon Tarif négocié valide du Dossier
→ sinon Tarif fournisseur applicable

Puis, pour tous les modes, si aucune source commerciale n'est exploitable :
→ Prix indicatif Dossier
→ sinon Prix indicatif Workspace
→ sinon aucun prix
~~~

Le backend est la seule autorité de résolution.

Il expose au minimum :

- Article retenu lorsqu'un Article est nécessaire et résolu ;
- Référence Produit retenue ;
- montant ;
- prix normalisé ;
- source ;
- contexte Dossier ;
- date/période ;
- fallback éventuel ;
- raison du fallback ;
- alertes de validité/fraîcheur.

Le frontend ne reconstruit jamais cette chaîne.

---

## 16. Résolution de l'Article

Règles :

~~~text
Article explicitement sélectionné
→ conservé

aucun Article exploitable
→ Prix indicatif possible sur la Référence Produit
→ sinon aucun Prix applicable

un seul Article exploitable
→ résolution automatique possible

plusieurs Articles exploitables
→ sélection utilisateur nécessaire

Article le moins cher
→ jamais sélectionné automatiquement
~~~

Un changement de prix du même Article est une revalorisation.

Un changement d'Article est une modification d'approvisionnement distincte.

---

## 17. Références du Dossier

Une référence favorite correspond à :

~~~text
Dossier × Article fournisseur
~~~

Elle ne contient pas de copie du prix.

Le Prix applicable est résolu dynamiquement.

Plusieurs Articles favoris peuvent correspondre à une même Référence Produit.

La fréquence est calculée à partir de Fiches techniques VALIDATED distinctes.

Baseline de démarrage :

~~~text
mode manuel
~~~

Les modes suggestion et ajout automatique peuvent être activés ultérieurement avec un seuil effectif configuré. Aucun seuil arbitraire n'est requis pour commencer M-003.

Un retrait manuel est respecté.

---

## 18. RBAC Workspace

M-003 étend le RBAC Workspace du Core via le registre applicatif.

Périmètres fonctionnels nécessaires :

- Fournisseurs : lecture / gestion ;
- Articles fournisseur : lecture / gestion ;
- Catalogues : lecture / import / gestion ;
- Tarifs négociés : lecture / gestion ;
- Prix facturés : lecture / gestion / validation ;
- Prix indicatifs : lecture / gestion ;
- Références Dossier : lecture / gestion.

Le rôle système owner reçoit toutes les permissions M-003.

Les autres membres reçoivent les permissions via des Roles Workspace personnalisés.

Profils fonctionnels :

- Acheteur : Fournisseurs, Articles, catalogues, rapprochements, Tarifs négociés ;
- Économe : Prix facturés, validation, revues, revalorisation ;
- Responsable FT / Contributeur / Lecteur : uniquement les données nécessaires aux actions autorisées.

La capacité à consulter un Prix applicable ne donne pas automatiquement accès à tout l'historique commercial.

---

## 19. Autorité Application Global

La gouvernance de :

- Fournisseurs GLOBAL_SHARED ;
- catalogues GLOBAL_SHARED ;
- mappings et corrections globales ;
- lifecycle global associé ;

utilise l'autorisation Application Global existante.

Un rôle Platform n'obtient aucun droit Application Global par héritage.

Un Workspace Owner n'obtient aucun droit Application Global.

---

## 20. Capabilities commerciales

Baseline V1 :

~~~text
consultation du référentiel fournisseur global
→ fonction standard lorsque disponible dans l'offre

import d'un catalogue WORKSPACE_PRIVATE
→ capability métier dédiée
→ fonctionnalité payante
~~~

RBAC et capability restent indépendants :

~~~text
RBAC
→ cet utilisateur peut-il importer ?

Capability
→ ce Workspace dispose-t-il commercialement de l'import ?
~~~

L'Owner ne contourne pas une capability absente.

Les fonctionnalités avancées OCR/IA/comparaison ne sont pas inventées dans M-003.

---

## 21. Quotas

Aucun quota métier arbitraire supplémentaire n'est nécessaire pour commencer M-003.

Les limites techniques d'upload et de traitement restent applicables.

Des quotas commerciaux futurs peuvent être introduits seulement lorsqu'un besoin réel est validé.

---

## 22. API REST — contrat conceptuel

Les chemins techniques exacts seront alignés sur les conventions de l'application pendant l'implémentation.

Surfaces Workspace conceptuelles :

~~~text
/workspaces/:workspaceId/suppliers
/workspaces/:workspaceId/supplier-articles
/workspaces/:workspaceId/supplier-catalogs
/workspaces/:workspaceId/dossiers/:dossierId/negotiated-prices
/workspaces/:workspaceId/dossiers/:dossierId/invoiced-prices
/workspaces/:workspaceId/dossiers/:dossierId/references
/workspaces/:workspaceId/supplier-pricing/global-indicative-prices
/workspaces/:workspaceId/supplier-pricing/indicative-prices
/workspaces/:workspaceId/dossiers/:dossierId/supplier-pricing/indicative-prices
~~~

Import :

~~~text
inspect
→ mapping
→ preview
→ confirm
~~~

La gouvernance GLOBAL_SHARED utilise une surface distincte protégée par Application Global.

---

## 23. Validation Zod et sécurité

Toutes les entrées M-003 sont validées côté backend avec Zod.

Doivent notamment être contrôlés :

- identifiants ;
- chaînes normalisées ;
- montants ;
- unités ;
- dates ;
- périodes ;
- portée ;
- lifecycle ;
- conditionnement ;
- mapping d'import ;
- statuts ;
- actions demandées.

Le frontend n'est jamais une autorité de validation.

---

## 24. Concurrence et transactions

Le modèle doit empêcher notamment :

- duplication concurrente du même Article fournisseur ;
- double création de la même édition ;
- chevauchement concurrent de Tarifs négociés ;
- mappings contradictoires lors d'imports concurrents ;
- fuite inter-Workspace ou inter-Dossier.

Les transactions MongoDB sont utilisées lorsqu'un invariant dépend de plusieurs écritures atomiques.

---

## 25. Audit et historique

Doivent être auditables selon leur importance :

- Fournisseur : création/modification/archivage ;
- Article : création/modification/archivage/remplacement ;
- édition : création/import/réimport/archivage ;
- mapping : validation/correction ;
- Tarif négocié : création/modification ;
- Prix facturé : création/validation/rejet ;
- Prix indicatif : création/remplacement/archivage ;
- favori : ajout/retrait ;
- politique tarifaire ;
- gouvernance globale.

L'AuditLog ne remplace jamais l'historique économique métier.

---

## 26. Archivage et suppression

Baseline :

~~~text
Fournisseur → archive
Article → archive
Catalogue/édition → archive
Tarif → historique conservé
Prix facturé → historique conservé
Prix indicatif → historique conservé
~~~

Aucune purge physique automatique des historiques économiques n'est requise en M-003 V1.

---

## 27. Frontend attendu

### Workspace

Fournisseurs :

- liste/recherche ;
- distinction global/privé ;
- création/édition/archivage privé selon droits.

Catalogues :

- liste par Fournisseur ;
- édition/millésime/période ;
- global/privé ;
- provenance ;
- organisation source, URL et date d'observation lorsqu'elles sont fournies ;
- import privé.

Import :

~~~text
fichier
→ Fournisseur
→ édition
→ colonnes
→ mapping
→ prévisualisation
→ ambiguïtés
→ confirmation
→ résultat
~~~

Articles :

- Référence Produit ;
- Fournisseur ;
- référence ;
- désignation ;
- marque ;
- conditionnement ;
- Prix applicable lorsque le contexte Dossier existe ;
- provenance et alertes.

Dossier :

- Références du magasin ;
- favoris ;
- fréquence lorsque disponible ;
- catalogue accessible ;
- Tarif négocié ;
- Prix facturé ;
- Prix indicatif Dossier ;
- Prix applicable ;
- source/fallback.

### Administration globale

Surface dédiée aux utilisateurs disposant des permissions Application Global :

- Fournisseurs globaux ;
- éditions globales ;
- imports globaux ;
- mappings ;
- lifecycle global.

---

## 28. Points d'extension Core

M-003 utilise les points d'extension existants :

- applicationRolePermission.registry ;
- applicationCapability.registry ;
- applicationRoutes.registry ;
- application-routes frontend ;
- workspace-navigation ;
- application-platform-navigation lorsque nécessaire ;
- application-dashboard lorsque nécessaire ;
- Application Global authorization.

Aucune modification du Core n'est identifiée comme nécessaire au moment de la validation du contrat.

Si un besoin générique manque réellement, il doit être traité dans saas-core-api avant intégration dans le produit.

---

## 29. Migrations et bootstrap

M-003 devra prévoir des migrations versionnées pour :

- indexes ;
- contraintes d'unicité ;
- enrichissement des permissions système owner ;
- autres backfills strictement nécessaires.

Les migrations M-001 et M-002 ne sont pas réécrites.

M-003 ne doit pas nécessiter de reset destructif M-002.

Les catalogues fournisseurs disponibles peuvent servir de bootstrap GLOBAL_SHARED après implémentation du moteur M-003 et validation de leur provenance/partageabilité.

Le bootstrap doit utiliser les mêmes invariants de rapprochement que les imports normaux.

---

## 30. Tests obligatoires

### Backend

Tenancy :

- Fournisseur privé invisible hors Workspace ;
- catalogue privé invisible hors Workspace ;
- Tarif négocié isolé par Dossier ;
- Prix facturé isolé par Dossier.

RBAC/capabilities :

- Owner dispose de toutes les permissions M-003 ;
- membre sans permission refusé ;
- rôle personnalisé appliqué ;
- import privé refusé sans capability, y compris pour l'Owner.

Fournisseurs/Articles :

- unicité ;
- normalisation ;
- archivage ;
- réutilisation d'Article ;
- remplacement tracé.

Catalogues/imports :

- portée global/privé ;
- édition historique ;
- réimport idempotent ;
- mapping ;
- preview ;
- ambiguïtés ;
- lignes non rapprochées ;
- rollback transactionnel.

Prix :

- Tarif fournisseur ;
- Tarif négocié ;
- Prix facturé ;
- Prix indicatif Global, Workspace et Dossier ;
- lecture Workspace du Prix repère global sans Favori ;
- prix `PACKAGE`, conditionnement plat et provenance structurée ;
- priorité des sources commerciales sur l'indicatif ;
- chevauchements refusés ;
- fraîcheur 12 mois calendaires ;
- fallback correct ;
- absence de prix différente de zéro ;
- aucun fallback inter-Dossier.

Résolution Article :

- zéro candidat ;
- un candidat ;
- plusieurs candidats ;
- aucune sélection automatique du moins cher.

### Frontend

- permissions ;
- capability d'import ;
- listes Fournisseurs/catalogues ;
- import/mapping ;
- ambiguïtés ;
- global/privé ;
- prix ;
- contexte Dossier ;
- Prix applicable et provenance.

### E2E critiques

~~~text
Owner seul
→ peut exercer toutes les opérations M-003 autorisées par l'offre

Workspace A importe un catalogue privé
→ Workspace B ne peut jamais le voir

Dossier A et Dossier B
→ même Article
→ prix locaux différents
→ Prix applicable propre à chacun

catalogue global
→ réutilisable par plusieurs Workspaces
→ aucune donnée Dossier partagée

réimport même édition
→ pas de doublon Article/catalogue
~~~

---

## 31. Cas limites

Protéger notamment :

- Fournisseurs homonymes ;
- référence fournisseur variant seulement par casse/espaces ;
- référence fournisseur absente ;
- désignation modifiée sans changement de référence ;
- conditionnement modifié ;
- données insuffisantes pour normaliser un prix ;
- Tarif négocié expiré ;
- Prix facturé ancien ;
- Article archivé encore présent dans l'historique ;
- catalogue archivé ;
- import partiellement rapproché ;
- plusieurs lignes candidates pour une même Référence Produit ;
- imports concurrents ;
- Dossier PAUSED/ARCHIVED/DELETED ;
- perte de membership pendant une opération.

---

## 32. Baseline V1 révisable

Les éléments suivants peuvent évoluer après tests métier réels sans remettre en cause l'architecture :

- champs Fournisseur facultatifs ;
- UX des listes/drawers ;
- workflow de rapprochement ;
- présentation de replacedBy ;
- durée standard de fraîcheur ;
- ergonomie des périodes tarifaires ;
- capabilities commerciales ;
- filtres ;
- seuil de fréquence ;
- modes suggestion/automatique ;
- conditionnements supplémentaires rencontrés.

Toute évolution doit être documentée avant de devenir un nouveau contrat.

---

## 33. Invariants structurants

~~~text
Workspace = frontière de tenancy

WORKSPACE_PRIVATE
→ jamais exposé hors Workspace

Tarif négocié
→ strictement Dossier

Prix facturé
→ strictement Dossier

Prix indicatif Dossier
→ strictement Dossier

Prix indicatif Workspace
→ fallback interne commun au Workspace

Prix repère global
→ dernier fallback commun en lecture seule

aucun prix d'un autre Dossier comme fallback

Owner
→ toutes les permissions métier Workspace
→ sans devenir administrateur global

catalogue Workspace
→ commun aux Dossiers du Workspace
→ jamais dupliqué par Dossier

ligne catalogue ambiguë
→ aucune création automatique dangereuse

Article fournisseur
→ distinct de la Référence Produit

prix absent
→ différent de zéro

historique économique
→ jamais écrasé silencieusement

backend
→ autorité du Prix applicable
~~~

---

## 34. Hors périmètre M-003 V1

Sont différés :

- OCR libre de factures/catalogues ;
- import utilisateur de PDF non structuré ;
- IA de rapprochement autonome ;
- CRM Fournisseur complet ;
- conditions de paiement ;
- franco de livraison ;
- calendrier logistique ;
- commandes ;
- réception ;
- stocks ;
- comptabilité ;
- sélection automatique du fournisseur le moins cher ;
- remplacement automatique d'un Article dans une fiche existante ;
- purge physique automatique des historiques économiques.

---

## 35. Critères d'acceptation

M-003 est acceptable lorsque :

1. Fournisseurs et catalogues global/privé respectent leurs portées ;
2. les Articles sont reliables aux Références Produit M-002 ;
3. plusieurs Articles peuvent représenter une même Référence Produit ;
4. les conditionnements permettent les normalisations fiables ;
5. les éditions sont historisées ;
6. le réimport ne recrée pas les identités déjà connues ;
7. les ambiguïtés restent contrôlées ;
8. les catalogues privés restent strictement Workspace ;
9. les Tarifs négociés et Prix facturés restent strictement Dossier ;
10. les Prix indicatifs restent explicitement distincts des sources commerciales et respectent leur portée Global/Workspace/Dossier ;
11. le Prix applicable respecte la politique Workspace puis utilise l'indicatif seulement en dernier recours ;
12. aucun fallback inter-Dossier n'existe ;
13. l'Owner possède toutes les permissions métier de son Workspace mais reste soumis aux capabilities ;
14. les autres membres restent contrôlés par RBAC ;
15. l'historique économique est conservé ;
16. les tests backend/frontend/E2E couvrent les invariants critiques ;
17. la Core Gate finale est verte ;
18. les tests métier et la validation visuelle sont réalisés avant merge.

---

## 36. Ordre d'implémentation

~~~text
branche feature/m003-suppliers-catalogs-pricing
→ constantes / permissions / capabilities
→ modèles + indexes
→ migrations
→ services métier
→ API + Zod
→ tests backend
→ frontend Workspace
→ administration globale nécessaire
→ tests frontend
→ E2E critiques
→ tests sur catalogues/cas réels
→ ajustements justifiés
→ release:check / Core Gate
→ une PR M-003
→ validation visuelle
→ merge
→ documentation de reprise
~~~

Le lot M-003 reste un lot cohérent unique. Les ajustements issus des tests métier sont intégrés dans cette même trajectoire tant qu'ils appartiennent au périmètre M-003.


---

## Extension 2026-10-03 — Prix repère global

Le contrat complémentaire suivant fait désormais partie du cadrage M-003 :

~~~text
docs/m003/M-003-GLOBAL-INDICATIVE-PRICING.md
~~~

Il étend le `Prix indicatif` existant avec une portée globale sans modifier l'identité Produit M-002.

Ordre de résolution complété :

~~~text
Prix facturé valide selon la politique
→ Tarif négocié valide
→ Tarif fournisseur applicable
→ Prix indicatif Dossier
→ Prix indicatif Workspace
→ Prix repère global
→ aucun prix
~~~

Le `Prix repère global` :

- référence un `ProductVariant` M-002 ;
- reste une donnée économique M-003 ;
- ne crée aucun Fournisseur ni Article fournisseur fictif ;
- sert de dernier fallback pour l'onboarding et la démonstration ;
- est maintenable par l'autorité Application Global Produit ;
- est historisé par remplacement comme les Prix indicatifs existants ;
- ne prime jamais sur une donnée commerciale ou locale plus précise.

Le corpus initial est versionné séparément du seed M-002. Aucun
conditionnement ni aucune provenance de marché ne sont inventés dans ce
corpus historique. En revanche, la maintenance Platform accepte désormais
un prix `PACKAGE`, son conditionnement plat et sa provenance structurée ; les
Workspaces les consultent en lecture seule.

---

## Complément validé — import autonome d'une liste d'Articles fournisseur (2026-10-09)

Le flux **Importer des Articles** est distinct du flux **Importer un catalogue**.
Il doit être accessible depuis l'onglet Articles et, avec l'autorité Application Global,
depuis le référentiel partagé. Le fournisseur est choisi explicitement, puis l'utilisateur
importe un CSV/XLS/XLSX, associe les colonnes, prévisualise et confirme.

- **Identité commerciale** : Fournisseur × référence fournisseur normalisée, avec
  ownership GLOBAL_SHARED ou WORKSPACE_PRIVATE. Une référence absente ne doit jamais être
  inventée : la ligne est affichée « à résoudre », mais aucun Article n'est créé.
- **Association à M-002** : un Article peut désormais être ACTIVE avec `productVariant=null`.
  L'API expose `associationStatus=PENDING` ou `ASSOCIATED`. L'association ultérieure
  est explicite, sous permission métier, avec validation de la Référence Produit.
  Un Article non associé n'est pas utilisable pour valoriser une fiche, fixer un prix
  sur base Produit, ni proposer une alternative d'optimisation.
- **Réimport** : une référence existante dans la même portée est réutilisée.
  Si son descriptif ou conditionnement change, les informations Article sont actualisées ;
  le Produit associé, l'identité fournisseur, les tarifs et la portée ne changent pas.
  Un Article global visible depuis un Workspace n'est jamais altéré ou recopié lors
  de cet import. Les Articles archivés nécessitent une réactivation explicite.
- **Sécurité** : permission ARTICLE_MANAGE et CATALOG_IMPORT en Workspace, capability
  commerciale d'import existante, autorité Application Global MANAGE au global,
  contrôle d'accès au Workspace, inspection ClamAV, transactions, verrouillage
  par référence et index d'unicité MongoDB.
- **Prévisualisation** : CREATE / UPDATE / UNCHANGED / SHARED / SKIPPED / INVALID.
  Une référence dupliquée dans le fichier ou un Article archivé bloque la confirmation ;
  une ligne SKIPPED est signalée mais n'empêche pas les autres lignes valides.
- **Stockage et audit** : sessions temporaires TTL 30 minutes ; pas de stockage
  commercial de fichier ; événement métier durable pour chaque import confirmé,
  contenant les identifiants des Articles créés et actualisés.
- **Frontière commerciale** : ne crée ni édition de catalogue, ni ligne de catalogue,
  ni Tarif fournisseur, ni Prix négocié ou Prix facturé. L'import catalogue historique
  reste inchangé.

Ce complément autorise les adaptations strictement nécessaires des modèles et services
M-003/M-004/M-005 ; il n'introduit aucun changement Core. L'annulation d'import et la
suppression contrôlée d'une édition commerciale sont un besoin distinct à finaliser,
avec vérification de toutes les dépendances économiques, sans effacer implicitement
les données déjà utilisées dans d'autres Dossiers ou éditions.

---

## Complément validé — cohérence UX des imports métier (2026-10-13)

Les assistants d'import Produits M-002, Articles fournisseur M-003 et
Catalogues fournisseur M-003 partagent une **présentation cohérente**, sans
fusionner leurs règles métier :

- titre visible et courte aide métier dans une icône d'information accessible ;
- sélection du fichier avec bouton « Choisir un fichier », nom du fichier ou
  « Aucun fichier sélectionné » en français et indication CSV/XLS/XLSX ;
- progression « Choisir → Associer → Vérifier → Terminer » ;
- état actif distingué visuellement par un cercle, une bordure et une graisse
  renforcés, états terminés cochés, étapes futures neutres ; statut également
  accessible aux lecteurs d'écran, sans signification portée par la couleur seule ;
- actions d'analyse, de prévisualisation, de confirmation et d'annulation situées
  de façon cohérente en pied de dialogue ;
- étape de fin lisible après confirmation réussie ; disposition responsive sans
  défilement horizontal de toute la boîte de dialogue ;
- correction possible du mapping après une prévisualisation M-003.

L'identité Produit M-002, les contrôles d'import existants, les permissions,
les contrats d'API et les règles économiques M-003 demeurent inchangés.

---

## Complément validé — liste tarifaire indépendante d'un catalogue (2026-10-13)

Un Fournisseur peut transmettre une liste de prix valable pendant une période
définie, sans édition de catalogue. Le parcours « Importer des Articles »
accepte ainsi les colonnes de prix en plus des identifiants et conditionnements,
sans imposer un Catalogue artificiel.

- **Source métier** : `SupplierTariff` reste le modèle tarifaire de référence.
  Chaque tarif possède soit une édition Catalogue, soit l'origine indépendante
  `PRICE_LIST` (nom de la liste, import source, provenance et dates de validité).
- **Temporalité** : date de début obligatoire pour une liste tarifaire ;
  date de fin facultative. Début postérieur à la fin refusé. Les bornes sont
  inclusives. Plusieurs listes historiques peuvent coexister sans chevauchement.
- **Concurrence** : l'import refuse tout chevauchement avec un tarif courant
  visible et applicable pour cet Article et cette portée. Aucun prix ancien
  n'est remplacé, fusionné ou recalculé silencieusement.
- **Sécurité** : les tarifs privés sur un Article global sont cloisonnés
  au Workspace ; l'autorité de gestion et la capability de l'import restent
  celles de M-003. Les autres Workspaces ne sont pas consultés lors de la
  vérification des chevauchements.
- **Cas sans prix** : le parcours Articles sans colonnes tarifaires reste
  fonctionnel et ne crée aucun `SupplierTariff`.
- **Association M-002** : un Article non associé conserve son prix commercial
  source et peut afficher le prix ramené au kg/L/unité si la base et le
  conditionnement le permettent. La valorisation d'une fiche nécessite
  toujours l'association Produit préalable. Après association, la normalisation
  est recalculée à la lecture côté serveur sans réécrire le tarif historique.
- **Projection API** : la liste Articles expose un état de disponibilité
  tarifaire, la provenance, les montants HT par conditionnement et par unité
  calculables, et un libellé de conditionnement synthétisé par le backend.
  Le frontend ne réalise aucun calcul monétaire ou de quantité.
- **Complément d'affichage du conditionnement (2026-10-13)** : conserver
  le libellé commercial et exposer une ligne secondaire calculée côté
  backend : poids net total en kg pour une quantité de masse, volume total
  en litres pour une quantité volumique, quantité totale pour UNIT.
  Un poids net déclaré différent du total de masse calculé n'est ni
  effacé ni adopté silencieusement : l'interface distingue le total
  calculé et signale la valeur déclarée à vérifier. Si le conditionnement
  est insuffisant, aucune quantité totale n'est inventée.
- **Prix par pièce (2026-10-13)** : en plus des prix existants du colis
  et de l'unité normalisée (kg/L/unité), le backend projette un prix par
  pièce lorsque le colis décrit explicitement plusieurs éléments
  (nombre entier supérieur à un, quantité par élément et unité définies)
  et que le prix du colis est calculable. Aucun prix par pièce n'est
  inventé pour un simple sac, un bidon ou un conditionnement incomplet.
  La dimension UNIT reste portée par le prix normalisé M-002, sans
  présumer que chaque élément commercial est une unité de recette.
  Le tarif historique utilise son packagingSnapshot si présent.
  La présentation arrondit à trois décimales, sans arrondi anticipé
  du calcul interne. Aucune modification du modèle métier ni du Core.
- **Compacité du tableau Articles (2026-10-13)** : les colonnes
  Conditionnement et Tarif fournisseur HT affichent respectivement le
  libellé commercial et le prix principal, sur une seule ligne chacun.
  Si des projections complémentaires existent, un bouton icône
  `PackageSearch` (quantité totale, avertissement sur le poids déclaré)
  ou `Calculator` (prix par pièce, kg, L, UNIT selon disponibilité)
  ouvre un popover au survol, au clic, au clavier ou au toucher.
  Aucune icône n'est affichée si son popover serait vide. L'avertissement
  de masse reste signalé par une icône de couleur `warning` avec
  libellé accessible explicite. Les montants et quantités restent
  ceux projetés par le backend, sans calcul React. La fiche détail
  Article conserve son affichage développé.
- **UX** : compteurs Fournisseurs actifs et Articles actifs indépendants
  de la pagination ; badge « Non associé » ; suppression du sous-libellé
  de portée dans la colonne Fournisseur de l'onglet Articles.
- **Migration** : l'ancien index unique par édition/Article doit être
  remplacé par un index qui ne contraint que les vrais tarifs de catalogue ;
  index dédié aux listes tarifaires. Migration uniquement après audit M-003
  et contrôle de la base concernée.

Ce complément ne crée ni Catalogue, ni édition fictive, ni seconde primitive
de Prix applicable. L'archivage d'une liste, la correction d'une période
déjà enregistrée et la gestion assistée des collisions historiques constituent
un workflow ultérieur à cadrer. Aucun test ou gate n'est présumé réussi.

**Invariance historique des quantités :** chaque tarif de liste conserve une copie
structurée du conditionnement tel qu'importé. Toute modification ultérieure
de l'Article ne modifie pas son calcul économique historique.


### Avenant validé — échéance tarifaire facultative et import immédiat (2026-10-13)

La saisie d'une période n'est pas une condition pour importer des prix présents
dans un fichier fournisseur.

- **Option A validée** : si l'utilisateur ne déclare pas de période,
  le backend rend le tarif applicable à l'instant de la confirmation de
  l'import (`validFrom` horodaté côté serveur), avec `validTo = null`.
  L'absence d'expiration déclarée ne signifie pas que le prix est garanti
  indéfiniment par le Fournisseur.
- Le backend génère également un intitulé de provenance lisible, au format
  « Prix importés le jj/mm/aaaa » (date française). Aucune date ni aucun
  montant ne sont calculés dans React.
- **Période définie** : une case à cocher ouvre la référence de la liste de
  prix, sa provenance et les deux calendriers français `jj/mm/aaaa`
  (début obligatoire, fin facultative). Les dates sont transmises à l'API
  au format ISO. Les imports existants avec nom et dates sans
  `validityMode` restent acceptés par compatibilité.
- **Import des prix** : une coche distincte permet d'importer seulement les
  Articles même si le fichier possède des colonnes tarifaires. Les champs
  de prix non retenus sont exclus du mapping envoyé au serveur.
- **Unité commerciale** : le libellé devient « À quoi correspond le prix
  indiqué dans le fichier ? » ; la colonne d'unité mappée du fichier
  prévaut sur la valeur par défaut, les calculs restent backend.
- **Intégrité historique** : les conflits de périodes, y compris les
  tarifs sans date d'expiration, restent bloquants. Un réimport identique
  n'écrase pas l'historique ; un changement de tarif doit être traité par
  un workflow explicite distinct.

Cet avenant précise la règle précédente « date de début obligatoire » :
elle reste obligatoire *dans le modèle persistant*, mais elle peut être
attribuée par le serveur à la confirmation plutôt que saisie par l'utilisateur.

---

## Avenant M-003 — correction des Articles et des prix privés (2026-10-13)

**Décision produit :** un utilisateur habilité peut corriger ses propres données
fournisseur depuis la fiche détaillée d'un Article, sans archiver l'Article
ni réimporter le fichier. La correction ne doit pas détruire une valeur
historique ni modifier les tarifs d'un autre Workspace.

- **Présentation :** la désignation fournisseur est en premier et la
  référence commerciale en second, sous la forme « Réf. fournisseur : ... ».
  Le nom de la liste de prix est retiré du tableau, mais reste disponible
  dans le détail et l'historique.
- **Association Produit :** un Article privé actif peut être associé,
  réassocié ou dissocié explicitement. Le retrait passe par
  `PATCH /supplier-articles/:articleId` avec `productVariantId: null`.
  La référence fournisseur et la désignation ne sont pas modifiées par
  cette opération. Le backend vérifie l'identité et le statut du Produit
  en cas d'association.
- **Détails et informations commerciales :** consultation de l'Article,
  modification de sa désignation, de sa marque et de son conditionnement
  existants via l'API M-003. Les anciens tarifs conservent leur
  `packagingSnapshot` pour l'historique économique.
- **Correction d'erreur tarifaire :** un prix provenant d'une mercuriale
  indépendante privée (`sourceKind=PRICE_LIST`) peut être corrigé sur
  sa période existante avec nouveau montant et base tarifaire, et motif
  facultatif (500 caractères maximum). Un motif absent ou vide devient `null`.
  L'ancienne version passe à `isCurrent=false`, sans suppression ; la
  nouvelle version immuable conserve l'import d'origine, le conditionnement,
  la période, la devise, et référence l'ancienne version (`replacesTariff`).
  Un événement d'audit `SUPPLIER_TARIFF_CORRECTED` est produit
  avec acteur, Article, identifiant antérieur et motif facultatif
  (`null` si aucun motif n'a été saisi).
- **Concurrence :** une même correction est sérialisée dans une
  transaction par le verrou Commerce déjà utilisé à l'import ; la lecture
  de `isCurrent=true` est effectuée après acquisition du verrou.
  Un index unique partiel garantit une seule combinaison
  import/Article/numéro de révision. L'unicité de la révision courante
  relève du protocole transactionnel, et non d'un index unique direct
  sur `isCurrent` : celui-ci empêchait le remplacement atomique
  d'une révision par une autre sous MongoDB.
- **Sécurité :** la lecture de l'historique requiert les permissions
  `supplier:article:read` ET `supplier:catalog:read` ; la correction
  exige `supplier:article:manage` ET `supplier:catalog:manage` et les
  contrôles d'accès Workspace. Un Article global ne devient pas modifiable
  par un Workspace pour autant. Seuls les tarifs privés du Workspace
  peuvent être corrigés dans ce parcours.
- **Hors périmètre de ce correctif :** modification directe d'un tarif
  issu d'une édition de catalogue, création d'un nouveau tarif à une
  date d'effet différente, extinction/archivage d'une liste complète,
  réécriture des valorisations historiques. Un nouveau prix à une
  nouvelle date ne doit pas être simulé par une « correction de saisie »
  rétrospective. Ces workflows temporels devront être cadrés séparément.

Le tableau et les formulaires React consomment exclusivement les projections
de prix/conditionnement calculées dans le backend ; aucun calcul monétaire
n'est ajouté dans le frontend.

---

## Avenant validé — dernier tarif connu et correction des périodes (2026-10-14)

**Décision produit expresse :** si aucun tarif actuellement applicable n'existe,
le dernier tarif fournisseur de période expirée reste visible ET peut valoriser
les Fiches techniques, sous réserve des politiques de priorité des prix
du Workspace. Son état `EXPIRED` et l'alerte
`LAST_KNOWN_SUPPLIER_TARIFF_EXPIRED` sont obligatoires et transmis par
l'API aux consommateurs M-004. Les tarifs futurs ne sont pas utilisés
avant leur début. Le dernier prix connu est sélectionné par la fin
de période la plus récente, puis le début de période en départage ;
une révision remplacée ou une édition Catalogue archivée est exclue.
Tout conflit entre tarifs simultanément applicables demeure bloquant
et n'autorise pas de sélection arbitraire.

**Dates civiles :** les dates de fin explicites saisies sans heure sont
inclusives jusqu'à la fin de la journée métier (Europe/Paris).
Les dates horodatées par le serveur pour `FROM_IMPORT` conservent leur
précision. La même comparaison de périodes est utilisée pour importer
et corriger, avec prise en compte des changements d'heure.

**Correction de la période :** un utilisateur habilité peut modifier
la date de début et la date de fin d'une liste privée `PRICE_LIST`,
y compris lorsqu'elle est expirée, sans réimport. Le montant, la base,
la devise, la provenance et le conditionnement figé demeurent inchangés.
La correction crée une nouvelle révision immuable, marque l'ancienne
comme remplacée, conserve les deux périodes et journalise l'acteur et
les anciennes/nouvelles dates. Les chevauchements, le cloisonnement
Workspace, les droits ARTICLE_MANAGE + CATALOG_MANAGE et l'accès
en écriture sont vérifiés. Les tarifs Catalogue globaux ne sont pas
modifiables par ce parcours. Motif facultatif (max. 500 caractères).

**Interface :** les colonnes du tableau Articles identifient le dernier
tarif expiré avec un avertissement non bloquant ; son détail et les
prix complémentaires restent consultables. La fiche Article propose
« Modifier la période » en plus de « Corriger le prix » et retrouve
son historique. La carte du Prix applicable et les lignes de Fiche
technique signalent explicitement toute valorisation à partir d'un
tarif expiré, sans remettre en cause les valorisations historisées.

**Filtres Articles :** toolbar compacte sans labels visuels Recherche
ou Statut, avec recherche serveur « Rechercher un article… », filtre
Fournisseur recherchable et filtre Statut juxtaposés ; filtres combinables,
page réinitialisée à 1. Le sélecteur de Fournisseurs interroge
l'API et invite à affiner si plus de 50 résultats, sans tronquer
silencieusement. Labels accessibles conservés.

---

## Complément UX validé — drawer Article à onglets (2026-10-14)

Le drawer « Article fournisseur » suit désormais la même composition que
les drawers Fournisseur, Dossier et Analyse : trois onglets métier
`Infos Article`, `Association`, `Tarif fournisseur`
(`Tabs`/variante `section` déjà partagés par l'application).

- Ouverture initiale sur `Infos Article` ; réinitialisation de cet onglet
  lors de la réouverture du drawer ou de la sélection d'un autre Article.
  La désignation reste dans le titre du drawer, sans répétition dans
  le contenu ; référence, nom du fournisseur, marque, conditionnement
  et statut composent un tableau de lecture compact. Action `Modifier`
  maintenue uniquement selon les droits et l'état de l'Article.
- `Association` affiche le Produit associé ou `Non associé` ; le
  bouton `Modifier l’association` conserve les gardes existantes.
  L'avertissement concernant les valorisations futures et la
  conservation des données historiques est consultable via un
  `InfoTooltip` placé au niveau de cette action, sans encadré
  permanent.
- `Tarif fournisseur` reste invisible sans autorisation de lecture.
  Prix principal, prix complémentaires calculés par M-003,
  provenance et dates de validité sont visibles immédiatement.
  Le dernier prix expiré conserve son avertissement explicite ;
  `Corriger le prix` et `Modifier la période` restent conditionnés
  par les permissions, le type `PRICE_LIST` et le statut actif.
  Ces deux actions sont positionnées dans l'en-tête de la carte
  « Prix fournisseur HT », à droite du titre, comme les actions des
  autres onglets. En largeur réduite, elles se réorganisent sans
  débordement ; aucun bloc d'actions supplémentaire ne s'affiche
  sous la carte.
  L'historique reste replié initialement et consultable sur demande,
  avec défilement local borné si nécessaire.

La réduction du scroll vise les cas courants ; elle ne masque
aucune information nécessaire et ne prétend pas empêcher le défilement
sur petit écran. L'accès historique, le backend, les règles de
valorisation, les schémas MongoDB et les primitives Core sont inchangés.
