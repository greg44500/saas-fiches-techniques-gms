# M-002 — Source et règles du corpus professionnel v8

**Statut : ACTIF SUR LA BRANCHE — enrichissement complémentaire du lot Produits globaux, avant PR finale**  
**Date de constitution :** 2026-10-03  
**Dataset :** `backend/seeds/data/m002-reference.v8.json`

## 1. Objectif

Le corpus `m002-reference-v8` complète le v7 pour rendre le référentiel
directement exploitable dans des Fiches techniques de pâtisserie, glacerie et
snacking.

Le besoin porte notamment sur :

- œufs coquille et ovoproduits ;
- sucres et matières sucrantes ;
- vanille, arômes, gélifiants et texturants ;
- purées et coulis de fruits ;
- sauces de snacking ;
- fruits secs / fruits à coque ;
- fonds de tartes et tartelettes avec diamètre ou format explicite.

Le contrat M-002 n'est pas refondu :

```text
CanonicalProduct
→ concept / racine Produit

ProductVariant
→ Référence Produit réellement sélectionnable dans une Fiche technique

Dimensions
→ enrichissement / recherche / filtrage

Fournisseur / marque / référence commerciale / conditionnement / prix
→ M-003
```

## 2. Composition

```text
v7
16 catégories
320 Produits
368 Références Produit

v8
16 catégories
381 Produits
488 Références Produit

écart v8 / v7
+61 Produits
+126 nouvelles Références
-6 anciennes Références génériques de fonds de tarte
+120 Références nettes
```

Aucune catégorie supplémentaire n'est créée.

Les six Références v7 retirées sont :

- `Fond de tarte sucré cru surgelé` ;
- `Fond de tarte sucré cuit` ;
- `Fond de tarte sablé cru surgelé` ;
- `Fond de tarte sablé cuit` ;
- `Fond de tarte salé cru surgelé` ;
- `Fond de tarte salé cuit`.

Elles sont remplacées par des Références dont le diamètre ou le format fait
partie du nom métier et est aussi porté par une Caractéristique
`SIZE_FORMAT`.

## 3. Sources professionnelles complémentaires

Ces sources servent à confirmer l'existence des familles et distinctions
techniques. Les marques, codes article, prix et colisages ne sont pas importés
dans M-002.

### Les Vergers Boiron

Catalogue produits :
https://les-vergers-boiron.com/les-produits/

Le catalogue consulté le 2026-10-03 expose notamment des purées ambiantes
sans sucres ajoutés de fraise, framboise, mangue, passion, ananas, pêche
blanche, citron jaune et citron vert. Le v8 retient des identités génériques,
sans marque.

### METRO France — œufs et ovoproduits

https://www.metro.fr/metro/univers-produits/cremerie/oeuf

La page professionnelle distingue les œufs coquille par calibre et les œufs
liquides pasteurisés. METRO présente explicitement l'œuf entier liquide et le
blanc d'œuf liquide ; son univers boulangerie-pâtisserie expose également le
jaune d'œuf liquide pasteurisé :

https://www.metro.fr/metro/univers-metiers/Boulangerie-patisserie

