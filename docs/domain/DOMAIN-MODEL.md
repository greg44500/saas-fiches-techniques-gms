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

La stratégie de sélection du Prix applicable est un paramètre du Workspace, commun à tous ses magasins/dossiers.

Modes retenus :

```text
Tarif fournisseur
Tarif négocié
Prix facturé
```

Valeur par défaut :

```text
Tarif négocié
```

Règles de sélection validées :

```text
Mode Tarif fournisseur
→ Tarif fournisseur de référence applicable

Mode Tarif négocié
→ Tarif négocié valide pour le magasin + Article + date
→ sinon Tarif fournisseur de référence

Mode Prix facturé
→ dernier Prix facturé exploitable et validé pour le magasin + Article
→ sinon Tarif négocié valide
→ sinon Tarif fournisseur de référence
```

Le moteur doit conserver la source réellement utilisée et savoir si un fallback a été appliqué.

### 9.5 Valorisabilité contextuelle

Le Prix applicable n'est jamais une propriété globale du Produit.

La capacité à valoriser un Produit dépend conceptuellement de :

```text
Produit
× magasin/dossier
× Article fournisseur
× politique de prix Workspace
× date de valorisation
```

Un Produit peut donc :

- être valorisable dans un magasin ;
- ne pas être valorisable dans un autre ;
- exister dans le catalogue commun sans prix applicable courant.

Pour être ajouté à une Fiche technique dans un magasin, un Prix applicable doit pouvoir être déterminé.

Le Produit peut néanmoins rester visible dans le catalogue du Workspace afin d'éviter les doublons et permettre de compléter ultérieurement son approvisionnement ou ses tarifs.

### 9.6 Prix facturé exploitable

Un Prix observé issu d'une facture ne devient pas automatiquement un Prix applicable.

Pour devenir exploitable, il doit pouvoir être rattaché de manière fiable :

- au Fournisseur ;
- à l'Article fournisseur ;
- au magasin/dossier ;
- à la date de facture ;
- au prix source et à son unité d'expression ;
- aux données nécessaires à une normalisation fiable.

Il doit ensuite être explicitement validé.

États fonctionnels minimaux :

```text
À VALIDER
VALIDÉ
REJETÉ
```

Seul un Prix facturé VALIDÉ peut être utilisé par la politique Workspace `Prix facturé`.

Le seuil de fraîcheur éventuel d'un Prix facturé validé reste à finaliser.

---

## 9.7 Validité commerciale et revue tarifaire

Le Tarif fournisseur de référence est général au Fournisseur et peut évoluer dans le temps lorsqu'un nouveau catalogue ou une nouvelle mercuriale entre en vigueur.

Un Tarif négocié est spécifique à un magasin et à un Article fournisseur.

Il doit pouvoir porter :

- une date de début de validité ;
- une date de fin éventuelle ;
- sa provenance ;
- sa traçabilité.

La validité commerciale est déterminée par ces dates et non par un âge générique du tarif.

Le domaine distingue :

```text
validité commerciale
≠
revue opérationnelle
```

Une revue tarifaire par magasin permet de confirmer les prix toujours cohérents, corriger les valeurs modifiées et identifier les anomalies.

La revue doit pouvoir conserver au minimum :

- date de dernière revue ;
- auteur ;
- périmètre contrôlé ;
- prochaine date de revue éventuelle ;
- anomalies restantes.

Une revue ne modifie pas automatiquement les dates contractuelles du tarif.

La fréquence exacte de revue reste à cadrer/configurer et ne doit pas être figée universellement.

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

Une Fiche technique appartient au contexte d'un dossier/magasin et utilise les marchandises du catalogue du Workspace.

Conceptuellement :

```text
Dossier
1
→ 0..n Fiches techniques

Fiche technique
→ lignes d'ingrédients
→ lignes d'Économat
```

### 11.0 Éligibilité d'un Produit à la fiche

Un Produit ne peut être ajouté à une Fiche technique que si le moteur peut déterminer un Prix applicable pour le magasin/dossier courant.

