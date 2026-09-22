# SAAS-FICHES-TECHNIQUES-GMS — Cadrage produit

**Statut :** VALIDÉ — fondations transversales approuvées avant M-001  
**Dernière mise à jour :** 2026-09-21  
**Périmètre :** définition du problème métier, des principes produit et des invariants à préserver avant tout module métier

> Ce document formalise les fondations transversales validées du produit.  
> Les sujets différés restent rattachés au module qui les nécessite et ne doivent pas être transformés en règles techniques par anticipation.
>
> Le cadrage global est validé. Aucun modèle métier Mongoose ne doit toutefois être créé avant validation détaillée du module concerné, en commençant par M-001.

---

## 1. Principe directeur

```text
Core = fondations génériques
Produit = métier
```

Le produit doit s'appuyer sur les mécanismes Core existants pour l'authentification, les Workspaces, la tenancy, le RBAC, les capabilities, les quotas, l'audit et les points d'extension.

Toute évolution générique nécessaire à plusieurs SaaS reste candidate au Core.

---

## 2. Problème métier

Le produit vise des utilisateurs qui travaillent pour un ou plusieurs magasins et doivent créer, maintenir et exploiter des fiches techniques et des fiches process à partir de produits réellement achetés.

Les conditions d'approvisionnement peuvent varier selon le magasin :

- fournisseur ;
- référence fournisseur ;
- conditionnement ;
- disponibilité ;
- prix ;
- date d'effet du prix.

Un même produit métier peut donc être utilisé dans plusieurs magasins avec des conditions commerciales différentes.

Le besoin principal est de centraliser les données produit et de les contextualiser automatiquement pour le magasin concerné afin d'obtenir des fiches techniques fiables, calculées et historisées.

---

## 3. Organisation générale validée

### 3.1 Workspace

Le Workspace reste la frontière de tenancy du Core.

Il représente l'espace de travail du client du SaaS et peut contenir plusieurs contextes magasin.

Les données métier d'un Workspace ne doivent pas être partagées implicitement avec un autre Workspace.


### 3.2 Dossier / magasin

L'utilisateur travaille dans un dossier correspondant au contexte d'un magasin pour lequel il réalise ses travaux.

Organisation validée :

```text
Workspace
→ plusieurs dossiers
→ 1 dossier = exactement 1 magasin en V1
```

Le dossier est une identité métier durable. Il porte les informations opérationnelles du magasin et contextualise notamment les prix, références locales, fiches techniques, fiches process et droits d'accès.

Données métier déjà identifiées pour le dossier :

- nom du dossier / magasin ;
- enseigne, distincte du nom lorsque cette distinction apporte une valeur métier ;
- localisation avec ville et code postal lorsque disponibles ;
- adresse complète lorsqu'elle est connue ;
- email principal destiné notamment à l'envoi de documents depuis l'application ;
- téléphone facultatif ;
- nom du responsable / interlocuteur métier, distinct de l'utilisateur qui crée le dossier ;
- statut du dossier ;
- dates et auteurs de création / modification.

En V1, le seul champ métier saisi obligatoirement à la création est le **nom du Dossier / magasin**. L'enseigne, l'adresse, le code postal, la ville, l'email documents, le téléphone et le responsable / interlocuteur sont facultatifs. Les champs système nécessaires à l'ownership, au lifecycle et à l'audit restent gérés par le backend. Une fonctionnalité ultérieure peut exiger ponctuellement une donnée facultative lorsqu'elle en dépend, par exemple un email avant un envoi de document.

La saisie de localisation bénéficie d'une autocomplétion facultative basée en V1 sur le service d'autocomplétion de la Géoplateforme / IGN alimenté notamment par la Base Adresse Nationale.

Contrat M-001 :

```text
3 caractères significatifs minimum
→ debounce d'environ 300 ms
→ type StreetAddress
→ maximum 8 suggestions
```

La saisie manuelle reste toujours disponible. Une indisponibilité, un timeout, une limitation de débit ou l'absence de résultat ne bloque jamais la création ou la modification du Dossier.

L'intégration frontend passe par un adapter dédié afin que le formulaire ne dépende pas du payload brut du fournisseur. M-001 ne persiste que `address`, `postalCode` et `city` ; aucune coordonnée, identifiant BAN/Géoplateforme ou payload fournisseur n'est stocké sans besoin métier ultérieur démontré.

Les informations opérationnelles du dossier sont modifiables par un utilisateur autorisé sans créer un nouveau dossier : nom, enseigne, localisation, email, téléphone, responsable et autres données utiles au fonctionnement métier. Les changements significatifs sont auditables.

```text
responsable / interlocuteur
→ donnée métier du magasin

createdBy / updatedBy
→ audit système
```

Une modification des coordonnées du dossier ne réécrit pas l'historique économique ou les versions validées des fiches.

#### Cycle de vie du dossier

États fonctionnels validés :

```text
ACTIVE
→ dossier opérationnel

PAUSED
→ activité temporairement suspendue
→ affectations conservées mais non opérationnelles

ARCHIVED
→ activité terminée / sortie de l'usage courant
→ historique conservé et consultation contrôlée

DELETED
→ suppression logique
→ accès métier coupé immédiatement
→ ressources enfants conservées historiquement mais inaccessibles dans les flux normaux
```

La suppression d'un dossier n'entraîne pas une destruction immédiate des Fiches techniques, Fiches process, prix, historiques ou affectations. Elle rend le contexte indisponible et invalide fonctionnellement les accès existants.

Les relations d'accès peuvent rester conservées pour l'audit mais n'accordent aucun droit effectif lorsque le dossier ne permet pas l'action demandée.

La restauration d'un dossier supprimé est possible tant qu'une purge définitive n'a pas eu lieu. La restauration doit revenir dans un état non opérationnel nécessitant une vérification, par défaut `PAUSED`, plutôt que de réactiver silencieusement le magasin.

La purge physique constitue une opération distincte, contrôlée et auditée. Pour M-001, un Dossier `DELETED` n'est soumis à aucune purge automatique : sa purge définitive reste différée jusqu'au cadrage du graphe métier complet. Cette règle est distincte de la politique de corbeille applicable aux ressources métier purgeables comme les futurs DRAFTS supprimés.

Transitions conceptuelles retenues :

```text
ACTIVE → PAUSED | ARCHIVED | DELETED
PAUSED → ACTIVE | ARCHIVED | DELETED
ARCHIVED → PAUSED | DELETED
DELETED → PAUSED après restauration contrôlée
```

### 3.3 Isolation stricte des contextes magasin

L'accès d'un utilisateur à plusieurs magasins permet de **changer de contexte**, jamais de fusionner les contextes.

Invariant :

```text
contexte actif = un seul dossier / magasin
```

Toutes les données commerciales contextualisées utilisées dans une Fiche technique doivent provenir du magasin actif :

- Tarif négocié ;
- Prix facturé ;
- revue tarifaire ;
- autres conditions commerciales locales.

Un prix spécifique d'un autre magasin ne fait jamais partie de la chaîne de fallback, même si l'utilisateur possède les droits d'accès aux deux magasins.

Exemple :

```text
Fiche du Magasin Nantes
→ Prix facturé Nantes si applicable
→ sinon Tarif négocié Nantes
→ sinon Tarif fournisseur de référence

Tarif négocié Saint-Nazaire
→ jamais utilisé dans le contexte Nantes
```

Le contrôle doit être garanti par le backend et non par l'interface seule.

Le Workspace Owner peut accéder à tous les magasins, et un collaborateur peut recevoir un périmètre multi-magasins, mais tous travaillent toujours dans un contexte magasin actif lorsqu'ils créent, modifient ou valorisent une fiche.

### 3.4 Référentiel Produit commun au SaaS et catalogue d'usage du Workspace

L'identité canonique d'un Produit de référence n'est pas recréée dans chaque Workspace.

Le SaaS maintient un **référentiel Produit canonique partagé** pour les données génériques non confidentielles :

```text
Référentiel SaaS
→ Carotte
→ Oignon
→ Farine
→ Film alimentaire
→ ...
```

Un Workspace possède ensuite son **catalogue d'usage**, qui référence les Produits canoniques dont il a besoin sans copier leur identité.

Conceptuellement :

```text
Produit canonique SaaS
→ 1 seule identité de référence

Workspace
→ sélection / relation d'usage vers ce Produit
→ aucune copie du Produit canonique

Dossier
→ exploite les Produits disponibles dans son Workspace
→ contextualise les données magasin
```

La relation d'usage du Workspace pourra être matérialisée ultérieurement par un concept de type `WorkspaceProduct`, sans préjuger du schéma Mongoose final de M-002.

Les données partagées au niveau SaaS doivent rester strictement génériques. Elles ne contiennent jamais de tarif négocié, prix facturé, historique commercial local, fournisseur choisi par un magasin ou autre donnée confidentielle d'un tenant.

Les utilisateurs autorisés doivent pouvoir rechercher un Produit du référentiel commun puis l'ajouter à leur catalogue Workspace. Si le Produit n'existe réellement pas, le parcours M-002 devra permettre de proposer/créer une nouvelle identité canonique après contrôle de doublon.

Invariant :

```text
même réalité Produit canonique
→ une seule identité de référence dans le SaaS
```

Les variantes de casse, espaces, accents, singulier/pluriel et fautes d'orthographe courantes ne doivent pas créer silencieusement des Produits concurrents. Le contrôle doit combiner normalisation, alias et recherche de proximité avant toute création. L'index d'unicité technique seul ne suffit pas à garantir l'unicité sémantique.

