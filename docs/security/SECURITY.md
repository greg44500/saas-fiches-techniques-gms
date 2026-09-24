# SAAS-CORE-API — Sécurité du Core

**Statut :** référence canonique de sécurité du Core  
**Dernière mise à jour :** 2026-09-24  
**Périmètre :** backend, frontend, frontières Workspace / Platform et futurs SaaS dérivés

## 1. Objet

Ce document décrit l'architecture de sécurité réellement portée par le code courant de `saas-core-api`.

Il ne remplace pas les contrats fonctionnels de `docs/contracts/`, ni les règles d'architecture de `docs/architecture/`. Il explique comment les différentes protections se combinent et où se situe l'autorité de sécurité.

Principe directeur : **aucune protection isolée n'est considérée comme suffisante**.

Une route sensible doit cumuler les barrières adaptées à son risque :

```text
authentification
→ validation stricte
→ contexte tenant
→ permission
→ mode d'accès Workspace
→ entitlement / feature
→ quota
→ règles métier du service
→ contraintes MongoDB / Mongoose
→ transaction / atomicité lorsque nécessaire
→ audit
```

Toutes ces étapes ne sont pas requises sur toutes les routes, mais une route ne doit jamais supprimer une barrière nécessaire au seul motif qu'une autre existe déjà.

---

## 2. Autorité de sécurité

La sécurité est appliquée côté backend.

Le frontend peut :

- masquer une action non pertinente ;
- désactiver un bouton ;
- protéger une route d'interface ;
- afficher un état de remédiation ;
- adapter la navigation selon les permissions ou entitlements connus.

Mais ces comportements sont uniquement des protections UX.

Invariant :

```text
frontend guard
≠
autorisation de sécurité
```

L'autorité finale reste le backend et, pour les données persistées, les contraintes de la base de données.

---

## 3. Authentification utilisateur

### 3.1 Séparation User / AuthIdentity

Le document `User` représente le compte fonctionnel. Les credentials ne sont pas stockés directement sur ce modèle.

Les identités d'authentification sont portées par `AuthIdentity`.

Pour une identité locale :

- `passwordHash` est requis ;
- il est `select: false` ;
- il n'est récupéré explicitement que par les workflows qui doivent vérifier ou modifier le mot de passe.

Cette séparation permet de garder la donnée d'identité fonctionnelle distincte des secrets d'authentification et prépare l'ajout éventuel de providers supplémentaires sans déformer `User`.

### 3.2 Hashage des mots de passe

Le Core utilise Argon2id via `node:crypto`.

Les paramètres V1 sont centralisés dans `backend/utils/password.js` et la représentation persistée contient une version interne, l'algorithme, les paramètres, un salt aléatoire et la clé dérivée.

Le mot de passe brut n'est jamais persisté.

La vérification :

- refuse une version ou un algorithme inconnu ;
- refuse des paramètres différents de la politique explicitement supportée ;
- utilise `timingSafeEqual` pour comparer la clé dérivée au hash attendu.

Le format versionné permet de faire évoluer ultérieurement la politique de hashage sans interpréter silencieusement d'anciens formats avec de nouvelles règles.

### 3.3 Login et anti-énumération

Une erreur d'email inconnu, d'identité locale absente ou de mot de passe incorrect utilise le même message public d'identifiants invalides.

L'AuditLog peut conserver une raison technique structurée, mais ne doit pas y enregistrer :

- le mot de passe ;
- le refresh token ;
- un hash de credential ;
- l'email brut fourni lors d'une tentative échouée.

Le compte réellement ciblé peut être référencé comme ressource lorsqu'il est connu, mais l'acteur d'une tentative de login échouée reste inconnu.

Un compte `disabled`, `deletion_requested` ou `closed` ne doit pas obtenir une nouvelle authentification utilisable.

### 3.4 Access token

L'access token est transmis au frontend et reste en mémoire côté client.

`authenticate` :

1. vérifie la présence du Bearer token ;
2. vérifie sa signature et sa validité ;
3. recharge le `User` depuis MongoDB ;
4. refuse un compte `disabled`, `deletion_requested` ou `closed` ;
5. compare `passwordChangedAt` du token à la valeur actuelle du User.

Le JWT n'est donc jamais l'autorité unique sur l'état actuel du compte.

Un ancien access token devient invalide après changement de mot de passe même s'il n'a pas encore atteint son expiration cryptographique.

