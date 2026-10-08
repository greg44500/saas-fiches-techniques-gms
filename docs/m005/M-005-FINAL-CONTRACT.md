# M-005 — Contrat final — Atelier d’optimisation des Fiches techniques

**Statut : RECADRÉ UX — IMPLÉMENTATION EN COURS**  
**Date : 2026-10-08**  
**Module : M-005**  
**Branche : `feature/m005-technical-sheet-optimizer-v1`**

## 1. Objet

M-005 fournit un Atelier payant d’optimisation d’une Fiche technique existante dans un Dossier précis.

Il s’agit d’un outil de simulation non destructif autour du `TechnicalSheetDraft` courant. Il réutilise :

- M-002 pour les Références Produit et leurs rendements ;
- M-003 pour les Articles fournisseur et le Prix applicable ;
- M-004 pour les quantités, la valorisation, les coûts, la marge, la concurrence optimiste et la validation.

M-005 ne crée ni catalogue, ni Fiche technique parallèle, ni moteur économique parallèle.

## 2. Contexte et tenancy

Toute opération M-005 est portée par :

```text
workspaceId
+ dossierId
+ technicalSheetId
```

Le Workspace reste la frontière de tenancy. Le Dossier est le contexte économique de l’optimisation.

Un Tarif négocié, un Prix facturé ou une autre donnée commerciale propre à un autre Dossier n’est jamais un fallback admissible.

## 3. Précondition : un DRAFT courant

L’Atelier travaille uniquement sur un `TechnicalSheetDraft` courant.

Si la Fiche est validée sans brouillon, le parcours existant M-004 crée d’abord un nouveau DRAFT depuis la version validée courante. La `TechnicalSheetValidation` historique reste immuable.

Une simulation n’est jamais une nouvelle Fiche et n’est pas persistée comme ressource autonome.

## 4. Capability et RBAC

Feature commerciale dédiée :

```text
technical_sheet_optimizer
```

Elle est déclarée par le module M-004/M-005 dans le registre applicatif de capabilities. Le plan baseline/Free ne l’active pas par défaut. Aucun nom de plan Premium ou IA n’est codé en dur : l’activation relève des Plans et dérogations effectives existants.

Aucun quota de simulations n’est introduit en V1.

RBAC :

- lecture/entrée Atelier : `technical-sheet:update` ;
- application d’une modification de composition : `technical-sheet:update` ;
- sélection explicite d’un autre Article fournisseur : `technical-sheet:sourcing:manage`.

Aucune permission `optimizer` artificielle n’est créée.

## 5. Langage économique commun : %CM

Pour une ligne Ingrédient valorisée :

```text
PartCM_i = CoûtMatière_i / CoûtMatièreTotal
```

Le backend M-004 reste l’autorité et produit déjà `materialCostSharePercent`.

La somme des parts des lignes Ingrédient valorisées est 100 % du Coût Matière.

Cette représentation n’est jamais une composition physique. Aucune règle n’impose que les kg, litres ou unités totalisent 100 %, ni qu’une diminution d’une ligne soit compensée par une hausse d’une autre.

## 6. Enveloppe d’optimisation d’une ligne

Une ligne Ingrédient peut porter durablement :

```text
optimization.minNetQuantity
optimization.maxNetQuantity
optimization.locked
```

Ces valeurs sont exprimées dans l’unité de référence de la Référence Produit de la ligne.

Invariants :

- minimum et maximum sont des garde-fous facultatifs et ne sont jamais inventés par défaut ;
- sans garde-fou explicite, la plage V1 est celle de l’ajustement économique : `-99 % → +100 %`, soit une quantité presque nulle jusqu’au double de la référence ;
- lorsqu’ils sont renseignés, ils sont strictement positifs et encadrent la quantité de référence ;
- une borne absente signifie « aucun garde-fou de ce côté » et ne neutralise jamais l’ajustement local ;
- pour une ligne non verrouillée, l’ancien cas `min = max = quantité de référence` est normalisé comme une absence de garde-fou : le mécanisme `locked` est l’unique façon explicite de figer la quantité ;
- une ligne verrouillée conserve sa quantité de référence ;
- une ligne Économat n’est pas modulée par l’ajustement quantitatif M-005 V1.

Les contraintes sont persistées sur le DRAFT lorsque l’utilisateur applique le scénario. Elles sont snapshottées lors de la validation, restaurées lors d’une nouvelle révision et copiées avec la recette vers un autre Dossier. Les données économiques ne sont jamais copiées entre Dossiers.