La politique exacte de contribution/modération d'un nouveau Produit global reste à fermer dans M-002 ; elle ne doit pas être inventée pendant M-001.

---


### 3.5 Navigation Workspace, consultation d'un dossier et contexte actif

Le produit distingue clairement quatre surfaces UX :

```text
Liste Dossiers
→ repérage, recherche et filtres

Drawer Dossier
→ consultation / navigation / administration légère
→ ne change jamais le contexte magasin actif

Dialog Dossier
→ création / modification focalisée

Page Dossier
→ véritable espace de travail métier
→ contexte magasin explicite
```

Le drawer d'un dossier doit permettre de comprendre son contenu sans l'ouvrir comme contexte de travail. En M-001, il présente selon les permissions :

- les informations générales du magasin ;
- les membres ayant accès au dossier ;
- l'activité métier du produit ;
- les actions d'administration du lifecycle ;
- l'action explicite « Ouvrir le dossier » lorsque le Dossier est ACTIVE.

Les futurs modules Fiches techniques, Produits contextualisés, Process et outils d'optimisation ne sont pas exécutés dans le drawer. Ils s'intègrent dans la vraie page de travail du Dossier.

L'activité métier du Dossier est distincte de l'AuditLog Core. Elle est portée par la primitive produit `BusinessActivityEvent` et filtrée selon les permissions et le scope Dossier.

L'ouverture du drawer de Nantes puis de Saint-Nazaire ne doit jamais modifier implicitement le contexte magasin actif.

La création et la modification des informations générales utilisent un Dialog métier basé sur les primitives shadcn/Base UI déjà présentes dans le Core. Le formulaire métier est réutilisable entre création et édition ; `ConfirmationDialog` reste réservé aux confirmations et n'est pas détourné en formulaire CRUD.

L'action « Ouvrir le dossier » navigue vers une vraie route de travail :

```text
/workspaces/:workspaceId/dossiers/:dossierId
```

Seul un Dossier ACTIVE peut devenir un contexte de travail opérationnel. PAUSED, ARCHIVED et DELETED restent consultables/administrables selon leurs règles mais ne sont pas ouverts comme contexte actif.

La route constitue la source UX du contexte sélectionné, sans créer de `currentDossier` backend ni de `activeDossierId` persistant comme autorité. Chaque requête backend reste autorisée indépendamment.

Depuis tout dossier ouvert, le Dashboard Workspace doit rester accessible en un clic.

Le Dashboard Workspace constitue la surface de pilotage globale du Workspace : Produits, Dossiers, Fiches techniques, Fiches process, alertes, activité et accès au panneau de configuration métier selon les modules réellement disponibles.

La Sidebar Workspace devra être recomposée avec les sections métier du produit en utilisant le point d'extension Core `frontend/src/app/workspace-navigation.js`. Sa structure définitive sera arrêtée après validation du périmètre V1 afin de distinguer clairement :

```text
référentiel partagé SaaS
→ identités Produit canoniques

ressources globales Workspace
→ catalogue d'usage Produit, Fournisseurs, Articles, catalogues fournisseur, administration...

ressources contextualisées dossier
→ Fiches, références magasin, prix locaux, process...
```

## 4. Principe de fiabilité des données

Règle directrice :

> L'utilisateur déclare les faits métier nécessaires ; l'application contrôle, normalise et calcule automatiquement toute donnée qui peut être déduite.

### 4.1 Vocabulaires métier et statuts backend-driven

Les statuts persistants et autres vocabulaires métier structurants ont une source canonique backend.

Pattern obligatoire :

```text
registry / constantes backend
→ modèles
→ validations Zod
→ services
→ métadonnées HTTP
→ frontend
```

Le frontend ne maintient pas de liste statique concurrente de statuts ni de mapping métier local des valeurs.

Lorsqu'un écran doit proposer ou afficher un vocabulaire métier, le backend expose les métadonnées nécessaires, notamment `value` et `label`, dérivées de la source canonique.

Cette règle s'applique à M-001 et doit être conservée dans les futurs modules Produits, Articles, Fiches techniques et autres ressources portant un lifecycle.

Le frontend reste responsable de la présentation visuelle ; le backend reste l'autorité du vocabulaire, des transitions et des règles métier.

Conséquences :

- une valeur calculable ne doit pas être demandée en saisie libre ;
- les validations frontend ne remplacent jamais les validations backend ;
- les valeurs dérivées sont calculées par la logique métier backend ;
- les incohérences sont bloquées ou signalées ;
- une valeur absente d'une source ne doit jamais être inventée ;
- les données historiques ne doivent pas être réécrites silencieusement par une modification ultérieure.

Exemples :

```text
quantités ingrédients
→ calcul automatique de la part dans la recette

prix + rendement + quantité
→ calcul automatique du coût matière

objectif de marge
→ calcul automatique du prix théorique

prix de vente retenu
→ calcul automatique de la marge réellement obtenue
```

---

## 5. Produit — définition métier validée

Un produit représente une denrée ou un composant utilisable dans une fiche technique, indépendamment de son fournisseur et de son prix.

### 5.1 Identité canonique, nom et déclinaisons structurées

Le Produit de référence représente d'abord une identité métier canonique, par exemple :

```text
Carotte
Oignon
Farine
Film alimentaire
```

Cette identité ne doit pas être recréée sous des variantes lexicales équivalentes telles que `carotte`, `Carottes` ou une faute d'orthographe reconnue comme désignant la même réalité.

Le libellé affiché reste lisible pour l'utilisateur, mais l'identité ne repose pas uniquement sur une chaîne libre.

Les formes et états qui modifient réellement l'usage, le rendement ou la sélection d'un Article fournisseur doivent être identifiés de manière structurée autour de l'identité canonique.

Axes conceptuels à cadrer précisément dans M-002 :

```text
Produit canonique
→ Carotte

forme
→ entière / rondelles / râpée / dés / julienne / purée / ...

état ou transformation
→ brute / pelée / cuite / blanchie / prête à l'emploi / ...

conservation lorsque pertinente
→ fraîche / surgelée / appertisée / ...
```

Exemple :

```text
Carotte
→ forme : râpée
→ état : prête à l'emploi
→ conservation : fraîche
```

L'interface peut composer un libellé lisible comme `Carotte râpée prête à l'emploi`, sans transformer chaque variante orthographique du libellé en nouvelle identité canonique.

Une transformation qui crée réellement un produit composé ou une formulation différente ne doit pas être assimilée automatiquement à une simple forme. Par exemple, une « purée de carottes » industrielle peut contenir d'autres ingrédients. La frontière entre déclinaison et Produit distinct doit être cadrée dans M-002 à partir de critères métier, jamais par simple comparaison de texte.

### 5.2 Données minimales du produit

Socle conceptuel actuellement retenu :

- identité / nom canonique — obligatoire ;
- clé normalisée et alias — nécessaires au contrôle des doublons et à la recherche ;
- catégorie — nécessaire au classement, tri, recherche et aux analyses ;
- forme / état / conservation — structurés lorsqu'ils distinguent réellement l'usage ;
- gamme alimentaire — uniquement lorsqu'elle est pertinente ;
- unité de référence — nécessaire aux calculs ;
- taux de rendement — caractéristique métier de la déclinaison réellement utilisée lorsque le rendement en dépend ;
- photo — facultative ;
- notes — facultatives, sans logique métier cachée ;
- date de création — système ;
- date de dernière modification — système ;
- créé par — audit ;
- modifié par — audit ;
- historique des modifications significatives — à préserver.

### 5.3 Catégorie

La catégorie sert à classer et filtrer les produits et pourra alimenter les analyses futures.

La liste canonique des catégories n'est pas encore définie.

**Point ouvert :** catégorie unique ou possibilité d'appartenance multiple.

### 5.4 Gamme alimentaire

La notion de gamme n'est pas obligatoire pour tous les produits.

Lorsqu'elle est pertinente, le référentiel métier doit permettre les gammes 1 à 5 ainsi qu'une valeur « non applicable ».

Exemple validé :

```text
Farine
→ gamme : non applicable
→ rendement : 100 %
```

La gamme aide à comprendre la nature et le niveau de préparation/conservation du produit, mais ne doit jamais imposer à elle seule un rendement universel.

Référence professionnelle de cadrage :

- 1re gamme : frais ;
- 2e gamme : conserve / appertisé ;
- 3e gamme : surgelé ;
- 4e gamme : cru prêt à l'emploi ;
- 5e gamme : cuit prêt à l'emploi.

Cette classification est un référentiel professionnel ; elle ne doit pas être forcée lorsqu'elle n'est pas pertinente.

### 5.5 Unité de référence

Les calculs doivent reposer sur des unités normalisées, par exemple :

```text
masse
→ g / kg

volume
→ ml / cl / l

nombre
→ unité
```

Les notions comme carton, sac, boîte, seau ou barquette relèvent du conditionnement commercial et non de l'unité mathématique de référence du produit.

### 5.6 Taux de rendement

Le taux de rendement représente la part réellement valorisable du produit.

```text
100 %
→ 100 % du produit est utilisé

