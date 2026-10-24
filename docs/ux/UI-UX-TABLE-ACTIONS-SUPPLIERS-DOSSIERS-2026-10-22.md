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

## Complément M-002 — Animation du repli des Références existantes

- Ajustement UX demandé le 2026-10-22 : ouverture/fermeture du panneau
  perçues comme trop abruptes.
- Réutilisation des états d'animation natifs de Base UI sur
  `CollapsibleContent` : `data-starting-style`, `data-ending-style`
  et hauteur mesurée `--collapsible-panel-height`. Transition
  hauteur + opacité en 300 ms (`ease-out`), reversible lors
  d'un clic rapide ; chevron synchronisé sur 300 ms.
- Contenu et bordure internes masqués par `overflow-hidden` pendant
  le déploiement ; liste plafonnée à `max-h-44`, sans changement
  des valeurs, de l'ownership ni du comportement du formulaire.
- Respect du paramètre système `prefers-reduced-motion` grâce à
  `motion-reduce:transition-none`.
- Tests RTL : conserver la validation fonctionnelle précédente et
  vérifier les classes d'animation ; la fluidité visuelle réelle
  doit être contrôlée par l'utilisateur sous Windows.


## Complément validé — cartes Dimensions M-002 et validation cohérente (2026-10-23)

- Variétés et Caractéristiques du drawer Application Global : carte homogène, nom et type lisibles, statut de cycle de vie discret et une seule pastille de validation métier.
- Priorité : identité `PROVISIONAL` → « Identité à valider » ; sinon revue `PENDING` → « Qualité à vérifier » ; sinon identité active approuvée → « Validée ». Une donnée `PROVISIONAL / REVIEWED` n'affiche jamais « Validée ».
- Une seule décision pour une identité provisoire : « Examiner », puis décision de gouvernance dans le panneau contextuel existant ; approbation et clôture qualité atomiques. Pas de revue qualité parallèle. Pour `APPROVED / PENDING`, action « Confirmer la qualité ».
- Actions de maintenance regroupées dans le menu `TableRowActionsMenu` réutilisé : Corriger, Archiver/Réactiver et Supprimer ; permissions et confirmations inchangées.
- Le filtre « À contrôler » local couvre les identités provisoires et les contrôles qualité en attente, sans double comptage. Compteur qualité de la liste Produit et file unifiée Platform non modifiés.
- Protection backend : refus de la revue qualité isolée sur une Dimension `PROVISIONAL`, avec maintien de l'audit et de la reprise des Contributions historiques.
- Tests RTL/integration, gate et QA Windows à vérifier. **Aucun résultat local ni gate n'est attesté.**

## Complément M-002 validé — Densité des cartes et menu d'actions unique (2026-10-23)