## 7. Profil économique global et ajustement local par ingrédient

L’ancien modèle à cinq ancres `0 / 25 / 50 / 75 / 100 %CM` est abandonné. Il était mathématiquement explicable mais trop indirect : plusieurs ancres pouvaient ne produire aucun effet visible lorsque les ingrédients étaient concentrés dans une même zone de contribution au coût matière.

Le nouveau principe est :

```text
1 point interactif = 1 ligne Ingrédient
```

Le profil économique est la lecture globale instantanée de la Fiche simulée. Il ne constitue pas une fonction continue entre ingrédients et aucune interpolation entre lignes n’a de signification métier.

Pour chaque ingrédient, le backend accepte une intention :

```text
economicAdjustmentPercent
```

En V1 :

```text
-99 %  → réduction maximale compatible avec une quantité strictement positive
0 %    → quantité de référence inchangée
+100 % → quantité doublée à économie unitaire inchangée
```

Lorsque Produit, rendement et Prix applicable restent identiques :

```text
qSimulation = qRef × (1 + economicAdjustmentPercent / 100)
```

Les éventuels minimum et maximum ne pilotent pas ce mouvement : ils bornent uniquement la quantité calculée.

Le profil utilise des grandeurs métier explicables :

- axe horizontal : ajustement économique de la ligne par rapport à la recette de référence ;
- centre `0 %` : recette de référence ;
- gauche : réduction ;
- droite : augmentation / enrichissement quantitatif ;
- axe vertical : contribution au coût matière de la ligne dans la projection affichée ;
- sélection : un clic sur un point sélectionne la même ligne que dans la Fiche centrale.

La position verticale sert à lire le poids économique relatif de la ligne. Elle ne constitue jamais un score de qualité, de goût ou d’équilibre sensoriel.

Au survol ou au focus d’un point, l’interface affiche au minimum :

- nom de la Référence Produit ;
- quantité avant / simulée ;
- coût avant / simulé ;
- contribution au coût matière avant / après ;
- ajustement économique demandé ;
- état éventuel d’un garde-fou.

Le déplacement horizontal d’un point et le slider de l’inspecteur représentent la même intention et doivent rester synchronisés.

Un override local de quantité reste disponible comme réglage avancé et prend priorité sur `economicAdjustmentPercent`. « Reprendre le calcul » supprime cet override.

## 8. Alternatives Produit

M-005 ne fait aucun rapprochement lexical pour décider qu’un Produit peut en remplacer un autre.

Une alternative Produit V1 est admissible uniquement si :

- la Référence candidate est ACTIVE et visible dans le Workspace ;
- elle appartient au même `CanonicalProduct` que la Référence courante ;
- elle utilise exactement la même `referenceUnit` ;
- elle n’est pas la Référence courante.

Le changement de Référence peut modifier le rendement. La quantité brute, le sourcing, le Prix applicable et le coût sont alors recalculés par les primitives M-002/M-003/M-004.

## 9. Alternatives d’approvisionnement

Une alternative d’approvisionnement conserve la même Référence Produit et change uniquement l’Article fournisseur.

La recherche explicite M-005 est distincte de la résolution normale M-003 :

- la résolution normale M-003 ne sélectionne jamais arbitrairement l’Article le moins cher ;
- M-005 peut lister les Articles utilisables et comparer explicitement leurs Prix applicables dans le Dossier courant ;
- chaque candidat est revalidé par `resolveApplicablePrice` avec le `dossierId` courant.

Aucune donnée commerciale d’un autre Dossier n’est consultée comme fallback.

## 10. Mode Manuel

Le mode Manuel combine des réglages indépendants et explicables :

- ajustement économique local par ingrédient ;
- bornes min/max ;
- verrouillage de quantité ;
- override local de quantité avancé ;
- alternative Produit ;
- alternative Article.

Il n’existe plus de courbe globale à cinq ancres pilotant plusieurs lignes à la fois.

Chaque changement déclenche une simulation backend après un debounce court côté frontend.

Le frontend conserve uniquement les intentions de simulation. Le backend traduit l’ajustement économique en quantité, applique les garde-fous, revalorise via M-004 et renvoie les coûts, marges, %CM et économies autoritatifs.

## 11. Mode Auto V1

Le mode Auto est un assistant de proposition, pas un solveur global opaque.