< 100 %
→ pertes, parage ou parties non valorisées
```

Exemples :

- carcasse de volaille ;
- peau ou arêtes de poisson ;
- épluchures de légumes.

Orientation validée :

- le rendement de référence est défini en amont sur le produit ;
- la fiche technique l'utilise automatiquement ;
- l'utilisateur ne ressaisit pas librement ce taux lors de la création ordinaire d'une fiche.

Lorsqu'une donnée objective permet le calcul du rendement, l'application doit le calculer automatiquement.

Exemple pour une conserve :

```text
poids net = 800 g
poids net égoutté = 480 g

rendement = 480 / 800 × 100
           = 60 %
```

Si le poids net égoutté n'est pas disponible, le système ne doit pas inventer le rendement.

**Extension à préserver :** possibilité future d'une exception de rendement documentée et historisée, sans obligation de la développer en V1.

---

## 6. Fournisseurs, articles fournisseur et tarifs

Le Produit ne contient pas directement son fournisseur, sa référence commerciale, son conditionnement ni son prix.

Le domaine distingue conceptuellement :

```text
Produit
→ ce qui est réellement utilisé dans une fiche

Fournisseur
→ acteur qui commercialise

Article fournisseur
→ référence commerciale précise d'un Produit chez un Fournisseur

Tarif fournisseur de référence
→ prix issu d'un catalogue / mercuriale sans magasin nécessaire

Tarif spécifique magasin
→ condition commerciale connue pour un magasin donné

Prix observé
→ prix réellement constaté, par exemple sur une facture
```

### 6.1 Fournisseur

Les fournisseurs sont créés et gérés par le client ; Sysco et SYCAL ne sont que les premières sources réelles disponibles pour les essais.

Le Fournisseur n'est pas un CRM. Le socle envisagé reste volontairement simple : nom, éventuel code interne, coordonnées/notes facultatives, statut et traçabilité.

### 6.2 Plusieurs articles pour un même Produit

Règle validée :

> Un même Produit peut être associé à plusieurs Articles fournisseur actifs chez un même Fournisseur.

Exemple :

```text
Mozzarella râpée
└── Sysco
    ├── réf. A123 — sac 2 kg
    ├── réf. B456 — carton 4 × 2,5 kg
    └── réf. C789 — sachet 500 g
```

Chaque Article fournisseur possède sa propre référence, sa désignation fournisseur, son conditionnement, ses tarifs et son historique.

Le modèle doit également permettre qu'un même Produit soit proposé par plusieurs Fournisseurs.

### 6.3 Données d'un Article fournisseur

Le socle fonctionnel doit pouvoir représenter au minimum :

- Fournisseur ;
- Produit associé ;
- référence fournisseur lorsqu'elle existe ;
- désignation fournisseur originale ;
- marque éventuelle ;
- conditionnement structuré ;
- libellé fournisseur du conditionnement ;
- poids net lorsqu'il est pertinent ;
- poids net égoutté lorsqu'il est pertinent ;
- statut actif / archivé ;
- dates et auteurs de création / modification.

La désignation fournisseur originale est conservée même si le SaaS utilise un nom Produit métier plus lisible.

### 6.4 Tarif fournisseur de référence

L'utilisateur ne connaît pas nécessairement à l'avance le magasin dans lequel il travaillera.

Les catalogues Sysco et SYCAL disponibles constituent donc des **tarifs fournisseur de référence**, indépendants de tout magasin tant qu'aucune information plus précise n'est connue.

Un tarif catalogue ne doit jamais être présenté comme un tarif négocié magasin sans preuve.

### 6.5 Tarif spécifique magasin

Lorsqu'un prix propre à un magasin est connu, il est enregistré séparément.

Il ne remplace pas ni ne détruit le tarif fournisseur de référence.

Exemple conceptuel :

```text
Tarif catalogue Sysco
→ 2,180 €/kg HT

