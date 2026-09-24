# M-002 — Recadrage QA du Référentiel Produits

**Statut : VALIDÉ — 2026-09-24**  
**Branche métier :** `feature/m002-catalogue-produits`  
**Autorité :** ce document complète et, en cas de contradiction, remplace les contrats M-002 antérieurs sur les points explicitement recadrés ci-dessous.

## 1. Origine du recadrage

La QA visuelle du Référentiel Produits a révélé plusieurs incohérences qui doivent être corrigées avant la PR finale M-002 :

- une identité racine comme `Bœuf` ou `Agneau` ne suffit pas pour constituer une déclinaison exploitable lorsqu'une pièce/découpe est nécessaire ;
- `PAI / PAE` a été modélisé à tort comme une sixième Gamme, alors qu'il s'agit d'une classification d'usage indépendante de l'état physique ;
- le seed `m002-reference-v2` force encore des variantes trop génériques et certaines classifications discutables ;
- le placeholder de recherche expose le mot interne `alias` ;
- la liste répète le nom du Produit pour chaque déclinaison, ce qui nuit fortement à la lecture ;
- la gouvernance globale existe techniquement mais n'est pas visible depuis la navigation Platform.

Le recadrage A → F suivant est validé et doit être implémenté comme un seul bloc métier cohérent après la dépendance Core décrite en section 8.

## 2. A — Pièce / découpe

`CanonicalProduct` reste l'identité alimentaire racine :

```text
Bœuf
Agneau
Poulet
Saumon
```

Une nouvelle dimension structurée est ajoutée aux `ProductCharacteristic` :

```text
CUT
→ libellé UX : Pièce / découpe
```

Exemples conceptuels :

```text
Bœuf + CUT:Paleron + PRESENTATION:Cubes
Bœuf + CUT:Faux-filet + PRESENTATION:Tranché
Agneau + CUT:Gigot + PRESENTATION:Entier
Agneau + CUT:Gigot + PRESENTATION:Tranché
Poulet + CUT:Cuisse
```

`CUT` décrit la pièce anatomique ou la découpe métier. `PRESENTATION` continue de décrire la forme de mise en œuvre : entier, tranché, cubes, haché, râpé, etc.

Une `ProductVariant` reste limitée à une seule Caractéristique de chaque `kind`.

## 3. CanonicalProduct sans variante artificielle

Le seed ne doit plus créer une déclinaison vague uniquement pour satisfaire une contrainte technique.

Contrat cible :

```text
CanonicalProduct
→ peut exister sans ProductVariant opérationnelle

WorkspaceProduct
→ continue de référencer obligatoirement une ProductVariant
```

Conséquences :

- `Bœuf` peut exister dans le référentiel global sans variante générique « Bœuf » ;
- l'utilisateur peut retrouver l'identité racine et constater qu'aucune déclinaison exploitable n'existe encore ;
- il doit alors enrichir le référentiel avec la pièce/découpe et les autres dimensions nécessaires avant rattachement à « Mon référentiel » ;
- aucune Gamme, pièce, présentation, unité ou rendement n'est inventé pour créer artificiellement une variante.

Le schéma de bootstrap M-002 doit donc autoriser `variants: []` lorsqu'aucune déclinaison suffisamment précise n'est validée.

## 4. B — Gammes 1 à 5 et classification PAI / PAE séparée

Les Gammes redeviennent strictement :

| Gamme | Libellé métier | État / transformation initial |
| --- | --- | --- |
| 1 | Frais | Produit frais |
| 2 | Conserves | Conserve |
| 3 | Surgelés | Surgelé |
| 4 | Sous-vide cru / épluchés | Sous-vide cru / épluché |
| 5 | Sous-vide cuit | Sous-vide cuit |

`PAI` et `PAE` ne sont plus une Gamme.

La déclinaison porte une classification d'usage indépendante, conceptuellement :

```text
usageType = null | PAI | PAE
```

`null` signifie qu'aucune classification PAI/PAE particulière n'est portée.

