# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-25  
**Lot clôturé :** M-002 — Référentiel Produits  
**Prochain lot :** M-003 — Fournisseurs + Articles + prix/catalogues  
**Intégration :** PR finale M-002 vers `main`, protégée par la Core Gate  
**HEAD :** toujours vérifier GitHub ; ne jamais utiliser un SHA documentaire figé comme autorité.

## 1. Ordre d'autorité

```text
KB-START-HERE
→ GitHub réel
→ code / contraintes DB
→ tests réellement exécutés
→ docs/m002/M-002-FINAL-CONTRACT.md
→ autres contrats M-002
→ Core réellement intégré
→ présente reprise
```

En cas de contradiction, Git/code/tests priment.

## 2. Core intégré

Produit : `greg44500/saas-fiches-techniques-gms`.

Core intégré :

```text
repository = greg44500/saas-core-api
version    = 1.2.1
tag        = v1.2.1
commit     = db55f8342837d7fe3d333fd962bdc7939a8c4603
```

La dépendance générique de navigation Platform est déjà résolue dans le Core intégré. Aucune nouvelle évolution Core n'est requise pour le recadrage M-002 actuel.

## 3. Contrat final M-002

Source de vérité :

```text
docs/m002/M-002-FINAL-CONTRACT.md
```

Décisions finales :

```text
ProductVariant
→ rôle métier actif = Référence Produit exploitable
→ name persistant obligatoire
→ normalizedName unique pour une référence active
→ conservationType obligatoire
→ referenceUnit obligatoire
→ foodRange facultatif
→ processingState facultatif
→ dimensions facultatives

foodRange
→ Gammes 1..6 conservées côté backend
→ Gamme 6 = PAI / PAE
→ non utilisé ni affiché par le frontend actif

usageType
→ retiré du contrat actif
→ seulement toléré dans les migrations historiques déjà versionnées

CanonicalProduct
→ racine / concept Produit global
→ peut exister sans Référence exploitable

WorkspaceProduct
→ lien Workspace ↔ Référence Produit
→ rôle UX = Favori
```

Catégorie facultative à la création d'une référence.

Le nom visible n'est jamais calculé à partir de Variété / Présentation / CUT / autres dimensions.

## 4. UX finale attendue

Workspace Produits :

```text
onglets
→ Tous les produits
→ Favoris

liste
→ Produit | Conservation | Actions

filtres
→ Recherche
→ Catégorie
→ Conservation

ordre
→ alphabétique par défaut
→ aucun contrôle de tri visible

Gamme
→ aucun affichage frontend
→ aucun champ de saisie
→ aucun filtre
→ aucun mapping d'import
```

La recherche est visuellement prioritaire et dispose d'une largeur supérieure aux filtres secondaires.

Le drawer et les écrans d'administration utilisent le vocabulaire « Référence Produit », pas « Déclinaison ».

## 5. Frontière M-002 / M-003

M-002 :

- identité Produit / Référence Produit ;
- catégorie ;
- conservation ;
- unité ;
- gamme conservée côté backend pour compatibilité/évolution future ;
- dimensions métier facultatives ;
- recherche/déduplication ;
- favoris Workspace ;
- gouvernance globale ;
- import de données M-002.

M-003 :

- Fournisseur ;
- référence fournisseur ;
- conditionnement commercial ;
- colisage ;
- prix catalogue / négocié / facturé ;
- contexte économique Dossier ;
- plusieurs offres fournisseurs pour une même Référence Produit.

Les PDF catalogues fournisseur pourront être exploités après validation finale de M-002.

## 6. Seed

Datasets historiques immuables :

```text
m002-reference-v1
m002-reference-v2
m002-reference-v3
```

Dataset actif :

```text
m002-reference-v6
```

Contrôle effectué sur le v6 :

```text
Catégories              = 14
Produits                 = 264
Références exploitables  = 264
Produits sans référence  = 0
collisions de nom       = 0
non-alimentaire         = 0
```

Le v6 utilise le PDF `SANS PRIX-IPCOLL-SEC-SEPT 2026.pdf` comme source unique du bootstrap. Les pages « Non Alimentaire » sont exclues. Les références des seeds v1 à v5 absentes du PDF sont archivées par migration. Marques, références fournisseur, conditionnements et prix restent hors M-002.

## 7. Migration et base locale de développement

