# M-002 — Source et règles du corpus professionnel v7

**Statut : CANDIDAT — Bloc A2.1, non activé comme bootstrap par défaut**  
**Date de constitution :** 2026-10-03  
**Dataset :** `backend/seeds/data/m002-reference.v7.json`

## 1. Objectif

Le corpus `m002-reference-v7` enrichit le référentiel alimentaire v6 pour
couvrir des usages professionnels insuffisamment représentés :

- pâtisserie / boulangerie ;
- crémerie ;
- pains et snacking.

Ce corpus ne modifie pas le contrat M-002. Il applique la frontière existante :

```text
Produit
→ concept / famille métier

Référence Produit
→ forme techniquement exploitable dans une Fiche technique

Article fournisseur / marque / référence commerciale / conditionnement / prix
→ M-003
```

Le v7 est volontairement **staged** dans ce bloc. Le bootstrap actif reste v6
tant que les impacts M-003, migrations et Prix repères du nouveau corpus ne
sont pas traités dans les blocs suivants de la même branche / PR.

## 2. Composition

Le v7 reprend intégralement le corpus v6 puis ajoute le socle professionnel.

```text
v6
14 catégories
264 Produits
264 Références Produit

v7 candidat
16 catégories
320 Produits
368 Références Produit

delta
+2 catégories
+56 Produits
+104 Références Produit
```

Aucune Référence v6 n'est retirée dans ce bloc.

Deux catégories sont ajoutées :

- `Matières premières de pâtisserie et boulangerie` ;
- `Pains et snacking`.

La catégorie existante `Produits laitiers et fromages` est réutilisée pour
la crémerie.

## 3. Sources professionnelles

Les sources ci-dessous servent à qualifier les familles, usages et
distinctions techniques du corpus. Elles ne servent pas à importer des prix,
des marques ou des conditionnements dans M-002.

### Source historique v6

- **SANS PRIX-IPCOLL-SEC-SEPT 2026.pdf**
- périmètre et exclusions inchangés ;
- documentation canonique :
  `docs/m002/M-002-SEED-V6-SOURCE.md`.

### Transgourmet France

- Ingrédients pâtisserie :
  https://transgourmet.fr/le-groupe/livraison/transgourmet/nos-produits/ingredients-patisserie
- Laboratoire boulangerie-pâtisserie :
  https://webshop.transgourmet.fr/grossiste-alimentaire/boulangerie-patisserie-laboratoire.html

Apports retenus pour la taxonomie : farines, sucres, chocolats/couvertures,
fondant, pâte d'amande, praliné, glaçages, nappages et autres ingrédients de
laboratoire.

### METRO France

- Farines professionnelles :
  https://www.metro.fr/metro/marques-metro/metro-chef/producteur-farine-charly-coutouit
- Offre burger professionnelle :
  https://www.metro.fr/metro/univers-metiers/Restauration-rapide/burger

Apports retenus : T45 pâtissière, T55, T65, farine de gruau et typologie de
pains burger incluant bun classique, bun brioché, potato bun et pains aux
graines.

### Valrhona Selection

- Couvertures chocolat :
  https://www.valrhona-selection.fr/couvertures-chocolat-cacao.html
- Exemple de couverture noire 70 % :
  https://www.valrhona-selection.fr/couvertures-chocolat-cacao/couverture-chocolat-noir/chocolat-noir-guanaja-70-feves-12-kg-1384.html
- Pâte pure de noisette :
  https://www.valrhona-selection.fr/fruits-fruits-secs/pralines-fruits-secs/pate-fruits-secs/pate-pure-de-noisettes-napoli-torrefaction-moyenne-5-kg-9388.html
- Pâte pure de pistache :
  https://www.valrhona-selection.fr/fruits-fruits-secs/pralines-fruits-secs/pate-fruits-secs/pate-pure-de-pistache-avec-pistache-sicilienne-3-kg-10059.html
- Pâte pure d'amande :
  https://www.valrhona-selection.fr/fruits-fruits-secs/pralines-fruits-secs/pate-fruits-secs/pate-pure-d-amande-de-sicile-crue-5-kg-7172.html

