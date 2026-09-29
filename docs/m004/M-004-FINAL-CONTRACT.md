# M-004 — Fiches techniques et valorisation

**Statut : VALIDÉ — contrat fonctionnel canonique autorisant la conception technique**  
**Date de validation : 2026-09-28**  
**Prérequis : M-001, M-002 et M-003 clôturés**  
**Core intégré au moment du cadrage : v1.2.1 — d90d8f1e6034cbbf4f63de2be7312eae69b1d698**

> Ce document est la source de vérité fonctionnelle de M-004.
> Il fixe les invariants métier, économiques, de tenancy, de RBAC, de lifecycle et de quotas.
> Les détails UX de présentation restent ajustables après tests et validation visuelle tant qu'ils ne modifient pas ces invariants.
> La conception technique peut commencer après ce contrat. Aucun choix de structure MongoDB ne doit contredire M-001/M-002/M-003 ni les points d'extension du Core v1.2.1.

---

## 1. Objectif

M-004 permet de créer, composer, valoriser, valider, historiser et administrer des Fiches techniques dans le contexte économique d'un Dossier.

Le module réutilise les contrats précédents :

```text
M-001
→ où travaille l'utilisateur ?

M-002
→ quelle Référence Produit utilise-t-il ?

M-003
→ comment cette Référence Produit est-elle achetée et à quel prix dans ce Dossier ?

M-004
→ comment composer, valoriser, valider et historiser une Fiche technique ?
```

M-004 ne recrée ni le référentiel Produits ni la résolution des Articles ou Prix applicables.

---

## 2. Frontière Core / produit

M-004 est un module métier du produit dérivé.

Le Core v1.2.1 fournit déjà les primitives génériques nécessaires :

- RBAC Workspace ;
- permissions applicatives ;
- plans ;
- métriques et limites ;
- entitlements et overrides ;
- audit ;
- transactions ;
- mécanismes génériques de rétention ;
- contrôle de concurrence applicable aux écritures métier.

Le contrat fonctionnel M-004 ne demande aucune évolution du Core. La corbeille des Fiches techniques, sa configuration par Workspace, le calcul de `purgeScheduledAt` et le job de purge automatique sont des responsabilités du module métier produit. Le moteur de rétention Core v1.2.1 reste inchangé et n'est pas détourné pour ce besoin Workspace-scoped.

---

## 3. Ownership et tenancy

Une Fiche technique appartient durablement à :

```text
Workspace
× Dossier
```

Le Dossier constitue son contexte économique et opérationnel.

Invariants :

- aucune Fiche d'un Workspace ne peut être lue ou modifiée depuis un autre Workspace ;
- aucune donnée économique propre à un Dossier ne peut être utilisée comme fallback pour un autre Dossier ;
- un utilisateur non Owner doit disposer du périmètre Dossier M-001 requis ;
- `createdBy` et `updatedBy` sont des données d'audit, jamais l'ownership de la Fiche ;
- un brouillon n'appartient pas personnellement à son auteur ;
- un Contributeur autorisé peut modifier les brouillons accessibles dans les Dossiers auxquels il est affecté, selon ses permissions effectives.

Il n'existe pas en V1 de propriété individuelle de Fiche ni de `draftOwner`.

---

## 4. Identité de la Fiche

Une Fiche technique est une identité métier durable.

Elle porte au minimum :

- un nom métier courant ;
- une description facultative ;
- son Dossier ;
- son lifecycle ;
- ses métadonnées d'audit ;
- un éventuel brouillon de travail ;
- un éventuel état validé courant ;
- l'historique des validations antérieures.

Le nom courant appartient à la Fiche.

Chaque état validé conserve aussi le nom et la description tels qu'ils existaient lors de sa validation.

---

## 5. Modèle fonctionnel du travail et de l'historique

Le modèle fonctionnel V1 est :

```text
1 Fiche durable
+
0 ou 1 brouillon de travail
+
0 ou 1 état validé courant
+
0..n états validés historiques
```

Une Fiche nouvellement créée peut n'avoir encore aucun état validé.

L'utilisateur travaille toujours sur la même Fiche :

```text
Ouvrir
→ Modifier
→ Enregistrer autant de fois que nécessaire
→ Valoriser / Revaloriser
→ Valider
```

Les sauvegardes intermédiaires ne créent pas de versions commerciales supplémentaires.

