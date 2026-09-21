# M-001 — Contrat UX Dossiers

**Statut :** VALIDÉ  
**Date de validation :** 2026-09-21

---

## 1. Principe de surfaces

M-001 distingue quatre surfaces clairement séparées :

```text
Liste Dossiers
→ trouver / filtrer / repérer

Drawer Dossier
→ consulter rapidement

Dialog Dossier
→ créer / modifier

Page Dossier
→ travailler réellement
```

Aucune de ces surfaces ne remplace les autres.

### 1.1 Dashboard Workspace — point d’arrivée métier

Le Dashboard Workspace est le point d’arrivée du produit métier après l’entrée dans un Workspace.

M-001 l’enrichit via le point d’extension Core existant :

```text
frontend/src/app/application-dashboard.js
```

Le produit ne crée pas un second système de Dashboard.

Le premier bloc métier M-001 est :

```text
Dossiers
→ jusqu’à 5 Dossiers accessibles dans le périmètre courant
→ états ACTIVE / PAUSED issus de la liste backend par défaut
→ labels issus des metadata backend
→ accès direct à la page de travail uniquement pour ACTIVE
→ lien vers la liste complète des Dossiers
```

Le widget est filtré par `dossier:read` et reste non configurable dans M-001 afin que l’accès aux Dossiers demeure visible sur la surface d’arrivée métier.

Les widgets Core continuent d’apporter le contexte Workspace utile ; les modules métier suivants enrichiront progressivement ce même Dashboard avec leurs propres indicateurs et surfaces de pilotage.

---

## 2. Liste Dossiers

Route frontend cible :

```text
/workspaces/:workspaceId/dossiers
```

La liste réutilise les primitives Core :

```text
DataTable
DataPagination
ActionIconButton lorsque pertinent
ToastProvider
```

Données M-001 minimales :

- nom ;
- enseigne si présente ;
- ville / code postal si présents ;
- statut ;
- actions autorisées.

Recherche, statut, pagination et limite sont exécutés côté backend via RTK Query.

Le frontend consomme les statuts et labels depuis `GET /dossiers/metadata`.

Actions principales :

```text
Voir
→ ouvre le drawer

Ouvrir
→ navigue vers la page de travail
→ uniquement si Dossier ACTIVE
```

---

## 3. Drawer Dossier

Le drawer réutilise `EntityDetailsDrawer`.

Il reste une surface de consultation et d'administration légère.

Sections M-001 :

```text
Informations
Accès
Activité
```

Il ne contient pas les futurs espaces de travail Fiches techniques, Produits contextualisés, Process ou optimisation.

Actions selon permissions et état :

- modifier les informations ;
- gérer les accès ;
- appliquer une transition lifecycle autorisée ;
- ouvrir le Dossier lorsque ACTIVE.

Le Workspace Owner est affiché comme ayant un accès implicite et n'est jamais matérialisé par un faux `DossierAccessGrant`.

---

## 4. Création et modification

La création et l'édition utilisent un Dialog métier basé sur les primitives shadcn/Base UI déjà présentes dans :

```text
components/ui/dialog
```

`ConfirmationDialog` reste réservé aux confirmations.

Le module Dossier réutilise un formulaire commun conceptuel :

```text
DossierForm
→ création
→ édition
```

Champs M-001 :

```text
Nom *
Enseigne
Adresse
Code postal
Ville
Email documents
Téléphone
Responsable / interlocuteur
```

La validation frontend améliore l'UX mais le backend reste autorité.

Après création réussie :

```text
POST
→ fermeture Dialog
→ invalidation/refetch RTK Query
→ toast succès
→ Dossier visible dans la liste
```

M-001 n'impose pas l'ouverture automatique du nouveau Dossier.

---

## 5. Page de travail Dossier

Route cible :

```text
/workspaces/:workspaceId/dossiers/:dossierId
```

Cette route constitue la vraie page de travail métier.

Seul `ACTIVE` peut devenir un contexte opérationnel.

```text
ACTIVE
→ page de travail autorisable

PAUSED
ARCHIVED
DELETED
→ pas de contexte de travail opérationnel
```

Le contexte sélectionné est exprimé par l'URL.

Interdit comme source de vérité d'autorisation :

```text
Redux activeDossierId
localStorage activeDossierId
backend currentDossier
```

Un futur `DossierProvider` peut dériver son contexte depuis l'URL et le GET Dossier autorisé, sans devenir une barrière de sécurité.

---

## 6. Évolution par modules

M-001 fournit la page de travail et une vue d'ensemble minimale.

Les modules suivants enrichissent cette page sans être implémentés dans le module Dossier :

```text
M-002
→ Produits / catalogue selon contexte

M-003
→ Articles fournisseur / références / prix locaux

M-004
→ Fiches techniques

modules futurs
→ Process / optimisation / autres outils
```

Aucun faux onglet vide n'est nécessaire avant l'existence réelle d'un module.

---

## 7. Navigation

Depuis la page Dossier :

```text
Workspace
> Dossier
```

Le Dashboard Workspace reste accessible en un clic.

Changer de Dossier implique une navigation explicite vers une autre URL.

L'ouverture ou la fermeture d'un drawer ne modifie jamais ce contexte.

---

## 8. Affectations

La section Accès du drawer compose :

```text
WorkspaceMembers Core
+
DossierAccessGrant produit
```

Nouvelle affectation :

```text
WorkspaceMember ACTIVE
→ non Owner
→ PUT access-grant
```

Révocation manuelle :

```text
ConfirmationDialog
→ DELETE access-grant
→ révocation logique
```

M-001 privilégie une gestion individuelle claire et traçable plutôt qu'un batch complexe.

---

## 9. Lifecycle UX

Les actions affichées sont construites à partir des metadata backend :

```text
dossierStatuses
statusTransitions
```

Le frontend n'encode pas localement la matrice.

Les transitions sensibles utilisent `ConfirmationDialog`.

La suppression et la restauration exigent un `reason` côté service et l'interface fournit donc le champ approprié dans la confirmation.

---

## 10. Règle directrice

```text
Drawer
≠ espace de travail

Dialog
≠ espace de travail

Page Dossier
= espace de travail métier
```