Tarif spécifique Magasin A
→ 2,050 €/kg HT
```

Le choix du tarif applicable est défini par la politique de Prix applicable du Workspace décrite ci-dessous.

### 6.6 Prix observé et provenance

Une facture, une saisie contrôlée, un import ou un futur OCR peuvent produire une nouvelle observation de prix.

Une observation doit être rattachable à :

- Article fournisseur ;
- Fournisseur ;
- date ;
- montant ;
- unité d'expression du prix ;
- provenance ;
- magasin/dossier lorsque celui-ci est identifiable.

Provenances déjà identifiées :

- catalogue fournisseur ;
- mercuriale ;
- tarif spécifique magasin ;
- facture ;
- saisie manuelle ;
- import fichier ;
- futur OCR.

L'OCR est une extension différable. Il devra alimenter le même historique tarifaire et ne jamais écraser automatiquement un prix existant sans contrôles suffisants.

### 6.7 Historisation

Une nouvelle donnée tarifaire ajoute une nouvelle réalité temporelle ; elle ne doit pas écraser silencieusement l'ancienne.

Le système doit pouvoir déterminer :

- valeur source ;
- valeur normalisée ;
- date / période d'effet ;
- provenance ;
- contexte magasin éventuel ;
- date et auteur d'enregistrement.

La priorité entre les sources est définie par la politique de Prix applicable du Workspace et ses fallbacks strictement contextualisés au même magasin.

### 6.8 Politique de Prix applicable du Workspace

La stratégie générale de sélection du prix est un **paramètre du Workspace** et s'applique à tous ses magasins/dossiers.

Modes retenus :

~~~text
Tarif fournisseur
Tarif négocié
Prix facturé
~~~

Valeur standard validée :

~~~text
Tarif négocié
~~~

La stratégie est commune au Workspace, mais les valeurs tarifaires restent strictement contextualisées par magasin.

Règles de fallback validées :

~~~text
Mode Tarif fournisseur
→ Tarif fournisseur de référence applicable

Mode Tarif négocié
→ Tarif négocié valide pour le magasin + Article + date
→ sinon Tarif fournisseur de référence applicable

Mode Prix facturé
→ dernier Prix facturé VALIDE, exploitable et suffisamment frais
   pour le magasin + Article
→ sinon Tarif négocié valide pour ce même magasin
→ sinon Tarif fournisseur de référence applicable
~~~

Un prix spécifique d'un autre magasin n'entre jamais dans cette chaîne de résolution.

Le backend conserve et expose au minimum :

- l'Article fournisseur réellement retenu ;
- la source tarifaire réellement utilisée ;
- la valeur source ;
- la valeur normalisée ;
- la date/période pertinente ;
- le contexte magasin ;
- le fait qu'un fallback ait été appliqué ;
- la raison du fallback ;
- les alertes de validité ou de fraîcheur ;
- les actions encore autorisées.

Le frontend ne reconstruit jamais cette logique et ne possède aucune liste statique ou valeur de remplacement métier.

Le Prix applicable n'est donc pas une propriété globale du Produit. Il résulte du contexte :

~~~text
Produit
× magasin/dossier
× Article fournisseur
× politique de prix du Workspace
× date de valorisation
~~~

Un Produit peut être non valorisable dans un magasin et valorisable dans un autre. Il peut également exister dans le catalogue sans Prix applicable courant.

### 6.9 Temporalité des différentes sources tarifaires

Les trois familles de prix ne portent pas la même temporalité :

~~~text
Tarif fournisseur
→ édition / millésime / période de validité du catalogue

Tarif négocié
→ période de validité de la condition commerciale

Prix facturé
→ fraîcheur opérationnelle calculée depuis la date de facture
~~~

Ces notions ne doivent jamais être fusionnées dans un champ générique d'ancienneté.

Une revue opérationnelle est également distincte de ces temporalités : elle confirme qu'un contrôle a été effectué mais ne prolonge pas artificiellement une validité commerciale.

### 6.10 Prix facturé exploitable et fraîcheur

Un prix lu ou importé depuis une facture n'est pas automatiquement utilisable dans les calculs.

Pour devenir exploitable, un Prix facturé doit pouvoir être rattaché sans ambiguïté :

- au bon Fournisseur ;
- au bon Article fournisseur ;
- au bon magasin/dossier ;
- à une date de facture ;
- à un prix source et une unité d'expression ;
- aux données suffisantes pour calculer un prix normalisé fiable.

Il doit également être explicitement validé.

États fonctionnels minimaux :

~~~text
À VALIDER
→ conservé mais non utilisable comme Prix applicable

VALIDÉ
→ peut devenir Prix applicable si les autres règles sont satisfaites

REJETÉ
→ conservé pour la traçabilité mais jamais utilisé
~~~

La fraîcheur est calculée à partir de la **date de facture**, jamais à partir de la date d'import, d'OCR ou de validation.

Comportement standard retenu :

~~~text
durée de fraîcheur standard
→ 1 an
~~~

La convention technique exacte entre douze mois calendaires et 365 jours reste à fixer avant implémentation.

Le Workspace peut personnaliser cette durée lorsqu'il dispose de la capability commerciale correspondante.

L'expiration de fraîcheur :

- ne change pas le statut VALIDÉ du Prix facturé ;
- ne détruit pas son historique ;
- le rend seulement inéligible à la résolution automatique courante ;
- déclenche le fallback vers le Tarif négocié valide du même magasin puis, à défaut, vers le Tarif fournisseur de référence.

La raison de ce fallback doit rester explicable.

### 6.11 Catalogues fournisseur de référence

Le SaaS peut proposer des catalogues fournisseur de référence préchargés et partagés afin que le premier usage soit réellement exploitable sans obliger chaque client à recréer manuellement les mêmes Articles fournisseur.

Un catalogue doit être identifiable par des informations conceptuelles telles que :

- Fournisseur ;
- édition / millésime ;
- date de début et de fin éventuelles ;
- source ;
- date d'intégration ;
- statut/fraîcheur de la source ;
- portée de partage.

Deux portées conceptuelles sont retenues :

~~~text
GLOBAL_SHARED
→ catalogue de référence vérifié
→ données non confidentielles
→ disponible pour plusieurs ou tous les Workspaces selon les règles du produit

WORKSPACE_PRIVATE
→ import propre à un Workspace
→ jamais exposé à un autre Workspace
~~~

Un import réalisé par un utilisateur est `WORKSPACE_PRIVATE` par défaut. Il ne devient jamais global automatiquement. Une édition ne peut être partagée globalement que si sa provenance et son caractère partageable sont établis.

Un catalogue ancien n'est pas écrasé par une édition plus récente.

Exemple :

~~~text
catalogue 2026 consulté en 2027
→ reste historique et exploitable comme source de référence
→ clairement signalé hors période de validité
→ jamais présenté comme un prix actuel sans avertissement
~~~

La résolution peut utiliser un ancien Tarif fournisseur lorsqu'aucune meilleure source n'existe, mais le backend doit alors exposer l'édition, sa période et son état de validité.

Les catalogues fournisseur partagés ne contiennent aucune condition commerciale confidentielle propre à un magasin.

#### Import structuré sans création massive de Produits

Une ligne de catalogue fournisseur n'est pas un Produit canonique.

Invariant :

~~~text
ligne CSV/XLS/XLSX
≠ Produit canonique
≠ Article fournisseur
≠ Tarif négocié
~~~

L'import complet d'un catalogue de plusieurs milliers de lignes ne crée donc pas automatiquement autant de Produits canoniques.

Le flux validé est :

~~~text
lecture / staging
→ identification Fournisseur + édition + portée
→ détection/présentation des colonnes
→ mapping utilisateur
→ normalisation références / désignations / unités / conditionnements
→ recherche des Articles fournisseur déjà connus
→ réutilisation de leurs mappings Produit déjà validés
→ rapprochement des nouvelles références
→ file des cas ambigus / non résolus
→ aperçu
→ validation
→ nouvelle édition historisée
~~~

Une ligne peut être conservée dans une édition de catalogue sans être immédiatement rapprochée d'un Produit canonique.

Lorsqu'un même Fournisseur et une même référence Article ont déjà été validés, une nouvelle édition réutilise ce mapping au lieu de refaire la reconnaissance du Produit.

Ordre de rapprochement recommandé :

~~~text
1. même Fournisseur + même référence Article connue
2. désignation normalisée connue
3. alias Produit / déclinaison
4. recherche de proximité
5. proposition utilisateur
6. création/proposition d'une nouvelle identité uniquement si aucun équivalent crédible n'existe
~~~

Aucune correspondance ambiguë ne doit créer silencieusement un Produit global.

Le mapping propre à un Fournisseur doit pouvoir être mémorisé et réutilisé, de même que les correspondances validées `Article fournisseur → Produit/déclinaison`.

L'IA n'est pas nécessaire pour les fichiers structurés. Elle pourra plus tard assister le mapping ambigu, l'interprétation de documents complexes ou l'OCR, mais ne deviendra jamais l'autorité qui écrit directement un prix exploitable ou crée un Produit canonique sans contrôles métier et validation.

#### Utilisation sans duplication par Workspace

Un Workspace peut utiliser un catalogue partagé sans en copier toutes les lignes.

Conceptuellement :

~~~text
Catalogue global
→ stocké une fois

Workspace
→ active / référence le catalogue utile
→ ne duplique pas son contenu
~~~

Le Workspace peut ensuite ne rattacher à son usage courant que les Produits, Fournisseurs ou Articles réellement nécessaires.

#### Recherche unifiée

La recherche métier doit pouvoir interroger une surface unique avec des filtres de portée et de source.

Portée :

~~~text
Mon Workspace
Tout le référentiel autorisé
~~~

Source :

~~~text
Toutes
Produits canoniques
Catalogues fournisseurs
Références / Articles fournisseur
~~~

Exemple :

~~~text
recherche "carotte"

Produits canoniques
→ Carotte
→ déclinaisons pertinentes

Catalogues fournisseurs
→ lignes de catalogue correspondantes

Références fournisseur
→ Articles fournisseur connus
~~~

Le résultat peut agréger plusieurs types de ressources, mais chaque résultat conserve sa nature exacte et son lien vers le Produit canonique lorsqu'il est connu.

Une recherche `Mon Workspace` priorise les ressources déjà utilisées/activées par le Workspace. L'utilisateur peut élargir à `Tout le référentiel` pour rattacher une ressource existante sans la recréer.

La recherche globale ne doit jamais exposer :

- Tarif négocié ;
- Prix facturé ;
- historique commercial tenant ;
- catalogue `WORKSPACE_PRIVATE` d'un autre Workspace ;
- donnée Dossier non autorisée.

### 6.12 Sélection d'Article fournisseur et références du magasin

Un Produit peut correspondre à plusieurs Articles fournisseur exploitables dans un même magasin.

Le SaaS ne sélectionne jamais arbitrairement l'Article le moins cher.

Règles validées :

1. un Article explicitement choisi pour une ligne reste attaché à la version de fiche concernée ;
2. si un seul Article est réellement exploitable dans le contexte courant, le backend peut le résoudre automatiquement ;
3. si plusieurs Articles sont exploitables et qu'aucune décision explicite ne permet de les départager, le backend remonte une sélection nécessaire ;
4. aucun Article d'un autre magasin n'est utilisé pour résoudre le contexte courant ;
5. un changement d'Article est distinct d'une simple revalorisation du même Article et doit être traçable.

Le raccourci opérationnel du magasin porte sur des **références favorites**, c'est-à-dire des Articles fournisseur précis, et non sur un Produit générique seul.

Une référence favorite identifie donc indirectement :

~~~text
Produit
+ Fournisseur
+ Article fournisseur
+ conditionnement
+ magasin
~~~

Le prix n'est pas stocké dans le favori : il est résolu dynamiquement par le backend selon le magasin, la politique du Workspace et la date.

Plusieurs références favorites peuvent correspondre au même Produit.

Le SaaS distingue également :

~~~text
Référence favorite
→ préférence opérationnelle du magasin

Référence fréquemment utilisée
→ observation calculée de l'usage réel
~~~

Ces deux états peuvent coexister. Ils ne créent pas deux catalogues : une vue unique « Références du magasin » peut proposer des filtres ou priorités Favorites / Fréquemment utilisées / Catalogue complet.

Une référence fréquemment utilisée est déterminée à partir de Fiches techniques VALIDÉES distinctes du magasin. Les nouvelles versions ou revalorisations d'une même fiche ne doivent pas gonfler artificiellement ce compteur.

La politique Workspace pourra déterminer :

~~~text
manuel uniquement
ou
suggestion automatique
ou
ajout automatique aux favoris
~~~

Le seuil exact reste configurable et sa valeur standard définitive reste à valider.

Un retrait manuel doit être respecté par l'automatisme et une référence favorite ne disparaît pas automatiquement parce que sa fréquence d'usage baisse.

Chaque Produit et Article proposé à la sélection doit disposer d'une **carte d'identité professionnelle** fournie par le backend et affichable par le frontend, notamment via une infobulle/détail contextuel. Elle doit permettre de vérifier sans ambiguïté le Produit, le Fournisseur, la référence, la désignation d'origine, la marque éventuelle, le conditionnement, le Prix applicable dans le magasin courant, sa source, sa validité/fraîcheur et les alertes pertinentes.

---


### 6.13 Détail d'un Produit dans un magasin

Le détail d'un Produit doit disposer d'une vue contextualisée par magasin, distincte de son identité globale dans le catalogue Workspace.

Cette vue de pilotage rapide doit présenter au minimum :

- le Prix applicable HT courant ;
- sa source et sa fraîcheur ;
- une courbe d'évolution des prix HT dans le temps ;
- le nombre de Fiches techniques courantes dans lesquelles le Produit est présent ;
- la liste de ces Fiches techniques.

La courbe est strictement contextualisée par magasin et ne peut jamais agréger ou révéler les données commerciales d'un autre magasin.

La série principale représente par défaut le Prix applicable HT tel que résolu par le backend au fil du temps. Des séries complémentaires pourront être ajoutées ultérieurement si elles apportent une valeur de pilotage et si les permissions l'autorisent.

Le compteur principal porte sur les Fiches techniques courantes non archivées. Les fiches archivées peuvent être incluses via un filtre distinct. Les versions historiques d'une même fiche ne doivent pas gonfler artificiellement le compteur principal.

## 7. Conditionnement et colisage

Le conditionnement fournisseur doit être lisible pour l'utilisateur **et structuré pour les calculs**.

Un simple texte comme `carton 4 × 2,5 kg` ne suffit pas comme seule donnée.

Le domaine doit pouvoir représenter conceptuellement :

```text
type de conditionnement : carton
nombre d'unités        : 4
quantité par unité     : 2,5
unité                  : kg

quantité totale calculée
→ 10 kg
```

Exemples :

```text
sac de 25 kg
→ 1 × 25 kg
→ total 25 kg

carton de 6 × 1 L
→ total 6 L

