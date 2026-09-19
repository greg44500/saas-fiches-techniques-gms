# SAAS-FICHES-TECHNIQUES-GMS — Roadmap produit

**Statut :** DRAFT — cadrage global en cours  
**Dernière mise à jour :** 2026-09-19

> Cette roadmap décrit l'ordre de cadrage et de livraison.  
> Elle ne constitue pas encore un engagement de périmètre V1 ni un calendrier daté.

---

## 1. Phase 0 — Bootstrap technique

**Statut : VALIDÉ**

- dérivation depuis `saas-core-api` ;
- Core `v1.0.1` intégré ;
- provenance Core tracée ;
- gate canonique validée ;
- points d'extension Core disponibles ;
- aucun module métier encore implémenté avant le cadrage.

---

## 2. Phase 1 — Cadrage global du produit

**Statut : EN COURS**

Objectif : obtenir un contrat produit suffisamment précis pour interdire les hypothèses métier pendant l'implémentation.


### 2.1 Problème métier et organisation

**État : fortement cadré**

Décisions établies :

- Workspace comme espace de travail du client ;
- plusieurs dossiers dans un Workspace ;
- règle V1 : `1 dossier = 1 magasin` ;
- identité du dossier modifiable sans recréer le contexte ;
- données magasin : nom, enseigne si pertinente, localisation, email documents, téléphone facultatif, responsable métier distinct de `createdBy` ;
- autocomplétion de localisation via une source publique fiable à confirmer techniquement ;
- lifecycle dossier `ACTIVE / PAUSED / ARCHIVED / DELETED` ;
- suppression logique avant éventuelle purge physique ;
- suppression logique = coupure immédiate des accès métier et des ressources du dossier dans les flux normaux sans destruction automatique de l'historique ;
- restauration contrôlée vers un état non opérationnel, par défaut `PAUSED` ;
- catalogue produit mutualisé dans le Workspace ;
- prix et conditions contextualisés par magasin ;
- accès multi-magasins = changement de contexte, jamais partage ou mélange des données locales ;
- invitation Workspace puis affectation séparée des magasins après acceptation ;
- Workspace Owner implicitement autorisé sur tous les dossiers ;
- drawer de consultation sans activation du contexte ;
- ouverture explicite du dossier pour le travail métier ;
- retour au Dashboard Workspace en un clic ;
- Dashboard Workspace comme surface globale de pilotage ;
- Sidebar métier recomposée via le point d'extension Core.

À terminer :

- fixer le caractère obligatoire de certains champs de contact ;
- choisir le contrat technique final d'autocomplétion de localisation ;
- définir la persistance métier exacte des affectations dossier ;
- préciser les règles de rétention / purge.

### 2.2 Catalogue Produit

**État : socle métier cadré**

À préserver :

- nom métier précis ;
- règle de nommage entier / préparation ;
- catégorie ;
- gamme lorsque pertinente ;
- unité de référence ;
- rendement ;
- photo facultative ;
- traçabilité de création / modification ;
- historique des modifications.

**À terminer :**

- gouvernance des catégories ;
- unités supportées ;
- détails de lifecycle / archivage.

### 2.3 Fournisseurs, articles, conditionnements et tarifs

**État : très avancé — moteur de résolution, fraîcheur et références magasin cadrés**

Décisions établies :

- Produit / Fournisseur / Article séparés ;
- plusieurs Articles possibles pour un même Produit ;
- conditionnements structurés ;
- tarifs de référence fournisseur historisés par édition ;
- possibilité de catalogues fournisseur préchargés ;
- Tarif négocié strictement magasin ;
- Prix facturé validé et rattaché au magasin ;
- fraîcheur calculée depuis la date de facture ;
- comportement standard de fraîcheur : un an, convention technique exacte à fixer ;
- politique Workspace : Tarif fournisseur / Tarif négocié / Prix facturé ;
- fallback strictement dans le même magasin ;
- aucun prix d'un autre magasin comme secours ;
- backend seule autorité de résolution ;
- sélection automatique possible uniquement lorsqu'un seul Article est exploitable ;
- jamais de sélection automatique du moins cher ;
- références favorites = Articles fournisseur précis propres au magasin ;
- références fréquemment utilisées = usage calculé sur fiches VALIDÉES distinctes ;
- modes manuel / suggestion / ajout automatique paramétrables ;
- carte d'identité professionnelle Produit/Article ;
- imports CSV/XLS/XLSX prévus comme extension structurée sans obligation d'IA ;
- IA/OCR uniquement comme assistance future sous contrôle métier.

À finaliser :

- valeur standard exacte du seuil de fréquence ;
- règles de comptage des fiches archivées ;
- données minimales définitives Fournisseur ;
- lifecycle des Articles remplacés/archivés ;
- détails finaux des revues tarifaires ;
- convention technique exacte de la durée de fraîcheur.



### 2.4 Fiches techniques

**État : socle économique suffisamment cadré pour ne plus bloquer M-001**

