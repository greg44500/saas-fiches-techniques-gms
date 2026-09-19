# SAAS-FICHES-TECHNIQUES-GMS — Modèle de domaine

**Statut :** DRAFT — cadrage métier en cours  
**Dernière mise à jour :** 2026-09-19  
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
Workspace
│
├── Catalogue produit
│   ├── Produits
│   │   ├── Catégorie
│   │   ├── Gamme éventuelle
│   │   ├── Unité de référence
│   │   └── Rendement
│   │
│   ├── Fournisseurs
│   │
│   └── Articles / offres fournisseur
│       ├── Référence fournisseur
│       ├── Conditionnement
│       ├── Poids net / égoutté si applicable
│       └── Conditions commerciales par magasin
│           ├── Prix
│           ├── Disponibilité
│           ├── Date d'effet
│           └── Historique
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

Invariant :

```text
toute donnée métier du produit
→ ownership Workspace explicite
```

Les ressources métier appartenant au Workspace doivent utiliser l'ownership explicite prévu par le Core.

`createdBy` / `updatedBy` servent à l'audit et ne remplacent pas l'ownership.

---

## 4. Dossier / magasin

Le dossier fournit le contexte dans lequel l'utilisateur travaille pour un magasin.

Relations actuelles :

```text
Workspace
1
→ plusieurs Dossiers

Dossier
→ contexte magasin
```

Le dossier contextualise notamment :

- conditions commerciales ;
- disponibilité des produits ;
- fiches techniques ;
- fiches process.

**Règle V1 validée :** `1 dossier = 1 magasin`.

**À valider avant implémentation :**

- informations minimales du magasin ;
- cycle de vie du dossier.

**Règle de copie/import validée :** une Fiche technique peut être copiée d'un magasin à un autre, mais la copie transporte uniquement sa structure de composition réutilisable. Elle ne transporte jamais les prix, valorisations ni historiques du magasin source.

---

## 4.1 Isolation du contexte magasin

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

---

## 5. Produit

Le Produit est indépendant de son fournisseur et de son prix.

### 5.1 Caractéristiques

Conceptuellement :

```text
Produit
├── nom
├── catégorie
├── gamme éventuelle
├── unité de référence
├── taux de rendement
├── photo facultative
├── notes facultatives
├── statut
├── createdAt
├── updatedAt
├── createdBy
└── updatedBy
```

Le détail technique de persistance reste à définir ultérieurement.

### 5.2 Nommage

Invariant de lisibilité :

```text
produit entier / forme standard
→ nom simple

forme préparée nécessaire à la compréhension
→ précision dans le nom
```

Exemples :

```text
Oignon
Oignon émincé

Carotte
Carotte râpée
```

Le domaine ne nécessite pas à ce stade un champ utilisateur séparé « forme/état ».

### 5.3 Catégorie

La catégorie est indépendante de la gamme.

```text
Catégorie
→ axe fonctionnel de classement

Gamme
→ axe professionnel de préparation / conservation lorsqu'applicable
```

### 5.4 Gamme

La gamme est facultative lorsqu'elle n'est pas pertinente.

Le modèle doit permettre :

```text
1
2
3
4
5
non applicable
```

Exemple :

```text
Farine
→ gamme non applicable
→ rendement 100 %
```

### 5.5 Rendement

Le rendement est une caractéristique de référence du produit utilisé dans la fiche.

Invariant :

```text
fiche technique
→ hérite du rendement produit
→ ne demande pas une ressaisie libre ordinaire
```

Lorsque le rendement est mathématiquement déductible de données fiables, il doit être calculé.

Exemple :

```text
poids net égoutté / poids net
→ rendement conserve
```

Le modèle doit préserver une possibilité future d'exception documentée et historisée sans imposer son développement en V1.

---

## 6. Fournisseur

Un Fournisseur est un acteur commercial pouvant proposer des articles correspondant aux produits du Workspace.

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
- lifecycle d'une référence remplacée ;
- notion éventuelle d'Article privilégié.

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

Le catalogue partagé au Workspace ne contient aucune condition commerciale spécifique à un magasin.

Un futur import CSV/XLS/XLSX crée une nouvelle édition après mapping, contrôles, aperçu et validation. Un mapping propre au Fournisseur peut être mémorisé.

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

Aucune purge n'est déclenchée automatiquement par l'âge.

La suppression définitive éventuelle est réservée au Workspace Owner dans le cadrage actuel, après archivage, contrôles backend, audit et application de la politique de rétention.

La fiche et ses versions sont traitées comme un ensemble cohérent.

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

Paramètres déjà identifiés : politique de prix, fraîcheur des Prix facturés, favoris/fréquence, cycle de vie des fiches, TVA, marge, coefficient et arrondis.

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

Le rôle système owner du Workspace reçoit toutes les permissions métier du produit et tous les dossiers de CE Workspace.

Il reste soumis aux invariants, capabilities, quotas et règles de sécurité.

Il ne faut pas le confondre avec un PlatformRole.

### PlatformRole

