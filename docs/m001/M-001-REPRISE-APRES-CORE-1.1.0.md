# M-001 — Reprise après intégration Core 1.1.0

**Statut :** addendum de reprise actif  
**Date :** 2026-09-21  
**Produit :** `greg44500/saas-fiches-techniques-gms`

> Ce document ne remplace pas le cadrage métier global du produit.  
> Il remplace uniquement les formulations devenues obsolètes qui indiquent encore que le prérequis Core transactionnel de M-001 reste « à vérifier » ou « non résolu ».

---

## 1. État réel validé

Le produit a intégré Core `v1.1.0`.

```text
Core repository : greg44500/saas-core-api
version         : 1.1.0
tag             : v1.1.0
commit          : 8326fb48856dcef151b5ab01495c934951050d6d
```

`core-origin.json` sur le produit porte cette provenance.

Vrai merge Git Core → produit :

```text
merge           : 8450fd984253a4ae29e03eff392767a51da65b7a
parent produit  : a38d64dd0231fc16616f00f157240f572c50ea67
parent Core     : 8326fb48856dcef151b5ab01495c934951050d6d
```

PR d’upgrade produit :

```text
PR #7 — Core update: integrate v1.1.0
merge main : dfeecc272a3c967b80f4c2c57be06e83e0799fe8
```

Validation distante :

```text
Core Gate #40 — PR #7
run : 35587288783
result : success

Core Gate #41 — post-merge
run : 35587924433
attempt : 2
result : success
```

La première tentative de la Gate #41 a échoué sur un seul test frontend Base UI/Testing Library. Le rerun du même commit est vert. Aucun changement de contenu n’a été introduit entre la PR et le merge : l’arbre Git était identique.

Validation locale avant provenance et merge :

- lint backend/tooling : OK ;
- tests backend : OK ;
- lint frontend : OK ;
- tests frontend : OK ;
- build frontend : OK ;
- Playwright E2E : OK.

Le garde-fou MongoDB a correctement empêché une exécution de tests sur une base ne portant pas le suffixe `_test`.

---

## 2. Prérequis Core M-001 désormais résolu

Core 1.1.0 fournit un point d’extension transactionnel générique pour le lifecycle `WorkspaceMember`.

Composition root :

```text
backend/config/applicationWorkspaceMemberLifecycle.registry.js
```

Événement disponible :

```text
onMemberRemoved
```

Contexte transmis au handler applicatif :

```js
{
  workspaceId,
  membershipId,
  userId,
  actorId,
  session,
  ipAddress,
  userAgent,
}
```

Garanties utiles au produit :

- le handler s’exécute dans la même transaction MongoDB que le passage du membership à `REMOVED` ;
- la session MongoDB active est fournie au handler ;
- les handlers sont exécutés de façon déterministe et séquentielle ;
- une erreur du handler est propagée et provoque le rollback global ;
- le retrait administratif d’un membre et la fermeture du compte utilisateur passent par ce lifecycle ;
- `SUSPENDED` ne déclenche pas `onMemberRemoved` ;
- une future réinvitation/réactivation d’un ancien membership `REMOVED` ne restaure aucune relation métier ;
- aucun effet externe irréversible ne doit être exécuté directement dans cette transaction.

Le Core reste générique et ne connaît ni `Dossier` ni `DossierAccessGrant`.

---

## 3. Frontière Core / Produit

La responsabilité est désormais claire.

### Core

Le Core fournit :

```text
WorkspaceMember lifecycle
+ transaction MongoDB
+ session partagée
+ rollback fail-closed
+ composition applicative
```

### Produit GMS

Le produit devra implémenter :

```text
Dossier
DossierAccessGrant
permissions métier
API métier
audit métier
UI métier
tests métier
handler produit onMemberRemoved
```

Aucun modèle `Dossier` ou `DossierAccessGrant` ne doit être ajouté dans `saas-core-api`.

---

## 4. Invariants M-001 déjà validés

Ces décisions ne doivent pas être rouvertes sans contradiction démontrée par le code, un contrat Core plus récent ou une règle métier nouvellement validée.

### Organisation

```text
Workspace
→ plusieurs Dossiers
→ 1 Dossier = 1 magasin
```

Seul le nom du Dossier est obligatoire à la création.

Localisation, adresse, enseigne, e-mail, téléphone et responsable/interlocuteur sont facultatifs selon le cadrage courant.

L’autocomplétion d’adresse fait partie de l’UX M-001 mais doit rester facultative et ne jamais bloquer la création.

### Autorisation

Le rôle et le périmètre magasin sont séparés :

