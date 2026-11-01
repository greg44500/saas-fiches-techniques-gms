# PRE-BETA-003 — Cadrage SMTP transactionnel (bêta privée)

**Date :** 2026-11-01  
**Statut :** PROPOSITION À VALIDER — aucun fournisseur, domaine, expéditeur ni secret provisionné.  
**Hébergement de principe validé :** VPS OVHcloud ; le serveur SMTP sera **externe** et ne fera pas partie des services Linux autohébergés.  
**Référence :** [cadrage du déploiement](PRE-BETA-003-DEPLOYMENT-CADRAGE.md).

## 1. Objectif et périmètre

Assurer la livraison fiable des **emails transactionnels** du SaaS de bêta privée : invitations commerciales D-020, invitations d'équipe, invitations Platform, réinitialisation du mot de passe et notifications de sécurité existantes. Le marketing, les newsletters, la réception de boîtes mail, les campagnes de masse et la construction d'un serveur mail ne sont **pas** au périmètre.

**Contrainte de sécurité :** les invitations et réinitialisations contiennent des liens porteurs de secrets temporaires : ni ces liens ni les clés SMTP ne doivent être écrits dans des logs ou stockés dans Git. Le contrat de validité, les contrôles de destinataire et la règle anti-rejeu restent ceux des services Auth/Invitation existants.

## 2. État du code réellement vérifié

| Élément | Constat | Conséquence |
| --- | --- | --- |
| `backend/services/email.service.js` | `nodemailer.createTransport({ ...smtpConfig, disableFileAccess: true, disableUrlAccess: true })` ; `sendEmail` envoie `to/subject/text/html` | **SMTP externe configurable sans réécrire les modules métier** ; ne pas ajouter une API propriétaire pour un simple changement de fournisseur. |
| `backend/config/smtp.config.js` | `SMTP_HOST/PORT/SECURE/USER/PASSWORD/FROM_EMAIL/FROM_NAME` | Variables de production distinctes des identifiants de développement Mailtrap. |
| `backend/config/env.js` | Validation Zod de chaque variable et refus des identifiants SMTP placeholders connus en production | Ne pas supposer que les envois fonctionnent parce que les variables sont présentes ; tester réellement la connexion/délivrabilité. |
| `backend/config/cookie.config.js`, `CLIENT_URL` | Sessions et liens du SaaS basés sur une origine frontend HTTPS en production | Envoyer les liens vers le vrai domaine HTTPS et vérifier acceptation après clic. |
| `backend/services/emailTemplates/` | Templates transactionnels intégrés | Conserver un seul système d'envoi ; inspection des liens, nom expéditeur et vocabulaire lors de la recette. |

Le transport actuel n'impose pas explicitement `requireTLS`. Sur **port 587**, `SMTP_SECURE=false` peut négocier STARTTLS sans garantir à lui seul une obligation de TLS. Privilégier **port 465, `SMTP_SECURE=true`**, si le fournisseur et la connectivité VPS le permettent, pour disposer de TLS dès la connexion **sans changement de code**. Si 587 est retenu, l'exigence de TLS strict doit être vérifiée et, si nécessaire, traitée via **une évolution du Core** et sa release, pas par correctif masqué dans le produit.

## 3. Candidats fournisseurs (pas encore arbitrés)

| Candidat | Coût/plafond documenté | Technique | Décision |
| --- | --- | --- | --- |
| **Brevo Gratuit — piste prioritaire** | 0 €/mois ; jusqu'à **300 emails/jour** incluant les transactionnels | SMTP `smtp-relay.brevo.com`, clé SMTP (différente d'une clé API), port 465 TLS ou 587/2525 avec conditions TLS à tester | **Candidat seulement** : compte et domaine à authentifier, tester la livraison et la file d'attente en cas de quota |
| **Resend Free — alternative** | 0 $/mois ; **3 000 emails/mois** et **100/jour** | Relais SMTP `smtp.resend.com` compatible Nodemailer, 465 TLS ; vérification du domaine requise | Alternative en cas de limites ou expérience insatisfaisante chez Brevo |

**Limites Brevo :** au-delà du plafond journalier, un volume limité de transactionnels peut entrer dans une file d'attente ; des emails supplémentaires peuvent ne pas être délivrés. L'application ne doit pas interpréter l'acceptation SMTP comme une preuve d'arrivée dans la boîte de réception. Limiter les invitations de bêta et surveiller les échecs/délais.

**VPS OVHcloud :** les conseils réseau officiels divergent selon les générations d'articles pour le port 25 ; **ne pas dépendre du port 25**. Les **Local Zones** OVHcloud peuvent bloquer les connexions SMTP sortantes sur tous les ports, sans possibilité d'ouverture. Sélectionner une région classique, puis **vérifier effectivement la connexion sortante au port 465** depuis le VPS *avant* de considérer le SMTP opérationnel. Ne pas exploiter d'autohébergement Postfix/MTA pour la bêta.

## 4. Domaine d'envoi et identité

**Prérequis à lever :** posséder ou contrôler un domaine DNS, ou décider explicitement du coût d'achat éventuel. Une adresse `@gmail.com` n'est pas un domaine authentifiable dans Brevo. Un simple sous-domaine gratuit fourni par un tiers ne confère pas nécessairement l'autorité DNS exigée.

**Hypothèse de configuration — pas une réservation de domaine :**
- URL web : `https://app.exemple.fr` ;
- expéditeur SMTP : `no-reply@exemple.fr` ;
- nom affiché : nom commercial de l'application, à valider ;
- adresse de réponse/contact et canal de support : à définir. La boîte `no-reply` ne doit pas être présentée comme un canal de support.