### 3.5 Refresh token et cookie

Le refresh token brut :

- n'est jamais retourné dans le JSON ;
- est placé dans un cookie `HttpOnly` ;
- utilise `secure: true` en production ;
- utilise actuellement `SameSite=Lax` ;
- est limité au chemin `/api/auth` ;
- possède une durée cohérente avec l'AuthSession serveur.

Si l'architecture de déploiement devient réellement cross-site, la stratégie `SameSite`/CORS/CSRF devra être réévaluée explicitement.

---

## 4. AuthSession, rotation et compromission

### 4.1 Aucun refresh token brut en base

`AuthSession` persiste uniquement `refreshTokenHash`.

Le refresh token brut existe uniquement pendant le transport nécessaire au navigateur.

### 4.2 Token à usage unique

Chaque génération de refresh token est conçue pour une utilisation réussie unique.

Une rotation :

```text
R1 / Session 1
↓ refresh réussi
R2 / Session 2
```

La première session est marquée comme utilisée et révoquée pour `token_rotated`, puis référence sa session de remplacement.

### 4.3 Famille de sessions

Toutes les générations issues d'une même connexion partagent un `familyId`.

Cette famille permet de réagir à la réutilisation d'un ancien refresh token déjà roté.

### 4.4 Détection de réutilisation

Si un refresh token déjà consommé lors d'une rotation réapparaît :

- toute la famille est marquée compromise ;
- les générations encore actives sont révoquées ;
- aucune nouvelle génération n'est émise ;
- l'événement est audité.

La compromission est commitée avant que la requête soit refusée afin qu'une exception HTTP ne rollbacke pas la mesure de sécurité.

### 4.5 Concurrence

La consommation d'une AuthSession active utilise un `findOneAndUpdate` conditionnel dans une transaction.

Le filtre exige que la génération soit encore :

- non révoquée ;
- non utilisée ;
- non remplacée ;
- non compromise ;
- non expirée.

Deux refresh concurrents ne peuvent donc pas légitimement consommer la même génération.

### 4.6 Révocation globale

Le Core peut révoquer toutes les sessions encore actives d'un User, notamment pour :

- logout-all ;
- changement de mot de passe ;
- reset de mot de passe ;
- désactivation administrative ;
- fermeture volontaire du compte ;
- autres workflows de sécurité prévus par le domaine.

### 4.7 Fermeture du compte et réauthentification

Le parcours self-service de fermeture combine plusieurs protections :

```text
GET /api/users/me/closure-impact
→ lecture seule des conséquences courantes

POST /api/users/me/closure
→ authentification
→ Zod strict
→ mot de passe courant
→ email de confirmation
→ confirmAccountClosure = true
→ recalcul MongoDB des ownership/memberships
→ transaction de fermeture
→ révocation AuthSessions
→ AuditLog
```

Le frontend n'envoie jamais une liste de Workspaces à fermer comme autorité. Le backend recalcule l'état réel au moment de la mutation.

Le User passe nominalement :

```text
ACTIVE
→ DELETION_REQUESTED
→ CLOSED
```

`DELETION_REQUESTED` et `CLOSED` sont refusés par login, `authenticate`, refresh et reset-password. `forgot-password` garde une réponse publique neutre mais ne doit pas fournir de mécanisme de récupération utilisable pour réactiver ces comptes.

Le statut `DISABLED` reste distinct : il représente une suspension administrative réversible et ne déclenche pas automatiquement la fermeture des Workspaces.

---

## 5. Validation des entrées

Les données provenant d'une requête ne doivent pas être utilisées directement par les couches métier lorsqu'un schéma de validation existe.

Le middleware `validateRequest` valide séparément :

```text
body
params
query
```

Les sorties Zod validées sont placées dans :

```text
req.validated
```

Les routes et controllers doivent privilégier cette sortie validée plutôt que les données brutes reçues du client.

Les schémas sensibles utilisent des objets stricts lorsque le contrat l'exige afin de refuser les propriétés supplémentaires plutôt que de les ignorer silencieusement.

La validation frontend améliore l'expérience utilisateur mais ne remplace jamais la validation backend.

---

## 6. Protection MongoDB

### 6.1 `sanitizeFilter`

Mongoose est configuré globalement avec :

```text
sanitizeFilter = true
```