```text
Role
→ QUOI le membre peut faire

DossierAccessGrant
→ OÙ il peut le faire
```

Autorisation effective d’un non-owner :

```text
WorkspaceMember ACTIVE
+ permission du Role
+ DossierAccessGrant ACTIVE
+ état Dossier compatible
+ éventuelle capability
+ invariants métier
```

Le contexte magasin choisi dans le frontend est une aide UX, jamais une autorité de sécurité.

### Invitation

L’invitation reste Core :

```text
email + roleId
→ acceptation
→ WorkspaceMember
```

Aucun Dossier n’est préparé dans l’invitation.

Après acceptation, le Workspace Owner affecte explicitement zéro, un ou plusieurs Dossiers.

Un membre ACTIVE peut donc temporairement avoir zéro Dossier.

### Owner

Le Workspace Owner :

- possède implicitement tous les Dossiers de son Workspace ;
- ne nécessite aucun `DossierAccessGrant` individuel ;
- reste soumis aux invariants métier.

Un PlatformRole ne donne aucun accès implicite aux données métier d’un Workspace.

### Lifecycle des grants

```text
WorkspaceMember SUSPENDED
→ DossierAccessGrant conservés
→ accès effectif refusé car membership non ACTIVE

WorkspaceMember REMOVED
→ DossierAccessGrant ACTIVE doivent devenir REVOKED
→ même transaction MongoDB via onMemberRemoved

REMOVED puis réinvité
→ membership peut redevenir ACTIVE
→ anciens grants restent REVOKED
→ nouvelle affectation uniquement par décision explicite de l’Owner
```

Le futur handler produit devra utiliser la `session` fournie par Core pour toutes les écritures de révocation.

---

## 5. Isolation stricte des contextes magasin

M-001 pose la frontière de sécurité utilisée par les modules suivants.

Un magasin A ne doit jamais pouvoir voir ou utiliser les données commerciales propres au magasin B.

En particulier, pour les futurs prix :

```text
prix négocié magasin A
≠
prix négocié magasin B
```

L’absence de prix local ne doit jamais provoquer un fallback vers le prix d’un autre magasin.

Une future copie de Fiche technique entre magasins pourra copier la composition, mais devra recalculer toute la valorisation dans le contexte du magasin cible et repartir avec un historique économique propre.

---

## 6. Ce qu’il reste à fermer dans le cadrage M-001

Avant toute première écriture de modèle métier, le projet GMS doit encore valider les points suivants.

1. clés de permissions métier exactes ;
2. matrice précise Owner / rôles métier / actions ;
3. API REST M-001 et conventions d’URL ;
4. ordre des middlewares sécurité / membership / permission / DossierAccessGrant ;
5. validations Zod d’entrée ;
6. contrats d’erreur ;
7. stratégie d’audit métier ;
8. matrice exacte des transitions `ACTIVE / PAUSED / ARCHIVED / DELETED` ;
9. règles de restauration et de suppression logique ;
10. contrat du drawer Dossier et de l’ouverture explicite du contexte magasin ;
11. gestion des affectations Dossier ;
12. source technique d’autocomplétion d’adresse avec fallback manuel ;
13. migrations/seeds uniquement si un besoin réel est démontré ;
14. stratégie de tests unitaires, intégration, tenancy, permissions et E2E ;
15. critères d’acceptation M-001 ;
16. ordre d’implémentation du premier lot métier.

---

## 7. Ordre recommandé après validation du cadrage

Une fois M-001 validé, privilégier une vertical slice cohérente plutôt qu’une succession de micro-PR techniques.

Ordre recommandé :

```text
1. constantes / permissions métier
2. modèles Dossier + DossierAccessGrant
3. validations Zod
4. services métier
5. handler onMemberRemoved composé dans le registry Core
6. controllers + routes
7. tests backend intégration / tenancy / permissions / transaction rollback
8. RTK Query
9. composants métier réutilisables
10. liste / drawer / affectations / contexte magasin
11. tests frontend
12. E2E critiques
13. documentation
14. PR fonctionnelle cohérente
```

Le backend reste l’autorité de sécurité et de validation.

---

## 8. Tests obligatoires à prévoir pour le lifecycle

Le futur lot M-001 devra notamment couvrir :

1. membership ACTIVE + grants ACTIVE → retrait → membership REMOVED + grants REVOKED ;
2. échec du handler de révocation → rollback du retrait Core et des changements métier ;
3. membership SUSPENDED → grants conservés ACTIVE mais accès effectif refusé ;
4. REMOVED puis réinvité → anciens grants restent REVOKED ;
5. nouvelle affectation explicite par l’Owner → création/réactivation contrôlée d’un nouveau périmètre ;
6. fermeture du compte utilisateur → même révocation transactionnelle des grants ;
7. tentative d’accès à un Dossier d’un autre Workspace ou sans grant → refus ;
8. Owner → accès implicite aux Dossiers sans grant individuel.