Cette classification peut se combiner avec une Gamme physique :

```text
Flan prétranché surgelé
→ catégorie métier adaptée
→ Gamme 3 / Surgelé
→ usageType = PAE
→ PRESENTATION:Pré-tranché

Fond brun en poudre
→ Condiments, sauces et aides culinaires
→ usageType = PAI
→ PRESENTATION:Poudre
```

Un produit comme `Jambon blanc` ou `Bacon` reste classé en `Charcuteries`; il ne devient pas PAI/PAE simplement parce qu'il est transformé ou tranché.

## 5. Identité d'une ProductVariant

Signature cible :

```text
canonicalProduct
+ varietyId ou _
+ characteristicIds ordonnés par kind
+ foodRange 1..5
+ normalized(processingState)
+ usageType ou _
```

`referenceUnit` et `yieldPercent` restent hors signature.

Le backend demeure l'autorité des Gammes, États/transformation et valeurs PAI/PAE. Le frontend ne duplique aucune nomenclature.

## 6. C — Seed v3

`m002-reference-v1` et `m002-reference-v2` restent immuables comme historique de bootstrap.

Le prochain dataset est :

```text
m002-reference-v3
```

Objectifs :

- conserver une taxonomie métier utile sans confondre catégories, Gammes et PAI/PAE ;
- corriger les classifications discutables de la v2 ;
- ne plus forcer une variante générique pour chaque `CanonicalProduct` ;
- enrichir les Produits nécessitant une pièce/découpe avec `CUT` lorsque des valeurs sont réellement validées ;
- ne jamais inventer rendement, pièce, présentation ou état physique ;
- conserver strictement hors M-002 fournisseur, marque, référence fournisseur, conditionnement commercial et prix.

Une base ayant déjà reçu la v2 doit pouvoir migrer vers la v3 sans doublons ni réécriture silencieuse.

Les anciennes variantes `foodRange = 6` doivent être traitées explicitement. La migration ne doit jamais deviner leur état physique. Les cas déterministes issus du bootstrap peuvent être corrigés de manière contrôlée ; tout cas non déterministe doit faire échouer la migration ou être placé dans un flux explicite de revue plutôt que recevoir une valeur inventée.

## 7. D/E — Recherche et présentation opérationnelle

Le champ de recherche Workspace utilise le placeholder :

```text
Rechercher un produit…
```

Le terme `alias` reste interne à la gouvernance et n'est jamais exposé dans ce placeholder.

### 7.1 Séparation administration / usage métier

Le modèle normalisé reste :

```text
CanonicalProduct
→ ProductVariant[]
```

mais il ne dicte plus l'unité d'affichage des écrans métier.

Contrat UX validé :

```text
Administration globale
→ regroupement par CanonicalProduct conservé
→ gestion des variantes sous l'identité racine

Catalogue Workspace / recherche opérationnelle
→ une ligne = une référence exploitable
→ pagination par référence, jamais par groupe Produit
```

Une identité possédant de nombreuses variantes ne doit donc jamais produire un bloc visuel contenant des dizaines ou centaines de sous-lignes.

### 7.2 Libellé métier calculé

Le nom visible d'une référence est calculé à partir du Produit et de ses dimensions structurées.

Exemples attendus :

```text
Carotte + PRESENTATION:Entière
→ Carotte

Carotte + PRESENTATION:Râpée
→ Carotte râpée

Carotte + PRESENTATION:Rondelles
→ Carotte rondelles

Canard + CUT:Cuisse
→ Canard (cuisse)

Canard + CUT:Magret
→ Canard (magret)

Canard + caractéristique distinctive:Confit
→ Canard confit
```

Le libellé métier n'est pas une nouvelle identité persistée et ne remplace pas les dimensions structurées.

L'état/transformation porté implicitement par la Gamme n'est pas répété dans le libellé ou la liste. Une transformation réellement distinctive peut apparaître lorsqu'elle apporte une information métier supplémentaire.

### 7.3 Colonnes et informations utiles

La liste opérationnelle privilégie :