Cette éligibilité est calculée par le backend ; elle n'est pas saisie manuellement.

Un Produit sans Prix applicable dans le magasin courant peut continuer à exister dans le catalogue du Workspace et être valorisable dans d'autres magasins.

### 11.1 Ligne d'ingrédient

L'utilisateur renseigne au minimum :

- Produit ;
- quantité nette nécessaire.

Le système récupère ou calcule :

- unité ;
- rendement ;
- quantité brute nécessaire ;
- % de recette ;
- prix d'achat HT applicable et normalisé ;
- coût HT de ligne.

### 11.2 Quantité nette

Règle validée :

> La quantité saisie est la quantité nette réellement présente dans la recette.

### 11.3 Quantité brute

Calcul automatique :

```text
quantité brute
=
quantité nette / rendement
```

Les pertes de rendement augmentent donc les besoins d'achat et le coût sans modifier la composition nette de la recette.

### 11.4 % de recette

Le pourcentage de recette est calculé sur les quantités nettes.

```text
% recette ligne
=
quantité nette ligne / total net pertinent × 100
```

Il n'est pas saisi librement.

### 11.5 Coût matière de ligne

Base validée :

```text
quantité brute nécessaire
×
prix achat HT normalisé
=
coût matière HT de la ligne
```

Le prix d'achat HT est l'autorité économique de ce calcul.

### 11.6 Coût Matière

```text
CM HT
=
Σ coûts HT des lignes d'ingrédients
```

### 11.7 Ligne d'Économat

L'Économat représente les consommables achetés nécessaires à la fabrication, au conditionnement ou à la commercialisation.

L'utilisateur renseigne la quantité réellement consommée dans l'unité de référence du consommable.

Le système calcule le coût HT à partir du conditionnement et du prix normalisé.

Les consommables utilisent les mêmes mécanismes d'approvisionnement et d'historisation que les ingrédients lorsque pertinent, sans attributs alimentaires non applicables.

### 11.8 Coût total de fabrication

Définition métier validée :

```text
Coût total de fabrication HT
=
Coût Matière HT + Économat HT
```

L'énergie est exclue.

Aucune autre charge ne doit être ajoutée sans validation métier.

---

## 12. Composition et valorisation

La composition et la valorisation sont deux dimensions distinctes.

```text
Composition
→ quels ingrédients ?
→ quelles quantités nettes ?
→ quels consommables d'Économat ?

Valorisation
→ quels prix HT applicables ?
→ quelles quantités brutes ?
→ quels coûts ?
```

Une variation de prix ne doit pas obliger à modifier la composition.

Les paramètres financiers encore ouverts — TVA, marge, coefficient, prix théorique, prix de vente, marge semi-nette et arrondis finaux — seront cadrés séparément avant implémentation.

---

## 12.1 Concurrence entre mise à jour tarifaire et édition d'une fiche

Une modification tarifaire crée une nouvelle version/réalité temporelle et ne modifie jamais rétroactivement la valeur déjà utilisée par une Fiche technique en cours.

Lorsqu'un utilisateur travaille sur une fiche pendant qu'un Économe ou un Acheteur modifie un prix :

- le nouveau tarif devient disponible selon sa date d'effet ;
- la fiche en cours conserve temporairement les valeurs avec lesquelles elle a été calculée ;
- le système détecte qu'un nouveau Prix applicable existe ;
- l'utilisateur est informé qu'une revalorisation est disponible ou nécessaire.

Avant validation définitive d'une fiche, le backend vérifie que la valorisation correspond aux Prix applicables courants. Si des prix ont changé, la fiche doit être revalorisée explicitement avant validation.

Une fiche déjà validée conserve son historique et peut être comparée à une valorisation courante.

Le domaine ne requiert pas de verrou global empêchant une mise à jour tarifaire parce qu'un autre utilisateur édite une fiche.

---

## 12.2 Copie d'une fiche entre magasins

La copie inter-magasin crée une nouvelle fiche dans le magasin cible.

