# M-002 — Validation, identité et prévention des doublons

**Statut : PROPOSÉ — à valider avec le cadrage M-002**

## 1. Normalisation déterministe

Fonction backend unique appliquée au nom, aux alias et aux dimensions textuelles :

1. trim ;
2. Unicode NFKD ;
3. suppression des diacritiques ;
4. minuscules ;
5. apostrophes et tirets transformés en séparateurs ;
6. suppression des autres ponctuations non significatives ;
7. espaces multiples réduits ;
8. trim final.

Exemples :

```text
"Carotte"
" carotte "
"CAROTTE"
→ carotte

"Crème-fraîche"
"creme fraiche"
→ creme fraiche
```

La normalisation ne transforme pas automatiquement un mot français en singulier : une règle linguistique naïve créerait des erreurs. Singulier/pluriel est traité par alias et recherche de proximité.

## 2. searchKeys

Chaque Produit conserve une collection dérivée :

```text
searchKeys
→ normalizedName
→ alias normalisés
```

Une même clé active ne peut appartenir à deux Produits distincts.

Le service déduplique les clés dans un même document.

## 3. Alias

- alias facultatifs ;
- maximum proposé : 20 ;
- 1 à 120 caractères avant normalisation ;
- un alias ne peut pas entrer en collision avec le nom ou l'alias d'un autre Produit non rejeté ;
- un alias n'est pas affiché comme identité principale ;
- les alias servent à la recherche et au contrôle des doublons.

Exemples pertinents :

```text
Carotte
→ Carottes

Échalote
→ Echalotte si la faute est réellement reconnue comme alias
```

Le SaaS ne fabrique pas automatiquement des fautes.

## 4. Recherche de proximité

Pour éviter la création silencieuse de variantes orthographiques :

- la base conserve des n-grammes de recherche dérivés des `searchKeys` ;
- la requête construit le même jeu de n-grammes ;
- MongoDB réduit le pool de candidats via l'index ;
- le service classe ensuite les candidats avec une distance textuelle déterministe.

Règle proposée pour imposer une revue :

```text
nom normalisé <= 6 caractères
→ distance d'édition <= 1

nom normalisé > 6 caractères
→ distance d'édition <= 2

ou
→ inclusion/prefixe fort entre deux clés normalisées
```

Cette règle ne fusionne jamais automatiquement deux Produits.

Elle produit uniquement une liste de candidats à examiner.

## 5. Contrôle avant création

Endpoint dédié :

```text
POST /duplicate-check
```

Réponse :

- exactMatch éventuel ;
- candidats proches triés ;
- identifiants à confirmer si l'utilisateur estime qu'il s'agit réellement d'un nouveau Produit.

Création/contribution :

- un exact match est toujours refusé ;
- si des candidats proches existent, le client doit fournir `reviewedCandidateIds` ;
- le serveur recalcule les candidats au moment de la création ;
- la contribution est refusée si la liste revue ne couvre pas les candidats actuels ;
- aucune validation purement frontend ne suffit.

## 6. Déclinaisons

Signature dérivée :

```text
canonicalProductId
+ normalized(form)
+ normalized(processingState)
+ normalized(preservation)
```

Le rendement, la gamme et l'unité de référence ne créent pas une nouvelle identité de déclinaison : ce sont des attributs corrigibles de la même réalité d'usage.

Une seule déclinaison non rejetée peut posséder une signature donnée pour un Produit.

La signature vide représente la déclinaison générique sans dimension précisée.

## 7. Validation Zod proposée

### Produit

- `name` : string trim, 1..120 ;
- `aliases` : array unique, max 20 ;
- contribution : corps strict ;
- champs système interdits depuis le client.

### Déclinaison

- `form` : nullable string 1..80 ;
- `processingState` : nullable string 1..80 ;
- `preservation` : nullable string 1..80 ;
- `foodRange` : null ou enum 1..5 ;
- `referenceUnit` : enum backend-driven ;
- `yieldPercent` : null ou nombre >0 et <=100.

### Pagination/recherche

- `page` défaut 1 ;
- `limit` défaut 20, max 100 ;
- `q` : trim, 2..120 lorsqu'il est fourni ;
- `scope` : WORKSPACE | REFERENCE ;
- statuts filtrés depuis les registries backend.

## 8. Erreurs métier structurées

Codes applicatifs proposés :

```text
PRODUCT_EXACT_DUPLICATE
PRODUCT_DUPLICATE_REVIEW_REQUIRED
PRODUCT_REVIEW_OUTDATED
PRODUCT_NOT_ACTIVE
PRODUCT_CATEGORY_NOT_ACTIVE
PRODUCT_VARIANT_DUPLICATE
PRODUCT_CONTRIBUTION_NOT_REVIEWABLE
PRODUCT_WORKSPACE_ENTRY_NOT_FOUND
```

Le contrat HTTP Core 400/401/403/404/409 reste conservé.
