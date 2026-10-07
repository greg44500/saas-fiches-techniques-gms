# M-005 — Contrat final — Atelier d’optimisation des Fiches techniques

**Statut : VALIDÉ POUR IMPLÉMENTATION**  
**Date : 2026-10-07**  
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

- minimum et maximum sont des garde-fous facultatifs ;
- lorsqu’ils sont renseignés, ils sont strictement positifs et encadrent la quantité de référence ;
- une borne absente signifie « aucun garde-fou de ce côté » et ne neutralise jamais la courbe ;
- une ligne verrouillée conserve sa quantité de référence ;
- une ligne Économat n’est pas modulée par la courbe M-005 V1.

Les contraintes sont persistées sur le DRAFT lorsque l’utilisateur applique le scénario. Elles sont snapshottées lors de la validation, restaurées lors d’une nouvelle révision et copiées avec la recette vers un autre Dossier. Les données économiques ne sont jamais copiées entre Dossiers.

## 7. Courbe d’ajustement économique

La courbe conserve cinq points fixes sur l’axe horizontal, déterminés par la contribution économique actuelle de la ligne :

```text
0 %CM   → Très faible
25 %CM  → Faible
50 %CM  → Moyenne
75 %CM  → Forte
100 %CM → Très forte
```

L’axe vertical représente directement la variation de coût souhaitée pour les lignes de la zone concernée.

En V1 :

```text
-90 %  → forte réduction du coût de ligne
0 %    → économie de référence inchangée
+100 % → coût de ligne doublé
```

Entre deux points, l’ajustement économique est interpolé linéairement selon le %CM de référence de la ligne.

Lorsque Produit, rendement et prix applicable restent identiques :

```text
qSimulation = qRef × (1 + ajustementEconomique / 100)
```

Le coût de ligne évolue alors dans la même proportion que la quantité. Les éventuels minimum et maximum ne pilotent pas ce mouvement : ils bornent uniquement la quantité calculée.

Lorsqu’un calque Produit ou approvisionnement change l’économie unitaire, le moteur M-004 revalorise entièrement la ligne et le résultat économique réel retourné par le serveur reste autoritatif.

Un override local de quantité prend priorité sur la courbe. « Reprendre le calcul » supprime cet override.

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

Le mode Manuel permet de combiner :

- courbe globale ;
- bornes min/max ;
- verrouillage de quantité ;
- override local ;
- alternative Produit ;
- alternative Article.

Chaque changement déclenche une simulation backend après un debounce court côté frontend.

Le frontend ne calcule jamais une valeur économique autoritative. Il peut uniquement conserver des intentions de simulation et afficher la réponse du serveur.

## 11. Mode Auto V1

Le mode Auto est un assistant de proposition, pas un solveur global opaque.

Il inspecte les leviers explicitement activés :

- ajustement des quantités ;
- alternatives Produit ;
- alternatives d’approvisionnement.

V1 recherche le meilleur **prochain mouvement élémentaire** :

- quantité : 25 % du chemin disponible entre la référence et le minimum pour une ligne non verrouillée ;
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

Desktop :

- page Atelier dédiée inspirée d’un poste de réglage type Lightroom ;
- bandeau économique compact avant/après ;
- Fiche technique simulée comme surface visuelle principale ;
- lignes Ingrédients avec quantité, coût et %CM avant/après ainsi qu’une barre de contribution ;
- panneau de réglages persistant à droite ;
- courbe économique compacte dans ce panneau ;
- calques logiques Produit / rendement et approvisionnement ;
- garde-fous quantité facultatifs dans l’inspecteur ;
- modes Manuel / Auto ;
- actions Réinitialiser / Comparer / Appliquer au brouillon.

La navigation Workspace expose également « Atelier d’optimisation » dans le groupe Dossiers avec une icône baguette magique. Cette entrée ouvre un sélecteur Dossier puis Fiche avant d’accéder au même Atelier canonique.

Petit écran :

- contenu principal conservé ;
- inspecteur en Sheet latérale/basse ;
- contrôles utilisables au tactile et au clavier.

Deux entrées ouvrent le même Atelier :

- action « Optimiser » depuis une Fiche ;
- entrée « Atelier d’optimisation » dans le Dossier avec choix d’une Fiche.

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
- courbe et override local ;
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
- création préalable d’un DRAFT depuis une version validée ;
- page Atelier ;
- Manuel/Auto ;
- courbe ;
- inspecteur ;
- contraintes ;
- alternatives ;
- avant/après ;
- reset ;
- apply ;
- erreur de révision.

E2E critique :

- simulation n’écrit pas avant Apply ;
- réduction d’une quantité sans compensation ;
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
