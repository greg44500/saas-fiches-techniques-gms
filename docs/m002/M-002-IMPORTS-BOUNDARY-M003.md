# M-002 — Imports Produits et frontière catalogue fournisseur M-003

**Statut : VALIDÉ — frontière M-002/M-003 et recadrage import du 2026-09-22**

## 1. Principe

Il existe deux imports différents qui ne doivent pas être confondus.

### Import Produit — M-002

Objectif : enrichir le référentiel Produit et le catalogue d'usage du Workspace.

Formats cibles :

```text
CSV
XLS
XLSX
```

Données admissibles :

- nom Produit ;
- alias ;
- catégorie ;
- forme ;
- état / transformation ;
- conservation ;
- gamme ;
- unité ;
- rendement lorsqu'il est fiable.

Le pipeline applique systématiquement normalisation, déduplication, recherche de proximité et contrôles d'autorisation.

L'accès commercial à l'import est porté par la capability métier `product_catalog_import`. La création de nouvelles identités/déclinaisons exige en plus `product_contribution` et les permissions Workspace correspondantes.

Le fichier source est un temporaire de traitement : il doit passer par les primitives génériques Core de réception bornée, quarantaine, inspection, checksum, antivirus et nettoyage. Il ne devient pas un document `File` durable pour le seul besoin de l'import.

L'import ne crée donc pas une seconde capacité de stockage. L'occupation temporaire nécessaire au traitement est une ressource d'infrastructure et ne consomme pas un quota commercial de stockage utilisateur.

### Import catalogue fournisseur — M-003

Objectif : importer une édition de catalogue ou mercuriale commerciale.

Données typiques :

- Fournisseur ;
- référence Article ;
- désignation source ;
- marque éventuelle ;
- conditionnement ;
- quantité / unité ;
- Tarif fournisseur de référence ;
- édition / date / validité.

Une ligne fournisseur n'est jamais assimilée automatiquement à un Produit canonique.

## 2. Catalogue fournisseur commun au Workspace

Cas métier de référence :

```text
Workspace
├── Dossier Nantes
├── Dossier Saint-Nazaire
└── Dossier La Baule

Catalogue fournisseur Sysco 2026
→ importé une seule fois dans le Workspace
→ disponible comme référence commune pour les trois Dossiers
```

Le catalogue n'est jamais dupliqué trois fois.

L'édition de catalogue constitue une ressource commerciale de référence du Workspace, réutilisable par tous ses Dossiers selon permissions.

## 3. Mapping vers le référentiel Produit

À l'import M-003 :

```text
ligne fournisseur
→ Fournisseur + référence Article
→ mapping déjà connu ?
   → oui : réutiliser
   → non : rechercher Produit / Déclinaison
→ exact match : rattacher
→ candidat proche : revue
→ aucun candidat fiable : création Produit/déclinaison via moteur M-002
```

Un nouveau millésime du même catalogue réutilise les mappings Fournisseur + référence Article déjà validés.

La réimportation ne recrée donc ni le Produit canonique, ni la déclinaison, ni l'Article fournisseur lorsque leur identité métier est déjà connue.

## 4. Prix de référence et prix négociés

Le Tarif fournisseur de référence appartient au catalogue/à l'Article de référence et peut être utilisé sans connaître un Dossier particulier.

Le Tarif négocié appartient strictement à :

```text
Dossier
× Article fournisseur
× période de validité
```

Exemple :

```text
Sysco — réf. CAR-001
Tarif catalogue Workspace : 2,30 €/kg

Nantes
→ Tarif négocié : 2,05 €/kg

Saint-Nazaire
→ Tarif négocié : 2,18 €/kg

La Baule
→ pas de Tarif négocié
→ Tarif fournisseur de référence selon la politique de prix du Workspace
```

Un Dossier peut donc avoir des prix négociés sur tout ou partie du catalogue.

L'absence de Tarif négocié sur une référence ne crée pas de copie locale du tarif fournisseur.

## 5. Politique de prix Workspace

Le contrat produit transversal reste autoritaire :

```text
Mode Tarif fournisseur
→ Tarif fournisseur de référence

Mode Tarif négocié
→ Tarif négocié valide du Dossier
→ sinon Tarif fournisseur de référence

Mode Prix facturé
→ dernier Prix facturé exploitable du Dossier
→ sinon Tarif négocié valide du même Dossier
→ sinon Tarif fournisseur de référence
```

La politique est commune au Workspace.

Les valeurs locales restent strictement isolées par Dossier.

Un prix spécifique Nantes ne peut jamais être utilisé comme fallback Saint-Nazaire.

## 6. Pas de duplication par Dossier

Architecture interdite :

```text
Dossier A → copie catalogue Sysco
Dossier B → copie catalogue Sysco
Dossier C → copie catalogue Sysco
```

Architecture retenue :

```text
Workspace
└── Catalogue fournisseur Sysco 2026
    ├── Article A
    ├── Article B
    └── Article C

Dossier A
└── conditions locales uniquement

Dossier B
└── conditions locales uniquement

Dossier C
└── conditions locales uniquement
```

## 7. Import et prévisualisation

Le pipeline d'import fournisseur M-003 devra suivre la même discipline que l'import Produit :

```text
téléversement temporaire sécurisé
→ mapping colonnes
→ prévisualisation
→ normalisation
→ rapprochement références existantes
→ rapprochement Produit/déclinaison
→ ambiguïtés à valider
→ confirmation
→ création de l'édition
```

Aucune ligne ambiguë ne crée automatiquement un Produit canonique.

## 8. Portée M-002

M-002 implémente maintenant :

- le moteur Produit et Déclinaison ;
- la déduplication ;
- le rattachement Workspace ;
- la création contrôlée et l'administration globale ;
- l'import en masse de données Produit CSV/XLS/XLSX.

M-002 n'implémente pas encore :

- Fournisseur ;
- Article fournisseur ;
- édition de catalogue fournisseur ;
- Tarif fournisseur ;
- Tarif négocié ;
- Prix facturé.

Ces ressources restent M-003, mais leur architecture de partage Workspace / contextualisation Dossier est désormais figée afin que M-002 ne crée aucune fondation incompatible.
