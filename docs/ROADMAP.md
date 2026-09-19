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

**État : largement validé**

- Workspace comme espace de travail du client ;
- plusieurs dossiers dans un Workspace ;
- dossier comme contexte magasin ;
- règle V1 : `1 dossier = 1 magasin` ;
- catalogue produit mutualisé dans le Workspace ;
- prix et conditions contextualisés par magasin ;
- accès multi-magasins = changement de contexte, jamais partage ou mélange des données locales ;
- un prix spécifique d'un autre magasin ne constitue jamais un fallback ;
- une Fiche technique peut être copiée d'un magasin à un autre en reprenant la composition réutilisable mais jamais les prix, valorisations ou historiques ;
- la fiche cible est recalculée intégralement dans son propre contexte et démarre avec son propre historique.

**À terminer :**

- définir les données minimales d'un magasin/dossier ;
- préciser le lifecycle du dossier ;
- préciser les détails UX et règles d'éligibilité de la copie/import.

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

**État : largement cadré — politique de Prix applicable validée, détails opérationnels à finaliser**

Déjà établi :

- un Produit peut avoir plusieurs Articles chez un même Fournisseur ;
- un Article conserve référence, désignation fournisseur et conditionnement ;
- le conditionnement doit être structuré pour permettre les conversions ;
- poids net / poids net égoutté sont conservés lorsqu'ils sont pertinents ;
- un Tarif fournisseur de référence peut exister sans magasin ;
- un Tarif spécifique magasin est optionnel et séparé ;
- un Prix observé peut provenir d'une facture, d'un import ou plus tard d'un OCR ;
- toutes les données tarifaires sont sourcées et historisées ;
- les prix d'achat sont gérés en HT ;
- les prix unitaires et normalisés sont affichés avec 3 décimales ;
- le moteur conserve une précision interne suffisante ;
- la politique de prix est un paramètre du Workspace, commun à tous les magasins ;
- la valeur par défaut est `Tarif négocié` ;
- mode Tarif négocié : tarif négocié valide → sinon tarif fournisseur ;
- mode Prix facturé : dernier prix facturé exploitable et validé → sinon tarif négocié → sinon tarif fournisseur ;
- un Produit peut être valorisable dans un magasin et non dans un autre ;
- un Produit ne peut être ajouté à une fiche que si un Prix applicable existe dans le magasin courant ;
- les Tarifs négociés sont spécifiques aux magasins et portent leur propre période de validité ;
- validité commerciale et revue opérationnelle sont distinctes ;
- les revues tarifaires peuvent être conduites par magasin et historisées ;
- un Prix facturé doit être contrôlé puis validé pour devenir exploitable.

À finaliser :

- données minimales exactes de la fiche Fournisseur ;
- règles d'unicité/lifecycle des Articles fournisseur ;
- sélection éventuelle d'un Article privilégié ;
- seuil éventuel de fraîcheur d'un Prix facturé validé ;
- règles finales d'alerte selon la source réellement utilisée ;
- fréquence/gouvernance détaillée des revues tarifaires ;
- disponibilité et dates d'effet exactes dans les cas encore non couverts.

### 2.4 Fiches techniques

**État : principes structurants validés, calculs à finaliser**

Déjà établi :

- l'utilisateur renseigne les faits nécessaires ;
- les données dérivées sont calculées automatiquement ;
- l'utilisateur saisit la quantité nette ;
- la quantité brute est calculée via le rendement ;
- le % recette est calculé sur les quantités nettes ;
- % recette distinct du rendement ;
- rendement récupéré depuis le Produit ;
- prix d'achat HT comme base du coût matière ;
- CM = somme des coûts HT des lignes d'ingrédients ;
- Économat = consommables achetés intégrés séparément ;
- les consommables utilisent des quantités réelles et des prix normalisés ;
- Coût total de fabrication = CM + Économat ;
- énergie exclue du Coût total de fabrication ;
- composition distincte de la valorisation ;
- historique des valorisations ;
- impact des changements de prix.
- une modification tarifaire ne réécrit pas silencieusement une fiche en cours ;
- une fiche en cours peut signaler qu'une revalorisation est nécessaire ;
- le backend contrôle les Prix applicables courants avant validation définitive ;
- une fiche validée conserve sa valorisation historique.

