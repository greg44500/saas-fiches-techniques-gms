# SAAS-FICHES-TECHNIQUES-GMS — Stockage, corbeille métier et rétention

**Statut :** VALIDÉ — contrat transversal produit  
**Date :** 2026-09-21  
**Périmètre :** ressources métier générées/supprimées par le SaaS GMS, stockage Workspace et artefacts d'export

> Ce document ne remplace pas la politique générique Core de téléversement de fichiers.
> Il formalise les décisions métier du produit concernant les Dossiers, DRAFTS, versions VALIDATED et formats générés.

---

## 1. Frontière avec le Core

La fonctionnalité générique Core de téléversement de fichiers conserve ses propres règles de quota, corbeille, restauration et purge.

Le présent contrat concerne le produit GMS :

```text
DRAFTS de Fiches techniques
versions VALIDATED / ARCHIVED
ressources métier supprimées
exports CSV / XLS(X)
PDF généré pour envoi par e-mail
Dossiers DELETED
```

Aucune règle produit ne doit modifier silencieusement le lifecycle générique des fichiers Core.

---

## 2. Autorité de stockage

La capacité de stockage appartient au Workspace.

```text
Workspace
→ capacité / quota de stockage

Dossiers
→ consomment la capacité commune
→ aucune allocation fixe
→ aucun quota dur individuel en V1
```

Tant que le Workspace dispose de la capacité, des permissions, des capabilities et des quotas applicables, ses Dossiers peuvent créer leurs ressources métier.

Une ventilation de consommation par Dossier peut être calculée et affichée à des fins d'observabilité et de pilotage. Elle ne devient pas une autorité de blocage en V1.

---

## 3. Politique de corbeille métier du Workspace

Le produit possède une politique de conservation métier centralisée au Workspace.

Valeurs validées :

```text
durée standard : 30 jours
minimum         : 7 jours
maximum         : 90 jours
```

Lorsque la capability commerciale autorise la personnalisation, le Workspace peut sélectionner une durée dans ces bornes.

Le backend reste l'autorité : aucune valeur hors bornes n'est acceptée.

La logique conceptuelle est :

```text
deletedAt
+ durée effective au moment de la suppression
→ purgeScheduledAt
```

L'échéance est figée au moment de la suppression. Une modification ultérieure de la configuration du Workspace n'est pas rétroactive sur les ressources déjà placées en corbeille.

---

## 4. DRAFTS de Fiches techniques

Un DRAFT actif n'est jamais supprimé ou purgé uniquement parce qu'il est ancien.

Une ancienneté importante peut produire un signalement ou une suggestion de nettoyage, mais jamais une destruction silencieuse.

Lorsqu'un DRAFT est explicitement supprimé :

```text
DRAFT actif
→ suppression explicite
→ corbeille métier
→ restaurable pendant la rétention
→ purge à l'échéance
```

Le contrat technique détaillé sera implémenté dans le module Fiches techniques, pas dans M-001.

---

## 5. Versions VALIDATED et archivage

Une version VALIDATED est une donnée métier historique et immuable.

```text
VALIDATED
→ conservation historique
→ archivage possible
→ aucune purge automatique par simple ancienneté
```

Le parcours normal pour sortir une fiche validée de l'usage courant reste l'archivage.

Une éventuelle suppression définitive de fiches validées devra faire l'objet d'un contrat spécifique, audité et compatible avec les exigences réglementaires applicables.

---

## 6. Dossiers DELETED

Pour M-001 :

```text
DELETED
→ suppression logique
→ coupure des flux métier
→ restauration contrôlée possible
→ aucune purge automatique
```

La purge physique d'un Dossier est différée jusqu'au cadrage du graphe complet de ses descendants métier.

La politique de corbeille des DRAFTS ne doit donc pas être appliquée mécaniquement au Dossier racine.

---

## 7. Exports et documents générés

Les formats de sortie reproductibles ne sont pas des ressources métier persistantes.

### CSV / XLS(X)

```text
donnée métier
→ génération à la demande
→ téléchargement / remise au client
→ suppression du temporaire
```

Aucun historique de fichiers d'export n'est conservé par défaut.

### PDF

Le PDF est uniquement un format de représentation généré à la demande lors de l'envoi d'un document par e-mail.

```text
version de Fiche technique
→ génération PDF temporaire
→ pièce jointe e-mail
→ envoi
→ destruction du temporaire
```

Le PDF n'est pas stocké comme ressource métier persistante.

En cas de nouvelle tentative d'envoi, il est régénéré depuis la donnée/version source.

L'audit pourra conserver l'identité de la fiche/version, l'acteur, le destinataire, la date et le résultat d'envoi sans conserver le binaire PDF.

---

## 8. Source de vérité

La donnée structurée métier reste l'autorité.

```text
Fiche / version persistée
→ source de vérité

PDF / CSV / XLS(X)
→ représentation temporaire dérivée
```

Les exports ne doivent jamais devenir une seconde source de vérité ni un historique concurrent aux versions métier.

---

## 9. Impacts par module

### M-001 — Dossiers / affectations

- quota de stockage : Workspace, jamais Dossier ;
- Dossier DELETED : pas de purge automatique ;
- aucun mécanisme File Core à dupliquer.

### Module Fiches techniques

À implémenter lors de son cadrage :

- corbeille des DRAFTS supprimés ;
- restauration avant échéance ;
- purge après échéance ;
- conservation des VALIDATED ;
- génération transitoire CSV/XLS(X) ;
- génération transitoire PDF pour e-mail.

### Panneau Workspace

Surface attendue :

```text
Conservation & nettoyage
→ valeur standard
→ valeur configurée éventuelle
→ valeur effective
→ droit de personnalisation
```

Le détail exact de la capability commerciale reste à rattacher au plan concerné au moment du cadrage d'implémentation.

---

## 10. Invariants

- le Workspace porte la capacité de stockage ;
- aucun quota dur par Dossier en V1 ;
- un DRAFT actif n'est jamais purgé par ancienneté seule ;
- un DRAFT supprimé peut être purgé après la durée de corbeille ;
- une version VALIDATED n'est jamais purgée automatiquement par âge ;
- un Dossier DELETED n'est pas purgé automatiquement dans M-001 ;
- la durée standard de corbeille métier est 30 jours ;
- toute valeur personnalisée reste comprise entre 7 et 90 jours ;
- l'échéance de purge est figée à la suppression ;
- CSV/XLS(X) sont temporaires ;
- le PDF d'e-mail est temporaire et non persisté ;
- les fichiers générés ne créent pas une seconde source de vérité.
