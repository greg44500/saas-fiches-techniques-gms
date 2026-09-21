# SAAS-FICHES-TECHNIQUES-GMS — Glossaire métier

**Statut :** VALIDÉ — vocabulaire transversal approuvé avant M-001  
**Dernière mise à jour :** 2026-09-21

> Ce glossaire fixe le vocabulaire déjà stabilisé pendant le cadrage.  
> Les termes marqués comme ouverts ne doivent pas être transformés en contrats techniques définitifs.

---

## Workspace

Espace de travail du client du SaaS et frontière de tenancy héritée du Core.

Un Workspace peut contenir plusieurs dossiers correspondant à des contextes magasin.

Il porte également la capacité de stockage du produit : les Dossiers consomment cette capacité commune et ne possèdent pas de quota dur de stockage propre en V1.

---

## Quota de stockage Workspace

Limite de capacité appliquée au Workspace dans son ensemble.

Elle ne réserve pas une part fixe à chaque Dossier. Une ventilation de consommation par Dossier peut être affichée à des fins de pilotage sans devenir une autorité de blocage.

---

## Corbeille métier

État temporaire d'une ressource métier explicitement supprimée mais encore restaurable avant son échéance de purge.

La durée standard validée est de 30 jours. Lorsqu'une personnalisation est autorisée, la valeur effective doit rester comprise entre 7 et 90 jours et est figée pour la ressource au moment de sa suppression.

---

## Artefact d'export temporaire

Fichier reproductible généré depuis une donnée métier pour un usage immédiat, sans devenir une ressource persistante.

CSV et XLS(X) sont générés à la demande pour téléchargement. Le PDF est généré à la demande comme pièce jointe lors de l'envoi d'un document par e-mail. Ces artefacts sont supprimés après traitement et ne constituent pas un historique parallèle.

---


## Dossier

Contexte métier durable correspondant à exactement un magasin en V1.

Il porte notamment l'identité opérationnelle du magasin, sa localisation, ses contacts, son responsable métier, son statut, ses affectations et ses ressources contextualisées.

En V1, le **nom du Dossier / magasin** est le seul champ métier saisi obligatoirement à la création. L'enseigne, la localisation, l'email documents, le téléphone et le responsable / interlocuteur sont facultatifs.

Ses informations opérationnelles peuvent évoluer sans recréer un nouveau dossier.

## Statut du dossier

État de cycle de vie du contexte magasin :

```text
ACTIVE
PAUSED
ARCHIVED
DELETED
```

`DELETED` désigne une suppression logique : les accès métier sont coupés mais les données ne sont pas immédiatement détruites.

## Suppression logique du dossier

Action rendant le dossier et ses ressources inaccessibles dans les flux métier normaux sans effacement physique immédiat.

Elle invalide fonctionnellement les affectations existantes tout en permettant de conserver leur trace pour l'audit.

La purge définitive est une opération distincte.

## Responsable / interlocuteur du dossier

Personne métier responsable ou interlocutrice du magasin.

Cette donnée ne doit pas être confondue avec `createdBy`, qui identifie l'utilisateur SaaS ayant créé le dossier.

## Affectation dossier

Relation métier donnant à un WorkspaceMember non-owner l'accès à un dossier/magasin déterminé.

Elle est indépendante du Role Workspace et est persistée dans une relation métier dédiée de type conceptuel `DossierAccessGrant`.

Le grant relie un `WorkspaceMember` et un `Dossier` appartenant au même Workspace, avec une seule affectation courante par couple membre + Dossier. Une révocation coupe l'accès sans perdre la traçabilité d'attribution/révocation.

Le Workspace Owner possède implicitement tous les dossiers de son Workspace et ne nécessite pas de `DossierAccessGrant` individuel.

## Magasin

Contexte opérationnel pour lequel l'utilisateur réalise ses fiches et dans lequel s'appliquent les conditions commerciales propres au site : prix, disponibilité, fournisseur/article applicable, etc.

---

## Contexte magasin actif

Dossier/magasin dans lequel l'utilisateur travaille à un instant donné.

Même lorsqu'un utilisateur possède un accès à plusieurs magasins, une Fiche technique est toujours créée, modifiée et valorisée dans un seul contexte magasin actif.

L'accès multi-magasins permet de changer de contexte ; il ne permet jamais de mélanger les données commerciales entre magasins.

---

## Isolation inter-magasin

