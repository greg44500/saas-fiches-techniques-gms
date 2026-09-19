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

**État : architecture fonctionnelle largement cadrée — formules économiques et Atelier d'optimisation à finaliser**

Décisions établies :

- quantité nette saisie, brute calculée ;
- coûts HT ;
- CM + Économat ;
- concurrence prix/édition sans réécriture silencieuse ;
- version DRAFT / VALIDATED / ARCHIVED ;
- version VALIDATED immuable ;
- revalorisation explicite ;
- snapshot économique historique ;
- validation backend complète ;
- absence de prix distincte de zéro ;
- invariants applicables au Workspace Owner ;
- copie inter-magasin sans prix ni historique source ;
- archivage avant éventuelle suppression définitive ;
- aucune purge automatique uniquement par âge ;
- politique Workspace de cycle de vie avec comportement standard ;
- TVA distincte des coûts HT, taux réellement utilisé conservé dans la version validée ;
- Objectif de marge = taux de marge souhaitable défini dans le contexte du magasin et utilisé comme cible de la fiche ;
- aucun remplacement arbitraire de cet indicateur par taux de marque ou autre métrique ;
- Atelier d'optimisation non destructif inspiré de Lightroom comme capability payante différenciante ;
- sliders globaux et courbe multipoints complémentaires ;
- histogramme composition/coût, avant/après et visualisations professionnelles ;
- lignes modulables avec quantité de référence et bornes min/max configurables ;
- pièces/unités et lignes verrouillées non modulables ;
- redistribution sous contrainte afin de conserver 100 % de composition et le poids final lorsqu'il est verrouillé ;
- enveloppe de qualité perçue et refus explicite d'un objectif économiquement impossible ;
- validations backend indépendantes des valeurs envoyées par l'utilisateur ;
- application d'une simulation au DRAFT uniquement sur action explicite.

À finaliser :

- formule exacte Objectif de marge → coefficient → prix théorique ;
- prix conseillé / retenu ;
- marge réelle / semi-nette ;
- arrondis ;
- paramètres mathématiques exacts des sliders et de la courbe ;
- bornes de sécurité globales de l'optimiseur ;
- placement commercial exact de la capability et inclusion V1 ou phase suivante ;
- types/motifs exacts de version ;
- rétention/suppression définitive.

### 2.5 Fiches process

**État : À CADRER**

Définir relation avec la fiche technique, étapes, durées, points critiques, critères d'acceptabilité, versionnement et données communes/séparées.


### 2.6 Utilisateurs, RBAC, capabilities et quotas

**État : architecture RBAC validée — matrice détaillée à terminer**

Décisions établies :

- réutilisation du RBAC Workspace du Core ;
- un WorkspaceMember porte un seul Role dans le Core v1.0.1 ;
- un rôle personnalisé peut combiner plusieurs responsabilités par ses permissions ;
- Workspace Owner = toutes les permissions métier + tous les dossiers de son Workspace ;
- invariants métier non contournables par l'Owner ;
- PlatformRole sans accès implicite aux données métier Workspace ;
- rôle et périmètre dossier séparés ;
- invitation Core = entrée dans le Workspace + Role ;
- après acceptation, le Workspace Owner affecte séparément les dossiers/magasins ;
- un membre peut temporairement appartenir au Workspace sans dossier affecté ;
- changement de Role et changement de périmètre dossier sont indépendants ;
- l'état du dossier participe à l'autorisation effective ;
- rôles types : Acheteur, Économe, Responsable fiches techniques, Contributeur fiches techniques, Lecteur métier ;
- suppression définitive des fiches réservée au Workspace Owner dans le cadrage courant ;
- Atelier d'optimisation = capability payante distincte du RBAC.

À finaliser :

- matrice précise des permissions par rôle type ;
- permission de validation par défaut de l'Économe ;
- lecture des historiques détaillés par le Lecteur métier ;
- stockage technique des affectations dossier ;
- rattachement commercial exact de la capability d'optimisation ;
- autres capabilities commerciales ;
- quotas.


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

**État : À FINALISER**

Le périmètre V1 sera validé après le bloc économique, les permissions finales, la fiche process et les contraintes réglementaires.

---

## 3. Phase 2 — Validation documentaire globale

**Statut : NON DÉMARRÉE**

Après validation des sujets de la Phase 1 :

- finaliser `docs/PRODUCT-SCOPE.md` ;
- finaliser `docs/domain/GLOSSARY.md` ;
- finaliser `docs/domain/DOMAIN-MODEL.md` ;
- finaliser la présente roadmap ;
- réévaluer `docs/DEBT.md` ;
- mettre à jour `docs/REPRISE-CURRENT.md`.

Gate de décision :

```text
cadrage global validé
→ autorisation de cadrer M-001
```

Aucun modèle métier Mongoose avant cette gate.

---

## 4. Phase 3 — Cadrage M-001

**Statut : BLOQUÉ par la validation du cadrage global**

Le premier module ne sera choisi qu'après finalisation de la Phase 2.

Le cadrage M-001 devra couvrir les exigences définies dans `AGENTS.md` :

- objectif ;
- acteurs ;
- cas d'usage ;
- modèles ;
- règles métier ;
- invariants ;
- lifecycle ;
- tenancy / ownership ;
- RBAC ;
- capabilities / quotas ;
- API ;
- validation ;
- audit ;
- frontend ;
- migrations ;
- tests ;
- critères d'acceptation.

---

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

Poursuivre sans coder dans cet ordre :

1. terminer la matrice détaillée des permissions des rôles types ;
2. figer la formule Objectif de marge → coefficient → prix théorique à partir des fiches de référence ;
3. cadrer prix conseillé / prix retenu ;
4. cadrer marge réelle / marge semi-nette ;
5. cadrer les règles d'arrondi ;
6. cadrer la Fiche process ;
7. terminer les champs obligatoires et règles de persistance du Dossier/Magasin ;
8. cadrer les paramètres mathématiques et de sécurité de l'Atelier d'optimisation ;
9. finaliser capabilities / quotas ;
10. finaliser intégrations et contraintes réglementaires ;
11. fixer V1 / hors V1 ;
12. valider globalement la documentation ;
13. seulement ensuite cadrer M-001.

Aucun modèle métier Mongoose avant cette validation globale.
