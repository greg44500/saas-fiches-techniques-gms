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

**État : partiellement validé**

- Workspace comme espace de travail du client ;
- plusieurs dossiers dans un Workspace ;
- dossier comme contexte magasin ;
- catalogue produit mutualisé dans le Workspace ;
- prix et conditions contextualisés par magasin.

**À terminer :**

- confirmer strictement `1 dossier = 1 magasin` en V1 ;
- définir les données minimales d'un magasin/dossier.

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

### 2.3 Fournisseurs, articles et conditionnements

**État : prochaine étape de cadrage**

À définir :

- fiche Fournisseur ;
- article / référence fournisseur ;
- conditionnement ;
- poids net / poids égoutté ;
- prix par magasin ;
- disponibilité ;
- date d'effet ;
- historique ;
- choix/priorité entre plusieurs offres.

### 2.4 Fiches techniques

**État : principes structurants validés, calculs à finaliser**

Déjà établi :

- l'utilisateur renseigne les faits nécessaires ;
- les données dérivées sont calculées automatiquement ;
- % recette distinct du rendement ;
- rendement récupéré depuis le Produit ;
- composition distincte de la valorisation ;
- historique des valorisations ;
- impact des changements de prix ;
- distinction matières premières / emballages.

À finaliser :

- quantité brute vs nette ;
- toutes les formules de coût ;
- TVA ;
- marge ;
- coefficient ;
- prix théorique ;
- prix conseillé / retenu ;
- marge semi-nette ;
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

**État : À CADRER**

Définir les besoins métier sans dupliquer le Core :

- acteurs métier ;
- permissions métier ;
- extensions des rôles système si nécessaires ;
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

Continuer le cadrage du bloc :

```text
Fournisseur
→ Article fournisseur
→ Conditionnement
→ Prix magasin
→ Historique
```

Puis revenir aux calculs détaillés de la fiche technique avec ces données stabilisées.
