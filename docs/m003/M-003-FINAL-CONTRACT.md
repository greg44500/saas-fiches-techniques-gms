# M-003 — Fournisseurs, Articles, conditionnements, prix et catalogues

**Statut : VALIDÉ — baseline V1 autorisant l'implémentation**  
**Date de validation : 2026-09-27**  
**Prérequis : M-001 et M-002 clôturés**  
**Core intégré au moment du cadrage : v1.2.1 — d90d8f1e6034cbbf4f63de2be7312eae69b1d698**

> Ce contrat est la source de vérité fonctionnelle de M-003.
> Les choix explicitement qualifiés de baseline V1 sont révisables après tests métier réels.
> Les invariants de tenancy, d'isolation Dossier et d'historisation ne sont pas des préférences UX.
> Aucun modèle Mongoose M-003 ne doit précéder ce contrat ; l'implémentation peut commencer après sa validation.

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