carton de 24 × 125 g
→ total 3 kg
```

Le système conserve également le libellé fournisseur d'origine lorsqu'il existe (`5/1`, `4/4`, `6X1KG`, etc.) sans dépendre de ce texte pour les calculs.

Pour les conserves ou produits comparables, les données de poids net et de poids net égoutté doivent pouvoir être exploitées lorsqu'elles sont disponibles.

### 7.1 Prix source et prix normalisé

Le SaaS conserve le prix tel qu'il est fourni par le Fournisseur puis calcule, lorsque les données sont suffisantes, un prix normalisé dans l'unité de référence.

Exemple :

```text
sac de farine : 25 kg
prix fournisseur : 40,625 € HT / sac

prix normalisé
→ 1,625 €/kg HT
```

Le prix source et le prix normalisé restent tous les deux traçables.

Si les données de conditionnement ne permettent pas une conversion fiable, le prix normalisé reste indisponible et le système signale l'information manquante ; il ne devine pas.

### 7.2 Précision des prix

Règle validée :

> Les prix d'achat unitaires et les prix normalisés sont affichés avec exactement trois décimales.

Exemples :

```text
1,625 €/kg HT
2,300 €/L HT
4,000 €/unité HT
```

Une source `2,68 €/kg` s'affiche `2,680 €/kg`.

Cette règle d'affichage ne doit pas provoquer d'arrondi prématuré dans le moteur de calcul. La précision interne nécessaire est conservée jusqu'au point d'arrondi métier défini.

La règle d'affichage des montants totaux et prix de vente finaux sera cadrée séparément.

---

## 8. Fiche technique — principes validés

La fiche technique est une donnée métier structurée, pas un document statique.

Elle s'appuie sur le catalogue, les Articles fournisseur, les données tarifaires et le contexte éventuel du dossier/magasin.

### 8.1 Quantité nette saisie

Règle validée :

> L'utilisateur saisit la quantité nette réellement nécessaire et présente dans la recette.

Le système ne demande pas à l'utilisateur de calculer la quantité brute nécessaire avant pertes.

### 8.2 Quantité brute calculée

Le système applique automatiquement le rendement Produit :

```text
quantité brute nécessaire
=
quantité nette / rendement
```

Exemple :

```text
Oignon
quantité nette : 1,000 kg
rendement : 80 %

quantité brute
= 1,000 / 0,80
= 1,250 kg
```

Pour un Produit à 100 % de rendement, quantité nette et quantité brute sont identiques.

### 8.3 Part dans la recette

Le « % de la recette » est calculé automatiquement sur les **quantités nettes réellement présentes dans la recette**.

Les pertes de rendement influencent la quantité brute nécessaire et le coût, mais ne modifient pas la composition proportionnelle de la recette.

Exemple :

```text
Oignon net : 1 kg
Tomate nette : 3 kg
Total net recette : 4 kg

Oignon
→ 25 %

Tomate
→ 75 %
```

Le « % de la recette » reste distinct du taux de rendement.

### 8.4 Prix d'achat et coût de ligne

Règle validée :

> Le coût matière est basé sur les prix d'achat HT.

Pour une ligne d'ingrédient :

```text
quantité brute nécessaire
×
prix d'achat HT normalisé
=
coût matière HT de la ligne
```

Exemple :

```text
Oignon
quantité nette : 1,000 kg
rendement : 80 %
quantité brute : 1,250 kg
prix achat : 1,625 €/kg HT

coût ligne
= 1,250 × 1,625
= 2,03125 € HT
```

Le moteur conserve la précision nécessaire ; les règles d'arrondi des montants agrégés restent à cadrer.

### 8.5 Coût Matière

Définition métier validée :

> **Coût Matière (CM) = somme des coûts HT de toutes les lignes d'ingrédients.**

```text
CM HT
=
Σ coûts HT des lignes d'ingrédients
```

### 8.6 Économat

L'Économat regroupe les consommables achetés nécessaires à la fabrication, au conditionnement ou à la commercialisation du produit.

Exemples :

- barquette ;
- étiquette ;
- film ;
- sachet ;
- autres consommables.

L'Économat est une nature de marchandise achetée différente des ingrédients mais intégrée dans la fiche technique.

Les consommables peuvent utiliser les mêmes mécanismes d'approvisionnement que les ingrédients :

- Fournisseur ;
- Article fournisseur ;
- conditionnement ;
- tarif HT ;
- historique.

Ils ne sont pas soumis aux attributs alimentaires qui ne leur sont pas applicables, notamment gamme alimentaire, rendement matière ou % de recette.

Chaque consommable possède une unité de référence adaptée à sa consommation réelle : unité, mètre, kg, litre, etc.

L'utilisateur saisit la quantité réellement consommée dans la fiche ; le SaaS normalise le prix fournisseur et calcule automatiquement le coût de la ligne d'Économat.

Exemple :

```text
Barquette
carton de 300
prix carton : 42,000 € HT

prix normalisé
→ 0,140 €/unité HT