Lorsqu'une Fiche déjà validée est modifiée :

```text
aucun brouillon
→ création d'un brouillon à partir de l'état validé courant

brouillon existant
→ reprise du même brouillon
```

À la validation :

```text
brouillon validé
→ nouvel état validé courant

ancien état validé courant
→ devient historique immuable

brouillon
→ cesse d'être l'état de travail
```

L'utilisateur ne gère pas une nomenclature V1/V2/V3. L'interface présente un Historique chronologique.

---

## 6. Base de production

Chaque brouillon et chaque état validé possède une base de production :

```text
quantité produite
+
unité de production
```

Le nombre de portions est facultatif et distinct de la base de production.

Les unités devront provenir de registries backend contrôlés.

---

## 7. Composition

Une Fiche possède deux sections métier distinctes :

```text
Ingrédients
Économat
```

Toute ligne repose obligatoirement sur un `ProductVariant` M-002, utilisé fonctionnellement comme Référence Produit.

Aucune désignation Produit libre n'est admise en V1.

Chaque ligne peut conserver notamment :

- ProductVariant ;
- quantité nette ;
- unité de saisie ;
- ordre ;
- note facultative ;
- Article fournisseur retenu lorsqu'il est résolu ou choisi ;
- données nécessaires à la valorisation et au snapshot historique.

Les Produits d'Économat utilisent eux aussi M-002. Ils ne reçoivent pas artificiellement des propriétés alimentaires qui ne les concernent pas.

---

## 8. Rendement et quantité brute

L'utilisateur saisit la quantité nette nécessaire.

La quantité brute est calculée à partir :

```text
quantité nette
+
yieldPercent du ProductVariant
```

Formule :

```text
quantité brute = quantité nette / (rendement / 100)
```

Règles V1 :

- le `yieldPercent` M-002 fait foi ;
- aucune surcharge locale du rendement dans une Fiche ;
- si un rendement est nécessaire au calcul mais absent, la ligne ne peut pas être considérée comme complètement calculée ;
- le rendement réellement utilisé est figé dans le snapshot de l'état validé ;
- une modification ultérieure du rendement M-002 ne réécrit jamais l'historique.

---

## 9. Unités et conversions

Les conversions sont autorisées uniquement entre unités physiquement compatibles.

Exemples :

```text
kg ↔ g
L ↔ mL
```

Interdit sans donnée métier dédiée :

```text
kg ↔ L
pièce ↔ kg
```

Le frontend ne doit jamais inventer une conversion physique.

Les conversions nécessaires aux calculs sont réalisées selon des règles backend déterministes.

---

## 10. Contribution au coût matière (%CM)

La Fiche calcule automatiquement, pour chaque ligne Ingrédient valorisée, sa contribution au coût matière HT total :

```text
%CM ligne
= coût HT de la ligne Ingrédient
/ Coût matière HT total de la Fiche
× 100
```

Le `%CM` :

- n'est jamais saisi librement ;
- est calculé par le backend uniquement lorsque la valorisation est complète ;
- est non applicable aux lignes Économat ;
- reste indisponible lorsque le Coût matière HT total est nul ;
- doit totaliser 100 % sur les lignes Ingrédients lorsque le Coût matière HT est strictement positif, sous réserve des arrondis d'affichage.

Le pourcentage physique de composition n'appartient plus à M-004. Aucun moteur de conversion `COUNT / VOLUME / MASS`, densité ou poids par unité n'est requis pour calculer `%CM`.

---

## 11. Résolution de l'Article fournisseur

M-004 réutilise impérativement les services M-003.

Chaîne conceptuelle :

```text
ProductVariant
→ SupplierArticle autorisé
→ Prix applicable M-003
→ contexte Dossier courant
```

Règles :

```text
Article explicitement sélectionné
→ conservé

0 Article exploitable
→ ligne non résolue

1 Article exploitable
→ résolution automatique autorisée

plusieurs Articles exploitables
→ choix humain obligatoire
```

Il est interdit de sélectionner automatiquement l'Article le moins cher.

Un changement d'Article constitue une modification d'approvisionnement distincte d'une simple revalorisation.

---

## 12. Prix applicable

Le backend M-003 reste la seule autorité de résolution du Prix applicable.

Le frontend ne reconstruit jamais la politique tarifaire.