Règle garantissant que les Tarifs négociés, Prix facturés, revues tarifaires et autres conditions locales d'un magasin ne sont jamais utilisés ni exposés dans le contexte d'un autre magasin sans autorisation explicite.

Un prix spécifique d'un autre magasin ne constitue jamais un fallback.

---

## Catalogue produit

Base de produits commune à un Workspace.

Les dossiers puisent dans ce catalogue au lieu de recréer les mêmes produits magasin par magasin.

---

## Produit

Denrée ou composant utilisable dans une fiche technique, indépendamment de son fournisseur et de son prix.

Le produit porte notamment :

- un nom métier précis ;
- une catégorie ;
- une gamme alimentaire lorsqu'elle est pertinente ;
- une unité de référence ;
- un taux de rendement ;
- une photo facultative ;
- des métadonnées de création et modification.

### Règle de nommage

Si le produit est entier ou utilisé dans sa forme standard, utiliser le nom simple :

```text
Carotte
Oignon
Rumsteck
Maquereau
```

Si une forme de préparation est nécessaire pour comprendre ce qui est réellement utilisé, la préciser dans le nom :

```text
Carotte râpée
Oignon émincé
Rumsteck tranché
Maquereau en filet
```

---

## Catégorie

Classification fonctionnelle du produit destinée au classement, à la recherche, aux filtres et aux analyses.

Exemples possibles : légumes, viandes, poissons, fromages, épicerie.

La liste exacte n'est pas encore validée.

---

## Gamme alimentaire

Référentiel professionnel utilisé lorsqu'il est pertinent pour le produit.

Référentiel de cadrage :

- 1re gamme : frais ;
- 2e gamme : conserve / appertisé ;
- 3e gamme : surgelé ;
- 4e gamme : cru prêt à l'emploi ;
- 5e gamme : cuit prêt à l'emploi.

La gamme n'est pas obligatoire pour tous les produits.

Exemple :

```text
Farine
→ gamme : non applicable
→ rendement : 100 %
```

La gamme ne fixe pas automatiquement un taux de rendement.

Référence officielle de cadrage :
https://www.economie.gouv.fr/files/files/directions_services/daj/marches_publics/oeap/concertation/autres_groupes_travail/indexation-prix-denrees-alimentaires.pdf

---

## Unité de référence

Unité normalisée utilisée pour les calculs métier.

Exemples :

- kg / g ;
- L / ml ;
- unité.

Un carton, un sac, une boîte ou une barquette sont des conditionnements commerciaux et non des unités mathématiques de référence.

---

## Taux de rendement

Part réellement valorisable d'un produit.

```text
100 %
→ aucune perte ou partie non valorisée

< 100 %
→ parage, perte, épluchure, os, carcasse, peau, liquide non valorisé, etc.
```

Le rendement de référence est défini en amont sur le produit et récupéré automatiquement par la fiche technique.

Lorsqu'une donnée objective permet de le calculer, le système doit le faire.

Exemple de conserve :

```text
rendement = poids net égoutté / poids net × 100
```

---

## Quantité nette

Quantité réellement nécessaire et présente dans la recette.

C'est la quantité saisie par l'utilisateur pour une ligne d'ingrédient.

---

## Quantité brute

Quantité à acheter ou à mettre en œuvre avant pertes.

Elle est calculée automatiquement :

```text
quantité brute = quantité nette / rendement
```

---

## % de la recette

Part d'un Produit dans la totalité de la recette.

Elle est calculée automatiquement à partir des quantités nettes réellement présentes dans la recette.

Les pertes de rendement n'entrent pas dans ce pourcentage.

Elle est distincte du taux de rendement.

---

## Fournisseur

Acteur qui commercialise un ou plusieurs articles correspondant aux produits du catalogue.

Les fournisseurs doivent pouvoir être créés par le client dans son contexte de travail.

---

## Article fournisseur

Référence commerciale précise d'un Produit chez un Fournisseur.

Un même Produit peut avoir plusieurs Articles fournisseur actifs chez un même Fournisseur, par exemple avec des références ou conditionnements différents.

Un Article fournisseur peut porter notamment :

- référence fournisseur ;
- désignation fournisseur originale ;
- marque éventuelle ;
- conditionnement structuré ;
- libellé fournisseur du conditionnement ;
- poids net ;
- poids net égoutté si applicable ;
- statut et traçabilité.

Un Produit ne doit pas être confondu avec un Article fournisseur.

---

## Conditionnement / colisage

Façon dont un Fournisseur commercialise un Article.