fiche technique
→ 1 barquette
→ coût Économat : 0,140 € HT
```

### 8.7 Coût total de fabrication

Définition métier validée :

> **Coût total de fabrication = Coût Matière + Économat.**

```text
Coût total de fabrication HT
=
CM HT + Économat HT
```

L'énergie est explicitement exclue de ce calcul.

Aucune autre charge ne doit être ajoutée à cette définition sans nouvelle validation métier.



### 8.8 Valorisation économique

La composition technique et la valorisation économique restent distinctes.

#### 8.8.1 TVA

Le Coût Matière, l'Économat et le Coût total de fabrication restent calculés en HT. La fiche/version porte le taux de TVA réellement applicable à sa commercialisation. Le backend est l'autorité des calculs HT / TVA / TTC et une version VALIDATED conserve le taux utilisé.

#### 8.8.2 Objectif de marge, coefficient et Prix théorique

Convention métier validée :

```text
Objectif de marge
=
(Prix de vente HT - Coût total de fabrication HT)
/
Prix de vente HT
```

Le coefficient est calculé depuis cet objectif :

```text
coefficient = 1 / (1 - objectif de marge)
```

Puis :

```text
Prix théorique HT
=
Coût total de fabrication HT × coefficient
```

Le vocabulaire produit reste « Objectif de marge ».

#### 8.8.3 Prix conseillé et arrondi Workspace

Le Prix conseillé est obtenu après application de la règle d'arrondi commerciale effective au Prix théorique TTC.

Invariant :

```text
Prix conseillé TTC >= Prix théorique TTC
```

Règle standard du SaaS :

```text
multiple de 0,50 € immédiatement supérieur ou égal
```

Exemples :

```text
7,21 € → 7,50 €
7,50 € → 7,50 €
7,51 € → 8,00 €
8,13 € → 8,50 €
```

Le Workspace peut, lorsque sa capability le permet, choisir une autre stratégie structurée, par exemple « euro supérieur - 0,10 € » pour obtenir une terminaison en `,90`. La stratégie ne peut jamais produire un Prix conseillé inférieur au Prix théorique. Aucune formule arbitraire exécutable n'est acceptée.

#### 8.8.4 Prix définitif

Le Prix définitif est un choix humain.

Invariant backend :

```text
Prix définitif TTC >= Prix conseillé TTC
```

Si une revalorisation rend le Prix définitif inférieur au nouveau Prix conseillé, le DRAFT devient non conforme jusqu'à ajustement du prix ou de la composition.

#### 8.8.5 Marge réelle

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

Le système expose également l'écart en points entre marge réelle et Objectif de marge.

#### 8.8.6 Marge semi-nette

La notion reste identifiée mais sa formule n'est pas encore connue.

```text
marge semi-nette
→ question métier différée
→ aucune formule inventée
→ ne bloque pas le démarrage du développement
```

#### 8.8.7 Snapshot économique

Une version VALIDATED conserve notamment Objectif de marge, coefficient, Coût total de fabrication HT, TVA, Prix théorique, Prix conseillé, Prix définitif, marge réelle en valeur et en pourcentage.

#### 8.8.8 Atelier d'optimisation

L'Atelier d'optimisation est une capability commerciale payante et non destructive, inspirée de la logique de Lightroom transposée aux Fiches techniques.

Il combine sliders globaux, courbe d'équilibre multipoints, histogramme composition/coût, réglages fins par ingrédient, avant/après et signalement visuel des limites.

Chaque ligne modulable possède une quantité de référence, un minimum et un maximum configurables. Les pièces/unités et lignes verrouillées restent fixes.

Toute variation doit respecter les contraintes, conserver 100 % de composition lorsque le poids final est verrouillé et rester dans l'enveloppe de qualité perçue. Des garde-fous backend indépendants des valeurs utilisateur restent obligatoires.

La simulation ne modifie le DRAFT qu'après action explicite « Appliquer au DRAFT ». Les mathématiques fines des sliders, de la courbe et des garde-fous seront cadrées avant le module d'optimisation et ne bloquent pas M-001.

### 8.9 Concurrence, revalorisation et prix modifiés en cours de travail

Une modification tarifaire crée une nouvelle réalité temporelle et ne réécrit jamais silencieusement le prix déjà utilisé dans une Fiche technique en cours.

Lorsqu'une Fiche technique est calculée, elle doit pouvoir conserver la référence Article, la source tarifaire et les valeurs effectivement utilisées pour expliquer son état courant.

Si un prix change pendant l'édition :

- le nouveau tarif devient disponible selon sa date d'effet ;
- la fiche en cours ne change pas silencieusement ;
- le backend détecte qu'une revalorisation est disponible ou nécessaire ;
- avant validation, le backend vérifie que la valorisation est toujours cohérente avec les données applicables ;
- si elle ne l'est plus, la validation est refusée jusqu'à revalorisation explicite.

Aucun verrou global n'empêche un Économe ou un Acheteur de mettre à jour un tarif uniquement parce qu'une fiche est ouverte ailleurs.

Un changement de prix sur le même Article est une revalorisation. Un changement d'Article fournisseur est une modification d'approvisionnement distincte et traçable.

### 8.10 Copie d'une Fiche technique entre magasins

Une Fiche technique peut être copiée/importée d'un magasin vers un autre afin d'éviter une ressaisie inutile.

Cette opération copie uniquement la structure métier réutilisable, notamment :

- Produits / ingrédients ;
- quantités ;
- unités ;
- autres données de composition explicitement réutilisables.

Elle ne copie jamais :

- Prix facturés ;
- Tarifs négociés ;
- Prix applicables calculés ;
- valorisations économiques ;
- historique tarifaire ;
- historique de validation ou de revalorisation du magasin source.

La fiche cible constitue une nouvelle fiche dans un nouveau contexte.

~~~text
composition copiée
→ résolution des Articles et Prix dans le magasin cible
→ recalcul complet
→ nouvel historique local
~~~

Une provenance minimale vers la fiche source peut être conservée pour l'audit, sans transférer son historique économique.

### 8.11 Versionnement et validation

La Fiche technique est une identité durable portant des versions successives.

États conceptuels validés :

~~~text
DRAFT
→ travail en cours
→ non officiel
→ peut être incomplet ou temporairement non valorisable

VALIDATED
→ version officielle validée
→ historiquement immuable

ARCHIVED
→ sortie de l'usage actif
→ historique et valorisation conservés
~~~

Une modification d'une version VALIDATED ne réécrit jamais cette version. Elle crée ou ouvre une nouvelle version DRAFT.

Une revalorisation peut produire une nouvelle version DRAFT dont la composition est inchangée mais dont les prix et coûts sont recalculés. Elle doit ensuite être explicitement validée.

Chaque version validée doit conserver le snapshot nécessaire à la reproductibilité économique : Produit, Article fournisseur réellement utilisé, quantités, rendement, Prix applicable, source, contexte magasin, date de valorisation et autres données indispensables.

Le backend doit pouvoir expliquer les différences entre versions, par exemple :

~~~text
composition inchangée
+ 4 lignes tarifaires modifiées
+ Coût Matière modifié
+ nature = REVALORISATION
~~~

Les libellés techniques exacts des types de version seront fixés lors du cadrage du module.

### 8.12 Conditions de validation et invariants

La validation est une action backend explicite.

Elle doit notamment recontrôler :

- membership et permissions ;
- accès au dossier/magasin ;
- complétude requise ;
- cohérence des quantités ;
- Article fournisseur réellement utilisable ;
- présence d'un Prix applicable pour chaque ligne devant être valorisée ;
- actualité de la valorisation ;
- changements concurrents incompatibles.

L'absence de prix n'est jamais représentée par zéro.

~~~text
prix absent
≠
prix à 0
~~~

Une Fiche technique VALIDATED exige que chaque ligne requise soit correctement valorisée. Un total de fabrication nul ne peut pas rendre une fiche officielle par simple convention.

Ces invariants s'appliquent à tous les utilisateurs, y compris au Workspace Owner.

### 8.13 Archivage, restauration et suppression

Le cycle de vie normal privilégie l'archivage.

Une version ou fiche archivée conserve sa vraie valorisation et son historique :

~~~text
ARCHIVED
≠
UNVALUED
≠
ZERO
~~~

Aucune suppression automatique n'est déclenchée uniquement par l'âge.

Le Workspace Owner peut, selon la politique de cycle de vie du Workspace, supprimer définitivement une fiche ancienne déjà archivée, sous contrôles backend, audit et règles de rétention applicables.

Une fiche VALIDATED active ne doit pas être supprimée directement : le parcours normal est archivage puis éventuelle suppression définitive.

La suppression définitive traite la fiche et ses versions comme une unité cohérente ; elle ne supprime pas arbitrairement une version intermédiaire.

Un audit minimal de suppression doit être préservé lorsque le contenu est détruit : identité de la fiche, Workspace, magasin, acteur, date et raison selon le contrat à finaliser.

Les exigences légales ou réglementaires de rétention restent à cadrer avant implémentation.

---

## 9. Historique, évolution et analyses

L'historisation est une exigence de conception dès le départ.

### 9.1 Produit

Un Produit doit permettre de consulter :

- ses modifications ;
- ses Articles fournisseur associés ;
- ses Fournisseurs associés ;
- son historique commercial ;
- son utilisation dans les fiches techniques ;
- les dossiers/magasins concernés lorsque cette visibilité est autorisée.

### 9.2 Tarifs

Une mise à jour tarifaire ne doit pas simplement écraser l'ancienne valeur.

Le système doit préserver :

- ancien prix ;
- nouveau prix ;
- unité d'expression ;
- date / période ;
- provenance ;
- contexte magasin éventuel ;
- valeur normalisée lorsque calculable ;
- écart en valeur ;
- écart en pourcentage ;
- fiches potentiellement impactées.

Il doit être possible de distinguer l'évolution d'un tarif fournisseur de référence de celle d'un tarif ou prix observé spécifique à un magasin.

### 9.3 OCR / facture

Extension structurellement prévue :

```text
Facture
→ OCR
→ fournisseur / date / établissement / référence / quantité / prix
→ rapprochement Article fournisseur
→ contrôles
→ validation si nécessaire
→ nouvelle observation tarifaire historisée
```

L'OCR ne doit jamais écraser directement un prix sur la seule base d'une lecture automatique.

### 9.4 Fiches techniques

Le système doit pouvoir distinguer :

```text
valorisation historique
→ valeurs réellement utilisées lors d'une version / date donnée

valorisation courante
→ recalcul à partir des données actuellement applicables
```

La consultation des écarts de coûts et marges doit pouvoir devenir visuelle et facilement accessible.

Les alertes et graphiques détaillés peuvent être différés ; les données nécessaires doivent être préservées dès le socle.

---

## 10. Fiche process

Le produit doit également gérer des fiches process de fabrication.

Le cahier des charges initial prévoit notamment :

- denrées ;
- temps / durées ;
- étapes de fabrication ;
- points critiques ;
- critères d'acceptabilité ;
- génération future possible d'une infographie synthétique.

Les exemples de fiches techniques contiennent déjà des colonnes « mode opératoire » et « temps ».

**Point ouvert :** définir la frontière exacte entre les informations process visibles dans une fiche technique et la fiche process détaillée reliée.

---

## 11. Politique d'extension

Principe validé :

> Les extensions identifiées doivent être prises en compte dans la conception afin d'éviter des refontes structurelles prévisibles, sans obligation de les développer immédiatement.

Trois niveaux sont distingués :

```text
Fonction V1
→ développée immédiatement

Extension planifiée
→ non développée immédiatement mais architecture compatible exigée

Extension éventuelle
→ possibilité identifiée sans créer d'abstraction complexe sans besoin démontré
```

Extensions actuellement identifiées :

- alertes visuelles sur prix, coûts et marges ;
- historique graphique ;
- comparaison de fournisseurs ;
- import de mercuriales ;
- OCR facture / mercuriale ;
- génération inversée de recette ;
- optimisation de marge assistée par IA ;
- analyse de portefeuille de fiches ;
- assistant de rédaction de process ;
- génération d'infographies process ;
- rappels / notifications ;
- recherche globale intelligente ;
- exports CSV / XLS(X) générés à la demande ;
- envoi direct de documents par e-mail avec PDF généré à la demande comme pièce jointe temporaire.

Aucune de ces extensions n'est considérée comme V1 uniquement parce qu'elle est citée ici.

---

## 12. Paramètres métier et configuration du Workspace

Le panneau de configuration métier est une surface structurante du produit et doit rester accessible au Workspace Owner.

Aucun paramétrage préalable ne doit être obligatoire pour commencer à travailler : le SaaS fournit des comportements standards immédiatement utilisables.

Pour chaque paramètre configurable, le backend distingue conceptuellement :

~~~text
valeur standard
→ fournie par le SaaS

valeur configurée
→ choix explicite du Workspace lorsqu'il en a le droit

valeur effective
→ valeur réellement appliquée par le moteur

droit de personnalisation
→ capability commerciale effective
~~~

Le frontend ne code jamais une valeur de remplacement selon le nom d'un plan. Il consomme la valeur effective et les droits exposés par le backend.

Portées possibles à examiner au cas par cas :

~~~text
système
Workspace
dossier / magasin
fiche
~~~

La présence de ces portées dans le modèle conceptuel ne signifie pas qu'elles seront toutes implémentées.

Paramètres candidats déjà identifiés :

- politique de Prix applicable ;
- durée de fraîcheur des Prix facturés ;
- politique des références favorites/fréquemment utilisées ;
- politique de cycle de vie des Fiches techniques ;
- politique de conservation / corbeille des ressources métier supprimées ;
- TVA ;
- objectif de marge ;
- coefficient ;
- règles d'arrondi ;
- unités, catégories et conditionnements lorsque leur gouvernance le justifie ;
- autres paramètres démontrés par la suite du cadrage.

### 12.1 Free, Trial et offre payante

Principe commercial retenu :

~~~text
FREE
→ métier disponible avec les comportements standards
→ panneau visible
→ paramètres personnalisables verrouillés selon capabilities

TRIAL
→ comportements standards actifs dès le départ
→ personnalisation facultative disponible pour tester l'offre évaluée

PAYANT
→ personnalisation des paramètres autorisés par le plan
~~~

La fonctionnalité métier fondamentale n'est pas volontairement dégradée pour forcer l'achat : la monétisation porte sur la personnalisation avancée lorsque celle-ci constitue une capability commerciale.

Un downgrade ne supprime pas les configurations personnalisées. Elles peuvent être conservées mais devenir inactives lorsque la capability n'est plus disponible ; le backend applique alors le comportement standard. La règle exacte de réactivation ultérieure reste à cadrer.

### 12.2 Politique de cycle de vie des fiches

Le Workspace dispose conceptuellement d'une politique centrale de cycle de vie.

Comportement standard immédiatement utilisable :

- DRAFT autorisés ;
- versions VALIDATED conservées ;
- pas de suppression automatique ;
- archivage explicite ;
- suppression définitive uniquement sous contrôles prévus.

Des personnalisations payantes pourront éventuellement porter sur :

- cadence de revue fonctionnelle ;
- règles de revalorisation ;
- signalement de fiches anciennes ;
- archivage ;
- purge ;
- rétention.

Il faut distinguer la fraîcheur fonctionnelle d'une recette de la fraîcheur économique de sa valorisation : une recette ancienne mais récemment revalorisée n'est pas nécessairement obsolète, et une recette récente peut avoir besoin d'attention si ses prix sont devenus anciens.

---


### 12.3 Conservation, corbeille métier et temporaires techniques

Le produit distingue trois notions :

```text
persistance des données métier structurées
→ MongoDB
→ source de vérité du produit