Il inspecte les leviers explicitement activés :

- ajustement des quantités ;
- alternatives Produit ;
- alternatives d’approvisionnement.

V1 recherche le meilleur **prochain mouvement élémentaire** :

- quantité : 25 % du chemin disponible entre la référence et le minimum explicite ; en absence de minimum, le moteur utilise la borne libre implicite correspondant à `-99 %` ;
- Produit : substitution admissible selon la section 8 ;
- approvisionnement : Article admissible selon la section 9.

Chaque candidat est entièrement revalorisé par M-004. Les scénarios incomplets ou sans gain économique sont écartés.

Le candidat ayant le meilleur gain de Coût de fabrication HT est proposé. En cas d’égalité, la plus faible déformation normalisée puis un ordre technique stable départagent les candidats.

Cette stratégie est volontairement conservatrice :

- elle ne pousse pas toutes les lignes au minimum ;
- elle ne prétend pas calculer le goût ;
- elle ne prétend pas fournir un optimum mathématique global ;
- elle fournit une proposition explicable que l’utilisateur peut reprendre en Manuel.

## 12. Simulation et comparaison

Une simulation renvoie au minimum :

- révision du DRAFT de référence ;
- scénario avant/après ;
- quantités avant/après ;
- %CM avant/après ;
- coûts de ligne avant/après ;
- CM HT ;
- CE HT ;
- CF HT ;
- coûts unitaires existants M-004 ;
- Prix retenu TTC ;
- marge réelle ;
- écart à la marge cible ;
- économie HT et pourcentage ;
- transformations actives ;
- alternatives disponibles ;
- fingerprint de simulation.

La simulation n’écrit rien dans le DRAFT.

## 13. Apply

« Appliquer au brouillon » envoie uniquement les intentions de transformation et le fingerprint de la dernière simulation.

Le backend :

1. recharge le DRAFT sous `workspaceId + dossierId + technicalSheetId + expectedRevision` ;
2. revalide les contraintes ;
3. revalide les alternatives ;
4. re-résout les Prix applicables ;
5. revalorise avec M-004 ;
6. vérifie que le fingerprint de simulation est toujours identique ;
7. applique composition, sourcing et contraintes dans une transaction ;
8. incrémente `TechnicalSheetDraft.revision` ;
9. trace l’activité.

Une révision obsolète ou une variation économique qui rend la simulation obsolète provoque un `409`. Aucun résultat économique envoyé par le client n’est accepté comme autorité.

## 14. Validation et historique

La validation reste le workflow M-004 normal.

Lors de la création d’une `TechnicalSheetValidation` :

- les quantités, rendements, Articles, coûts et %CM restent snapshottés comme aujourd’hui ;
- les contraintes d’optimisation de chaque ligne sont également snapshottées ;
- la validation demeure immuable.

Une nouvelle révision reprend ces contraintes, mais re-résout toute donnée économique à partir du Dossier courant.

## 15. UX

Desktop : l’Atelier est un poste de lecture et de réglage continu. La Fiche simulée reste le résultat principal ; le panneau droit est un poste de pilotage compact et dense.

Structure cible :

```text
Fiche technique simulée à gauche
├── indicateurs économiques compacts
└── représentation tabulaire vivante de la Fiche

panneau de pilotage à droite
├── en-tête compact
│   ├── Profil économique global
│   └── sélecteur [Manuel | Auto]
├── spectre économique toujours visible
│   ├── axe Y : %CM
│   └── axe X : Réduction — Référence — Enrichissement
├── barre horizontale d’outils par icônes
├── grande zone contextuelle de l’outil sélectionné
└── pied compact Réinitialiser | Comparer | Appliquer
```

La page Atelier ne doit pas imposer un scroll documentaire sur desktop. La Fiche et la zone contextuelle peuvent disposer de leur propre viewport si leur contenu dépasse la hauteur disponible.

### Profil / spectre économique

Le texte explicatif redondant sous le titre est supprimé. Les termes d’axes portent leur propre aide au survol/focus.

Le rendu visuel peut s’inspirer d’un histogramme photographique : chaque ingrédient possède une trace fine et colorée indépendante. Cette trace ne relie jamais deux ingrédients entre eux et ne crée aucune interpolation métier.

Pour chaque trace :