Le conditionnement doit être à la fois lisible et structuré pour les calculs.

Exemples :

```text
sac de 25 kg
→ 1 × 25 kg

carton de 6 × 1 L
→ total 6 L

carton de 24 × 125 g
→ total 3 kg
```

Le système conserve le libellé fournisseur d'origine lorsqu'il existe mais ne dépend pas uniquement de ce texte pour les calculs.

Le conditionnement doit pouvoir être ramené à l'unité de référence du Produit lorsque les données disponibles le permettent.

---

## Tarif fournisseur de référence

Prix issu d'un catalogue ou d'une mercuriale Fournisseur sans condition commerciale spécifique à un magasin.

Il peut être associé à une édition/millésime et à une période de validité.

Un tarif ancien reste historique ; s'il sert exceptionnellement de dernier fallback, son ancienneté et son édition doivent être signalées.

---

## Édition de catalogue fournisseur

Version identifiable d'un catalogue de référence d'un Fournisseur.

Une nouvelle édition n'écrase pas l'ancienne.

---

## Tarif négocié

Condition commerciale spécifique à un magasin et à un Article fournisseur.

Sa validité repose sur sa propre période commerciale et non sur un seuil générique d'ancienneté.

---

## Prix observé

Prix réellement constaté à une date donnée, notamment sur une facture.

Sa provenance et son contexte magasin sont conservés.

---

## Prix facturé exploitable

Prix de facture correctement rattaché, normalisable et explicitement validé.

Seul un prix VALIDÉ peut participer à la résolution automatique, sous réserve de sa fraîcheur.

---

## Fraîcheur d'un Prix facturé

Éligibilité temporelle d'un Prix facturé VALIDÉ à l'usage automatique courant.

Elle se calcule depuis la date de facture.

Le comportement standard retenu est un an ; la représentation technique exacte reste à fixer.

Une perte de fraîcheur ne retire pas le statut VALIDÉ.

---

## Validité commerciale d'un tarif

Période pendant laquelle une condition commerciale est applicable selon sa source.

Elle est distincte de la fraîcheur d'un Prix facturé et de la date d'une revue opérationnelle.

---

## Revue tarifaire

Contrôle opérationnel effectué sur les tarifs d'un magasin.

Une revue peut être réalisée en masse mais ne modifie pas artificiellement les dates contractuelles.

---

## Produit valorisable

Produit pour lequel le backend peut résoudre, dans le magasin courant, un Article et un Prix applicable conformes aux règles du Workspace.

---

## Référence favorite

Article fournisseur précis identifié comme favori dans un magasin.

Le favori ne stocke pas son prix : le Prix applicable est résolu dynamiquement.

Plusieurs références favorites peuvent correspondre au même Produit.

---

## Référence fréquemment utilisée

Article fournisseur dont l'usage réel est calculé à partir de Fiches techniques VALIDÉES distinctes d'un magasin.

Ce statut est une observation calculée et non une préférence utilisateur.

---

## Références du magasin

Vue opérationnelle unique regroupant les Articles fournisseur pertinents d'un magasin, avec notamment les états Favorite et Fréquemment utilisée et un accès au catalogue complet.

---


## Détail Produit / Magasin

Vue contextualisée d'un Produit pour un magasin déterminé.

Elle présente notamment le Prix applicable HT courant, son historique graphique dans ce magasin et les Fiches techniques courantes utilisant le Produit.

## Courbe d'évolution des prix HT

Graphique temporel affichant par défaut l'évolution du Prix applicable HT d'un Produit dans un magasin.

Il ne mélange jamais les données commerciales de plusieurs magasins.

## Carte d'identité Produit / Article

Présentation professionnelle des informations nécessaires à une sélection fiable : Produit, Fournisseur, référence, désignation d'origine, marque éventuelle, conditionnement, Prix applicable du magasin courant, source, temporalité et alertes.

Les données de cette carte proviennent du backend.

---

## Provenance tarifaire

Origine d'une donnée de prix : catalogue, mercuriale, Tarif négocié, facture, saisie contrôlée, import ou futur OCR.

---

## Prix normalisé

Prix calculé automatiquement dans l'unité de référence du Produit à partir du prix source et du conditionnement.

Exemple :

```text
40,625 € HT / sac de 25 kg
→ 1,625 €/kg HT
```

S'il manque des données fiables, le prix normalisé reste indisponible : il n'est pas deviné.

---

## Politique de prix du Workspace