Cette protection réduit les risques liés à l'injection d'opérateurs MongoDB dans les filtres contenant des données non fiables.

Lorsqu'un opérateur MongoDB est construit volontairement par le backend à partir de données déjà validées, le code peut utiliser explicitement `mongoose.trusted()`.

Cette exception doit rester locale, justifiée et construite exclusivement à partir de données contrôlées.

### 6.2 Modèles et indexes

Zod protège l'entrée HTTP, mais les modèles et indexes MongoDB restent une seconde barrière.

Ils portent notamment :

- champs requis ;
- enums ;
- immutabilité ;
- contraintes de longueur ;
- indexes uniques ;
- indexes partiels ;
- invariants documentaires ;
- TTL lorsque pertinent.

Une règle critique de cohérence ne doit pas dépendre uniquement du frontend ou d'une validation HTTP.

### 6.3 Production

En production, `autoIndex` est désactivé.

Les indexes de production doivent être gérés explicitement par les migrations afin d'éviter qu'une instance HTTP modifie la structure des indexes au démarrage.

---

## 7. Frontière multi-tenant Workspace

### 7.1 Workspace comme frontière

Les routes tenant sont structurées autour de :

```text
/api/workspaces/:workspaceId/*
```

L'identifiant Workspace doit être validé avant construction du contexte tenant.

### 7.2 Construction du contexte

`loadWorkspaceContext` est exécuté après `authenticate` et vérifie successivement :

1. existence du Workspace ;
2. statut `active` du Workspace ;
3. membership `active` du User dans ce Workspace ;
4. existence du Role référencé ;
5. appartenance du Role au même Workspace.

Il construit ensuite uniquement un contexte fiable :

```text
req.workspace
req.membership
req.role
req.permissions
```

Un User authentifié globalement n'acquiert aucun accès automatique à un Workspace.

### 7.3 Isolation du Role

La chaîne tenant est :

```text
User
→ WorkspaceMember
→ Role du même Workspace
→ permissions
```

Une référence à un Role d'un autre Workspace ne doit jamais produire une autorisation.

### 7.4 Archivage et fermeture Workspace

Les états `ARCHIVED` et `CLOSED` ont des significations distinctes.

```text
ARCHIVED
→ retrait volontaire / opérationnel
→ plus d'accès courant
→ données et historique non purgés immédiatement

CLOSED
→ fermeture fonctionnelle terminale
→ aucune réactivation normale
```

L'owner peut appeler :

```text
POST /api/workspaces/:workspaceId/archive
```

La route exige l'authentification, une validation Zod stricte, le contexte Workspace, un contrôle owner-only dédié, le mode d'accès autorisé pour cette action, le mot de passe courant et la confirmation exacte du nom.

Le backend neutralise uniquement les Subscriptions commerciales concernées lors de l'archivage owner, conserve la baseline, révoque les invitations pendantes et audite la transition.

La fermeture `CLOSED` reste réservée au workflow Platform :

```text
PATCH /api/platform/workspaces/:workspaceId/close
```

Un owner ne peut pas utiliser l'archivage pour obtenir directement un `CLOSED`.

---

## 8. RBAC Workspace

`authorizePermission` n'interprète pas le nom du rôle.

Il ne vérifie que les permissions déjà construites dans le contexte Workspace.

Invariant :

```text
rôle visible
≠
autorisation

permission effective
=
source de décision RBAC
```

Si `req.permissions` n'est pas disponible, le middleware refuse l'accès par défaut.

Les règles d'anti-escalade de délégation de rôles et les permissions réservées à la gouvernance restent définies dans le contrat Core et dans les services dédiés.

Le frontend peut utiliser les mêmes permissions pour adapter l'UX, mais le contrôle backend reste obligatoire.

Les commandes owner-only qui engagent le cycle de vie ou le contrat commercial ne doivent pas être rendues délégables par l'invention d'une permission personnalisée côté frontend.

---

## 9. Administration Platform

Le contexte Platform est volontairement séparé du contexte Workspace.

Un `super_admin` qui administre la plateforme ne contourne pas `loadWorkspaceContext` pour se faire passer artificiellement pour un membre d'un tenant.

Les routes `/api/platform/*` utilisent la politique Platform dédiée.

Les permissions Platform sont dérivées du `platformRole` du User **rechargé depuis MongoDB par `authenticate`**.