Décisions établies :

- quantité nette saisie, brute calculée ;
- coûts HT ;
- CM + Économat ;
- version DRAFT / VALIDATED / ARCHIVED ;
- version VALIDATED immuable ;
- revalorisation explicite ;
- snapshot économique historique ;
- validation backend complète ;
- absence de prix distincte de zéro ;
- copie inter-magasin sans prix ni historique source ;
- TVA distincte des coûts HT ;
- Objectif de marge = `(PV HT - coût fabrication HT) / PV HT` ;
- coefficient = `1 / (1 - objectif de marge)` ;
- Prix théorique HT = `Coût fabrication HT × coefficient` ;
- Prix conseillé obtenu après application de la règle d'arrondi Workspace au Prix théorique TTC ;
- Prix définitif choisi humainement ;
- invariant `Prix définitif TTC >= Prix conseillé TTC >= Prix théorique TTC` ;
- marge réelle % et € calculées depuis le Prix définitif ;
- règle standard d'arrondi = multiple de 0,50 € immédiatement supérieur ou égal ;
- règles d'arrondi personnalisables par stratégies structurées ;
- marge semi-nette explicitement différée et non bloquante ;
- Atelier d'optimisation Premium cadré fonctionnellement.

À cadrer avant les modules concernés, pas avant M-001 :

- types/motifs exacts de versions avant M-004 ;
- définition de la marge semi-nette lorsqu'elle sera disponible ;
- paramètres mathématiques fins et garde-fous de l'optimiseur avant M-005 ;
- catalogue complet des stratégies d'arrondi ;
- rétention/purge définitive avant implémentation.


### 2.5 Fiches process

**État : DIFFÉRÉ — non bloquant pour M-001**

Le domaine reste prévu mais son cadrage détaillé n'est plus une condition préalable au démarrage.

Il sera cadré avant son implémentation : relation avec la Fiche technique, étapes, durées, points critiques, critères d'acceptabilité, versionnement et données communes/séparées.


### 2.6 Utilisateurs, RBAC, capabilities et quotas

**État : baseline RBAC validée — détails techniques par module**

Décisions établies :

- réutilisation du RBAC Workspace du Core ;
- un WorkspaceMember porte un seul Role ;
- un rôle personnalisé combine plusieurs responsabilités par ses permissions ;
- Workspace Owner = toutes les permissions métier + tous les dossiers ;
- PlatformRole sans accès implicite aux données métier Workspace ;
- rôle et périmètre dossier séparés ;
- invitation Core puis affectation Dossier après acceptation ;
- un membre peut appartenir au Workspace avec zéro Dossier ;
- changement de Role et changement de périmètre indépendants ;
- l'état du Dossier participe à l'autorisation effective ;
- baseline des profils Acheteur, Économe, Responsable FT, Contributeur FT et Lecteur validée ;
- Économe : validation des Prix facturés, revues et revalorisation, sans validation FT par défaut ;
- Contributeur/Lecteur : Prix applicable nécessaire sans historique commercial détaillé ;
- administration du Dossier et affectations Owner-only par défaut ;
- Atelier d'optimisation = capability payante distincte du RBAC.

À finaliser au cadrage des modules :

- clés de permissions techniques exactes ;
- persistance métier des affectations Dossier pour M-001 ;
- rattachement commercial exact de l'optimisation avant M-005 ;
- quotas uniquement lorsqu'un besoin quantitatif est démontré.

### 2.7 Paramètres métier

**État : architecture fonctionnelle validée — catalogue de paramètres à poursuivre**

Décisions établies :

~~~text
standard
+ configuré éventuel
→ effectif calculé par le backend
~~~

- panneau métier visible et comportements standards immédiatement utilisables ;
- Free = standards, personnalisation selon capabilities ;
- Trial = standards + personnalisation facultative pour tester l'offre ;
- Payant = personnalisation autorisée par le plan ;
- downgrade sans destruction automatique des valeurs configurées ;
- aucune valeur métier de remplacement codée en dur dans le frontend ;
- préférences d'affichage séparées de la configuration métier ;
- Dashboard Core + widgets métier ;
- tous les widgets accessibles sont visibles par défaut avec le Core v1.0.1 (`hiddenWidgetIds = []`) ;
- les widgets configurables peuvent ensuite être masqués/réaffichés par utilisateur ;
- les widgets non configurables restent visibles ;
- masquer un KPI ne désactive jamais une règle métier ou une alerte bloquante.

Paramètres métier déjà identifiés : politique de prix, fraîcheur factures, favoris/fréquence, cycle de vie des fiches, TVA standard, Objectif de marge, coefficient, arrondis et contraintes de l'optimiseur lorsque leur portée sera validée.


### 2.8 Intégrations et contraintes réglementaires

**État : À CADRER**

À étudier :

