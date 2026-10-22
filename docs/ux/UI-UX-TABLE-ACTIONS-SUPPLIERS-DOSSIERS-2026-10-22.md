# Lot UI/UX — Formulaire Fournisseur et actions des tableaux

**Date de cadrage :** 2026-10-22  
**Branche :** `feature/ui-ux-improvements`  
**Décision :** périmètre validé par l'utilisateur ; implémentation sur la branche, recette et gate locales en attente.

## Objectif

Alléger les pages métier sans modifier les règles métier, autorisations, API,
données MongoDB ni conventions Core. Préserver les parcours accessibles
existants et réduire la multiplication des boutons par ligne.

## Périmètre validé

- Fenêtre de création et d'édition de Fournisseur : présenter l'information
  de portée via `InfoTooltip` à côté du titre. La description demeure accessible
  aux technologies d'assistance, sans occuper une ligne visuelle.
- Bouton « Enregistrer » désactivé si le nom obligatoire est vide ou si
  une requête est en cours. Le serveur reste autoritaire pour Zod, unicité,
  périmètre Workspace et autres validations. Code, raison sociale,
  site web et catégories demeurent facultatifs.
- Menu « … » ouvert au clic pour les actions de ligne des tableaux :
  Fournisseurs, Articles et Catalogues (page Fournisseurs),
  Dossiers, puis Références, Tarifs négociés, Prix indicatifs
  et Prix facturés dans « Fournisseurs et prix ».
- Le tableau des Catalogues de « Fournisseurs et prix » ne dispose
  actuellement d'aucune action de ligne ; ne pas créer d'action factice.
- Aucun déclencheur « … » si aucune action n'est disponible ; les actions
  restent filtrées selon leur ownership, leur statut et leurs permissions
  au niveau de chaque feature. Les guards serveur sont inchangés.
- Conserver les liens de navigation et la possibilité de consulter
  les ressources partagées sans leur conférer des droits de modification.
- Remplacer le menu spécifique des lignes de Fiches techniques par le
  même composant de présentation pour éviter une primitive concurrente,
  sans en modifier les actions métier.

## Composants réutilisés

- `components/shared/info-tooltip.jsx` : déclencheur d'aide accessible.
- `components/ui/popover.jsx` et `components/ui/button.jsx` :
  primitives shadcn/Base UI.
- `components/data-display/table-row-actions-menu.jsx` :
  composition partagée d'actions déclaratives avec icône, libellé,
  callback ou lien, état désactivé et style sensible.
- `components/data-display/data-table.jsx` :
  tableau existant, sans changement de contrat.

## Critères d'acceptation

1. Le texte de portée n'occupe plus une ligne de description visible ;
   l'information reste accessible via infobulle et description masquée.
2. Sans nom exploitable, « Enregistrer » est désactivé ; un nom saisi
   l'active (sauf requête en cours). La validation serveur reste effective.
3. Les menus de lignes s'ouvrent au clic et ferment après action.
4. Fournisseurs globaux : consultation seulement. Fournisseurs privés :
   actions existantes selon permissions et statut.
5. Dossier actif : consulter et ouvrir. Dossier non actif :
   consultation uniquement conformément à l'ancienne navigation.
6. Aucun changement des payloads métier, statuts persistants,
   événements/audit, entitlements ou quotas.
7. Les prix facturés conservent distinctement « Valider » et « Rejeter » ;
   les actions sensibles restent clairement identifiables.
8. Les tests RTL des composants et pages concernés, lint, build,
   gate complète et QA visuelle sous Windows sont validés par
   l'utilisateur avant toute PR.

## Exclusions

- Pas d'évolution du Core, pas de nouveau module métier.
- Pas d'évolution des modèles, routes, migrations, seeds ni permissions.
- Pas de redesign des tableaux hors des trois pages prévues.
- Pas de suppression ni de merge sans validation explicite.

## Validation technique

Aucun test local ou gate n'est réputé exécuté à la publication
du code. Résultats attendus de l'utilisateur après `git pull` :

```powershell
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
npm run release:check
```

Revoir les résultats réels, appliquer les corrections éventuelles dans
la même branche, puis demander l'accord avant PR.