Paramètre déterminant la source tarifaire préférée par le moteur pour tous les magasins/dossiers du Workspace.

Modes retenus :

- Tarif fournisseur ;
- Tarif négocié ;
- Prix facturé.

La valeur par défaut est **Tarif négocié**.

La politique est globale au Workspace, mais les tarifs négociés et prix facturés restent propres à chaque magasin lorsqu'ils sont contextualisés.

---

## Prix applicable

Prix retenu par le moteur pour valoriser une fiche dans le contexte d'un magasin, d'un Article fournisseur et d'une date de valorisation.

Hiérarchie validée :

```text
Mode Tarif fournisseur
→ Tarif fournisseur de référence applicable

Mode Tarif négocié
→ Tarif négocié valide
→ sinon Tarif fournisseur

Mode Prix facturé
→ dernier Prix facturé exploitable et validé
→ sinon Tarif négocié valide
→ sinon Tarif fournisseur
```

La source réellement utilisée et l'existence d'un fallback doivent rester traçables.

Le Prix applicable n'est pas une propriété globale du Produit.

---

## Prix d'achat HT

Base économique utilisée pour le calcul du Coût Matière.

Les prix d'achat unitaires et prix normalisés sont affichés avec exactement trois décimales.

L'affichage à trois décimales ne doit pas provoquer d'arrondi prématuré dans les calculs internes.

---

## Prix actuel

Prix commercial actuellement applicable pour un article fournisseur dans le contexte d'un magasin.

Il ne remplace pas l'historique des prix.

---

## Historique de prix

Suite chronologique des prix applicables à un article ou produit dans un magasin.

Une mise à jour ne doit pas écraser silencieusement la valeur précédente.

---

## Copie inter-magasin d'une Fiche technique

Création d'une nouvelle Fiche technique dans un magasin cible à partir de la structure d'une fiche source.

La copie peut reprendre la composition réutilisable : Produits, quantités, unités et autres données de recette validées pour la copie.

Elle ne reprend jamais les prix, valorisations ni historiques du magasin source.

La fiche cible est recalculée avec les Articles et Prix applicables de son propre contexte.

Une information minimale de provenance peut être conservée sans reprendre l'historique source.

---

## Fiche technique

Donnée métier structurée décrivant une composition et sa valorisation économique dans le contexte d'un dossier/magasin.

Elle n'est pas un simple document statique.

L'utilisateur sélectionne les produits et renseigne les faits nécessaires ; l'application calcule les données dérivées.

---

## Version de Fiche technique

État historisé d'une Fiche technique à un moment donné.

Une version VALIDATED est immuable. Une modification ultérieure produit un nouveau DRAFT.

---

## DRAFT

Version de travail non officielle pouvant être incomplète. Un DRAFT actif n'est jamais purgé uniquement pour ancienneté ; un DRAFT explicitement supprimé relève de la corbeille métier et de sa politique de rétention.

---

## VALIDATED

Version officielle ayant passé les contrôles backend de validation et conservant son snapshot économique. Elle n'est pas purgée automatiquement par simple ancienneté ; l'archivage reste le mécanisme normal de sortie de l'usage actif.

---

## ARCHIVED

Fiche ou version sortie de l'usage actif sans destruction de son historique.

---

## Ligne de composition

Utilisation d'un produit dans une fiche technique avec une quantité donnée.

Elle permet de déterminer automatiquement notamment :

- part dans la recette ;
- rendement applicable ;
- coût ;
- impact sur la valorisation totale.

---

## Composition technique

Ensemble relativement stable des produits et quantités constituant une fiche technique.

Elle doit être distinguée de la valorisation économique.

---

## Valorisation économique

Résultat des calculs de coût, marge et prix obtenus à partir :

- de la composition ;
- des rendements ;
- des prix applicables ;
- des paramètres de calcul applicables.

Une même composition peut être revalorisée dans le temps.

---

## Valorisation historique

Photographie des valeurs et résultats utilisés à une date ou version donnée.

Elle permet de comprendre pourquoi une fiche affichait un certain coût ou une certaine marge à ce moment-là.

---

## Valorisation courante

Calcul effectué avec les données actuellement applicables, notamment les prix courants.

Si un tarif devient plus récent ou plus applicable pendant qu'une fiche est en cours d'édition, la fiche n'est pas modifiée silencieusement. Le système signale qu'une revalorisation est disponible ou nécessaire.

---

## Coût Matière (CM)