Un Prix applicable absent est représenté comme absent :

```text
jamais 0 €
→ ligne non valorisée
→ Fiche non complètement valorisée
```

Le fallback reste celui du contrat M-003 et toujours dans le contexte autorisé du même Dossier.

---

## 13. Coût des lignes

Une ligne valorisable est calculée à partir de :

```text
quantité brute
×
prix normalisé applicable HT
```

La quantité brute doit être convertie dans l'unité normalisée du Prix applicable lorsque la conversion est compatible.

Aucun arrondi prématuré ne doit modifier le calcul interne.

Le snapshot validé conserve suffisamment d'informations pour expliquer le coût historique de la ligne sans dépendre de l'état futur de M-002 ou M-003.

---

## 14. Coûts économiques de la Fiche

Les coûts sont séparés :

```text
Coût matière HT
= somme des lignes Ingrédients

Économat HT
= somme des lignes Économat

Coût de fabrication HT
= Coût matière HT + Économat HT
```

L'énergie est hors périmètre de M-004 V1.

---

## 15. TVA

La TVA appartient à l'état économique de la Fiche et est historisable.

Les coûts matière et Économat restent calculés HT.

Le passage HT → TTC utilise la TVA de la Fiche.

---

## 16. Marge cible

La marge cible représente :

```text
(PV HT - coût fabrication HT) / PV HT
```

Pour une marge cible strictement inférieure à 100 % :

```text
coefficient
= 1 / (1 - marge cible)
```

Puis :

```text
Prix théorique HT
= Coût fabrication HT × coefficient
```

Le backend valide les bornes admissibles. Une marge cible rendant le calcul impossible est refusée.

---

## 17. Prix théorique et prix conseillé

Le Prix théorique TTC est obtenu après application de la TVA au Prix théorique HT.

Règle d'arrondi V1 :

```text
prochain multiple de 0,50 €
supérieur ou égal au théorique TTC
```

Exemples :

```text
4,00 → 4,00
4,01 → 4,50
4,49 → 4,50
4,50 → 4,50
4,51 → 5,00
```

Le résultat constitue le Prix conseillé TTC.

Le Prix conseillé est une aide à la décision, pas un plancher commercial obligatoire.

---

## 18. Prix final et marge réelle

Par défaut, le Prix conseillé TTC est proposé comme Prix final TTC.

L'utilisateur autorisé peut ensuite choisir un Prix final :

```text
supérieur
égal
ou inférieur au Prix conseillé
```

Le Prix final ne peut jamais être inférieur au plancher économique correspondant au coût total.

Pour une Fiche soumise à TVA :

```text
plancher TTC
= Coût de fabrication HT × (1 + TVA)
```

Après choix du Prix final, le backend recalcule :

- Prix final HT ;
- marge réelle en valeur ;
- marge réelle en pourcentage.

Un Prix final choisi explicitement par l'utilisateur ne doit pas être remplacé silencieusement lors d'une revalorisation.

Si une nouvelle valorisation rend ce Prix final inférieur au nouveau plancher économique, la validation est refusée jusqu'à correction explicite.

---

## 19. Marge cible par défaut du Dossier

Chaque Dossier porte un paramètre métier :

```text
taux de marge cible par défaut
```

Ce paramètre sert uniquement à initialiser les nouvelles Fiches.

Exemple :

```text
Dossier = 30 %
→ nouvelle Fiche = 30 %

Dossier modifié ensuite à 35 %
→ Fiches existantes inchangées
→ nouvelles Fiches = 35 %
```

Pas d'effet rétroactif.

Lors d'une copie A → B :

- TVA : copiée depuis la Fiche source ;
- marge cible : initialisée depuis le Dossier B.

Ce réglage appartient au domaine métier du Dossier, pas à une surface technique Core.

---

## 20. Valorisation et fraîcheur

La valorisation calcule les coûts à partir de l'état courant du brouillon et des Prix applicables M-003.

Une Fiche peut être :

- non valorisée ;
- partiellement valorisée ;
- complètement valorisée ;
- valorisation devenue obsolète.

Avant validation, le backend revérifie notamment :

- validité des ProductVariants ;
- validité des Articles retenus ;
- Prix applicables ;
- cohérence des quantités et unités ;
- fraîcheur de la valorisation ;
- concurrence.