## Complément validé — identification et recherche d'Articles

L'utilisateur a validé le 2026-10-22 :

- Action `Ouvrir` du tableau Dossiers avec icône `FolderOpen`, lien inchangé.
- Sélecteurs d'Articles dans les Références favorites du Dossier,
  le dialogue d'ajout de Tarif négocié / Prix facturé et la carte de
  vérification du prix applicable : champ de recherche prédictive
  remplaçant les listes déroulantes.
- Présentation métier des suggestions sur deux lignes :
  désignation de l'Article si disponible (sinon nom de Référence Produit),
  puis Fournisseur et référence fournisseur.
- Recherche côté serveur dès trois caractères, avec temporisation de
  300 ms et pagination limitée à 10 suggestions ; pas de chargement
  de 1 000 Articles côté navigateur.
- Réutilisation des composants `components/ui/autocomplete.jsx` existants.
  Le popup est rendu dans un Portal et borné en hauteur (`max-h-64`) ;
  il ne modifie ni le flux ni la taille initiale de la carte ou de la modale.
- Le filtre standard M-003 côté serveur est complété par le nom de
  Fournisseur et le nom de Référence Produit ; la recherche conserve
  les filtres de visibilité Workspace existants.
- Si l'utilisateur n'a accès qu'aux Références du Dossier, la recherche
  de la carte fonctionne sur ces données déjà autorisées, sans
  déclencher l'API de liste d'Articles.
- Une saisie qui modifie l'Article retenu invalide le choix précédent
  et empêche d'envoyer un identifiant obsolète.
- Les actions et validations de prix demeurent inchangées.
- Tests ajoutés / ajustés pour recherche, sélection, affichage,
  permissions/tenancy et comportement de l'icône.

**Recette en attente :** vérifier localement les trois recherches, les
libellés des Articles avec et sans désignation, la recherche sur des
catalogues volumineux, les résultats vides, la recherche clavier et la
stabilité de hauteur de la carte « Vérifier un prix applicable » ainsi
que de la modale tarifaire avant toute PR.

## Complément M-002 — Libellés Outlined dans « Créer une référence Produit »

- Demande validée le 2026-10-22 : aligner les champs de création sur le
  comportement Outlined déjà disponible dans la modification d'une Référence
  Produit. Ne pas dupliquer la primitive ni retoucher les composants Core.
- Utiliser `ProductVariantFields floatingLabels` dans
  `ProductVariantCreateDialog` (même composant que pour la modification).
- Champ vide : libellé dans le champ ; focus : libellé sur la bordure avec
  exemple contextuel visible ; valeur renseignée : libellé maintenu en haut.
  Les listes désactivées, champs requis et messages d'aide restent intacts.
- Indiquer un exemple numérique pertinent pour le rendement facultatif
  (95 %) en mode Outlined, en conservant le libellé historique hors de ce mode.
- Pas de modification backend, du schéma de validation ni de la sérialisation.
- Vérification : tests RTL des champs et du dialogue de création,
  lint/build, puis QA visuelle locale (focus, saisie, effacement,
  champs préremplis, options indisponibles) avant PR.

## Complément M-002 — Références existantes repliables

- Demande du 2026-10-22 : ne pas allonger la fenêtre de création
  de Référence Produit à cause de la liste des références déjà présentes.
- Réutiliser `components/ui/collapsible.jsx` déjà présent dans le Produit.
- Si des références existent, afficher un en-tête « Références existantes »
  avec leur nombre et un chevron ; panneau fermé par défaut, ouverture et
  fermeture au clic ou au clavier.
- Conserver les libellés métier et unités des références existantes.
- Lors de l'ouverture, limiter la liste à une hauteur de `max-h-44`
  avec défilement interne (`overflow-y-auto`, `overscroll-contain`).
  Cela évite l'allongement de la modale lorsque la liste est importante.
- Si aucune référence n'existe, ne pas afficher le panneau.
- Aucun changement métier, API, DB, permission ou Core.
- Tests RTL : nombre, état replié, ouverture/fermeture et défilement borné
  avec 30 entrées ; QA visuelle sous Windows avant PR.