Somme des coûts HT de toutes les lignes d'ingrédients.

```text
CM HT = Σ coûts HT des lignes d'ingrédients
```

Le coût d'une ligne utilise la quantité brute nécessaire et le prix d'achat HT normalisé.

---

## Économat

Ensemble des consommables achetés nécessaires à la fabrication, au conditionnement ou à la commercialisation du produit.

Exemples :

- barquette ;
- étiquette ;
- film ;
- sachet.

L'Économat est une nature de marchandise achetée différente des ingrédients mais intégrée à la fiche technique.

Les consommables utilisent les mêmes mécanismes d'approvisionnement, de conditionnement, de tarif et d'historisation lorsque pertinent, sans être soumis aux attributs alimentaires non applicables.

L'utilisateur renseigne la quantité réellement consommée ; le SaaS calcule le coût à partir du prix normalisé.

---

## Coût total de fabrication

Définition métier du produit :

```text
Coût total de fabrication HT
=
Coût Matière HT + Économat HT
```

L'énergie est exclue de ce calcul.

Aucune autre charge ne doit être ajoutée sans validation métier.

---

## Workspace Owner

Propriétaire du Workspace au sens du Core.

Dans ce SaaS, il reçoit toutes les permissions métier du produit et tous les dossiers de CE Workspace.

Il reste soumis aux invariants métier, capabilities, quotas et règles de sécurité.

Il ne faut pas le confondre avec un rôle Platform.

---

## PlatformRole

Rôle d'administration de la plateforme.

Il ne donne aucun accès implicite aux données métier d'un Workspace.

---

## Rôle Workspace

Groupe de permissions rattaché à un Workspace et attribué à un WorkspaceMember.

Le Core v1.1.0 porte un seul rôle par membre. Un rôle personnalisé peut donc combiner plusieurs responsabilités métier.

---

## Périmètre dossier

Ensemble des dossiers/magasins sur lesquels un membre est autorisé à exercer les permissions de son rôle.

Le périmètre est distinct du rôle.

---

## Acheteur / Responsable achats

Profil de rôle type orienté Fournisseurs, Articles, catalogues, négociations et conditions commerciales.

---

## Économe / Gestionnaire des prix

Profil de rôle type orienté contrôle des prix, validation des Prix facturés, revues tarifaires et revalorisation/correction des fiches selon permissions.

---

## Responsable fiches techniques

Profil de rôle type orienté création, modification, validation et cycle de vie des Fiches techniques selon permissions.

---

## Contributeur fiches techniques

Profil de rôle type pouvant créer une fiche et travailler sur les DRAFTS autorisés sans recevoir implicitement de droits tarifaires ou administratifs.

---

## Lecteur métier

Profil de rôle type limité à la consultation des données métier autorisées.

---

## Invariant métier

Règle qui définit un état acceptable du Workspace indépendamment du rôle de l'utilisateur.

Une permission autorise à demander une action ; elle n'autorise jamais à créer un état métier incohérent.

---



## Objectif de marge

Taux de marge souhaitable à atteindre pour une Fiche technique.

Convention validée :

```text
Objectif de marge
=
(Prix de vente HT - Coût total de fabrication HT)
/
Prix de vente HT
```

Il constitue une cible de pilotage et peut différer de la marge réellement obtenue.

## TVA de la fiche

Taux de TVA appliqué à la commercialisation du produit fini.

Les coûts matière, Économat et Coût total de fabrication restent calculés en HT.

## Coefficient

Valeur calculée depuis l'Objectif de marge :

```text
coefficient = 1 / (1 - objectif de marge)
```

Il n'est pas une donnée libre indépendante de l'objectif.

## Prix théorique

Prix calculé pour atteindre l'Objectif de marge avant application de la stratégie commerciale d'arrondi.

```text
Prix théorique HT
=
Coût total de fabrication HT × coefficient
```

## Prix conseillé

Prix minimum proposé par le SaaS après application au Prix théorique TTC de la règle d'arrondi effective du Workspace.

Il ne peut jamais être inférieur au Prix théorique correspondant.

## Prix définitif

Prix de vente décidé humainement pour la Fiche technique.

Invariant :

```text
Prix définitif TTC >= Prix conseillé TTC
```

## Marge réelle

Résultat économique calculé à partir du Prix définitif réellement choisi.

```text
Marge réelle %
=
(Prix définitif HT - Coût total de fabrication HT)
/
Prix définitif HT
× 100
```