Si un prix M-003 a changé depuis la valorisation :

```text
validation refusée
→ revalorisation explicite obligatoire
```

Aucune modification économique silencieuse n'est admise.

---

## 21. Snapshot économique validé

Chaque validation conserve un snapshot immuable suffisant pour expliquer l'état validé sans dépendre de données externes futures.

Il conserve au minimum, selon pertinence :

### Fiche

- nom ;
- description ;
- base de production ;
- portions ;
- TVA ;
- marge cible ;
- coûts agrégés ;
- prix théorique ;
- prix conseillé ;
- prix final ;
- marge réelle ;
- auteur et date de validation ;
- commentaire utilisateur facultatif.

### Lignes

- type Ingrédient / Économat ;
- ProductVariant utilisé ;
- identité/libellé utile du Produit au moment de la validation ;
- quantité nette ;
- unité ;
- rendement utilisé lorsque pertinent ;
- quantité brute ;
- contribution au coût matière (%CM) lorsque pertinente ;
- Article fournisseur retenu ;
- identité utile de l'Article et du Fournisseur ;
- source du Prix applicable ;
- prix normalisé utilisé ;
- unité normalisée ;
- coût calculé ;
- alertes/éléments de provenance nécessaires à la compréhension historique.

Les états validés historiques sont immuables.

---

## 22. Références historiques devenues indisponibles

Un ProductVariant, SupplierArticle ou Fournisseur peut devenir indisponible après une validation.

Règle :

```text
état historique validé
→ reste intégralement consultable
```

Une nouvelle validation ne peut pas continuer silencieusement avec une référence devenue invalide.

Le brouillon doit être corrigé ou réapprovisionné.

---

## 23. Concurrence

Deux utilisateurs ne doivent jamais écraser silencieusement leurs modifications.

Si la Fiche ou le brouillon a changé depuis le chargement :

```text
enregistrement ou validation refusé
→ conflit explicite
→ récupération de l'état actuel
```

Pas de fusion automatique de composition ou de données économiques en V1.

La conception technique doit utiliser un contrôle optimiste explicite compatible avec MongoDB/Mongoose et les transactions existantes.

---

## 24. Lifecycle de la Fiche

Les états utilisateur principaux sont :

```text
ACTIVE
ARCHIVED
DELETED
```

Le brouillon et l'état validé sont des sous-états de travail/historique, pas le lifecycle principal de l'identité Fiche.

### ACTIVE

- usage normal ;
- modification selon permissions ;
- valorisation ;
- validation ;
- copie possible.

### ARCHIVED

- consultation conservée ;
- historique conservé ;
- réactivation possible ;
- copie possible ;
- pas d'édition opérationnelle tant qu'elle n'est pas réactivée.

### DELETED

- Fiche en corbeille ;
- non utilisable normalement ;
- non copiable ;
- restauration possible pendant la rétention ;
- purge définitive à échéance ou action explicitement autorisée.

---

## 25. Archivage

L'archivage concerne toute la Fiche.

Il ne supprime ni :

- l'état validé courant ;
- le brouillon éventuel ;
- l'historique ;
- les snapshots.

Une Fiche archivée continue de compter dans la capacité commerciale.

---

## 26. Suppression, corbeille, restauration et purge

Une Fiche, même déjà validée, peut être supprimée.

La suppression concerne l'agrégat entier :

```text
Fiche
+ brouillon éventuel
+ état validé courant
+ historique
+ snapshots économiques
```

Flux :

```text
suppression
→ corbeille
→ restauration possible pendant la rétention
→ purge définitive
```

Une suppression ne détruit jamais individuellement un ancien état validé.

Une Fiche en corbeille reste comptée dans le quota tant qu'elle est restaurable.

La restauration remet la Fiche dans son dernier état métier pertinent antérieur à la suppression, sans revalorisation ni validation silencieuse.

La purge définitive détruit la Fiche complète et libère alors seulement son unité de capacité.

La corbeille M-004 est gérée dans le produit, sans modification du Core.

Politique validée :

```text
configuration par Workspace
durée par défaut = 30 jours
minimum = 1 jour
maximum = 90 jours
```

Lors de chaque suppression :

```text
deletedAt
+ durée du Workspace au moment de la suppression
→ purgeScheduledAt figé
```