Un rôle Platform ne donne aucun accès implicite aux données métier d'un Workspace.

### Autres membres

Le Core v1.0.1 porte un seul Role par WorkspaceMember.

Les responsabilités multiples sont donc représentées par un rôle personnalisé combinant les permissions nécessaires, et non par plusieurs rôles cumulés.

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

## 20. Invariants métier déjà établis

1. Un Produit n'est ni un prix ni un Article fournisseur.
2. Le catalogue Produit est mutualisé dans le Workspace.
3. Un Produit peut avoir plusieurs Articles chez un même Fournisseur et chez plusieurs Fournisseurs.
4. Les données commerciales propres à un magasin restent isolées de celles des autres magasins.
5. Un prix spécifique d'un autre magasin n'est jamais un fallback.
6. Les prix utilisés pour les coûts directs sont HT.
7. Les prix unitaires et normalisés sont affichés avec trois décimales sans arrondi prématuré du moteur.
8. Les données tarifaires sont sourcées, temporelles et historisées.
9. La politique de Prix applicable est définie au niveau Workspace.
10. Le mode standard est Tarif négocié.
11. Le mode Prix facturé applique Prix facturé frais et valide → Tarif négocié → Tarif fournisseur.
12. La fraîcheur d'un Prix facturé part de la date de facture ; le standard métier est un an.
13. Une perte de fraîcheur n'altère pas le statut VALIDÉ ni l'historique.
14. Les catalogues fournisseur sont versionnés par édition/millésime et ne sont pas écrasés.
15. Un catalogue ancien reste identifiable comme tel et ne doit jamais être présenté comme actuel sans signalement.
16. Le SaaS ne choisit jamais automatiquement l'Article le moins cher parmi plusieurs candidats.
17. Une référence favorite correspond à un Article fournisseur précis dans un magasin, pas à un Produit générique.
18. Favori et fréquemment utilisée sont deux concepts distincts.
19. Le prix d'une référence favorite est résolu dynamiquement et n'est pas dupliqué dans le favori.
20. L'utilisateur saisit la quantité nette ; la quantité brute est calculée via le rendement.
21. Le pourcentage de recette est calculé sur les quantités nettes.
22. Coût Matière = somme des coûts HT des lignes d'ingrédients.
23. Économat est distinct du Coût Matière.
24. Coût total de fabrication = Coût Matière + Économat ; énergie exclue.
25. Une modification tarifaire ne réécrit jamais silencieusement une fiche.
26. Une version VALIDATED est immuable ; toute modification crée/ouvre un nouveau DRAFT.
27. Une ligne sans Prix applicable ne peut pas être considérée comme valant zéro.
28. Une fiche officielle exige une valorisation valide de toutes les lignes requises.
29. Les invariants métier s'appliquent aussi au Workspace Owner.
30. La copie inter-magasin transporte la composition mais jamais les prix, valorisations ou historiques économiques.
31. Le backend est la seule autorité pour la résolution des prix, l'état, les actions autorisées, les alertes, l'exportabilité, les versions et les valeurs effectives de configuration.
32. Le frontend ne contient aucun fallback métier statique.
33. Un WorkspaceMember porte un seul Role Core ; un rôle personnalisé peut combiner plusieurs responsabilités par ses permissions.
34. Le périmètre dossier est indépendant du Role.
35. Un PlatformRole ne donne aucun accès implicite aux données métier d'un Workspace.
36. Le Workspace Owner possède toutes les permissions métier et tous les dossiers de son propre Workspace, sans contourner les invariants.
37. Free utilise les comportements standards ; Trial peut tester la personnalisation ; les offres payantes peuvent personnaliser selon leurs capabilities.
38. Un downgrade ne détruit pas automatiquement les configurations personnalisées.
39. Aucune suppression automatique d'une fiche n'est déclenchée uniquement par son âge.
40. La suppression définitive éventuelle est contrôlée, auditée et postérieure à l'archivage.

---

## 21. Questions de domaine encore ouvertes

Avant création du premier modèle Mongoose, il reste notamment à trancher :

- données minimales définitives du magasin ;
- catégories et cardinalités ;
- unités supportées ;
- gouvernance finale des types de conditionnement ;
- convention technique exacte pour la durée standard de fraîcheur d'un Prix facturé ;
- seuil standard et détails de calcul de « fréquemment utilisée » ;
- lifecycle d'un Article fournisseur remplacé ou archivé ;
- fréquence/gouvernance finale des revues tarifaires ;
- matrice finale des permissions des rôles types ;
- stockage du périmètre dossier et orchestration lors de l'invitation ;
- TVA et sa portée ;
- marge, coefficient, prix théorique, prix conseillé/retenu et marge semi-nette ;
- arrondis des montants agrégés ;
- types/motifs exacts de version des Fiches techniques ;
- règles exactes de rétention et suppression définitive ;
- frontière fiche technique / fiche process ;
- V1 / hors V1 ;
- capabilities et quotas ;
- intégrations ;
- contraintes réglementaires.

Aucune de ces questions ne doit être résolue implicitement dans le code.