```text
Référence
Gamme
Unité
Usage PAI/PAE éventuel
Actions
```

Le rendement n'est pas affiché dans la liste principale. Une valeur absente n'est jamais rendue sous forme de « non renseigné » dans cette liste.

La Gamme est le repère physique synthétique principal. Le couple « Gamme + état par défaut de la Gamme » ne doit pas être affiché deux fois.

### 7.4 Recherche, filtres et tri

La recherche reste variante-aware :

```text
carotte
→ références Carotte pertinentes

carotte râpée
→ Carotte râpée

paleron
→ Bœuf (paleron)
```

La liste opérationnelle propose au minimum :

- filtre Catégorie ;
- filtre Gamme ;
- tri alphabétique ;
- tri par Gamme.

Le backend reste l'autorité des valeurs de Gamme et des métadonnées affichées.

Un `CanonicalProduct` sans variante peut rester visible dans le référentiel global comme « à enrichir », mais il n'est pas rattachable au Workspace tant qu'aucune `ProductVariant` exploitable n'existe.

## 8. F — Gouvernance globale visible depuis Platform

Les autorisations métier globales restent :

```text
product:reference:read
product:reference:manage
```

et restent portées par :

```text
ApplicationGlobalRole
ApplicationGlobalMember
```

Invariant conservé :

```text
Super Admin Platform ≠ gouverneur Produit automatique
Workspace Owner       ≠ gouverneur Produit
```

Le Fondateur doit toutefois recevoir explicitement le rôle système métier :

```text
product_reference_governor
```

via le bootstrap produit, et disposer d'un accès visible à la gouvernance du référentiel.

La route métier globale peut rester indépendante de l'autorisation Platform ; en revanche, lorsqu'un gouverneur est aussi membre Platform actif, la navigation Platform doit pouvoir afficher une entrée `Référentiel Produits` sans que le Core importe le module métier.

### Dépendance Core démontrée

Le Core actuel expose :

- extension des routes Platform ;
- extension de la navigation Workspace ;

mais aucun point d'extension générique de la navigation Platform.

Ce besoin est générique et réutilisable. Il doit donc être traité dans `greg44500/saas-core-api` avant le code produit.

Lot Core attendu :

```text
un point de composition générique de navigation Platform
+ filtrage/visibilité extensible sans connaître product:reference:*
+ tests Core
+ documentation des points d'extension
```

Le module Produit fournira ensuite son descriptor/navigation et restera responsable de l'autorisation métier réelle.

## 9. Stratégie Core exceptionnelle validée pour ce lot

Le Core stable actuellement intégré reste `1.2.1` au commit `ec6714035b76b6b78910a3763c2d94446cf2238c`.

Pour ce point d'extension :

- aucune nouvelle version Core ;
- aucun tag ;
- aucune GitHub Release ;
- aucune micro-version ;
- une seule branche Core cohérente ;
- une seule PR Core ;
- une seule fusion.

Après fusion, le SaaS métier intégrera **le SHA exact du commit Core fusionné**, pas un nouveau tag.

La PR Core doit également clarifier le contrat de provenance d'un dérivé lorsqu'un commit compatible post-tag est intégré : aucun nouveau numéro ni tag ne doit être inventé et `core-origin.json` doit pouvoir tracer sans ambiguïté le commit exact réellement intégré.

## 10. Ordre de reprise

```text
1. saas-core-api
   → point d'extension navigation Platform
   → tests/gates
   → une PR
   → merge
   → relever le SHA exact

2. saas-fiches-techniques-gms
   → branche dédiée d'intégration Core depuis main
   → intégrer le SHA exact
   → gates produit
   → une PR d'intégration Core
   → merge dans main

3. feature/m002-catalogue-produits
   → synchroniser avec main
   → implémenter A → F en un seul bloc
   → migration + seed v3
   → backend/frontend/tests/E2E
   → QA visuelle
   → documentation finale
   → une seule PR M-002
```

Ne pas commencer M-003 avant clôture M-002.