Une modification ultérieure du réglage du Workspace n'est pas rétroactive sur les Fiches déjà en corbeille.

Un job métier unique et idempotent recherche périodiquement toutes les Fiches `DELETED` dont `purgeScheduledAt <= maintenant` et purge chaque agrégat éligible. Il n'existe pas un scheduler distinct par Workspace.

Le Workspace Owner peut modifier la durée de conservation et conserve la permission de purge définitive manuelle.

---

## 27. Copie inter-Dossier

Une Fiche ACTIVE ou ARCHIVED peut servir de source uniquement lorsqu’aucun brouillon de travail n’est ouvert.

Une Fiche DELETED ne peut pas être copiée.

Une Fiche possédant un brouillon ouvert ne peut pas être copiée. L’utilisateur doit d’abord valider ce brouillon afin que la copie parte d’un état validé explicite.

V1 :

```text
copie inter-Dossier
→ dans le même Workspace / contexte produit autorisé
```

La copie crée :

```text
nouvelle identité Fiche
+
nouveau brouillon indépendant
```

Aucune synchronisation future avec la source.

Une provenance informative est conservée :

- Fiche source ;
- Dossier source ;
- date de copie.

### Données copiées

Notamment :

- nom ;
- description ;
- base de production ;
- portions ;
- composition ;
- ProductVariants ;
- quantités nettes ;
- unités ;
- ordre ;
- notes ;
- TVA.

La composition copiée provient exclusivement de l’état validé courant de la Fiche source. Un brouillon non validé n’est jamais utilisé comme source de copie.

### Données non copiées

Aucune donnée financière propre au Dossier source :

- Prix applicables ;
- Tarifs négociés ;
- Prix facturés ;
- coûts ;
- snapshots économiques ;
- Prix conseillé ;
- Prix final ;
- marge réelle ;
- historique financier.

### Contexte cible

Après copie vers B :

```text
marge cible
→ valeur par défaut du Dossier B

pour chaque ligne
→ résolution M-003 dans B
→ Article B si résolution non ambiguë
→ Prix applicable B
→ valorisation B
```

Si aucun Prix valide n'existe dans B :

```text
ligne non valorisée
→ jamais 0 €
→ validation impossible
```

Si plusieurs Articles sont possibles :

```text
choix humain obligatoire
```

La copie consomme une nouvelle unité de quota.

---

## 28. Dossier et disponibilité opérationnelle

Les opérations de création, édition, composition, valorisation et validation exigent un Dossier opérationnel selon les règles M-001.

Un Dossier PAUSED, ARCHIVED ou DELETED ne doit pas devenir silencieusement un contexte de travail opérationnel.

Les consultations historiques restent soumises aux politiques M-001 et aux permissions effectives.

---

## 29. RBAC M-004

M-004 étend le RBAC Workspace existant via les permissions applicatives du produit.

Aucun RBAC parallèle.

Profils fonctionnels de référence :

- Owner ;
- Responsable Fiches techniques ;
- Contributeur Fiches techniques ;
- Économe / Acheteur ;
- Lecteur.

Les profils métier sont des presets fonctionnels destinés aux Roles Workspace personnalisés, pas de nouveaux rôles système Core.

Le rôle système Owner reçoit toutes les permissions M-004.

Matrice fonctionnelle validée :

| Action | Owner | Responsable FT | Contributeur FT | Économe / Acheteur | Lecteur |
|---|:---:|:---:|:---:|:---:|:---:|
| Consulter | Oui | Oui | Oui | Oui | Oui |
| Créer une Fiche | Oui | Oui | Oui | Non | Non |
| Modifier identité/base | Oui | Oui | Oui | Non | Non |
| Modifier composition | Oui | Oui | Oui | Non | Non |
| Choisir/changer l'Article fournisseur | Oui | Oui | Oui | Oui | Non |
| Valoriser / revaloriser | Oui | Oui | Oui | Oui | Non |
| Valider | Oui | Oui | Non | Non | Non |
| Archiver | Oui | Oui | Non | Non | Non |
| Réactiver | Oui | Oui | Non | Non | Non |
| Supprimer vers corbeille | Oui | Oui | Non | Non | Non |
| Restaurer depuis corbeille | Oui | Oui | Non | Non | Non |
| Copier | Oui | Oui | Oui | Non | Non |
| Modifier la marge par défaut du Dossier | Oui | Oui | Non | Non | Non |
| Modifier la durée de corbeille du Workspace | Oui | Non | Non | Non | Non |
| Purger définitivement | Oui | Non | Non | Non | Non |