La marge réelle en euros correspond à la différence entre Prix définitif HT et Coût total de fabrication HT.

## Marge semi-nette

Indicateur métier identifié dont la définition exacte est encore attendue.

Aucune formule ne doit être inventée. Son absence de définition ne bloque pas le démarrage des premiers modules.

## Règle d'arrondi du Workspace

Stratégie structurée transformant le Prix théorique TTC en Prix conseillé TTC.

Règle standard du SaaS :

```text
multiple de 0,50 € immédiatement supérieur ou égal
```

Le Workspace peut utiliser une stratégie personnalisée lorsque sa capability le permet, par exemple une terminaison commerciale en `,90`, tout en respectant `Prix conseillé >= Prix théorique`.

## Atelier d'optimisation de Fiche technique

Capability commerciale payante permettant de simuler une optimisation économique d'une Fiche technique sous contraintes de composition et de qualité.

Son UX transpose la logique d'un panneau de développement professionnel de type Lightroom : sliders globaux, courbe d'équilibre multipoints, histogramme métier, réglages fins, avant/après et limites visuelles.

La simulation est non destructive tant qu'elle n'est pas explicitement appliquée au DRAFT.

## Simulation d'optimisation

État temporaire calculé à partir d'un DRAFT sans modifier la fiche persistée.

Elle permet de comparer la référence et le scénario avant une action explicite « Appliquer au DRAFT ».

## Quantité de référence d'optimisation

Quantité de départ d'une ligne d'ingrédient utilisée comme point d'ancrage de la simulation.

Elle reste distincte des bornes minimum et maximum.

## Bornes d'optimisation

Minimum et maximum configurés pour une ligne modulable.

Elles définissent l'enveloppe commercialement acceptable de variation, mais restent soumises à des limites de sécurité backend.

## Enveloppe de qualité perçue

Ensemble des bornes, verrouillages et contraintes garantissant que l'optimisation ne dégrade pas arbitrairement la perception commerciale du produit.

Si l'objectif économique n'est pas atteignable dans cette enveloppe, le moteur doit le signaler plutôt que la dépasser.

## Courbe d'équilibre

Courbe interactive multipoints agissant sur la répartition globale de l'effort d'optimisation selon la contribution économique des ingrédients.

Elle ne remplace pas les sliders : les deux contrôles agissent sur des dimensions différentes du moteur.

## Histogramme métier

Visualisation synthétique de la composition et de la contribution économique des ingrédients utilisée dans l'Atelier d'optimisation.

Les zones proches de leurs limites de modulation doivent être signalées visuellement.

## Fiche process

Document/donnée métier décrivant la fabrication : étapes, durées, points critiques et critères d'acceptabilité.

La frontière exacte entre les données process portées par la fiche technique et la fiche process détaillée reste à définir.

---

## Paramètre métier

Valeur ou règle susceptible d'influencer les calculs ou comportements du produit.

---

## Valeur standard

Comportement fourni par le SaaS lorsqu'aucune personnalisation effective ne le remplace.

---

## Valeur configurée

Valeur choisie par le Workspace lorsque son plan/capability autorise la personnalisation.

Elle peut être conservée sans être active après un downgrade.

---

## Valeur effective

Valeur réellement appliquée par le backend après résolution entre standard, configuration et droits commerciaux.

Le frontend consomme cette valeur et ne reconstruit pas la règle.

---

## Personnalisation métier

Capacité commerciale permettant de remplacer certaines valeurs standards par des valeurs propres au Workspace.

Free peut rester sur les standards ; Trial peut tester la personnalisation ; une offre payante peut l'activer selon ses capabilities.

---

## Contrainte

Règle obligatoire et non une simple valeur proposée.

---

## Seuil d'alerte

Valeur à partir de laquelle le système signale une situation sans nécessairement empêcher l'opération.

---

## Historique produit

Traçabilité des changements significatifs du produit : nom, catégorie, rendement, photo, archivage, etc.

Il est distinct de l'historique commercial des prix et conditionnements.

---

## Alerte

Signal visuel ou notification indiquant une incohérence, une variation ou un impact nécessitant l'attention de l'utilisateur.

Les règles détaillées d'alertes restent à cadrer.

---

## Extension planifiée

Fonctionnalité non développée immédiatement mais dont le modèle V1 ne doit pas rendre l'ajout ultérieur inutilement complexe.

---

## Extension éventuelle

Possibilité identifiée sans obligation de créer immédiatement une abstraction technique ou un module dédié.