À finaliser :

- règle du Prix applicable en présence de plusieurs sources ;
- TVA ;
- marge ;
- coefficient ;
- prix théorique ;
- prix conseillé / retenu ;
- marge semi-nette ;
- arrondis des montants agrégés ;
- versionnement / validation d'une fiche.

### 2.5 Fiches process

**État : À CADRER**

Définir :

- relation avec la fiche technique ;
- étapes ;
- durées ;
- points critiques ;
- critères d'acceptabilité ;
- versionnement ;
- données communes ou séparées.

### 2.6 Utilisateurs, RBAC, capabilities et quotas

**État : socle des rôles métier cadré — matrice de permissions à finaliser**

Décisions établies :

- le Workspace Owner du Core possède implicitement toutes les permissions métier du produit et tous les magasins/dossiers de son Workspace ;
- aucun rôle métier `Admin` spécifique au produit n'est créé à ce stade ;
- les autres rôles métier peuvent être cumulés ;
- leur périmètre peut être limité à certains magasins/dossiers ;
- l'accès à tous les magasins permet de changer de contexte sans fusionner les données de ces magasins ;
- les contrôles d'isolation magasin sont imposés par le backend, y compris pour les utilisateurs ayant plusieurs rôles ;
- utiliser une Fiche technique ne confère pas implicitement le droit de modifier ou valider les prix ;
- rôles métier retenus pour poursuivre le cadrage :
  - Acheteur / Responsable achats ;
  - Économe / Gestionnaire des prix ;
  - Responsable fiches techniques ;
  - Utilisateur métier ;
- une future administration déléguée du Workspace sans transfert de propriété est identifiée comme un besoin générique potentiel du Core, non comme un rôle métier à inventer dans le produit.

À finaliser :

- matrice précise des permissions métier ;
- périmètres magasin par permission/rôle ;
- capabilities commerciales ;
- quotas éventuels.

### 2.7 Paramètres métier

**État : DÉVELOPPEMENT DIFFÉRABLE — besoins à recenser pendant le cadrage**

Le panneau de paramètres peut être reporté.

Pendant le cadrage, chaque donnée potentiellement configurable doit toutefois être classée :

```text
système
Workspace
dossier / magasin
fiche
```

Paramètres candidats identifiés :

- TVA ;
- marge par défaut ;
- arrondis ;
- seuils d'alerte ;
- unités ;
- catégories ;
- conditionnements ;
- autres valeurs réellement démontrées.

### 2.8 Intégrations et contraintes réglementaires

**État : À CADRER**

- import de mercuriales ;
- fichiers / images ;
- export PDF / CSV ;
- e-mail ;
- OCR éventuel ;
- règles fiscales réellement applicables ;
- règles alimentaires / hygiène réellement prises en charge par le produit.

Aucune obligation réglementaire ne doit être inventée.

### 2.9 Périmètre V1 / hors V1

**État : À FINALISER après les étapes précédentes**

Le périmètre final V1 sera validé avant création du premier module métier.

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

Le bloc Produit / approvisionnement / coût direct est désormais suffisamment avancé pour poursuivre sur les calculs économiques encore ouverts.

Ordre recommandé :

```text
1. finaliser le bloc Prix applicable
   → seuil éventuel de fraîcheur du Prix facturé
   → alertes selon source/fallback
   → fréquence/gouvernance détaillée des revues tarifaires

2. finaliser la matrice des rôles/permissions métier liés aux prix et aux magasins

3. TVA et portée de la TVA

4. objectif de marge

5. coefficient / prix théorique

6. prix de vente conseillé / retenu

7. marge réelle / marge semi-nette

8. règles d'arrondi des totaux

9. versionnement / validation d'une fiche technique

10. fiche process

11. données minimales et lifecycle du dossier/magasin

12. capabilities / quotas

13. intégrations / réglementation

14. V1 / hors V1

15. validation documentaire globale

16. seulement ensuite cadrage M-001
```

La PR documentaire #5 reste le lot unique de cadrage global jusqu'à clôture de cette phase.