Apports retenus : couverture noire / lait / blanche / blonde, fruits secs et
pâtes pures. Les noms de marque et références commerciales restent M-003.

### Sysco France

- Offre boulangerie professionnelle :
  https://www2.sysco.fr/grossiste-boulangerie
- Pain pita :
  https://shop.sysco.fr/Produits/Pain-pita/p/000000000000077856
- Pain burger focaccia :
  https://shop.sysco.fr/Les-produits/Le-pain--la-viennoiserie-et-les-pates-a-travailler/Le-pain/Le-pain-pour-burger-et-bagel/Le-pain-pour-burger-et-bagel/Pain-burger-focaccia/p/000000000000018548

Apports retenus : pain sandwich, pain polaire, pain bagnat, pain nordique,
baguette rustique, kebab, pita, panini, burger, hot-dog et focaccia.

## 4. Règle Produit / Référence Produit appliquée

Une différence devient une Référence Produit lorsqu'elle modifie réellement
l'utilisation technique dans une recette ou une fiche.

Exemples v7 :

```text
Farine de blé
├─ Farine de blé T45 pâtissière
├─ Farine de gruau T00
├─ Farine de blé T55
└─ Farine de blé T65 panifiable

Beurre
├─ Beurre doux 82 % MG
├─ Beurre demi-sel
├─ Beurre de tourage 82 % MG
└─ Beurre extra-sec de tourage 84 % MG

Pain burger
├─ Bun classique surgelé
├─ Bun brioché surgelé
├─ Bun multigraines surgelé
└─ Potato bun surgelé
```

Le v7 commence aussi à utiliser réellement la capacité du modèle à porter
plusieurs Références sous une même racine Produit.

## 5. Frontière commerciale

Le corpus n'intègre aucun :

- fournisseur ;
- identifiant fournisseur ;
- marque comme identité Produit ;
- prix ;
- référence commerciale ;
- colisage ;
- nombre de pièces par carton ;
- poids commercial imposé à l'identité générique.

Exemple :

```text
M-002
Pain pita surgelé
→ UNIT

M-003
Article Sysco / autre fournisseur
→ calibre
→ carton / sachets / pièces
→ référence fournisseur
→ prix
```

## 6. Conservation et unité

Le contrat M-002 impose une conservation et une unité de référence.

Principes appliqués dans le corpus :

- poudres, farines, sucres, chocolats et fruits secs : `SEC / KG` ;
- produits laitiers réfrigérés : `REFRIGERE / KG` ou `L` selon l'usage ;
- UHT : `CONSERVE / L` ;
- pains et fonds explicitement surgelés : `SURGELE / UNIT` ;
- références vendues et utilisées à la pièce : `UNIT`.

La conservation est incluse dans le nom lorsque cela évite d'attribuer
implicitement à une Référence générique une conservation qui n'est pas
universelle.

## 7. Tests attendus pour ce bloc

Le bloc A2.1 doit vérifier au minimum :

- schéma Zod du v7 ;
- conservation intégrale des 264 Références v6 ;
- exactement 104 Références supplémentaires ;
- 16 catégories, 320 Produits et 368 Références ;
- absence de doublon de nom normalisé ;
- présence des références structurantes pâtisserie / crémerie / snacking ;
- racines multi-références pour Farine de blé, Beurre et Pain burger ;
- enrichissement des racines existantes Emmental et Gouda ;
- absence de données commerciales M-003 ;
- traçabilité des sources professionnelles.

## 8. Activation différée

Ce fichier n'autorise pas encore à remplacer automatiquement le bootstrap v6.

Avant activation du v7 comme dataset par défaut, la même branche doit encore
traiter :

1. comportement de réconciliation v6 → v7 ;
2. idempotence du bootstrap après v7 ;
3. cohérence du corpus de Prix repères M-003 ;
4. éventuelles références sans Prix repère assumées explicitement ;
5. tests backend concernés ;
6. documentation opérationnelle et commande de migration/seed.

Aucune PR intermédiaire n'est créée : tous ces blocs appartiennent à la même
future PR.