fichiers temporaires techniques
→ import / export / génération PDF
→ nécessaires à l'exécution
→ supprimés après traitement

stockage durable de fichiers utilisateur
→ aucun besoin V1 démontré à ce stade
→ ne constitue pas un Drive implicite du produit
```

Le Core conserve ses primitives génériques de téléversement, inspection, antivirus, stockage et rétention, mais le produit GMS n'est pas obligé d'exposer ni de commercialiser un stockage documentaire durable.

Les ressources métier structurées peuvent néanmoins être soumises à des quotas commerciaux de **nombre d'objets** indépendants du stockage fichier. Décision validée pour les Fiches techniques :

```text
DRAFTS actifs
→ quota métier par Workspace / plan

Fiches techniques VALIDATED
→ quota métier distinct par Workspace / plan
```

Ces quotas utiliseront le moteur générique Core de metrics / limits / entitlements / overrides ; ils ne seront pas calculés à partir de la taille MongoDB ni de `storage_bytes`.

Les valeurs exactes Free/Premium, les clés techniques définitives, le comportement lorsque la limite est atteinte et la règle de comptage des fiches ARCHIVED seront cadrés en M-004.

Un import CSV/XLS/XLSX peut donc utiliser temporairement la chaîne de sécurité File du Core sans consommer un quota commercial de stockage durable. De même, un PDF ou un CSV généré peut exister le temps du téléchargement ou de l'envoi puis être détruit.

Les limites applicables aux temporaires — taille maximale, TTL, concurrence de traitement — sont des garde-fous techniques et non un espace de stockage vendu au Workspace.

La corbeille métier possède un comportement standard immédiatement utilisable :

```text
durée standard : 30 jours
borne minimale : 7 jours
borne maximale : 90 jours
```

Lorsque la personnalisation est autorisée, le Workspace peut choisir une valeur comprise dans ces bornes. Le backend reste l'autorité sur les limites. Cette rétention concerne les ressources métier supprimées, pas des fichiers temporaires d'import/export.

Pour les Fiches techniques :

- un DRAFT actif n'est jamais purgé uniquement parce qu'il est ancien ;
- un DRAFT explicitement supprimé est placé en corbeille puis devient purgeable à l'échéance de la politique métier ;
- une version VALIDATED reste historiquement immuable et n'est jamais purgée automatiquement par simple ancienneté ;
- l'archivage reste le mécanisme normal pour sortir une fiche validée de l'usage courant.

Pour les artefacts générés :

- CSV et XLS(X) sont générés à la demande pour l'export puis détruits après remise au client ;
- le PDF est généré à la demande pour téléchargement ou envoi selon le module concerné, puis supprimé du stockage temporaire après traitement ;
- les artefacts reproductibles ne sont pas conservés durablement et ne créent pas d'historique de fichiers parallèle à la donnée métier source.

Cette politique ne déclenche aucune purge automatique des Dossiers `DELETED` dans M-001.

Si un futur module démontre un besoin de conservation durable de documents binaires, son usage, sa capability commerciale et son éventuel quota Workspace devront être cadrés séparément au lieu d'être déduits du simple fait que le Core sait stocker des fichiers.

Le contrat transversal détaillé est conservé dans `docs/domain/STORAGE-RETENTION.md`.

---

### 12.4 Préférences d'affichage et Dashboard Workspace

Les préférences d'affichage sont distinctes de la configuration métier :

```text
configuration métier
→ modifie le comportement du moteur

préférences d'affichage
→ modifient uniquement ce que l'utilisateur voit
```

Le produit réutilise le mécanisme Dashboard du Core v1.1.0 :

```text
widgets Core
+
widgets métier du produit
→ widgets accessibles selon capabilities + permissions
→ préférences utilisateur
→ widgets réellement visibles
```

Le comportement Core courant affiche par défaut tous les widgets accessibles : `hiddenWidgetIds = []`.

Un widget `configurable: true` peut ensuite être masqué ou réaffiché par l'utilisateur. Un widget `configurable: false` reste visible.

Masquer un KPI n'altère jamais la donnée, la règle métier, une alerte bloquante ou une capability.

Les modules métier pourront fournir davantage de KPI que ceux qu'un utilisateur souhaite conserver à l'écran. Le Dashboard doit donc rester utile par défaut puis réellement personnalisable individuellement.

Le produit ne crée pas un second système de Dashboard et utilise le point d'extension Core `frontend/src/app/application-dashboard.js`.

## 12.1 Données initiales et bootstrap métier

Le produit peut fournir des données de référence initiales utiles aux bêta-tests et au démarrage réel, sans confondre bootstrap et migration historique.

Contrat canonique :

```text
docs/domain/INITIAL-DATA-BOOTSTRAP.md
```

Principes :

```text
M-001
→ aucune migration historique
→ aucun seed Dossier
→ Owner suffisant pour le bêta M-001

M-002
→ bootstrap versionné du référentiel Produit initial

M-003
→ bootstrap versionné des Fournisseurs / Articles / catalogues de référence partageables

rôles métier
→ profils/presets définis par le produit
→ provisionnés uniquement lorsque leurs permissions utiles sont suffisamment cadrées
```

Tout bootstrap métier est explicite, idempotent, testé, traçable et non destructif.

---

## 13. Utilisateurs, rôles et périmètres

Le produit réutilise le moteur RBAC Workspace générique du Core, mais le vocabulaire des rôles métier appartient exclusivement au produit.

Invariant :

```text
Core
→ moteur Role / Permission générique
→ rôles système génériques déjà prévus

Produit GMS
→ permissions métier
→ presets / profils de rôles métier
→ aucune nouvelle notion métier ajoutée aux rôles système du Core
```

Les profils `Acheteur`, `Économe`, `Responsable FT`, `Contributeur FT` ou `Lecteur métier` ne sont jamais des rôles système Core. Ils sont définis et provisionnés par le produit en s'appuyant sur la primitive générique de rôles du Core.

### 13.1 Workspace Owner

Le rôle système `owner` du Workspace reste générique dans `saas-core-api` : aucun rôle métier GMS n'est ajouté au Core et aucune constante Core n'est modifiée.

Le produit déclare cependant ses permissions métier dans le point d'extension RBAC applicatif prévu par le Core. Le descriptor produit attribue ces permissions métier au rôle système `owner` lors de la composition du SaaS dérivé, afin que l'Owner reste l'autorité complète de son Workspace sans créer un deuxième moteur RBAC.

Pour ce produit, le Workspace Owner :

- possède les permissions métier applicatives déclarées par le produit ;
- peut agir sur tous les magasins/dossiers de son Workspace ;
- peut créer, modifier, revaloriser, valider, archiver et administrer les données métier selon les contrats ;
- peut gérer les membres, rôles et paramètres dans les limites des mécanismes Core ;
- n'a pas besoin d'un profil métier supplémentaire.

Les profils métier nommés restent exclusivement des rôles personnalisés définis par le produit.

Le Workspace Owner ne contourne jamais les invariants métier, les capabilities, les quotas ni les validations de sécurité.

Le terme Workspace Owner doit être utilisé pour éviter toute confusion avec les rôles Platform.

### 13.2 Rôles Platform

Un PlatformRole, y compris un rôle d'administration de la plateforme, ne donne aucun accès implicite aux données métier d'un Workspace.

Il ne permet pas automatiquement de consulter :

- dossiers/magasins ;
- Fiches techniques ;
- Tarifs négociés ;
- Prix facturés ;
- autres données commerciales confidentielles.

Un éventuel futur accès support transversal constituerait une fonctionnalité distincte à cadrer, sécuriser et auditer explicitement.

### 13.3 Un rôle Workspace par membre

Le Core v1.1.0 porte un seul Role sur chaque WorkspaceMember.

Le cadrage métier s'aligne donc sur ce contrat :

~~~text
WorkspaceMember
→ 1 Role Workspace
→ ensemble de permissions Core + métier
~~~

Les responsabilités métier ne sont plus modélisées comme plusieurs rôles cumulés sur le même membre.

Lorsque plusieurs responsabilités doivent être combinées, un rôle personnalisé regroupe l'union des permissions nécessaires.

Exemple :

~~~text
Acheteur + Économe
→ un rôle Workspace personnalisé
→ permissions Achats + permissions Prix
~~~

Les profils suivants servent de rôles types/presets de cadrage :

- Acheteur / Responsable achats ;
- Économe / Gestionnaire des prix ;
- Responsable fiches techniques ;
- Contributeur fiches techniques ;
- Lecteur métier lorsque le besoin de simple consultation existe.

Le nom affiché du rôle n'est jamais utilisé comme autorité technique : les permissions effectives gouvernent les actions.


### 13.4 Invitation et affectation

Le mécanisme d'invitation du Core est conservé sans le surcharger avec la logique magasin.

Parcours validé :

```text
acteur autorisé
→ invitation email dans le Workspace
→ choix d'un Role du Workspace
→ acceptation
→ création / activation du WorkspaceMember
→ ensuite affectation des dossiers/magasins par le Workspace Owner
```

L'invitation gère l'entrée dans l'organisation ; l'affectation des magasins est une organisation interne du Workspace après acceptation.

Un membre peut donc appartenir au Workspace tout en n'ayant temporairement accès à aucun dossier.

Le rôle owner ne peut pas être attribué par invitation.

Les responsabilités restent strictement séparées :

```text
Role Workspace
→ ce que le membre peut faire

