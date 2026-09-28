# SAAS-FICHES-TECHNIQUES-GMS — Stockage, corbeille métier et rétention

**Statut :** VALIDÉ — contrat transversal produit  
**Date :** 2026-09-28  
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

La corbeille des ressources métier M-004 est une responsabilité du produit et non une configuration globale du moteur de rétention Core.

Valeurs validées :

```text
durée par défaut : 30 jours
minimum           : 1 jour
maximum           : 90 jours
```

La durée est configurée par Workspace. Le Workspace Owner peut la modifier.

Le réglage exprime une **durée de conservation avant purge automatique**, pas la fréquence d'exécution d'un scheduler propre au Workspace.

Exemples :

```text
Workspace A = 3 jours
Workspace B = 30 jours
```

Lors d'une suppression :

```text
deletedAt
+ trashRetentionDays effectif au moment de la suppression
→ purgeScheduledAt
```

`purgeScheduledAt` est figé sur la ressource supprimée. Une modification ultérieure de `trashRetentionDays` ne modifie pas rétroactivement les échéances déjà enregistrées.

La purge automatique est exécutée par un job métier produit unique et idempotent qui sélectionne les ressources dont :

```text
status = DELETED
AND purgeScheduledAt <= maintenant
```

Il n'existe pas un job ou scheduler distinct par Workspace.

Le moteur de rétention Core reste inchangé et continue de gérer ses propres cibles génériques.

---

## 4. Fiches techniques, brouillon et quota métier

Une Fiche technique est une identité métier persistante. Son brouillon éventuel, son état validé courant et son historique ne constituent pas des ressources commerciales comptées séparément.

Décision M-004 validée :

```text
1 identité Fiche = 1 unité de capacité
```

Le comptage est indépendant :

- du statut ACTIVE / ARCHIVED / DELETED ;
- de l'existence d'un brouillon ;
- du nombre de validations ;
- du nombre de revalorisations ;
- du nombre d'états historiques.

```text
création = +1
copie = +1
modification = +0
revalorisation = +0
nouvelle validation = +0
archivage = +0
mise en corbeille = +0
restauration = +0
purge définitive = -1
```

Cette limite porte sur le **nombre de Fiches métier**, pas sur des octets de stockage File.

La limite effective est configurable selon le Plan et les mécanismes d'EntitlementOverride du Core. Le seuil commercial Free définitif reste à décider. Une valeur temporaire de développement telle que 10 Fiches peut être utilisée sans être codée en dur dans la logique métier.

Un brouillon actif n'est jamais supprimé ou purgé uniquement parce qu'il est ancien.

---

## 5. États validés et historique

Un état VALIDATED possède une valeur historique et économique immuable.

```text
VALIDATED
→ conservation historique dans l'identité Fiche
→ aucune purge individuelle
→ aucune purge automatique par simple ancienneté
```

L'archivage concerne l'identité Fiche entière et ne détruit pas ses états validés.

La suppression place également la Fiche entière en corbeille : brouillon éventuel, état courant, historique et snapshots restent restaurables ensemble pendant la rétention.

La purge définitive porte sur l'agrégat Fiche complet et libère alors seulement son unité de capacité.

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

## 7. Exports, impression et documents générés

Les sorties reproductibles de la V1 sont :

- CSV ;
- XLSX ;
- PDF ;
- impression ;
- envoi par e-mail.

Elles appartiennent au produit V1 mais sont développées dans un bloc séparé après validation fonctionnelle, tests et QA visuelle du bloc Fiche technique.

Leur cadrage détaillé déterminera notamment l'état de Fiche exportable, les templates, permissions, destinataires, noms de fichiers, mécanisme d'impression et audit.

Principe de stockage :

```text
donnée métier persistée
→ génération à la demande
→ téléchargement / impression / pièce jointe
→ destruction du temporaire après usage
```

Aucun historique de binaires d'export n'est conservé par défaut.

Un PDF peut être généré pour téléchargement direct, impression ou envoi e-mail. Il reste une représentation dérivée temporaire, pas une ressource métier persistante.

Une nouvelle tentative d'envoi ou un nouvel export régénère la représentation depuis la donnée source autorisée.

L'audit peut conserver l'identité de la Fiche / état, l'acteur, le destinataire éventuel, la date et le résultat sans conserver le binaire.

Les autres exports restent différés à V2.

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

Contrat M-004 validé :

- une métrique/quota métier compte les identités Fiche ;
- brouillon, validations et historique ne sont pas comptés séparément ;
- ACTIVE, ARCHIVED et DELETED comptent tant que la Fiche n'est pas purgée ;
- intégration avec les limites de Plan et EntitlementOverrides ;
- suppression de la Fiche entière vers la corbeille ;
- restauration avant échéance ;
- purge de l'agrégat complet après échéance ou action Owner explicitement autorisée ;
- conservation immuable des états VALIDATED tant que la Fiche existe ;
- bloc V1 séparé pour CSV, XLSX, PDF, impression et e-mail après stabilisation M-004.

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
- les Fiches techniques sont limitées par un quota métier en nombre d'identités Fiche, distinct de `storage_bytes` ;
- un DRAFT actif n'est jamais purgé par ancienneté seule ;
- une Fiche supprimée reste restaurable avec tout son agrégat jusqu'à sa purge ;
- une version VALIDATED n'est jamais purgée automatiquement par âge ;
- un Dossier DELETED n'est pas purgé automatiquement dans M-001 ;
- la durée standard de corbeille métier est 30 jours ;
- toute valeur Workspace reste comprise entre 1 et 90 jours ;
- l'échéance de purge est figée à la suppression ;
- CSV, XLSX et PDF sont des représentations temporaires ;
- impression et e-mail dérivent de la donnée métier autorisée sans créer de stockage durable par défaut ;
- les fichiers générés ne créent pas une seconde source de vérité.