Le rôle inscrit dans un ancien token ne constitue donc pas une autorité persistante.

La politique Core V1 accorde actuellement l'ensemble des permissions Platform au `super_admin`; l'architecture permet néanmoins de faire évoluer la matrice de permissions sans modifier toutes les routes consommatrices.

La fermeture terminale d'un Workspace est une opération Platform distincte de son archivage owner.

---

## 10. Permission, entitlement et quota sont trois choses différentes

Ces notions ne doivent jamais être fusionnées.

### Permission

Répond à :

> Cet utilisateur peut-il effectuer cette action dans ce Workspace ?

Exemple : `file:upload`.

### Feature / entitlement

Répond à :

> Ce Workspace possède-t-il commercialement cette fonctionnalité ?

Exemple : `file_upload`.

### Quota

Répond à :

> Quelle quantité de cette ressource le Workspace peut-il encore consommer ?

Exemple : `storage_bytes`.

Ainsi :

```text
permission accordée
+
feature absente
=
action refusée
```

et :

```text
permission accordée
+
feature accordée
+
quota saturé
=
action refusée
```

---

## 11. Mode d'accès Workspace

`enforceWorkspaceAccessMode` applique la décision commerciale globale du Workspace.

Par défaut, une action métier normale est interdite pendant un mode de remédiation.

Une route corrective doit déclarer explicitement qu'elle est autorisée pendant la remédiation.

Exemples de corrections possibles selon le domaine :

- suppression d'un fichier pour libérer du stockage ;
- suppression d'un membre pour revenir sous une limite ;
- archivage volontaire d'un Workspace par son owner lorsque le service le permet explicitement.

Cette possibilité ne supprime ni le contrôle de permission ni le contrôle de feature lorsqu'ils restent applicables.

---

## 12. Entitlements effectifs

`enforcePlanFeature` résout l'entitlement effectif du Workspace.

Le contrôle ne porte donc pas seulement sur le Plan catalogue : les `EntitlementOverride` actifs peuvent activer ou retirer une feature.

Le résultat placé dans la requête peut être réutilisé pour éviter des lectures redondantes, mais **ce cache de requête n'est jamais considéré comme un verrou métier**.

Une écriture sensible doit relire l'autorité dans sa transaction si un changement concurrent de Subscription ou d'override pourrait modifier la décision.

---

## 13. Quotas et concurrence

Les `UsageMetric` représentent les consommations/capacités mesurées du Workspace.

Pour les quotas bornés, `reserveUsageMetricWithinLimit` combine :

- une condition sur la valeur actuelle ;
- un `$inc` ;
- une même opération MongoDB atomique.

Exemple : limite 10, réservation 3.

La réservation n'est possible que si la valeur actuelle est `<= 7`.

Deux requêtes concurrentes ne peuvent donc pas réserver simultanément la même capacité restante.

`null` représente une limite illimitée.

Les métriques temporelles utilisent des périodes calculées par le registre de capabilities, avec des bornes mensuelles UTC pour éviter une dépendance au fuseau horaire du serveur.

---

## 14. Sécurité du pipeline File

Le pipeline File constitue un exemple complet de défense en profondeur.

### 14.1 Avant réception du contenu

La route d'upload vérifie avant Multer :

```text
authenticate
→ validation workspaceId
→ loadWorkspaceContext
→ permission FILE_UPLOAD
→ mode d'accès Workspace
→ feature file_upload
```

Un Workspace ou un utilisateur non autorisé ne doit donc pas pouvoir provoquer inutilement l'écriture d'un fichier temporaire.

### 14.2 Limites multipart

Multer applique des limites dédiées.

Les erreurs sont traduites en erreurs HTTP contrôlées, notamment :

- fichier trop volumineux ;
- nombre de fichiers dépassé ;
- champ inattendu ;
- limites multipart dépassées.

Les rejets pertinents sont audités sans enregistrer le contenu du fichier.

### 14.3 Quarantaine et inspection

Un fichier temporaire n'est pas considéré comme sain.

Le pipeline d'inspection exécute séquentiellement :

1. détection du type réel ;
2. calcul SHA-256 ;
3. analyse antivirus.

Le type réel est déterminé depuis la signature binaire du fichier.

Le MIME déclaré par le navigateur n'est jamais une preuve.

Le Core vérifie la cohérence entre :

```text
signature binaire
MIME déclaré
extension du nom d'origine
liste blanche des formats
```