- Cartes Variétés / Caractéristiques : padding réduit, nom + type + badge métier en une ligne avec retour naturel quand la largeur ne suffit pas. Retirer « Actif » répétitif ; signaler « Archivée » seulement pour une valeur archivée. La validation reste distincte du lifecycle.
- Filtre affiché « Non archivées », valeur technique `active` inchangée : comprend les dimensions provisoires utilisables dans leur Workspace d'origine. Le filtre « À contrôler » demeure transversal et peut recouper « Non archivées ».
- Menu unique « … » : `Valider directement` et `Examiner` pour une identité provisoire, puis `Corriger`, `Archiver/Réactiver`, `Supprimer`. La confirmation qualité directe n'est offerte que si l'identité est déjà approuvée. Aucun bouton « Examiner » séparé sur la carte.
- Avant une validation directe, relire le contexte de gouvernance exact via les API métier existantes. Une liste de candidats absente, un rapprochement, une cible incohérente ou un contexte indisponible empêchent l'approbation rapide et imposent l'examen (ou un message d'erreur). Le serveur décide et audite `APPROVE` ; aucune seconde revue qualité n'est demandée.
- Pour rendre le menu visible devant le drawer, un style temporaire strictement ciblé sur le portail Popover des Dimensions M-002 l'affiche entre les couches drawer et modal, sans modifier les primitives Core. Contrôle manuel du z-index, du clic, de l'accessibilité et du comportement mobile à effectuer en QA. Le besoin générique d'une superposition configurable reste candidat Core distinct.
- Gates, tests et recette navigateur locale toujours non attestés avant retour utilisateur ; ne pas fusionner.

## Finition QA M-002 — 2026-10-23

- L'action du menu Dimensions se nomme « Valider » (et non « Valider directement »). Elle garde le contrôle de contribution exact et l'approbation `APPROVE`.
- « Valider » a un survol/focus `success` ; « Examiner » a un survol/focus `warning`. Les autres actions et les styles destructifs conservent leurs comportements.
- Le filtre reprend le libellé « Actives », sans modifier la valeur `active` ni la visibilité des identités provisoires.
- Le dialogue de catégorie masque le sous-titre technique et conserve une description pour l'accessibilité.
- Tests et QA Windows à réaliser ; ne déclarer aucune gate verte sans résultat.

## QA complémentaire — Tableau Catégories et sortie des contrôles (2026-10-23)

- Catégories : un menu contextuel « … » par ligne à la place des boutons multiples. Renommer et Archiver/Réactiver selon état ; Supprimer affiché uniquement avec `totalProductCount === 0` et permission MANAGE. Le compteur « Produits actifs » seul n'est pas suffisant pour autoriser une suppression.
- Demande de suppression confirmée dans la modale réutilisée, erreur 409 visible et refus de suppression côté serveur si une association avec un Produit persiste.
- Zone Catégories : les onglets, actions d'entête et colonnes restent visibles ; le conteneur des lignes est scrollable selon la hauteur de fenêtre, avec en-tête de table sticky et région focalisable pour le clavier.
- Panneau examen Dimensions : texte « Approuver » et action « Annuler » qui quitte le contexte ciblé sans action de gouvernance. Pas de fermeture complète du drawer.
- Vérifications navigateur obligatoires : largeur mobile, hauteur réduite, nombre élevé de catégories, popover au-dessus du tableau, navigation clavier, sélection de ligne et confirmations.

## Finition de la liste M-004 et Fournisseurs et prix — 2026-10-23

- Fiches techniques du Dossier : conserver le menu contextuel partagé et présenter les actions disponibles strictement dans l'ordre **Modifier**, **Prévisualiser**, **Optimiser**, **Supprimer**. Les opérations demeurent conditionnées aux droits, à la présence d'une version validée, à la capability Optimiseur et au statut ; aucune action artificielle n'est proposée. La confirmation de mise en Corbeille reste inchangée.
- Liste des Fiches techniques : fixer la zone des lignes à la hauteur disponible sous la recherche ; en-tête du tableau sticky, recherche, commandes en haut de page et pagination hors du défilement. Repositionner la liste en haut lors d'un changement de recherche, de page ou de taille de page.
- Fournisseurs et prix d'un Dossier : pour les onglets Références, Catalogues, Tarifs négociés, Prix facturés et Prix indicatifs, le titre, les onglets et les commandes de section restent visibles ; seules les lignes défilent dans une région focalisable avec en-tête sticky. La page ne reçoit pas de pagination supplémentaire non demandée ; les requêtes et leurs limites existantes ne sont pas modifiées.
- Dans le tableau Références, retirer le menu « … » lorsque l'unique action est « Retirer du Dossier » : afficher directement un bouton icône + texte, neutre au repos, destructif au survol/focus, désactivé pendant la mutation et caché aux profils dépourvus de `DOSSIER_REFERENCE_MANAGE`. Conserver exactement la mutation, le contexte Workspace/Dossier et les messages d'erreur existants. Ne pas renommer cette opération « Supprimer ».
- Réutilisation UI : `useTableViewport` centralise le calcul de hauteur auparavant contenu dans le hook M-002 ; l'ancien export est conservé pour compatibilité, sans modification du `DataTable` Core. Les travaux Core D-008 et l'audit de branche M-001 restent distincts.
- Tests frontend ciblés, build, lint, recette visuelle (résolutions réduites, navigation clavier, menus en dernières lignes) et gate complète à exécuter en local Windows. Aucun résultat vert prétendu avant exécution.

## Complément QA — tableaux Fournisseurs et Produits Workspace (2026-10-23)

- La page Fournisseurs conserve ses commandes globales, ses onglets `Fournisseurs`, `Articles`, `Catalogues` et ses filtres hors du défilement des lignes. Chaque tableau possède un en-tête sticky au sein d'une région focalisable, dimensionnée par le hook UI partagé `useTableViewport`.
- Le pied du tableau garde le composant `DataPagination` existant, hors de cette région. La pagination demeure serveur (`page`, `limit` transmis aux hooks RTK Query), conserve les options de taille, et remonte les lignes au début lorsque l'utilisateur change de page, de taille de page, de section ou de critère de recherche.
- La page Produits applique exactement la même règle aux onglets `Tous les produits` et `Favoris`. Le champ de recherche prédictive et les filtres Catégorie/Conservation restent visibles. Le panneau détail, les favoris, les capabilities et les permissions ne sont pas modifiés.
- Aucun nouvel endpoint, changement d'autorisation, mutation métier ni pagination doublonnée. Le composant `DataPagination` n'affiche pas de navigation si la requête n'a aucun résultat ; une erreur de chargement conserve son état `ErrorState` au lieu d'afficher des contrôles factices.
- La hauteur utilise la fenêtre courante et réserve l'espace nécessaire au footer. Les tests RTL vérifient les en-têtes sticky, les zones de lignes et la pagination disponible indépendamment du scroll ; tests local Windows et QA visuelle (hauteur réduite, menus de dernière ligne, changement de filtres et taille de page) restent requis.


## Finition UI/UX — barre compacte du Dossier (2026-10-24)

- L'en-tête Dossier regroupe retour, nom et statut, marge cible et recherche Article fournisseur ; les deux cartes à hauteur fixe disparaissent. Sur écran étroit, les commandes passent à la ligne sans masquer les fonctions.
- Les coordonnées existantes (localisation, interlocuteur, e-mail documentaire, téléphone) sont consultables via survol/focus du nom (Tooltip) et clic sur l'information (Popover) pour l'accès tactile/clavier.
- Champ de recherche compact visible, élargi au focus sur écran large (animation réduite selon `prefers-reduced-motion`) ; recherche prédictive, contrôle des droits, fallback sur les Références du Dossier et filtres serveur inchangés.
- Après sélection seulement, panneau flottant de résultat : montant HT, source, alerte tarif expiré, chargement et erreur conservés. Fermeture au clic hors panneau, par bouton ou Échap sans effacer l'Article ; réouverture au focus de recherche.
- Aucun changement API, Core, DB, permissions, capabilities ni quota. Tests RTL préparés ; tests locaux PowerShell, lint/build, gate et QA visuelle encore à confirmer. Ni PR ni merge avant accord explicite.


## Ajustement QA — Déclencheur d'information et recherche compacte (2026-10-24)

- Suppression de l'infobulle au survol du nom et de l'icône d'information distincte : **le nom du Dossier devient l'unique bouton** ouvrant le Popover « Informations du Dossier » au clic ou au clavier. Les coordonnées existantes conservent leurs icônes ; sans coordonnées, afficher un message neutre. Aucun affichage automatique au survol.
- Dans l'en-tête, la recherche de prix se place immédiatement après le contrôle de marge cible (ou après le statut si le contrôle est absent). **Au repos, seule une loupe est rendue** : ni champ ni placeholder partiellement visible. Au clic, la recherche se déploie avec une transition de largeur réversible (300 ms, réduction des animations selon préférences système) puis reçoit le focus.
- Les suggestions M-003 continuent de s'afficher dans leur Portal. Un clic sur une suggestion ne replie pas la recherche. Un clic extérieur la replie sans effacer l'Article sélectionné ; la recherche rouverte retrouve la sélection et son résultat. Échap conserve le comportement tarifaire validé (fermeture du résultat sans perte de l'Article).
- Permissions, API et calculs inchangés. Tests RTL Dossier/prix ajustés ; tests locaux, lint, build, gate et QA Windows à effectuer avant toute PR ou fusion.

 
## Ajustement de l'animation inverse — recherche de prix Dossier (2026-10-24)

- Diagnostic QA : le champ fournisseur était supprimé du DOM dès le repli, ce qui cassait visuellement la transition inverse malgré `transition-[width] duration-300`.
- Correction ciblée au Produit : champ conservé monté lors des deux transitions, largeur du conteneur animée symétriquement en 300 ms, champ masqué au repos (`opacity`, `aria-hidden`, `inert`) et loupe seule interactive.
- Les informations tarifaires contextuelles restent hors du conteneur à débordement masqué. L'autocomplétion partagée accepte seulement une classe visuelle facultative pour neutraliser la double bordure dans la barre, sans changer le comportement des autres usages.
- Échap redonne le focus à la loupe lorsque la recherche se replie ; un clic extérieur conserve le focus de sa destination. Respect de `prefers-reduced-motion`.
- Tests RTL du repli et de l'accessibilité actualisés. Validation visuelle de l'ouverture **et de la fermeture**, tests locaux Windows, lint/build et gate encore à obtenir avant PR/merge.