Un Économe/Acheteur peut modifier l'Article retenu et revaloriser sans obtenir le droit de modifier la recette.

Un Contributeur peut résoudre une ambiguïté d'Article nécessaire à la valorisation sans obtenir les permissions d'administration M-003.

L'administration M-003 reste séparée des permissions M-004.

---

## 30. Quota commercial des Fiches techniques

La limite commerciale s'exprime en nombre de Fiches, jamais en octets.

Principe :

```text
1 identité Fiche = 1 unité
```

Indépendamment :

- de son statut ;
- de son nombre de sauvegardes ;
- de son nombre de revalorisations ;
- de son nombre de validations ;
- de la taille de son historique.

Comptage :

```text
nouvelle Fiche = +1
copie = +1

modifier = +0
revaloriser = +0
valider à nouveau = +0
historique supplémentaire = +0
archiver = +0
mettre en corbeille = +0
restaurer = +0

purge définitive = -1
```

Une Fiche en corbeille continue de consommer la capacité tant qu'elle est restaurable.

La limite est portée au niveau Workspace, pas Dossier par Dossier.

---

## 31. Plans et valeur de développement

La Fiche technique est une fonctionnalité centrale et reste disponible dans l'offre Free.

Les actions normales ne sont pas séparées en capabilities commerciales :

- créer ;
- modifier ;
- valoriser ;
- valider ;
- archiver ;
- historiser ;
- restaurer ;
- copier.

La différenciation commerciale V1 repose principalement sur les limites effectives de plan.

Le seuil commercial définitif de l'offre Free reste À DÉFINIR.

Pour le développement et les tests, une valeur temporaire telle que :

```text
10 Fiches
```

peut être utilisée.

Les tests peuvent employer des limites inférieures afin d'atteindre rapidement le cas « quota atteint ».

Cette valeur ne doit jamais être codée en dur dans la logique métier.

Toute vérification utilise :

```text
usage actuel
vs
limite effective du Plan / entitlement
```

Ainsi le quota pourra être modifié ultérieurement par configuration commerciale sans modification de la logique M-004.

---

## 32. Comportement à la limite

Lorsque le quota est atteint :

```text
création nouvelle
→ refusée

copie
→ refusée
```

Restent autorisées selon RBAC :

- consultation ;
- modification d'une Fiche existante ;
- valorisation ;
- revalorisation ;
- validation ;
- archivage ;
- suppression vers corbeille ;
- restauration.

La mise en corbeille ne libère pas une place.

Seule la purge définitive ou l'augmentation de la limite effective libère/permet une nouvelle capacité.

---

## 33. Dashboard et indicateurs

Les capacités sont affichées séparément par type de ressource.

Exemple :

```text
Dossiers
1 / 1

Fiches techniques
7 / 10

Fiches process
plus tard
```

Pas de pourcentage global mélangeant des ressources différentes.

Pour chaque métrique :

```text
utilisation = nombre actuel
reste = limite effective - utilisation
pourcentage = utilisation / limite effective × 100
```

Le backend demeure l'autorité sur l'usage et la limite effective.

---

## 34. Audit métier

Les actions significatives doivent être auditables, notamment :

- création ;
- modification ;
- changement de composition ;
- changement d'Article ;
- valorisation / revalorisation ;
- validation ;
- archivage ;
- réactivation ;
- suppression ;
- restauration ;
- purge ;
- copie ;
- modification de la marge par défaut du Dossier.

L'AuditLog générique ne remplace pas l'historique fonctionnel validé de la Fiche.

---

## 35. Parcours frontend

M-004 s'intègre dans la vraie page de travail du Dossier M-001.

Le shell Dossier conserve les outils de contexte utiles pendant la navigation entre les modules. En particulier, lorsqu'un utilisateur possède l'autorité M-003 correspondante, la vérification du Prix applicable reste accessible depuis l'onglet Fiches techniques afin d'aider à choisir ou contrôler un Article fournisseur pendant la composition.

Surfaces fonctionnelles :

