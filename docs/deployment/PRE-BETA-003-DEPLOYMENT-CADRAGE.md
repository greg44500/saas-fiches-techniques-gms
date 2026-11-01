# PRE-BETA-003 — Cadrage du premier déploiement (proposition)

**Date :** 2026-11-01  
**Statut :** PROPOSITION À ARBITRER — ni architecture validée ni autorisation de déploiement  
**Périmètre :** bêta privée de `saas-fiches-techniques-gms`, pas une mise en production publique ou un refactoring métier  
**Base Git vérifiée :** `main` au commit `1e47178ffd9abfa67011ba075bcc13a6a607b481` (PR #58 fusionnée) ; `core-origin.json` = Core `v1.2.1` / `42beaff67200ca4e956378e2273b4eae440f47bc`.  
**Preuve CI :** Core Gate #250 verte sur la PR #58 ; la gate du commit de fusion `1e47178` était encore `in_progress` à la dernière lecture. Ne pas transposer le succès de la PR à la gate post-fusion.

## 0. Contrainte révisée : petit budget pour un hébergement disponible (2026-11-01)

**Dernier arbitrage du propriétaire :** une petite dépense récurrente est acceptable **pour un hébergement effectivement disponible**, notamment chez Infomaniak, OVHcloud ou Hostinger. Cette décision **remplace** la consigne antérieure de 0 € absolu. Elle n'autorise pas l'achat, ne fixe aucun plafond chiffré et ne valide aucun fournisseur. Pour MongoDB, SMTP, certificats et outils, rechercher d'abord des solutions gratuites, **sans compromettre les conditions techniques et la récupération des données**.

### Comparaison officielle des VPS adaptés à l'application

Prix publics consultés le 2026-11-01 ; disponibilité effective, contrat, mensualité réelle, taxe, région et commande à confirmer au panier. Les tarifs « à partir de » et promotionnels ne sont pas des prix garantis au renouvellement.

| Hébergeur / offre | CPU, RAM, stockage | Prix affiché | Sauvegarde incluse / restriction | Évaluation |
| --- | --- | --- | --- | --- |
| **OVHcloud VPS-2 (gamme « VPS 2027 »)** | 4 vCore, **8 Go RAM**, 75 Go NVMe | **dès 7,21 € HT / 8,65 € TTC par mois** | Sauvegarde quotidienne incluse, **rétention de 24 h seulement** ; copie indépendante impérative | **Premier candidat** pour disponibilité à contrôler et coût maîtrisé |
| **Hostinger KVM 2** | 2 vCPU, **8 Go RAM**, 100 Go NVMe | **7,99 € HT/mois promotionnel**, renouvellement annoncé à **14,99 € HT/mois** pour 2 ans | Sauvegardes hebdomadaires ; tarifs mensualisés **facturés d'avance pour la durée du forfait** | Alternative, seulement après vérification du paiement initial et de la durée |
| **Infomaniak VPS Lite (8 Go)** | 4 vCPU, **8 Go RAM**, 160 Go NVMe | **18 CHF HT/mois** affichés ; option mensuelle/annuelle à vérifier | **Pas de snapshot inclus, pas de SLA de disponibilité** sur VPS Lite ; localisation Suisse | Alternative si préférence fournisseur/souveraineté ; coût supérieur |
| VPS 4 Go (toutes marques) | Mémoire totale 4 Go | Prix plus faible | ClamAV recommande **3 Gio+ pour son seul processus**, avant l'API/OS | **Déconseillé par défaut** sans mesure de mémoire et test de charge |

Le minimum recommandé par l'éditeur ClamAV est 3 Gio de RAM pour ClamAV seul, avec au moins 5 Gio d'espace disque libre en plus du système. **8 Go de RAM est une hypothèse de dimensionnement prudent pour le pilote, pas un résultat de benchmark.** La taille définitive dépendra des scans, imports, PDF, concurrents et des métriques réelles.

**Disponibilité :** ces pages prouvent que les produits sont commercialisés, **pas qu'un serveur 8 Go est commandable aujourd'hui dans la région cible**. Vérifier le panier/stock et la région avant toute transaction. Préférer une facturation mensuelle résiliable plutôt qu'une promotion exigeant 12–24 mois prépayés, sauf décision contraire explicite.

### Architecture candidate : VPS payant et services complémentaires gratuits

```text
HTTPS / domaine ou sous-domaine réellement contrôlé
    -> VPS Linux 8 Go (une instance API)
       -> Caddy ou reverse proxy (frontend Vite construit + /api)
       -> Node.js 24 / Express (Core + modules GMS)
       -> volumes persistants séparés : fichiers / quarantaine
       -> ClamAV clamscan + signatures mises à jour
       -> cron/systemd : jobs + surveillance
    -> MongoDB Atlas Free (base bêta isolée, transactions à éprouver)
    -> SMTP gratuit compatible Nodemailer, expéditeur DNS authentifié
    -> sauvegarde externe chiffrée de MongoDB ET des fichiers
```

**Choix MongoDB non arrêté :** Atlas Free est le candidat initial pour éviter l'administration d'un second service critique sur le VPS ; limite actuelle **0,5 Go données + indexes**, 100 opérations/s, 10 Go entrants et sortants par période de 7 jours, et restrictions de commandes. Les transactions, migrations et jeux de données métier devront être testés sur le tier réel. Une MongoDB auto-hébergée sur le VPS avec replica set `rs0` **serait une autre architecture**, impliquant des ressources supplémentaires, la gestion de la disponibilité et une stratégie de sauvegarde plus exigeante ; ne pas l'adopter silencieusement pour contourner la limite de M0.

**ClamAV :** l'exécutable `clamscan` doit être installé **dans le système/conteneur qui exécute Node**, avec signatures actualisées. Aucun correctif du pipeline Core n'est nécessaire à ce stade, mais les scans réels en panne/timeout doivent être validés.

**SMTP et domaine :** Brevo Free ou autre SMTP gratuit peut être évalué sans changement API ; l'adresse expéditrice, le contrôle DNS DKIM/SPF/DMARC et l'envoi de liens réels sont à prouver. Un sous-domaine gratuit de test ne garantit pas le contrôle DNS de l'expéditeur. Un achat de domaine éventuel est **un coût séparé nécessitant accord**.

**Sauvegardes :** la sauvegarde OVH quotidienne (un jour) ou Hostinger hebdomadaire ne constitue pas un plan de récupération suffisant à elle seule. Atlas Free et les fichiers persistés doivent pouvoir être **restaurés sur une cible isolée** depuis une copie chiffrée hors VPS. Aucune solution à 0 € n'est réputée correcte avant restauration éprouvée.

### Critères de choix avant commande

1. **Prix réel payé maintenant**, prix de renouvellement, TVA, durée minimale, frais annexes et procédure de résiliation.
2. **Disponibilité immédiate** de la configuration et du datacenter choisi, sans réservation ou crédit temporaire non renouvelable.
3. **RAM de 8 Go** ou preuve de dimensionnement suffisante pour ClamAV, Express et traitements.
4. **Accès root Linux**, installation Docker/ClamAV, volume persistant, ports HTTPS, SMTP sortant et tâches cron permis contractuellement.
5. **Région de traitement** et DPA/RGPD ; responsabilité d'administration/patching clairement attribuée.
6. **Plan de récupération MongoDB + fichiers** indépendant du serveur, RPO/RTO acceptables et test de restauration.
7. Pas de création de service ni de paiement avant sélection explicite du propriétaire.

**Sources officielles consultées le 2026-11-01** (date de publication non fournie) :
- OVHcloud. *VPS — caractéristiques et tarifs*. s.d. https://www.ovhcloud.com/fr/vps/
- OVHcloud. *VPS Backup*. s.d. https://www.ovhcloud.com/fr/vps/vps-backup/
- Hostinger. *Hébergement VPS*. s.d. https://www.hostinger.com/fr/vps
- Infomaniak. *VPS Lite*. s.d. https://www.infomaniak.com/fr/hebergement/vps-lite
- ClamAV. *Recommended System Requirements*. s.d. https://docs.clamav.net/
- MongoDB. *Atlas Free Cluster Limits*. s.d. https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/
- MongoDB. *Free Cluster Backups*. s.d. https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/
- Brevo. *FAQ — limites de l'offre Gratuit*. s.d. https://help.brevo.com/hc/fr/articles/208580669-FAQ-Quels-sont-les-limites-de-l-offre-Gratuit

---

## 1. Objet et limites

Ce lot établit **l'architecture cible, les dépendances d'exploitation, les options d'hébergement, les décisions à prendre et les critères de sortie**. Il ne crée aucun serveur, compte prestataire, secret, domaine, base ni pipeline de déploiement. Il ne change ni le runtime ni les fonctionnalités et n'exécute pas de migration.

Préserver intégralement les bases locales `*_dev` et `*_e2e_test` ; ne jamais recopier automatiquement la base de développement, ses identités ou son contenu vers la bêta. Le déploiement sera une cible **distincte**, peuplée uniquement de données synthétiques ou autorisées.

Autorité : code et tests présents, `AGENTS.md`, `docs/audits/PRE-BETA-READINESS.md`, `docs/operations/OPERATIONS.md`, `docs/releases/MIGRATION-POLICY.md` et `docs/releases/migration-manifest.json`. Les audits antérieurs à la PR #58 sont des photographies historiques, pas un inventaire à jour des E2E.

## 2. Observations vérifiées dans le code

| Composant | Comportement actuellement implémenté | Conséquence concrète |
| --- | --- | --- |
| Backend | Node.js `>=24.7 <25`, Express, `npm start` ; `connectDB` avant écoute HTTP | Exécuter Node 24 et rendre MongoDB accessible avant ouverture de trafic. |
| Frontend | React/Vite ; appels RTK Query sous `/api` ; proxy de `vite.config.js` limité au serveur de développement | Construire les assets statiques et router `/api/*` vers Express via le frontal HTTPS. Ne pas déployer le serveur de développement Vite. |
| MongoDB | URI `mongodb://` ou `mongodb+srv://` ; transactions ; `autoIndex: false` en production | DB isolée prenant en charge les transactions ; migrations et création d'indexes explicites avant trafic. |
| Sessions | Refresh cookie `HttpOnly`, `Secure` en `NODE_ENV=production`, `SameSite=Lax`, `Path=/api/auth`; access token dans Redux mémoire | **Même origine HTTPS** pour frontend et API en première proposition. Vérifier rotation/refresh/logout dans le navigateur déployé. |
| CORS | Origine navigateur limitée à `CLIENT_URL`, `credentials: true` | Configurer `CLIENT_URL` sur l'origine HTTPS réelle, sans joker. |
| Stockage | `FILE_STORAGE_PROVIDER=local` seulement ; racine persistante et quarantaine séparées | Volume local **persistant**, monté hors du conteneur/release ; sauvegardes et contrôle des permissions. Pas de S3 en l'état. |
| Antivirus | `execFile(CLAMAV_BINARY_PATH, ...)` lance `clamscan` pour chaque fichier ; résultat erreur refusé (fail-closed) | Installer l'exécutable et les signatures au **même emplacement d'exécution que l'API**, maintenir `freshclam` et contrôler délais/mémoire. Modifier uniquement le chemin du binaire ne suffit pas sans installation fonctionnelle. |
| Courriels | Nodemailer et transport SMTP depuis `SMTP_*` | Choisir un fournisseur transactionnel réel ; credentials, domaine d'envoi, délivrabilité et test de réception. |
| Tâches | Runners npm indépendants `job:*` et runners de migrations | Scheduler externe, suivi des échecs, non-chevauchement ; ne pas déduire qu'ils tournent automatiquement avec `npm start`. |
| Health | `GET /api/health` renvoie HTTP 200 sans tester MongoDB/SMTP/ClamAV | Sonde de vie seulement ; établir une stratégie de readiness et surveillance des dépendances. Une éventuelle primitive transverse relève du Core. |
| Reverse proxy | `requestContext` et rate-limit utilisent `req.ip` ; aucun `trust proxy` explicite lu dans `backend/app.js` | **Risque à démontrer** : IP du reverse proxy pour tous les utilisateurs, altération de l'audit et du rate limiting. Tester derrière le proxy réel, ouvrir un sujet Core générique si ajustement nécessaire. |

Les exports PDF/CSV/XLSX générés à la demande ne doivent pas être assimilés automatiquement à des fichiers persistés : contrôler les flux effectifs par module. Le stockage persistant concerne les objets réellement enregistrés, dont le système de fichiers Core.

## 3. Topologie de référence à évaluer — une origine HTTPS

```text
Utilisateurs invités
    |
    | HTTPS / certificat valide
    v
[app.domaine.tld : proxy inverse + frontend Vite compilé]
    | /api/*, réseau privé
    v
[Express Node 24 : une instance initiale]
    |-- MongoDB Atlas (TLS, utilisateurs DB spécifiques, IP autorisée)
    |-- volume persistant : fichiers
    |-- répertoire de quarantaine séparé
    |-- clamscan local + signatures mises à jour
    |-- relais SMTP externe (TLS)
    +-- jobs planifiés, isolés des requêtes HTTP
                  |
            supervision, sauvegardes hors serveur
```

**Hypothèses de conception, non validées** : faible nombre d'utilisateurs invités, une seule instance API initiale, absence de haute disponibilité garantie, fenêtre de maintenance acceptable. **Le propriétaire autorise désormais un hébergement VPS peu coûteux**, sous réserve de disponibilité et de conditions contractuelles vérifiées. OVHcloud, Hostinger et Infomaniak sont les trois candidats évalués ci-dessus ; les autres services restent gratuits dans la mesure du possible. Le besoin de capacité et la criticité réelle des données doivent être arbitrés avant dimensionnement.

La proposition `app.domaine.tld` est illustrative, pas un nom de domaine réservé. Les ports internes HTTP ne doivent pas être exposés au public. La terminaison TLS sur reverse proxy reste une frontière de confiance à tester (headers, véritable IP source, cookies, protections).

## 4. Stratégies d'hébergement : VPS économique prioritaire, PaaS alternatif

| Critère | Option A : VM/VPS UE + Docker Compose + MongoDB Atlas | Option B : PaaS managé + MongoDB Atlas |
| --- | --- | --- |
| Déploiement frontend/API | Images immuables, proxy inverse type Caddy, une VM | Build / service web selon la plateforme |
| ClamAV | Installer `clamscan` et `freshclam` dans l'environnement exécutant l'API | Image personnalisée et ressources RAM ; politique du PaaS à vérifier |
| Fichiers | Volume persistant réservé, sauvegarde indépendante | Un disque persistant sur service payant, soumis aux contraintes du fournisseur |
| Jobs | Cron/systemd ou exécuteur conteneur dédié, non chevauchant | Cron jobs du fournisseur, mais vérifier leur accès à la même donnée/au même disque |
| Exploitation | Mises à jour OS, durcissement, firewall et restauration à notre charge | Moins de maintenance OS ; restrictions de persistance et architecture spécifiques |
| Disponibilité | Panne de la VM = interruption ; sauvegardes hors VM indispensables | SLA et indisponibilités à vérifier, y compris quand un disque est attaché |
| Coûts | VM + sauvegardes + Atlas + domaine + SMTP ; ressources suffisantes pour ClamAV | Service payant + disque + tâches + Atlas + SMTP |
| Statut | **Piste prioritaire à instruire si gestion serveur acceptée**, pas un choix imposé | Alternative à instruire si réduction de l'administration système prioritaire |

**Justification des réserves PaaS :** Render indique qu'un disque persistant est attaché à une seule instance et inaccessible à ses Cron Jobs ; un service doté d'un disque n'a pas de déploiement sans interruption. Il ne faut pas sélectionner une telle combinaison en supposant que les jobs de purge pourront accéder au même système de fichiers.

**Ressources ClamAV :** la documentation éditeur recommande au moins 3 GiB de RAM pour ClamAV seul et 5 GiB d'espace libre pour l'application, **en plus des autres services**. Ne pas choisir un VPS de 1–2 GiB par réflexe économique ; mesurer la mémoire et les temps de scan avant validation de la taille. Aucun gabarit serveur n'est fixé aujourd'hui.

### MongoDB Atlas : distinguer coût et capacité de reprise

- **Free/M0** : capacité et opérations limitées ; sauvegardes automatiques optionnelles en préversion privée selon la documentation actuelle, donc leur disponibilité **ne peut pas être présumée**. Pas de GO sur données précieuses sans restauration indépendante éprouvée.
- **Flex** : snapshots quotidiens automatiques (huit dernières journées), sans restauration à l'instant T ni snapshot à la demande ; premières 24 heures sans snapshot. Convient à étudier pour pilote à faibles exigences de reprise, sous réserve de test de transactions et de charge réelles.
- **M10+** : offre dédiée proposant des politiques de sauvegarde plus avancées ; à considérer si la perte potentielle d'une journée d'activité est inacceptable. Prix réel selon région/cloud/configuration à chiffrer.

Aucun cluster n'est créé. Les noms, régions, contrats DPA, IP sortantes et limites tier seront confirmés avant choix. La connexion Atlas impose TLS et une liste d'accès réseau explicite : **ne jamais accepter `0.0.0.0/0` par commodité** pour un déploiement pérenne.

### SMTP : option vérifiée sans migration applicative

Un relais SMTP transactionnel comme Brevo peut alimenter le code Nodemailer existant. La formule gratuite est annoncée à 300 emails par jour, avec restrictions de volume ; le domaine et les expéditeurs doivent être authentifiés et la remise réelle mesurée. Une configuration `SMTP_PORT=465` + `SMTP_SECURE=true` est compatible avec la convention du service ; les valeurs exactes sont à renseigner depuis le prestataire, sans copier ici d'identifiants.

**Point de sécurité :** `SMTP_SECURE=false` sur 587 ne garantit pas à elle seule l'obligation de STARTTLS dans le transport actuel ; si 587 est retenu, tester la politique TLS et classer tout éventuel besoin de `requireTLS` dans le Core, pas sous forme de patch silencieux produit.

## 5. Matrice d'environnement à préparer, sans secret

| Variable / paramètre | Valeur/cible de production *proposée* | Vérification bloquante |
| --- | --- | --- |
| `NODE_ENV` | `production` | Schéma Zod et garde-fous actifs |
| `PORT` | Port interne API, non exposé directement | Reverse proxy correct |
| `CLIENT_URL` | `https://app.domaine.tld` (illustration) | HTTPS, CORS et auth réussis |
| `MONGODB_URI` | URI Atlas vers base `saas_fiches_techniques_gms_beta` ou autre nom validé | TLS, auth, IP autorisée, transactions, aucune base `_dev`/`_test` |
| `JWT_ACCESS_SECRET`, `TRIAL_IDENTITY_SECRET` | Secrets distincts, forts, injectés depuis gestion sécurisée | Pas en Git/logs, rotation et sauvegarde des paramètres |
| `JWT_ACCESS_ISSUER`, `JWT_ACCESS_AUDIENCE` | Contrat courant du Core à préserver | Cohérence vérificateur/émetteur ; aucun changement arbitraire |
| `SMTP_HOST/PORT/SECURE/USER/PASSWORD` | SMTP transactionnel chiffré | Connexion TLS, réception test, quotas fournisseur |
| `SMTP_FROM_EMAIL/NAME` | Expéditeur sur domaine vérifié | DNS DKIM/DMARC, vérification d'acheminement |
| `FILE_STORAGE_PROVIDER` | `local` (seule valeur acceptée aujourd'hui) | Volume réellement persistant |
| `LOCAL_STORAGE_ROOT_DIR` | Chemin absolu persistant, p.ex. `/srv/saas/files` | Droits, sauvegarde, restauration |
| `UPLOAD_TEMP_DIR` | Quarantaine distincte, p.ex. `/srv/saas/quarantine` | Isolation, capacité, purge, échec du scan |
| `CLAMAV_BINARY_PATH` | `clamscan` ou chemin dans le conteneur API | Binaire réel, signatures, codes retour, timeout |
| `CLAMAV_SCAN_TIMEOUT_MS` | `30000` initialement, à mesurer | Scan propre, EICAR, incident scanner, aucune acceptation si erreur |
| `E2E_BYPASS_RATE_LIMITS` | `false` | Aucun bypass |
| `ALLOW_DEVELOPMENT_DATA_RESET` | `false` | Aucune suppression de données |
| `SUPER_ADMIN_*` | Uniquement au bootstrap explicitement autorisé | Ne pas conserver en permanence des secrets de seed inutilement |

Ce tableau **n'est pas un fichier `.env` prêt à copier**. Il faut inventorier les variables réellement obligatoires dans le `env.js` au moment du premier déploiement, les stocker hors dépôt et éviter toute valeur fictive prise pour une vraie configuration.

## 6. Préparation du déploiement : ordre de travaux, pas des commandes à exécuter maintenant

1. **Arbitrage** : périmètre bêta, utilisateurs simultanés, sensibilité des données, enveloppe mensuelle, RPO (perte maximale acceptable) et RTO (durée de restauration), préférence d'administration serveur, domaine, hébergeur/région et SMTP.
2. **Architecture validée** : un schéma final, capacité ClamAV, origine HTTPS unique, DB, stockage et sauvegardes ; décision documentée sur les points Core potentiels (proxy IP, readiness, TLS SMTP, stockage S3 seulement si nécessaire).
3. **Infrastructure versionnée et isolée** : Dockerfile(s), construction frontend, configuration du reverse proxy, volumes, droits des conteneurs, gestion des secrets et politiques de mises à jour ; jamais de credentials dans l'image ou Git.
4. **Base cible** : nouvelle base isolée, compte de service à privilèges minimaux, contrôle des connexions, seed limité et revue de `migration-manifest.json` **avec l'ordre réel des dépendances** ; enregistrer l'exécution/idempotence et les indexes. Aucun `npm run migration:*` en masse sans plan de préconditions.
5. **Service complet** : SMTP de production, ClamAV + signatures, scheduler contrôlé pour les jobs nécessaires, logs/alertes et sondes d'exploitation. Démontrer stockage/upload/restore et règles d'accès dans la même topologie que la bêta.
6. **Recette pré-ouverture** : tests de sessions/cookies derrière HTTPS, invitations D-020 et équipe, cloisonnement Workspace, imports, PDF M-004/M-006, EICAR, mails reçus, migrations et quotas. QA manuelle A4 multipages, mobile et clavier **encore à prouver** après PRE-BETA-002.
7. **Sauvegarde et reprise** : restaurer sur **une cible de test distincte**, cohérente MongoDB + fichiers, tester une restauration après incident et un rollback applicatif ; `git revert` ne restaure pas une migration de données.
8. **GO contrôlé** : version/commit immuable, Core Gate verte sur ce commit, checklists techniques + RGPD/contrats sous-traitants + consignes support, décision explicite de l'exploitant, ouverture par invitations et suivi des incidents.

Le choix de la cadence des jobs et de rétention dépend des usages et contrats. La surveillance doit distinguer disponibilité HTTP, readiness DB, disponibilité de ClamAV/signatures, SMTP et échecs de jobs. Les règles d'échec/réessai ne doivent pas générer de doubles opérations.

## 7. Décisions en attente — ne pas traiter comme validées

| ID | Arbitrage nécessaire | Proposition de travail |
| --- | --- | --- |
| DEP-01 | Population et exposition | Bêta privée nominative, sans inscriptions publiques ouvertes par défaut, à valider contre le fonctionnement actuel. |
| DEP-02 | **Petit budget d'hébergement autorisé ; pas de plafond chiffré ni de fournisseur retenu** | Prioriser OVHcloud VPS-2 8 Go, comparer Hostinger KVM 2 et Infomaniak VPS Lite 8 Go ; valider le tarif réel, les taxes, le paiement initial et la disponibilité. |
| DEP-03 | Administration du serveur | Décider si l'exploitation Linux/Docker et ses correctifs peuvent être assurés. |
| DEP-04 | Sauvegarde MongoDB et fichiers | Explorer Atlas Free + mongodump + backup externe chiffré, mais ne pas exclure une solution payante si la sécurité de reprise requise l'impose ; valider toute dépense complémentaire avant souscription. |
| DEP-05 | Stockage et fichiers | Local persistant et sauvegarde externe pour une instance, **ou** demande d'évolution Core S3 si besoin multi-instance. |
| DEP-06 | SMTP et domaine | Comparer offres transactionnelles, domaine d'envoi, DNS et limites. |
| DEP-07 | Confiance proxy/IP et health | Exiger preuve derrière proxy ; ouvrir changement Core isolé si primitive générique incorrecte. |
| DEP-08 | Protocole RGPD et hébergement | Région effective, sous-traitants, DPA, finalités, durées, documents d'information et droits. |
| DEP-09 | Version et modalités de bêta | Définir le canal/version produit et protocole d'invitation et de support ; aucune release forcée ici. |

## 8. Critères de clôture du cadrage PRE-BETA-003

- Architecture et prestataires **explicitement validés**, devis réel (prix initial, renouvellement, TVA, durée, disponibilités, localisation des données) documenté ; aucune souscription anticipée.
- Schéma des flux, surface réseau exposée, inventaire secrets et paramètres d'auth/cookies corrigés ou prouvés compatibles.
- Liste des dépendances qui relèvent de la configuration seule vs évolution Core/Produit ; aucun correctif Core maquillé dans le produit.
- Plan d'implémentation et de recette d'un **lot cohérent**, avec rollback, responsabilités, critères GO/NO-GO.
- Aucune création de compte, achat, changement de base ou mise en ligne avant cette validation.

## 9. Sources officielles externes — consultées le 2026-11-01

- MongoDB. *Flex Cluster Backups*. s.d. https://www.mongodb.com/docs/atlas/backup/cloud-backup/flex-cluster-backup/
- MongoDB. *Atlas Flex Limitations*. s.d. https://www.mongodb.com/docs/atlas/reference/flex-limitations/
- MongoDB. *Free Cluster Backups* (private preview, disponibilité variable). s.d. https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/
- MongoDB. *Guidance for Atlas Network Security*. s.d. https://www.mongodb.com/docs/atlas/architecture/current/network-security/
- Render. *Persistent Disks*. s.d. https://render.com/docs/disks
- Render. *Cron Jobs*. s.d. https://render.com/docs/cronjobs
- ClamAV. *Introduction — Recommended System Requirements*. s.d. https://docs.clamav.net/
- ClamAV. *Updating Signature Databases*. s.d. https://docs.clamav.net/manual/Usage/SignatureManagement.html
- Docker. *Use Compose in production*. 2026 (date exacte non précisée). https://docs.docker.com/compose/how-tos/production/
- Caddy. *Reverse proxy quick-start*. s.d. https://caddyserver.com/docs/quick-starts/reverse-proxy
- Brevo. *FAQ — Quels sont les limites de l'offre Gratuit ?*. s.d. https://help.brevo.com/hc/fr/articles/208580669-FAQ-Quels-sont-les-limites-de-l-offre-Gratuit
- Brevo. *Envoyer des emails transactionnels avec Brevo SMTP*. s.d. https://help.brevo.com/hc/fr/articles/7924908994450-Envoyer-des-emails-transactionnels-avec-Brevo-SMTP
- CNIL. *Sécurité : Gérer la sous-traitance*. s.d. https://www.cnil.fr/fr/securite-gerer-la-sous-traitance

**Documentation interne :** chemins de fichiers cités ci-dessus, état GitHub de `main`, et workflow `.github/workflows/core-gate.yml`.
