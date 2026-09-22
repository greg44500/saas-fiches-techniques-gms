# SAAS-FICHES-TECHNIQUES-GMS — Stockage, corbeille métier et rétention

**Statut :** VALIDÉ — contrat transversal produit  
**Date :** 2026-09-21  
**Périmètre :** persistance des ressources métier, temporaires techniques, corbeille métier et artefacts d'export

> Ce document ne remplace pas la politique générique Core de téléversement de fichiers.
> Il formalise les décisions métier du produit concernant les Dossiers, DRAFTS, versions VALIDATED et formats générés.

---

## 1. Frontière avec le Core

Le Core fournit des primitives génériques de fichiers : réception multipart bornée, quarantaine temporaire, inspection, antivirus, checksum, stockage durable optionnel, corbeille et purge.

Le produit GMS n'expose pas pour autant un « Drive » ni un espace de fichiers utilisateur par défaut.

Le présent contrat concerne :

```text
DRAFTS de Fiches techniques
versions VALIDATED / ARCHIVED
ressources métier supprimées
imports temporaires CSV / XLS / XLSX
exports temporaires CSV / XLS(X)
PDF généré temporairement
Dossiers DELETED
```

Réutiliser les primitives techniques File du Core pour un traitement temporaire n'active pas automatiquement une fonctionnalité commerciale de stockage durable.

Aucune règle produit ne doit modifier silencieusement le lifecycle générique des fichiers Core.

---

## 2. Persistance métier et stockage fichier

La persistance des données métier structurées et le stockage durable de fichiers sont deux notions distinctes.

```text
MongoDB / ressources métier structurées
→ persistance normale du produit
→ Produit, Fiche, version, Dossier, historique, etc.

fichiers temporaires techniques
→ import / export / génération PDF
→ durée limitée au traitement
→ suppression après usage
→ aucun quota de stockage utilisateur durable

fichiers durablement conservés
→ aucun besoin produit V1 démontré à ce stade
→ ne seront activés/commercialisés que si un cas d'usage réel l'exige

quotas métier de ressources structurées
→ distincts du stockage fichier
→ peuvent limiter le nombre de ressources persistantes selon le plan
→ moteur Plans / Metrics / EntitlementOverrides du Core
```

Les imports et exports temporaires peuvent être soumis à des garde-fous techniques — taille maximale, nombre de traitements concurrents, TTL des temporaires — sans devenir un quota commercial de stockage.

Il n'existe donc pas, pour M-002 ni pour les exports reproductibles, de « stockage invisible gratuit » concurrent d'un stockage payant : le temporaire est un coût d'exécution de la fonctionnalité, pas un espace de conservation mis à disposition du Workspace.

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

Cette rétention concerne les ressources métier supprimées ; elle n'implique pas l'existence d'un quota de fichiers stockés.

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

Un DRAFT actif est une ressource métier persistante et peut donc rester présent longtemps dans le Workspace.

Décision commerciale validée :

```text
nombre de DRAFTS
→ métrique / quota métier du produit
→ valeur configurable selon le plan
→ dérogation possible via les mécanismes Core
```

Cette limite porte sur le **nombre de brouillons métier**, pas sur des octets de stockage File.

Les clés techniques finales, les seuils Free/Premium et les règles précises de comptage seront fermés dans M-004.

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

Une Fiche technique validée est une ressource métier durable ayant une valeur commerciale.

Décision commerciale validée :

```text
nombre de Fiches techniques VALIDATED
→ métrique / quota métier distinct
→ valeur configurable selon le plan
→ dérogation possible via les mécanismes Core
```

Cette limite ne réutilise pas `storage_bytes`. Les clés techniques, seuils et règles de comptage — notamment le traitement éventuel des fiches ARCHIVED — seront fermés dans M-004.

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

- aucun quota de fichiers métier n'est requis par M-001 ;
- Dossier DELETED : pas de purge automatique ;
- aucun mécanisme File Core à dupliquer.

### Module Fiches techniques

À implémenter lors de son cadrage :

- métrique/quota métier de DRAFTS ;
- métrique/quota métier de Fiches techniques VALIDATED ;
- seuils commerciaux par plan et comportement à la limite ;
- règles de comptage exactes, notamment vis-à-vis des ARCHIVED ;
- intégration avec EntitlementOverrides ;
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

- le produit V1 n'expose pas un espace de stockage de fichiers de type Drive ;
- les temporaires d'import/export ne consomment pas un quota de stockage utilisateur durable ;
- les DRAFTS et Fiches techniques VALIDATED peuvent être limités par des quotas métier de comptage distincts de `storage_bytes` ;
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