- liste des Fiches du Dossier ;
- création ;
- consultation ;
- édition ;
- composition ;
- valorisation ;
- revalorisation ;
- validation ;
- historique ;
- archivage ;
- réactivation ;
- copie ;
- corbeille ;
- restauration ;
- paramètres du Dossier ;
- indicateurs de capacité.

Réutiliser prioritairement :

- DataTable ;
- DataPagination ;
- EntityDetailsDrawer lorsque pertinent ;
- ActionIconButton ;
- ConfirmationDialog ;
- composants shadcn/ui ;
- composants shared existants.

Les détails de mise en page, densité, placement d'actions et microcopie restent ajustables après validation visuelle.

Ils ne sont pas bloquants pour la conception technique tant qu'ils respectent :

- les permissions ;
- les invariants métier ;
- l'accessibilité ;
- le vocabulaire métier français ;
- l'absence de vocabulaire technique Core dans l'UI.

---

## 36. États et messages UX nécessaires

L'interface doit gérer explicitement :

- aucun résultat ;
- aucune Fiche ;
- aucun Article exploitable ;
- plusieurs Articles possibles ;
- Prix applicable absent ;
- valorisation obsolète ;
- quota atteint ;
- conflit de concurrence ;
- référence historique devenue indisponible ;
- Dossier non opérationnel ;
- permission insuffisante ;
- Fiche archivée ;
- Fiche en corbeille.

Aucun de ces états ne doit être transformé en valeur par défaut silencieuse.

---

## 37. Exports et diffusion — périmètre produit V1

La V1 produit comprend :

- export CSV ;
- export XLSX ;
- génération PDF ;
- impression ;
- envoi par e-mail.

Ces fonctions appartiennent à la V1 mais ne sont pas implémentées dans le premier bloc M-004 Fiche technique.

Ordre impératif :

```text
Bloc M-004 Fiche technique
→ implémentation complète
→ tests backend/frontend/E2E
→ gates
→ validation visuelle utilisateur
→ stabilisation

puis

Bloc V1 Exports et diffusion
→ cadrage détaillé
→ CSV
→ XLSX
→ PDF
→ impression
→ e-mail
→ tests dédiés
→ validation visuelle
```

Le bloc Exports et diffusion doit être cadré séparément avant son code, notamment pour :

- contenu exact des sorties ;
- état de Fiche utilisé ;
- templates ;
- permissions ;
- noms de fichiers ;
- génération temporaire ;
- impression ;
- destinataires ;
- e-mail ;
- rétention éventuelle ;
- audit.

Les exports reproductibles ne doivent pas devenir par défaut des ressources métier persistantes.

---

## 38. Exports différés V2

Tous les autres formats ou mécanismes d'export non explicitement inclus dans la section précédente restent différés à une V2 ou à un cadrage ultérieur.

Ils ne doivent pas être implémentés implicitement dans M-004.

---

## 39. Hors périmètre M-004 V1

Restent hors périmètre :

- M-005 optimisation atelier ;
- OCR ;
- IA ;
- reverse recipe ;
- comparateur automatique du fournisseur le moins cher ;
- optimisation automatique de marge ;
- marge semi-nette ;
- analytics avancés ;
- synchronisation automatique de copies entre Dossiers ;
- fusion automatique de modifications concurrentes ;
- surcharge locale du rendement Produit.

---

## 40. Cas limites structurants

Le backend doit notamment refuser ou traiter explicitement :

- ProductVariant absent/inactif/remplacé lorsque non autorisé ;
- rendement requis mais absent ;
- conversion d'unités impossible ;
- Article fournisseur devenu invalide ;
- plusieurs Articles sans choix utilisateur ;
- aucun Prix applicable ;
- Prix applicable non normalisable ;
- changement de Prix après valorisation ;
- Prix final sous le plancher économique ;
- marge cible invalide ;
- Fiche non complètement valorisée ;
- validation concurrente ;
- brouillon modifié depuis chargement ;
- copie depuis la corbeille ;
- copie vers Dossier non autorisé ;
- création/copie lorsque quota atteint ;
- restauration après purge ;
- opération d'écriture dans un Dossier non opérationnel.

---

## 41. Critères d'acceptation fonctionnels

M-004 Fiche technique est fonctionnellement acceptable lorsque :