### 14.4 Antivirus fermé par défaut

Seul un verdict :

```text
CLEAN
```

autorise la poursuite du traitement.

Un statut infecté, erreur, pending ou inconnu bloque le fichier.

Le fichier temporaire est supprimé après un échec d'inspection. Si le traitement et le nettoyage échouent tous les deux, les deux erreurs sont conservées dans un `AggregateError` afin de ne pas masquer une potentielle ressource temporaire résiduelle.

### 14.5 Stockage physique

Le nom original n'est pas utilisé comme clé physique de stockage.

La clé définitive utilise un identifiant généré par le backend et un segment Workspace construit uniquement depuis un ObjectId canonique.

Une valeur utilisateur ne peut donc pas injecter un séparateur de chemin ou une traversée de répertoire dans la clé physique.

### 14.6 Revalidation avant persistance

Après inspection, l'orchestrateur revalide encore le résultat avant de déplacer le contenu hors quarantaine.

Il contrôle notamment :

- chemin attendu ;
- taille ;
- type autorisé ;
- checksum SHA-256 ;
- verdict antivirus `CLEAN` ;
- provider et date de scan.

### 14.7 Transaction quotas + File + AuditLog

Avant la création du document `File`, le service de persistance relit l'entitlement dans une transaction MongoDB.

Cette relecture protège contre un changement concurrent de Plan ou d'override survenu entre la première vérification HTTP et la persistance finale.

Dans la même transaction :

```text
feature file_upload revalidée
→ quota file_uploads_monthly réservé
→ quota storage_bytes réservé
→ document File créé
→ AuditLog FILE_UPLOADED créé
```

Un échec annule ces écritures ensemble.

Le stockage physique ne partageant pas la transaction MongoDB, une compensation supprime le contenu déjà stocké lorsqu'une persistance MongoDB échoue.

---

## 15. AuditLog

`AuditLog` est un journal fonctionnel et de sécurité.

Il ne doit pas être confondu avec une plateforme d'observabilité technique.

Les opérations critiques doivent choisir explicitement l'une des deux stratégies suivantes.

### 15.1 Audit transactionnel

Lorsque l'audit fait partie de l'invariant métier, il est écrit dans la même transaction que les données principales.

Exemples : upload File réussi, fermeture Account et transitions Workspace lorsqu'elles font partie de leur transaction métier.

### 15.2 Sécurité prioritaire sur l'audit

Certaines décisions de sécurité ne doivent jamais être annulées parce que l'AuditLog est temporairement indisponible.

Exemples :

- révocation d'une AuthSession déjà persistée ;
- compromission d'une famille de refresh tokens ;
- rejet d'un fichier dangereux.

Dans ces cas, l'action de sécurité reste effective et l'échec de journalisation est signalé de manière minimale côté serveur.

### 15.3 Données sensibles

Les AuditLogs et fallbacks techniques ne doivent pas contenir :

- mots de passe ;
- access tokens ;
- refresh tokens ;
- reset tokens ;
- hash de credentials ;
- contenu de fichier ;
- secrets d'environnement.

Les métadonnées doivent rester minimales et structurées.

---

## 16. Gestion des erreurs et logs

En production :

- une erreur opérationnelle peut retourner son message contrôlé ;
- une erreur inattendue retourne un message HTTP générique ;
- le logger global ne sérialise pas aveuglément l'objet Error ;
- seules certaines propriétés explicitement choisies sont journalisées ;
- la stack n'est exposée que dans l'environnement de développement.

Le `requestId` peut être associé aux erreurs techniques pour faciliter la corrélation sans exposer de données sensibles.

La future observabilité technique reste suivie dans `DEBT.md` et ne doit pas être simulée avec `AuditLog`.

---

## 17. Protections HTTP

L'application Express utilise plusieurs protections globales.

### Helmet

Helmet applique les en-têtes de sécurité.

En production :

- HSTS est actif ;
- les requêtes non sécurisées sont concernées par la politique d'upgrade de la CSP.

### CORS

Le CORS accepte actuellement :

- l'origine configurée par `CLIENT_URL` ;
- les requêtes sans Origin utiles aux clients non navigateur ;
- les credentials nécessaires au refresh cookie.

Une nouvelle origine ne doit pas être ajoutée sans décision explicite.

### Rate limiting