**DNS :** ajouter uniquement les enregistrements réellement fournis par le prestataire choisi (preuve du domaine, DKIM et DMARC ; vérifier la politique SPF, l'alignement DMARC et l'unicité des enregistrements existants sans les écraser). Les documents Brevo précisent que DKIM et DMARC sont les éléments demandés pour l'authentification du domaine dans leur parcours ; l'exigence SPF dépend de la configuration d'envoi. Ne pas fabriquer de valeurs DNS ni ajouter un second enregistrement SPF/DMARC contradictoire.

**Critères de preuve :** domaine `Authenticated` chez le prestataire, `dkim=pass` et alignement DMARC lorsque disponible dans les en-têtes des messages de test ; délai de propagation pris en compte, vérification des destinataires Gmail et Outlook.

## 5. Variables de production proposées (aucun secret réel)

| Variable | Exemple / contrainte | Statut |
| --- | --- | --- |
| `SMTP_HOST` | `smtp-relay.brevo.com` si Brevo est choisi | À valider |
| `SMTP_PORT` | `465` pour TLS implicite | Proposition |
| `SMTP_SECURE` | `true` sur 465 | Proposition |
| `SMTP_USER` | Identifiant SMTP délivré par Brevo | Secret/configuration hors dépôt |
| `SMTP_PASSWORD` | Clé SMTP dédiée, **pas clé API Brevo** | Secret hors dépôt, droits limités, rotation |
| `SMTP_FROM_EMAIL` | `no-reply@exemple.fr` (illustration) | Domaine réel vérifié à décider |
| `SMTP_FROM_NAME` | Nom du produit validé | À arbitrer |
| `CLIENT_URL` | Origine publique HTTPS de la bêta | Doit correspondre aux liens reçus |

**Environnements :** conserver l'outil de capture SMTP de développement en local, les tests E2E avec comptes et base dédiés, et la configuration SMTP réelle dans l'environnement de bêta. Pas d'identifiants réels dans les logs, captures Playwright, fichiers `.env.example` ou workflow GitHub public.

## 6. Recette opérationnelle et critères GO/NO-GO

1. **DNS / TLS :** expéditeur autorisé, domaine authentifié ; secret SMTP injecté hors Git ; connexion TLS vérifiée sur le VPS.
2. **Cas fonctionnels :** invitation D-020 vers bénéficiaire autorisé, mauvais bénéficiaire refusé, invitation Workspace, invitation Platform, réinitialisation mot de passe et notification de sécurité pertinente ; liens cliquables en HTTPS, expiration et anti-rejeu inchangés.
3. **Réception réelle :** réception testée sur Gmail et Outlook (boîte de réception / spam) ; vérifier l'adresse affichée, les liens, les accents et la version texte du message. Conserver des preuves **sans tokens ni données personnelles**.
4. **Pannes/quota :** simuler mauvais secret, serveur SMTP inaccessible, timeout et dépassement de quota **dans un environnement de test sécurisé**, vérifier qu'aucune action métier n'est annoncée comme livrée si l'envoi a échoué, et qualifier explicitement les éventuelles incohérences transactionnelles.
5. **Observabilité :** statut des envois et erreurs (sans secrets, tokens ou contenu sensible), contrôle de consommation du quota, suivi des rejets/bounces et alerte sur échec des invitations/réinitialisations. Le niveau d'automatisation de la remontée d'erreur sera décidé sur preuve, pas supposé disponible.
6. **Récupération :** procédure de révocation/rotation de la clé SMTP et traitement manuel des emails critiques non reçus. Pas de réémission automatique non cadrée des invitations ni des tokens.

**NO-GO** tant qu'il n'existe pas de preuve d'envoi **et de réception** d'au moins une invitation réelle et d'un lien de réinitialisation sur l'environnement cible, de DNS authentifié et de la gestion d'une erreur SMTP. Ne pas qualifier Brevo de « choisi » avant validation explicite du propriétaire.

## 7. Décisions encore nécessaires

- **SMTP-01 :** existence d'un domaine contrôlé et choix du domaine d'expédition ;
- **SMTP-02 :** validation de Brevo Free ou d'une autre solution, après test compte/domaine ;
- **SMTP-03 :** boîte `Reply-To`/contact support et identité expéditrice ;
- **SMTP-04 :** politique de quotas, surveillance, retours d'erreur et preuve de réception ;
- **SMTP-05 :** compatibilité de la région OVHcloud et du port 465 avant ouverture de la bêta.

## 8. Sources officielles — consultées le 2026-11-01

- Brevo. *FAQ - Limites de l'offre Gratuit*. s.d. https://help.brevo.com/hc/fr/articles/208580669-FAQ-Quels-sont-les-limites-de-l-offre-Gratuit
- Brevo. *À propos des offres d'abonnement*. s.d. https://help.brevo.com/hc/fr/articles/208589409-%C3%80-propos-des-offres-d-abonnement-de-Brevo
- Brevo. *Envoyer des emails transactionnels avec Brevo SMTP*. s.d. https://help.brevo.com/hc/fr/articles/7924908994450-Envoyer-des-emails-transactionnels-avec-Brevo-SMTP
- Brevo. *Authentifier votre domaine dans Brevo*. s.d. https://help.brevo.com/hc/fr/articles/12163873383186-Authentifier-votre-domaine-dans-Brevo-code-Brevo-enregistrement-DKIM-enregistrement-DMARC
- Resend. *Pricing*. s.d. https://resend.com/pricing
- Resend. *SMTP Service*. 2023-08-08. https://resend.com/changelog/smtp-service
- OVHcloud. *FAQ sur les VPS OVHcloud*. s.d. https://docs.ovhcloud.com/fr/guides/bare-metal-cloud/virtual-private-servers/vps-faq
- Nodemailer. *SMTP transport*. s.d. https://nodemailer.com/smtp