1. une Fiche peut être créée dans un Dossier autorisé ;
2. une Fiche consomme exactement une unité de capacité ;
3. une composition repose uniquement sur M-002 ;
4. quantité brute et rendement sont déterministes ;
5. les conversions incompatibles sont refusées ;
6. M-003 est réutilisé comme autorité de résolution Article/Prix ;
7. plusieurs Articles exigent un choix humain ;
8. un Prix absent n'est jamais transformé en 0 ;
9. CM, %CM, Économat et coût de fabrication sont calculés séparément ;
10. TVA, marge cible, prix théorique, conseillé et final sont correctement calculés ;
11. le Prix final peut différer du conseillé sans passer sous le plancher ;
12. la marge réelle est recalculée ;
13. une valorisation devenue obsolète bloque la validation ;
14. un état validé est immuable et historiquement explicable ;
15. les validations successives n'ajoutent pas de consommation de quota ;
16. la copie A → B ne transporte aucune donnée financière du Dossier A ;
17. la copie utilise les prix et la marge par défaut de B selon le contrat ;
18. archivage, corbeille, restauration et purge respectent leur lifecycle ;
19. seule la purge libère une unité de capacité ;
20. le RBAC validé est respecté ;
21. la concurrence ne provoque aucun écrasement silencieux ;
22. les Fiches historiques restent consultables malgré l'évolution des références externes ;
23. les détails UX peuvent évoluer après QA sans modifier les invariants fonctionnels ;
24. les exports V1 restent différés jusqu'à la stabilisation visuelle et fonctionnelle du bloc Fiche technique.

---

## 42. Tests attendus

### Backend

Prévoir notamment :

- ownership / tenancy ;
- isolation Dossier ;
- RBAC et Owner ;
- quota global Fiches ;
- création ;
- copie ;
- suppression / corbeille / restauration / purge ;
- brouillon incomplet ;
- validation complète ;
- 0 / 1 / N Articles ;
- Prix manquant ;
- absence de fallback inter-Dossier ;
- quantité brute ;
- rendement ;
- conversions ;
- contribution au coût matière (%CM) ;
- CM ;
- Économat ;
- coût total ;
- TVA ;
- marge cible ;
- prix théorique ;
- arrondi ;
- Prix conseillé ;
- Prix final ;
- plancher économique ;
- marge réelle ;
- snapshot historique ;
- immutabilité historique ;
- Prix modifié avant validation ;
- revalorisation ;
- changement d'Article ;
- copie inter-Dossier ;
- prix cible ;
- marge par défaut cible ;
- archivage ;
- concurrence ;
- transactions ;
- limite effective configurable ;
- usage libéré uniquement après purge.

### Frontend

Prévoir notamment :

- permissions ;
- lecture seule ;
- création ;
- édition ;
- composition ;
- ambiguïté Article ;
- Prix absent ;
- valorisation ;
- warnings ;
- validation ;
- historique ;
- revalorisation ;
- archivage ;
- copie ;
- corbeille ;
- quotas ;
- dashboard capacité ;
- accessibilité ;
- tooltips ;
- réutilisation des composants ;
- vocabulaire français.

### E2E critiques

```text
créer → composer → valoriser → valider

ambiguïté Article
→ choix humain

Prix modifié
→ validation refusée
→ revalorisation
→ validation

isolation de deux Dossiers

copie A → B
→ aucun prix A copié
→ prix B résolu si disponible

quota atteint
→ modification autorisée
→ création/copie refusée

suppression
→ corbeille
→ restauration

purge définitive
→ capacité libérée
```

---

## 43. Ordre d'implémentation après conception

Après validation de la conception technique :

```text
branche M-004 unique
→ backend
→ tests backend
→ frontend
→ tests frontend
→ E2E critiques
→ QA visuelle utilisateur
→ corrections UX compatibles avec ce contrat
→ npm run release:check
→ une seule PR cohérente
→ Core Gate PR
→ merge
→ Core Gate post-merge
→ documentation de clôture
```

Pas de micro-PR.

Pas de micro-version pour corriger chaque test.

Le bloc Exports et diffusion V1 n'est ouvert qu'après validation et stabilisation du bloc Fiche technique.

---

## 44. Principe directeur

```text
Core = fondations génériques
Produit = métier

M-004 =
une Fiche durable
+ un brouillon éventuel
+ un état validé courant
+ un historique automatique
+ une valorisation propre au Dossier
+ une capacité exprimée en nombre de Fiches
```