L'API possède une limite globale et plusieurs endpoints sensibles possèdent des limiteurs dédiés.

Le runtime réel conserve toujours ces protections. Les seuils ne sont pas relâchés pour le développement, la production ou les tests Vitest ordinaires.

Les parcours Playwright E2E disposent d'un bypass explicite uniquement pour empêcher qu'une suite fonctionnelle riche consomme artificiellement les quotas anti-abus depuis une même IP locale. Le mécanisme reste fermé par défaut :

```text
E2E_BYPASS_RATE_LIMITS=false
```

Une activation à `true` est refusée par la validation d'environnement sauf si les deux gardes sont simultanément vraies :

```text
NODE_ENV=test
MONGODB_URI → base se terminant par _e2e_test
```

Même dans ce contexte, les middlewares `express-rate-limit` restent montés. Un predicate `skip` partagé les bypass uniquement lorsque le flag validé est actif. Les factories restent injectables afin que les tests backend dédiés puissent continuer à exercer les vrais compteurs avec des seuils faibles.

`forgot-password` conserve notamment ses protections supplémentaires :

- limite par IP ;
- limite par adresse email canonique ;
- email hashé pour construire la clé interne du limiter ;
- comportement indépendant de l'existence réelle du compte.

Cette séparation évite qu'un endpoint particulièrement coûteux ou exploitable repose uniquement sur le rate limit général.

### Réduction d'information

Express désactive `x-powered-by`.

---

## 18. Configuration et secrets

Les variables d'environnement sont validées au démarrage avec Zod.

Le serveur refuse de démarrer si la configuration requise est invalide.

En production, la validation ajoute notamment :

- interdiction de plusieurs placeholders connus sur les secrets sensibles ;
- `CLIENT_URL` obligatoirement en HTTPS ;
- interdiction d'activer les outils de reset destructifs réservés au développement.

Les valeurs sensibles restent dans l'environnement et ne doivent jamais être intégrées au bundle frontend ou versionnées dans le dépôt.

Les valeurs actuelles telles que durée de l'access token, durée du refresh token ou timeout antivirus sont des paramètres de configuration ; elles ne doivent pas être recopiées comme constantes métier dans plusieurs modules.

---

## 19. Sécurité frontend

Le frontend applique les conventions suivantes.

### Access token

L'access token reste en mémoire via l'état Auth.

Il n'est pas persisté par défaut dans `localStorage` ou `sessionStorage`.

### Refresh token

Le refresh token reste inaccessible à JavaScript grâce au cookie HttpOnly.

### RTK Query

Toutes les requêtes serveur passent par la couche API centralisée.

Le `baseQueryWithReauth` :

- ajoute l'access token courant ;
- intercepte un 401 récupérable ;
- utilise un mutex pour empêcher plusieurs refresh simultanés ;
- rejoue la requête une seule fois ;
- évite les boucles de refresh ;
- termine la session si le refresh ne fournit plus de credential valide.

### Fin de session

Une fin de session vide le cache RTK Query.

Cette règle est importante dans une application multi-tenant : un utilisateur connecté ensuite dans le même onglet ne doit pas voir brièvement des données du compte précédent provenant du cache.

Après fermeture Account réussie, le frontend déclenche également la fin de session locale et la purge du cache tenant.

### Guards

Les guards Auth, Workspace et Platform améliorent la navigation mais ne remplacent jamais les contrôles backend.

La visibilité owner-only de l'archivage Workspace est une règle UX ; la route backend revérifie toujours l'ownership.

### Données sensibles

Le frontend ne doit jamais :

- embarquer un secret serveur ;
- stocker un refresh token dans un stockage JavaScript ;
- interpréter un bouton masqué comme une permission ;
- afficher directement des détails techniques d'une erreur inattendue ;
- journaliser password, access token, refresh token ou reset token.

---

## 20. Sécurité des futurs modules métier

Tout module ajouté dans un SaaS dérivé doit réutiliser la même méthode de défense en profondeur.

Avant implémentation, il faut définir explicitement :

```text
tenant concerné
permission requise
capability éventuelle
quota éventuel
validation Zod
règles métier
contraintes MongoDB
besoin de transaction
politique de soft delete
AuditLog nécessaire
risques de concurrence
surface frontend
```

Une capability commerciale ne remplace jamais une permission.

Une permission ne remplace jamais l'isolation tenant.