Les conditionnements (bidons, cartons, nombre d'œufs) restent M-003.

### METRO France — boulangerie / pâtisserie

https://www.metro.fr/conseil-service/metro/univers-produits/epicerie/boulangerie-patisserie

Cette source confirme les familles professionnelles fruits secs, purées de
fruits, épaississants, arômes/colorants, toppings et prêts à garnir.

### METRO France — restauration rapide / sauces

https://www.metro.fr/conseil-service/metro/univers-metiers/Restauration-rapide/burger

La sélection professionnelle comporte notamment ketchup, mayonnaise,
moutarde, barbecue, sauce burger et sauce cheddar.

Le catalogue restauration rapide consulté le 2026-10-03 complète cette
typologie avec sriracha, mayonnaise sriracha, sauces barbecue, curry,
yakitori, sésame et hoisin. Le corpus v8 conserve uniquement les familles
génériques utiles à une fiche technique.

### Transgourmet France — fonds de tartes et tartelettes

Exemples actuels vérifiés :

- fond de tarte sucré cru surgelé Ø 10 cm :
  https://transgourmet.fr/le-groupe/livraison/transgourmet/nos-partenaires/mademoiselle-desserts/fond-de-tarte-sucre-pur-beurre-diametre
- fond de tarte sucré cru surgelé Ø 22 cm :
  https://www.transgourmet.fr/restauration-commerciale/produit/fond-tarte-sucre-beurre-cru-diametre-22-cm--247946.html
- fond de tartelette sucré cru surgelé Ø 8,5 cm :
  https://www.transgourmet.fr/restauration-commerciale/produit/fond-tartelette-sucre-cru-diametre-8-5-cm--248670.html
- fond de tartelette sucré carré 7 × 7 cm :
  https://www.transgourmet.fr/restauration-commerciale/produit/fond-tartellette-sucre-carre-7-x-7-cm--800585.html
- mini tartelette salée ronde Ø 4,2 cm :
  https://www.transgourmet.fr/restauration-commerciale/produit/mini-tartelette-salee-ronde-diametre-4-2cm--245867.html
- fond brisé cru surgelé Ø 12 cm :
  https://transgourmet.fr/le-groupe/livraison/transgourmet/nos-partenaires/mademoiselle-desserts-france/fond-de-tartelette-brise-pur
- tartelette sablée prête à garnir Ø 8,5 cm :
  https://www.transgourmet.fr/restauration-commerciale/produit/tartelette-sablee-standard-diam-8-5-cm--070003.html
- tartelette sablée prête à garnir Ø 11 cm :
  https://www.transgourmet.fr/restauration-commerciale/produit/tartelette-sablee-standard-diam-11-cm--486860.html

Cette vérification justifie que la taille soit portée par la Référence Produit :
pour une production donnée, une tartelette individuelle et un fond de 22 cm ne
représentent pas le même nombre d'unités à utiliser.

### Transgourmet France — coulis

Exemples actuels vérifiés :

- coulis de fruits rouges surgelé :
  https://www.transgourmet.fr/restauration-commerciale/produit/coulis-fruits-rouges--300984.html
- coulis de framboise surgelé :
  https://www.transgourmet.fr/restauration-commerciale/produit/coulis-framboises--490094.html

## 4. Références structurantes ajoutées

### Œufs / ovoproduits

```text
Œuf de poule
├─ Œuf coquille calibre S
├─ Œuf coquille calibre M
├─ Œuf coquille calibre L
└─ Œuf coquille calibre XL

Œuf entier
├─ Œuf entier liquide pasteurisé
└─ Œuf entier en poudre

Jaune d'œuf
├─ Jaune d'œuf liquide pasteurisé
└─ Jaune d'œuf en poudre

Blanc d'œuf
├─ Blanc d'œuf liquide pasteurisé
└─ Blanc d'œuf en poudre
```

### Pâtisserie / glacerie

Le corpus ajoute notamment :

- cassonade, vergeoises, muscovado, dextrose, isomalt, tréhalose ;
- gousse de vanille, vanille en poudre, pâte de vanille et arôme vanille ;
- agar-agar, pectines, gommes, carraghénane, alginate ;
- stabilisateur glace et stabilisateur sorbet ;
- purées de fruits surgelées ;
- purées ambiantes classiques inspirées de la gamme professionnelle Boiron ;
- coulis de fruits surgelés.

Les Références déjà présentes en v7 restent conservées, notamment :

- sucre semoule ;
- sucre glace ;
- sucre inverti ;
- gélatine en feuilles 200 Bloom ;
- gélatine en poudre 200 Bloom ;
- cacao en poudre ;
- poudre d'amande blanche / brute ;
- poudre de noisette ;
- poudre de pistache.

### Fruits secs / fruits à coque

Le v8 complète les racines existantes et ajoute les racines manquantes :

```text
Amande
→ entière avec peau
→ entière blanchie
→ poudre blanche
→ poudre brute
→ effilée
→ concassée
→ hachée
→ bâtonnets

Noisette
→ entière
→ entière mondée
→ poudre
→ concassée
→ grillée
→ hachée

Pistache
→ décortiquée
→ poudre
→ entière non salée
→ concassée
→ hachée

Noix
→ cerneau
→ hachée
→ poudre

Cacahuète
→ grillée non salée
→ hachée
→ poudre
```

## 5. Fonds de tartes — règle d'identité

Le v8 applique explicitement :

```text
type de fond
+ état / conservation utile
+ diamètre ou format
→ Référence Produit distincte
```

Exemples :

```text
Fond de tarte sucré
├─ Fond de tartelette sucré cru surgelé Ø 8,5 cm
├─ Fond de tarte sucré cru surgelé Ø 10 cm
├─ Fond de tarte sucré cru surgelé Ø 22 cm
├─ Fond de tartelette sucré cru surgelé carré 7 × 7 cm
└─ Fond de tartelette sucré prêt à garnir Ø 8,5 cm
```

Le diamètre / format est aussi une Caractéristique `SIZE_FORMAT`, mais le nom
visible de la Référence reste persistant et n'est pas reconstruit depuis les
dimensions.

## 6. Frontière M-002 / M-003

Le v8 ne contient aucun :

- fournisseur ;
- code fournisseur ;
- marque comme identité ;
- prix ;
- colisage ;
- nombre de pièces par carton ;
- poids commercial imposé comme conditionnement.

Les unités `KG`, `L` ou `UNIT` sont uniquement les unités de référence
M-002 utilisées par les fiches et la valorisation.

## 7. Prix repères M-003

Le passage au v8 ne crée aucun montant économique non sourcé.

Dataset économique actif :

```text
m003-global-indicative-prices.v3.json
362 Prix repères hérités du corpus v7
488 Références Produit v8
126 nouvelles Références volontairement sans Prix repère
```

Les six Prix repères correspondant aux six fonds de tarte génériques retirés
sont exclus du v3.

Cette couverture partielle est volontaire et conforme au contrat M-003 :
une Référence sans valeur économique exploitable reste sans Prix repère plutôt
que de recevoir un montant incohérent ou inventé.

## 8. Migration et bootstrap

Le bootstrap actif charge :

```text
backend/seeds/data/m002-reference.v8.json
```

La migration M-002 utilise :

```text
reconcileM002BootstrapToV8
```

Les datasets v1 à v7 sont historiques.

Ordre opérationnel inchangé :

```text
npm run migration:m002-catalog
→ npm run seed:m002-reference
→ npm run migration:m003-indicative-pricing
```

Le bloc reste sur `feature/a2-professional-reference-corpus` et ne crée
aucune PR intermédiaire.