---

## 9. Points différés non bloquants pour M-001

Restent hors du cadrage immédiat :

- marge semi-nette ;
- Fiches process ;
- OCR / IA ;
- imports avancés ;
- optimiseur détaillé ;
- purge physique ;
- historique administratif complet des invitations Core ;
- modules Produits / Fournisseurs / Tarifs / Fiches techniques.

Ils ne doivent pas retarder M-001.

---

## 10. Amorce de conversation pour le projet SAAS-FICHES-TECHNIQUES-GMS

Utiliser cette amorce dans le projet consacré au produit métier :

> Nous reprenons le développement de `greg44500/saas-fiches-techniques-gms`.
>
> Travaille impérativement à partir de l’état réel de GitHub. Le code, Git, les tests et les contrats réellement validés priment sur les synthèses.
>
> Core `v1.1.0` est désormais intégré et validé dans le produit :
>
> ```text
> tag Core      : v1.1.0
> commit Core   : 8326fb48856dcef151b5ab01495c934951050d6d
> main produit  : dfeecc272a3c967b80f4c2c57be06e83e0799fe8
> Core Gate #40 : success
> Core Gate #41 : success — attempt 2
> ```
>
> Le prérequis générique M-001 est donc résolu : Core expose `onMemberRemoved` via `backend/config/applicationWorkspaceMemberLifecycle.registry.js` et transmet la session MongoDB active de la transaction de retrait du `WorkspaceMember`.
>
> Frontière impérative :
>
> ```text
> saas-core-api
> → mécanisme générique uniquement
>
> saas-fiches-techniques-gms
> → Dossier
> → DossierAccessGrant
> → permissions métier
> → API métier
> → audit métier
> → UI
> → tests métier
> ```
>
> Aucun code `Dossier` / `DossierAccessGrant` ne doit être ajouté au Core.
>
> Décisions M-001 déjà validées :
>
> - 1 Dossier = 1 magasin ;
> - seul le nom est obligatoire à la création ;
> - autocomplétion adresse facultative et non bloquante ;
> - Role = « quoi ? », DossierAccessGrant = « où ? » ;
> - invitation Core = email + roleId, aucun magasin dans l’invitation ;
> - affectations seulement après acceptation ;
> - un membre ACTIVE peut avoir zéro Dossier ;
> - Owner implicitement sur tous les Dossiers, sans grant individuel ;
> - SUSPENDED conserve les grants mais ils sont inopérants ;
> - REMOVED doit révoquer les grants ACTIVE dans la transaction Core via `onMemberRemoved` ;
> - une réinvitation ne restaure jamais les anciens grants ;
> - contexte magasin frontend = UX uniquement, jamais sécurité ;
> - isolation stricte entre magasins.
>
> Le cadrage global produit est validé. M-001 reste EN COURS de cadrage détaillé.
>
> Reprendre maintenant, sans rouvrir les décisions déjà fermées, dans cet ordre :
>
> 1. permissions métier exactes ;
> 2. matrice d’autorisation ;
> 3. API REST et ordre des middlewares ;
> 4. validations Zod ;
> 5. audit et contrats d’erreur ;
> 6. transitions ACTIVE / PAUSED / ARCHIVED / DELETED ;
> 7. drawer Dossier, liste, affectations et activation du contexte magasin ;
> 8. contrat technique d’autocomplétion d’adresse ;
> 9. migrations/seeds éventuels ;
> 10. stratégie de tests ;
> 11. critères d’acceptation ;
> 12. validation finale M-001 ;
> 13. seulement ensuite commencer les premières écritures de code métier.
>
> Pendant l’implémentation, privilégier des composants réutilisables, RTK Query pour le server state, Redux uniquement pour un état global réellement nécessaire, et des PR par lots fonctionnels cohérents.
>
> Commence par vérifier l’état réel de `main`, lire le présent document et les contrats produit M-001, puis propose la prochaine décision de cadrage à fermer. Ne développe rien tant que cette décision n’est pas validée.

---

## 11. Règle de reprise

À la reprise du projet GMS :

```text
Git réel
→ code réel
→ tests réellement validés
→ contrats produit
→ présent addendum
→ synthèses historiques
```

Les anciennes mentions « Core v1.0.1 ne permet pas encore… » ou « vérifier si le Core a évolué… » sont désormais obsolètes pour M-001.
