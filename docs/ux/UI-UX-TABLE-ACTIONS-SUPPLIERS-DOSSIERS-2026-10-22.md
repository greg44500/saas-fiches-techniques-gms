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