- autocomplétion ville / code postal / adresse via une source publique actuelle, avec la Géoplateforme / BAN comme candidate à confirmer ;
- import catalogues/mercuriales CSV/XLS/XLSX ;
- fichiers / images ;
- export PDF / CSV ;
- e-mail, notamment envoi de documents à l'adresse configurée du dossier ;
- OCR ;
- assistance IA ;
- règles fiscales réellement applicables ;
- règles alimentaires/hygiène réellement prises en charge ;
- contraintes de rétention.

Aucune obligation réglementaire ne doit être inventée.


### 2.9 Périmètre V1 / hors V1

**État : périmètre initial structuré — dernière validation globale à effectuer**

Ordre initial recommandé :

```text
M-001 Dossiers / Magasins + affectations
M-002 Catalogue Produits
M-003 Fournisseurs + Articles + prix/catalogues
M-004 Fiches techniques + valorisation
M-005 Atelier d'optimisation Premium
M-006+ Process / imports / OCR / extensions
```

Ne bloquent plus M-001 :

- marge semi-nette ;
- Fiche process ;
- OCR / IA ;
- imports avancés ;
- paramètres fins de l'optimiseur ;
- purge physique ;
- analyses avancées.

Dernière gate avant M-001 :

- champs obligatoires minimaux du Dossier ;
- représentation/persistance des affectations Dossier ;
- vérification des contraintes réglementaires utiles à M-001 ;
- revue de cohérence documentaire ;
- validation formelle du cadrage global.


## 3. Phase 2 — Validation documentaire globale

**Statut : PROCHE — dernière passe nécessaire**

La validation globale confirme que les fondations transversales sont suffisamment stables ; elle n'exige plus de spécifier les fonctionnalités futures non nécessaires à M-001.

À terminer :

- fermer les champs obligatoires minimaux du Dossier ;
- fixer la persistance métier des affectations Dossier ;
- vérifier les contraintes réglementaires structurantes pour M-001 ;
- revoir la cohérence de PRODUCT-SCOPE, GLOSSARY, DOMAIN-MODEL et ROADMAP ;
- réévaluer DEBT uniquement si une dette réelle existe ;
- mettre à jour REPRISE-CURRENT ;
- passer les documents globaux en VALIDÉ si cohérents.

Gate :

```text
cadrage global validé
→ cadrage M-001 autorisé
```

Aucun modèle métier Mongoose avant cette gate.


## 4. Phase 3 — Cadrage M-001

**Statut : PROCHAIN LOT — encore bloqué par la dernière validation globale**

Module recommandé :

```text
M-001 — Dossiers / Magasins + affectations
```

Ce module dépend directement du Workspace Core, crée la frontière métier magasin et prépare M-002/M-003 sans dépendre encore des Fiches techniques.

Le cadrage M-001 couvrira au minimum : objectif, acteurs, cas d'usage, modèle Dossier, relation d'affectation, lifecycle, tenancy, RBAC, API, validations, audit, suppression logique/restauration, drawer/ouverture de contexte, tests et critères d'acceptation.

## 5. Phase 4 — Implémentation métier

**Statut : NON AUTORISÉE pour le moment**

Après validation d'un module :

```text
branche
→ backend
→ tests backend
→ frontend
→ tests frontend
→ E2E si nécessaire
→ gate
→ PR
→ documentation
```

### Granularité Git / PR

Règle de travail validée :

> Une PR correspond à un lot fonctionnel cohérent et vérifiable, pas à une couche technique isolée.

Ainsi :

```text
modèle + validation Zod
→ commits possibles
→ pas une PR autonome par défaut

capacité métier complète
→ backend
→ permissions
→ frontend
→ tests
→ documentation
→ une PR cohérente
```

Les PR ne doivent ni être des micro-lots techniques, ni devenir des regroupements de fonctionnalités indépendantes.

---

## 6. Extensions à préserver sans les développer prématurément

Le domaine doit rester compatible avec :

- historique graphique de prix ;
- alertes sur coûts / marges / volatilité ;
- analyse d'impact d'un produit sur les fiches ;
- comparaison fournisseurs ;
- import automatisé de mercuriales ;
- OCR de facture / catalogue ;
- reverse recipe ;
- optimisation de marge par IA ;
- analyse transversale des fiches ;
- assistant de rédaction process ;
- génération d'infographie process ;
- recherche globale ;
- rappels / notifications ;
- exports et partage avancés.

Principe :

```text
compatibilité structurelle
≠
développement immédiat
```

---



## 7. Prochaine étape immédiate

La longue phase de cadrage transversal est presque terminée.

Prochaine conversation :

1. fermer les champs obligatoires minimaux du Dossier ;
2. choisir la représentation métier de l'affectation Dossier ;
3. vérifier les contraintes réglementaires pertinentes pour M-001 ;
4. effectuer la revue finale de cohérence ;
5. passer les documents globaux en VALIDÉ ;
6. cadrer M-001 ;
7. seulement après validation M-001, créer la branche d'implémentation et commencer le code.

La marge semi-nette, la Fiche process, l'OCR/IA et l'optimiseur détaillé ne bloquent pas ce passage.