La base locale actuelle a accumulé plusieurs contrats M-002 pré-release incompatibles. Il ne faut plus tenter de convertir ces artefacts un par un.

Stratégie locale officielle :

```text
dev:reset-m002-catalog
→ migration:m002-catalog
→ seed:m002-reference (v6)
```

Le reset ne touche qu'aux collections M-002 et refuse production, MongoDB distant et toute base ne terminant pas par `_dev`.

Une migration additionnelle M-002 convertit, pour les environnements qui en ont encore besoin, le contrat actuel vers :

- `name` / `normalizedName` persistants sur la Référence ;
- `conservationType` ;
- Gamme 6 lorsqu'un ancien `usageType` l'établit explicitement ;
- suppression de `usageType` du document actif ;
- nouvelle signature d'identité.

Principe :

```text
déterministe → migrer
ambigu → échouer explicitement / revue métier
```

Les migrations historiques ne sont pas réécrites.

## 8. Déduplication et import

L'unicité métier exacte porte désormais sur le nom normalisé de la Référence Produit.

Un import rencontrant exactement le même nom de Référence :

```text
→ réutilise la Référence existante
→ ne recrée pas une Référence sous un autre CanonicalProduct
```

Les colonnes commerciales restent détectées mais hors périmètre M-002.

## 9. Travail réalisé dans le dernier bloc

Depuis le HEAD historique `7f432e00...`, le lot a notamment :

- ajouté le nom persistant et la conservation à `ProductVariant` ;
- ajouté Gamme 6 = PAI / PAE ;
- retiré `usageType` du contrat actif ;
- rendu Catégorie et Gamme facultatives ;
- découplé `processingState` de la Gamme ;
- ajouté l'index unique de nom normalisé ;
- ajouté la migration de contrat Référence Produit ;
- créé le seed `m002-reference-v6` uniquement depuis le PDF alimentaire et ajouté la réconciliation des anciens seeds ;
- adapté le pipeline d'import ;
- dédupliqué sur le nom exact de Référence ;
- refondu la liste Workspace en `Produit | Conservation | Actions` ;
- remplacé « Mon référentiel » par « Favoris » ;
- simplifié la création et l'édition de Référence ;
- aligné les drawers, administration globale, dashboard et E2E ;
- mis à jour les tests ciblés pour protéger le nouveau contrat ;
- créé `docs/m002/M-002-FINAL-CONTRACT.md`.

## 10. Décision de clôture M-002

Le porteur produit a validé le 2026-09-25 la clôture fonctionnelle de M-002 après la dernière QA visuelle.

Décisions de sortie :

- le contrat M-002 est gelé ;
- le frontend n'expose plus les Gammes ; `foodRange` reste conservé côté backend pour compatibilité/évolution future ;
- l'import massif Produits CSV/XLS/XLSX et la gouvernance globale restent M-002 ;
- l'import de catalogues fournisseur complets reste M-003 ;
- les retouches purement design découvertes ultérieurement sont non bloquantes et ne rouvrent pas M-002, sauf régression fonctionnelle démontrée.

## 11. Vérité des tests et de l'intégration

Le workflow `Core Gate` du dépôt exécute `npm run release:check` sur chaque pull request et sur chaque push vers `main`. Il couvre donc la gate canonique backend, frontend, build et E2E définie par le dépôt.

La documentation ne fige pas un résultat CI futur. Pour la clôture technique, l'autorité est :

```text
HEAD de la PR finale M-002
→ Core Gate PR = success
→ merge vers main
→ Core Gate post-merge = success
```

Ne jamais transformer une gate non exécutée ou en cours en résultat vert.

## 12. Dette UX non bloquante

`GMS-UX-001` suit les éventuels raffinements visuels M-002 post-merge. Aucun changement de modèle, d'API, de règle métier, de permission ou de frontière M-002/M-003 ne doit être glissé dans cette dette.

## 13. Suite immédiate

Après intégration de la PR finale M-002, ouvrir le cadrage détaillé M-003.

Premier verrou à fermer :

```text
Fournisseur
→ édition/catalogue identifié
→ Article fournisseur
→ rapprochement Référence Produit M-002
→ conditionnement
→ tarif de référence
→ contexte/prix Dossier
```

Ne pas coder de modèle M-003 avant validation de son contrat détaillé.