Périmètre dossiers
→ où il peut le faire
```

Aucune évolution du Core n'est nécessaire pour préparer atomiquement le périmètre magasin au moment de l'acceptation : cette exigence n'est pas retenue.


### 13.5 Périmètre magasin et autorisation effective

Pour un membre non-owner, l'accès peut porter sur zéro, un ou plusieurs dossiers explicitement autorisés.

Le Workspace Owner dispose implicitement de tous les dossiers de son Workspace et n'a pas besoin d'une affectation métier par dossier pour conserver cet accès. La création d'un nouveau magasin lui devient donc immédiatement accessible.

La relation d'affectation magasin est une notion métier distincte du WorkspaceMember Core et sera persistée dans une relation métier dédiée de type conceptuel `DossierAccessGrant`, sans modifier le modèle Core. Cette relation lie un `WorkspaceMember` non-owner à un `Dossier` du même Workspace, conserve sa traçabilité d'attribution/révocation et ne peut exister qu'une fois par couple membre + Dossier dans son état courant. Le Workspace Owner conserve un accès implicite à tous les Dossiers et n'a pas besoin d'un grant par Dossier.

Modifier le Role d'un membre ne modifie pas automatiquement ses magasins. Modifier son périmètre magasin ne modifie pas son Role.

Le contexte actif reste toujours un seul magasin à la fois.

L'autorisation métier effective combine conceptuellement :

```text
membership actif
+ permission du rôle
+ accès au dossier
+ état du dossier / de la ressource
+ capability commerciale si nécessaire
+ invariants métier
```

Un grant conservé pendant PAUSED ou ARCHIVED n'accorde que les usages compatibles avec l'état courant. Lors du passage à DELETED, tous les grants ACTIVE sont révoqués ; une restauration ne réactive jamais silencieusement ces anciens grants.

Le rôle détermine ce que l'utilisateur peut demander. Les invariants déterminent ce que le système accepte comme état valide.


### 13.6 Matrice de référence des rôles types

La baseline validée est la suivante ; les permissions effectives restent l'autorité technique et les rôles personnalisés peuvent combiner plusieurs responsabilités.

| Action | Owner | Acheteur | Économe | Responsable FT | Contributeur FT | Lecteur |
| --- | --- | --- | --- | --- | --- | --- |
| Voir Produits | Oui | Oui | Oui | Oui | Oui | Oui |
| Créer / modifier Produits | Oui | Oui | Non | Oui | Non | Non |
| Voir Fournisseurs / Articles | Oui | Oui | Oui | Oui | Oui | Oui |
| Gérer Fournisseurs / Articles | Oui | Oui | Non | Non | Non | Non |
| Gérer catalogues fournisseur | Oui | Oui | Non | Non | Non | Non |
| Voir le Prix applicable nécessaire | Oui | Oui | Oui | Oui | Oui | Oui |
| Voir l'historique commercial détaillé | Oui | Oui | Oui | Non | Non | Non |
| Gérer Tarifs négociés | Oui | Oui | Non | Non | Non | Non |
| Saisir / corriger Prix facturés | Oui | Non | Oui | Non | Non | Non |
| Valider Prix facturés | Oui | Non | Oui | Non | Non | Non |
| Exécuter une revue tarifaire | Oui | Non | Oui | Non | Non | Non |
| Gérer Références favorites | Oui | Oui | Oui | Oui | Non | Non |
| Créer une Fiche technique | Oui | Non | Non | Oui | Oui | Non |
| Modifier ses DRAFTS | Oui | Non | Non | Oui | Oui | Non |
| Modifier les DRAFTS d'autrui | Oui | Non | Non | Oui | Non | Non |
| Revaloriser ses fiches | Oui | Non | Oui | Oui | Oui | Non |
| Revaloriser toute fiche du périmètre | Oui | Non | Oui | Oui | Non | Non |
| Valider une Fiche technique | Oui | Non | Non | Oui | Non | Non |
| Archiver / restaurer une fiche | Oui | Non | Non | Oui | Non | Non |
| Consulter les Fiches techniques | Oui | Selon besoin | Oui | Oui | Oui | Oui |
| Modifier les informations d'un Dossier | Oui | Non | Non | Non par défaut | Non | Non |
| Gérer les accès Dossier | Oui | Non | Non | Non | Non | Non |
| Changer le statut d'un Dossier | Oui | Non | Non | Non | Non | Non |
| Lire la configuration métier | Oui | Oui | Oui | Oui | Oui | Oui |
| Modifier la configuration métier | Oui | Non | Non | Non | Non | Non |
| Suppression définitive d'une fiche | Oui uniquement | Non | Non | Non | Non | Non |

L'Économe ne valide pas les Fiches techniques par défaut. Contributeur et Lecteur peuvent recevoir le Prix applicable nécessaire sans accès à l'historique commercial détaillé. L'administration du Dossier et l'affectation des magasins restent Owner-only par défaut.


## 14. V1 / hors V1

Le cadrage global ne doit plus exiger la spécification exhaustive de toutes les extensions futures avant le premier module.

Ordre recommandé :

```text
M-001 → Dossiers / Magasins + affectations
M-002 → Catalogue Produits
M-003 → Fournisseurs + Articles + prix/catalogues
M-004 → Fiches techniques + valorisation
M-005 → Atelier d'optimisation Premium
M-006+ → Fiches process / imports / OCR / extensions
```

Sont explicitement différés et non bloquants pour M-001 :

- marge semi-nette ;
- Fiche process ;
- mathématiques fines de l'Atelier d'optimisation ;
- catalogue complet des stratégies d'arrondi personnalisées ;
- OCR / IA ;
- imports avancés ;
- purge physique définitive ;
- analyses et alertes avancées.

Ces sujets seront cadrés avant le module qui les implémente.


## 15. Validation globale et passage à M-001

Le cadrage transversal est **VALIDÉ** pour autoriser le cadrage détaillé de `M-001 — Dossiers / Magasins + affectations`.

Décisions finales fermées le 2026-09-20 :

- création d'un Dossier avec le nom comme seul champ métier saisi obligatoire ;
- persistance des affectations dans une relation métier dédiée `DossierAccessGrant` sans modification de `WorkspaceMember` Core ;
- contraintes réglementaires structurantes de M-001 vérifiées : les éventuelles coordonnées nominatives sont des données personnelles à minimiser et protéger, mais aucune obligation démontrée n'impose un champ métier obligatoire supplémentaire au Dossier ;
- conformité globale et rétention restent suivies par D-003 / D-006 avant production.

Les questions restantes sont désormais rattachées au module concerné : catégories/unités Produit avant M-002 ; Fournisseur/Article/prix avant M-003 ; versionnement FT avant M-004 ; optimisation avant M-005 ; Process avant son module ; rétention/purge avant implémentation.

La validation globale n'autorise pas encore l'implémentation de M-001 : son contrat détaillé doit d'abord être cadré et validé.

## 16. Sources de cadrage utilisées

Le présent document synthétise les éléments métier fournis et validés le 2026-09-19 à partir de :

- échanges de cadrage avec le porteur du produit ;
- cahier des charges initial « SAAS-FICHES-TECHNIQUES-GMS » ;
- trois exemples de fiches recettes Bruschetta (Italienne, Royale, Normande) ;
- exemples de tarifs fournisseurs Sysco et SCAL ;
- référentiels professionnels sur les gammes alimentaires.

Référence officielle consultée pour la terminologie des gammes :

- Direction des Affaires juridiques, Ministère de l'Économie — glossaire d'indexation des prix des denrées alimentaires : https://www.economie.gouv.fr/files/files/directions_services/daj/marches_publics/oeap/concertation/autres_groupes_travail/indexation-prix-denrees-alimentaires.pdf

La source métier utilisateur prime sur les hypothèses lorsqu'une règle spécifique au produit est validée.