Une validation Zod ne remplace jamais un invariant de base de données.

Une transaction ne remplace jamais l'autorisation.

---

## 21. Dette de sécurité et préparation production

Les protections présentes dans le Core ne signifient pas que toute application dérivée est automatiquement prête pour la production.

`docs/DEBT.md` reste l'autorité pour les chantiers non résolus ou conditionnels, notamment :

- RGPD, cookies et confidentialité ;
- observabilité technique ;
- rétention/anonymisation/suppression réglementaire ;
- stockage File de production ;
- API keys / webhooks si utilisés ;
- MFA/passkeys/SSO lorsqu'ils deviennent nécessaires ;
- configuration et déploiement propres au produit dérivé.

Le cycle fonctionnel Account / Workspace est désormais couvert par le Core ; cela ne définit pas pour autant la durée légale de conservation ou la politique de purge d'un produit dérivé.

Une dette applicable à un produit doit être traitée avant son go-live selon son niveau de blocage.

---

## 22. Checklist de revue d'une nouvelle route sensible

Avant validation d'une nouvelle route, vérifier :

```text
[ ] authentification nécessaire ?
[ ] body / params / query validés ?
[ ] données brutes évitées après Zod ?
[ ] Workspace correctement isolé ?
[ ] permission explicite ?
[ ] owner-only dédié plutôt qu'une permission délégable si nécessaire ?
[ ] permission Platform distincte si administration globale ?
[ ] access mode à contrôler ?
[ ] feature commerciale à contrôler ?
[ ] quota à contrôler/réserver atomiquement ?
[ ] risque de concurrence identifié ?
[ ] transaction nécessaire ?
[ ] contraintes DB suffisantes ?
[ ] soft delete / lifecycle défini ?
[ ] AuditLog requis ?
[ ] secrets et données personnelles exclus des logs ?
[ ] erreur publique suffisamment générique ?
[ ] tests 401 / 403 / 404 / 409 / quota / concurrence pertinents ?
[ ] frontend utilisé uniquement comme UX, jamais comme barrière unique ?
```

---

## 23. Références canoniques associées

```text
docs/architecture/ARCHITECTURE.md
docs/architecture/BACKEND.md
docs/architecture/FRONTEND.md

docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md

docs/DEBT.md
```

Le code et les tests actuels restent supérieurs à ce document dans la hiérarchie d'autorité documentaire. Toute évolution de sécurité significative doit mettre à jour cette référence dans le même lot ou au checkpoint documentaire immédiatement suivant.


---

## Autorité globale applicative

À partir de Core 1.2.0, une troisième frontière RBAC existe pour les ressources métier globales d’un SaaS dérivé.

    Platform → administration interne du SaaS
    Application global → gouvernance métier globale du produit
    Workspace → autorisation tenant

Ces frontières sont indépendantes.

Flux backend :

    authenticate
    → resolveApplicationGlobalAuthorization()
    → authorizeApplicationGlobalPermission()
    → service métier

Le resolver recharge ApplicationGlobalMember et ApplicationGlobalRole depuis MongoDB.

Interdictions :

- ne pas déduire une autorité globale métier depuis User.platformRole ;
- ne pas donner automatiquement les droits métier aux membres Platform ;
- ne pas réutiliser req.permissions du Workspace ;
- ne pas faire confiance au JWT ou au frontend pour les permissions effectives ;
- ne pas accepter une permission inconnue ou en collision avec un autre scope ;
- ne pas réactiver implicitement un membership révoqué via le bootstrap.

Un rôle archivé, un membre suspendu ou un historique révoqué donnent zéro permission.

Pour la composition de navigation Platform, `GET /api/platform/me` peut
projeter séparément les permissions Application Global effectives dans
`applicationGlobalPermissions`. Cette projection est uniquement une aide UX :
elle ne transforme jamais une permission Platform en permission métier et ne
constitue pas une preuve d'autorisation pour une requête ultérieure.

Toute route métier globale protégée doit continuer à exécuter
`resolveApplicationGlobalAuthorization()` /
`authorizeApplicationGlobalPermission()` côté backend au moment de la
requête. Une modification de rôle ou de membership doit donc prendre effet
sans dépendre du cache frontend.

Les mutations de rôles et memberships sont auditées. Les services imposent l’anti-escalade : l’acteur ne peut administrer ou attribuer des permissions qu’il ne possède pas.