- le sommet est le point de donnée réel ;
- son abscisse est `economicAdjustmentPercent` ;
- son ordonnée est `materialCostSharePercent` de la projection ;
- la largeur de la forme autour du sommet est uniquement décorative et ne constitue pas une mesure ;
- le point interactif reste l’autorité de sélection et de réglage ;
- le survol/focus conserve l’avant/après de la ligne.

L’axe vertical porte explicitement `%CM`. L’axe horizontal expose `Réduction`, `Référence` et `Enrichissement` avec aide contextuelle.

### Mode et outils

Le sélecteur Manuel / Auto est compact et intégré à l’en-tête du profil. Il ne crée plus une rangée pleine largeur dédiée.

Les outils Manuel sont des icônes seules :

```text
Réglage | Produit | Approvisionnement | Contraintes
```

Le libellé complet est fourni par tooltip et nom accessible. L’outil actif dispose d’un état visuel clair.

Un seul contenu d’outil est affiché sous cette barre. Cette zone reçoit la majorité de la hauteur disponible du panneau.

### Réglage et contraintes

La vue Réglage reste centrée sur l’action :

- ingrédient sélectionné ;
- slider ;
- valeur signée ;
- quantité avant → après ;
- coût avant → après ;
- %CM avant → après.

Les min/max ne sont pas initialisés par défaut. La plage libre est donc celle du moteur M-005 : presque zéro (`-99 %`) jusqu’au double (`+100 %`).

Le bouton Contraintes sert uniquement à resserrer volontairement cette plage, verrouiller une ligne ou utiliser une quantité forcée avancée.

Le cas historique non verrouillé `min = max = quantité de référence` est considéré comme un ancien état de blocage et est neutralisé à l’ouverture de la session. Une quantité réellement figée doit utiliser `locked`.

### Fiche et indicateurs

La Fiche simulée affiche au minimum Produit, quantité nette simulée, unité, PU HT, coût HT et %CM, avec lecture de la valeur précédente lorsqu’elle change.

Le bandeau économique reste compact. Les informations déjà évidentes dans la Fiche ou le profil ne sont pas répétées inutilement dans l’inspecteur.

### Petit écran

Le panneau de pilotage est présenté dans la Sheet existante avec la même hiérarchie :

- en-tête compact ;
- profil ;
- icônes ;
- contenu contextuel ;
- actions.

## 16. Performance

Les simulations sont serveur et non persistées.

Le frontend applique un debounce court aux réglages continus et ignore les réponses devenues obsolètes. Aucun cache persistant de simulation n’est créé.

Le moteur réutilise strictement les calculs M-004. Aucune formule économique parallèle n’est copiée dans React.

## 17. Tests obligatoires

Backend :

- isolation Workspace/Dossier ;
- capability absente ;
- RBAC update et sourcing ;
- DRAFT absent ;
- révision obsolète ;
- min/max/verrouillage ;
- plage libre sans min/max explicites ;
- normalisation de l’ancien état non verrouillé `min=max=référence` ;
- Auto quantité sans minimum explicite via la borne libre implicite ;
- ajustement économique par ligne ;
- override local prioritaire ;
- diminution sans compensation physique ;
- renormalisation %CM ;
- alternative Produit admissible/inadmissible ;
- alternative Article visible et prix Dossier ;
- Auto non destructif ;
- Apply transactionnel ;
- stale fingerprint ;
- validation immuable et snapshot des contraintes.

Frontend :

- affichage conditionné par capability + permission ;
- ouverture depuis la liste et la Fiche ;
- page Atelier sans scroll documentaire desktop ;
- profil économique global ;
- point = ingrédient ;
- sélection bidirectionnelle profil ↔ Fiche ;
- slider ↔ point synchronisés ;
- inspecteur à outils dynamiques ;
- Manuel/Auto ;
- contraintes ;
- alternatives ;
- avant/après ;
- arrondis de présentation ;
- reset ;
- apply ;
- erreur de révision.

E2E critique :

- simulation n’écrit pas avant Apply ;
- ajustement d’une ligne sans compensation ;
- alternative avec prix Dossier ;
- deux Dossiers donnent des résultats économiques isolés ;
- absence de capability bloque l’Atelier ;
- validation historique jamais modifiée.

## 18. Hors périmètre V1

- IA générative ;
- score de goût ;
- prédiction sensorielle ;
- conversion physique artificielle entre kg/L/unités ;
- solveur global multi-objectifs opaque ;
- persistance d’un projet d’optimisation ;
- quota de simulations ;
- modification d’une version VALIDATED ;
- diffusion/impression/email des Fiches.