Elle peut reprendre :

- les références Produit ;
- les quantités ;
- les unités ;
- les autres données de composition explicitement réutilisables.

Elle ne reprend jamais :

- les Tarifs négociés du magasin source ;
- les Prix facturés du magasin source ;
- les Prix applicables déjà calculés ;
- les valorisations économiques ;
- l'historique de validation ou de revalorisation du magasin source.

Après copie, le moteur résout les Articles et Prix applicables dans le contexte du magasin cible et recalcule intégralement la valorisation.

La nouvelle fiche démarre avec son propre historique. Une simple information de provenance vers la fiche source peut être conservée pour la traçabilité sans importer son historique.

Si une ligne copiée n'est pas valorisable dans le magasin cible, elle doit être signalée et ne peut pas recevoir implicitement un prix provenant du magasin source ou d'un autre magasin.

---

## 13. Valorisation courante et historique

Le modèle doit permettre deux lectures :

```text
Valorisation historique
→ valeurs réellement utilisées à une date/version

Valorisation courante
→ recalcul avec les prix actuellement applicables
```

Cela permet de mesurer :

- variation de coût ;
- variation de marge ;
- produits responsables de l'écart ;
- fiches impactées.

Le choix technique entre snapshots, événements, versions ou combinaison sera étudié lors du cadrage du module concerné.

---

## 14. Marchandises achetées et Économat

Le domaine reconnaît au moins deux natures de marchandises achetées intégrables à une Fiche technique :

```text
Ingrédient
→ contribue au Coût Matière
→ peut avoir gamme / rendement / % recette

Économat / consommable
→ contribue à l'Économat
→ ne possède pas les attributs alimentaires non pertinents
```

Les deux natures peuvent partager les mécanismes d'approvisionnement :

- Fournisseur ;
- Article fournisseur ;
- conditionnement ;
- tarif HT ;
- historique.

La structure technique exacte — modèle commun, spécialisation ou autre composition — sera décidée lors du cadrage du module concerné. Le contrat métier prime : les règles de calcul doivent rester distinctes.

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

Le futur panneau de paramètres n'est pas requis pour démarrer la V1.

Le modèle doit cependant éviter de figer les valeurs candidates dans le code métier.

La portée possible d'un paramètre doit être étudiée explicitement :

```text
système
Workspace
dossier / magasin
fiche
```

Les portées ne seront pas toutes implémentées automatiquement.

---

## 19. Extensibilité

Le modèle doit préserver les données nécessaires aux extensions identifiées :

- alertes de variation ;
- graphiques historiques ;
- comparaison fournisseur ;
- OCR / import de mercuriales ;
- optimisation de marge ;
- suggestions IA ;
- reverse recipe ;
- analyses transversales ;
- infographies process.

Invariant :

> Préparer la compatibilité structurelle ne signifie pas implémenter prématurément les extensions.

---

## 19.1 Rôles métier et périmètres

Les rôles Core et les responsabilités métier restent distincts.

### Workspace Owner

Le rôle `owner` du Workspace, fourni par le Core, possède implicitement toutes les permissions métier du produit dans son Workspace et dans tous ses magasins/dossiers.

Il n'a pas besoin de recevoir chaque rôle métier séparément.

Les capabilities commerciales, quotas, validations métier et règles de sécurité restent applicables.

Aucun rôle métier `Admin` spécifique au produit n'est défini à ce stade.

Une future administration déléguée du Workspace sans transfert de propriété est identifiée comme un besoin générique potentiel du Core.

### Autres rôles métier

Socle retenu :

- Acheteur / Responsable achats ;
- Économe / Gestionnaire des prix ;
- Responsable fiches techniques ;
- Utilisateur métier.

Ces rôles peuvent être cumulés.

Ils peuvent être limités à certains magasins/dossiers.

Le droit d'utiliser un Produit dans une Fiche technique ne donne pas implicitement le droit de modifier ou valider ses tarifs.

La matrice exacte des permissions reste à finaliser avant implémentation.

