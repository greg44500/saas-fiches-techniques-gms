# UX M-003 — Articles fournisseur dans le Dossier

**Décision du 2026-10-26 :** complément UX approuvé à intégrer dans
`feature/m004-gammes-fiches-techniques` avec les Gammes M-004.
Ce document complète M-003 sans changer les règles métier existantes.

## Problème

Le premier onglet « Références (1) » du Dossier ne montrait que les
références favorites, alors que l'administration du Workspace affichait
cinq Articles fournisseur accessibles. L'utilisateur devait chercher
puis ajouter un Article pour le voir dans le Dossier. Le terme
« Références » masquait qu'il s'agit d'Articles fournisseur existants.

## Contrat UI approuvé

- Dans « Dossier → Fournisseurs et prix », afficher les **Articles
  fournisseur accessibles** dans le premier onglet, sans duplication
  de leurs données.
- Le libellé est « Articles fournisseur (N) » ; N provient du total
  de la liste serveur des Articles actifs, non du nombre de favoris.
- Recherche et pagination des Articles sont côté serveur.
- Filtre « Tous les articles / Favoris (N) » : N est le nombre de
  favoris actifs de ce Dossier, maintenus par le mécanisme existant.
- Ajouter ou retirer un favori depuis la ligne sans créer ni supprimer
  d'Article. Un favori est une sélection du Dossier, pas un nouveau
  catalogue, un approvisionnement automatiquement choisi ou un prix figé.
- Afficher désignation source, référence fournisseur, Fournisseur et
  Produit associé ou état non associé. Ne pas inventer de prix applicable
  au magasin à partir du seul tarif catalogue.
- Conserver les autres onglets et leur structure. La suppression éventuelle
  des Catalogues du Dossier relève d'une décision ultérieure.

## Invariants et sécurité

- `supplier:article:read` reste obligatoire pour consulter la liste
  complète des Articles fournisseur.
- `supplier:dossier-reference:read` contrôle la visibilité de l'état
  favori ; `supplier:dossier-reference:manage` contrôle la mutation.
- Un utilisateur qui n'a que le droit de lire les références du Dossier
  conserve un mode « Articles favoris » (sans élargissement des droits).
- Aucune modification des ressources persistées, des règles de tenancy,
  de la politique de Prix applicable, des Fiches techniques ou du Core.
- Article non associé visible n'implique pas qu'il soit valorisable.
- Le backend M-003 existant est autorité pour les Articles accessibles
  et pour l'appartenance des favoris au Dossier.

## Finition d'interaction validée — 2026-10-26

- Glissement animé de l'indicateur du filtre sur 200 ms,
  avec `prefers-reduced-motion` ; style aligné avec le sélecteur de
  Produits des Fiches M-004.
- Tooltip des actions favorites, au survol et au focus clavier :
  confirmation explicite de l'ajout ou du retrait.
- Barre de recherche placée immédiatement à droite du filtre, sans
  alignement forcé à l'extrémité opposée du bandeau. Elle s'étend vers
  la droite au clic ; sur les petits écrans les contrôles passent à
  la ligne lorsque la place manque, sans débordement horizontal.
- Barre de recherche fermée sur une loupe seule ; expansion animée
  300 ms, champ de saisie conservé monté pendant la transition.
  Focus transmis à la saisie à l'ouverture ; recherche serveur
  inchangée. La saisie évite tout repli involontaire, et Échap
  efface puis referme avec retour de focus.
- Implémentation limitée à la feature M-003 ; aucune modification
  des primitives génériques Core, du backend ni des règles de gestion.

## Tests et recette

- RTL : affichage Articles/favoris, ajout/retrait, absence de création
  d'Article, RBAC lecture seule, absence d'élargissement de droits,
  recherche/pagination serveur et entêtes scrollables.
- Playwright : Article consultable avant mise en favori, favori ajouté
  seulement au Dossier courant, filtre et absence de fuite entre Dossiers.
- Vérifier visuellement les états chargement, vide, erreur, thème clair
  et sombre, mobile et grand nombre de résultats.
- Tests et gates locaux non exécutés par l'assistant ; aucune PR ni
  fusion sans preuve des vérifications applicables.