---

## 20. Invariants métier déjà établis

1. Un Produit n'est pas un prix.
2. Un Produit n'est pas un article fournisseur.
3. Le catalogue est mutualisé dans le Workspace.
4. Un même Produit peut avoir plusieurs Articles chez un même Fournisseur.
5. Un tarif Fournisseur peut exister sans connaître de magasin.
6. Un tarif spécifique magasin ou un prix observé est conservé séparément du tarif de référence.
7. Les prix sont HT pour le calcul du coût matière.
8. Les prix unitaires et normalisés sont affichés avec 3 décimales sans arrondi prématuré du moteur.
9. Les données tarifaires sont sourcées et historisées.
10. Les modifications Produit doivent être traçables.
11. L'utilisateur saisit la quantité nette ; la quantité brute est calculée via le rendement.
12. Le % de recette est calculé sur les quantités nettes.
13. Le taux de rendement est distinct du % de recette.
14. Le rendement de référence appartient au Produit et est réutilisé automatiquement.
15. La gamme n'est renseignée que lorsqu'elle est pertinente.
16. Les unités mathématiques et les conditionnements commerciaux sont distincts.
17. CM = somme des coûts HT des lignes d'ingrédients.
18. L'Économat est une nature distincte de marchandise achetée et reste séparé du CM.
19. Coût total de fabrication = CM + Économat ; l'énergie est exclue.
20. La composition technique et la valorisation économique sont distinctes.
21. Une valorisation historique ne doit pas être détruite par une modification future.
22. Les calculs métier ont leur autorité côté backend.
23. Les extensions futures doivent rester possibles sans sur-conception immédiate.
24. La politique de Prix applicable est définie au niveau du Workspace.
25. Le mode par défaut est Tarif négocié, avec fallback vers Tarif fournisseur.
26. En mode Prix facturé, le fallback est Prix facturé validé → Tarif négocié → Tarif fournisseur.
27. La valorisabilité d'un Produit est contextualisée au magasin et n'est pas une propriété globale du Produit.
28. La validité commerciale d'un tarif est distincte de sa dernière revue opérationnelle.
29. Un Prix facturé n'est exploitable qu'après validation.
30. Une modification tarifaire ne réécrit jamais silencieusement une fiche en cours ou une valorisation historique.
31. Le Workspace Owner possède implicitement toutes les permissions métier du produit dans son Workspace.
32. Aucun rôle métier Admin spécifique au produit n'est défini à ce stade.
33. L'accès à plusieurs magasins autorise un changement de contexte, jamais un mélange de leurs données commerciales.
34. Une Fiche technique utilise exclusivement les données contextualisées de son propre magasin.
35. Un prix spécifique d'un autre magasin ne constitue jamais un fallback.
36. La copie d'une Fiche technique entre magasins ne transporte ni prix, ni valorisation, ni historique du magasin source.
37. La fiche cible est revalorisée intégralement dans son propre contexte magasin.

---

## 21. Questions de domaine encore ouvertes

Avant création d'un premier modèle Mongoose, il reste notamment à trancher :

- données minimales du magasin ;
- catégories et cardinalités ;
- unités supportées ;
- liste/gouvernance exacte des types de conditionnement ;
- règles de conversion encore non couvertes ;
- sélection de fournisseur/article ;
- fournisseur/article privilégié ;
- seuil éventuel de fraîcheur d'un Prix facturé validé ;
- fréquence et gouvernance finales des revues tarifaires ;
- lifecycle d'une référence fournisseur remplacée ;
- TVA et sa portée ;
- marge, coefficient et prix de vente ;
- marge semi-nette ;
- arrondis des montants agrégés ;
- frontière fiche technique / fiche process ;
- lifecycle et versionnement des fiches ;
- V1 / hors V1 ;
- matrice détaillée des permissions des rôles métier et périmètres magasin ;
- capabilities et quotas ;
- intégrations ;
- contraintes réglementaires.

Aucune de ces questions ne doit être résolue implicitement dans le code.
