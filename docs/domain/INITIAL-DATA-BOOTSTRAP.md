# Données initiales et bootstrap métier

**Statut :** VALIDÉ  
**Date de validation :** 2026-09-21  
**Périmètre :** rôles métier, référentiel Produit initial, Fournisseurs/catalogues de référence et stratégie de bootstrap bêta

---

## 1. Principe

Le produit démarre sur une base MongoDB propre pour les premières données réelles.

Les Workspaces actuellement présents dans les bases de développement sont des données de test et ne constituent pas un historique de production à migrer.

Conséquence :

```text
migration historique M-001
→ aucune

bootstrap métier initial
→ oui lorsque des données de référence apportent une valeur réelle
```

Le bootstrap n'est pas une migration de compatibilité.

Il installe volontairement des données métier de départ validées pour rendre le produit exploitable dès les bêta-tests.

---

## 2. Frontière Core / Produit pour les rôles

Le Core reste propriétaire uniquement des mécanismes génériques :

```text
Role
Permission
WorkspaceMember
rôles système génériques
moteur RBAC
points d'extension
```

Le produit GMS reste propriétaire :

```text
permissions métier
profils / presets métier
matrices métier
libellés métier
bootstrap de ces profils
```

Aucun profil comme :

```text
Acheteur
Économe
Responsable FT
Contributeur FT
Lecteur métier
```

n'est ajouté comme rôle système dans `saas-core-api`.

---

## 3. Rôle système Owner

Le rôle système `owner` reste générique dans le Core.

Le produit compose ses permissions métier dans le registre applicatif prévu :

```text
backend/config/applicationRolePermission.registry.js
```

Ainsi :

```text
Core owner
+
permissions métier déclarées par le produit
→ autorité effective de l'Owner dans le SaaS GMS
```

Cette composition ne transforme pas `owner` en rôle métier GMS et ne modifie pas les constantes du Core.

---

## 4. Presets de rôles métier

Le produit définit conceptuellement des presets de rôles métier :

```text
Acheteur / Responsable achats
Économe / Gestionnaire des prix
Responsable Fiches Techniques
Contributeur Fiches Techniques
Lecteur métier
```

Un preset est une définition produit destinée à créer un `Role` Workspace personnalisé avec un ensemble cohérent de permissions métier.

```text
preset produit
→ création dans un Workspace
→ Role personnalisé Core
→ attribution à WorkspaceMember
```

Le nom du preset n'est jamais une autorité technique : seules les permissions persistées dans le Role gouvernent les actions.

---

## 5. Ne pas provisionner trop tôt des rôles incomplets

Les profils métier couvrent plusieurs modules.

Exemples :

```text
Acheteur
→ M-002 + M-003 principalement

Économe
→ M-003 + M-004

Responsable FT
→ M-004

Contributeur FT
→ M-004
```

M-001 ne doit donc pas inventer ou figer artificiellement les permissions futures de ces profils.

Décision :

```text
M-001
→ définit les permissions dossier
→ Owner peut tester tout M-001
→ profils métier reconnus conceptuellement

provisionnement final d'un preset
→ seulement lorsque son ensemble de permissions utile est suffisamment cadré
```

Cela évite de créer des rôles de départ qui devraient être immédiatement remodelés à chaque module suivant.

---

## 6. Bêta M-001

Pour le premier bêta-test Workspace :

```text
Workspace bêta
→ Owner
→ rôle système Core
→ permissions M-001 composées par le produit
→ tous les Dossiers du Workspace
```

Ce parcours suffit pour tester intégralement M-001.

Le bêta-testeur Platform reste séparé :

```text
PlatformRole
→ administration Platform selon permissions Platform
→ aucun accès implicite aux données métier Workspace
```

---

## 7. Référentiel Produit initial — M-002

Après validation et implémentation de M-002, le produit pourra installer un jeu initial de Produits canoniques.

Le bootstrap doit respecter exactement les mêmes règles que les flux normaux :

```text
normalisation
contrôle des doublons
alias
identité canonique
déclinaisons structurées
traçabilité
```

Il ne doit jamais utiliser un chemin de persistance qui contourne les invariants du module.

Les données initiales sont :

- versionnées ;
- déterministes ;
- idempotentes ;
- traçables ;
- réutilisables par tous les Workspaces autorisés.

---

## 8. Fournisseurs et catalogues initiaux — M-003

Après validation et implémentation de M-003, les catalogues déjà disponibles peuvent servir de base aux bêta-tests.

Ils suivent le contrat de portée :

```text
GLOBAL_SHARED
→ édition de référence vérifiée et partageable

WORKSPACE_PRIVATE
→ donnée propre à un Workspace
```

Un catalogue ne devient jamais `GLOBAL_SHARED` uniquement parce qu'il ne contient pas de tarif négocié.

Sa provenance et son caractère partageable doivent être vérifiés avant publication globale.

---

## 9. Import catalogue et Produits canoniques

Invariant :

```text
1 ligne de catalogue
≠ 1 Produit canonique créé
```

Le bootstrap des catalogues suit le même moteur que les imports normaux :

```text
édition catalogue
→ lignes fournisseur
→ réutilisation des références connues
→ rapprochement Produit/déclinaison
→ cas ambigus non résolus
→ validation
```

Une édition peut être exploitable même si toutes ses lignes ne sont pas encore rapprochées d'un Produit canonique.

---

## 10. Versionnement des données de référence

Les données initiales doivent pouvoir être identifiées par une version produit/référentiel.

Conceptuellement :

```text
referenceDataVersion
source
importedAt
provenance
```

Le mécanisme exact de persistance sera fermé dans le module propriétaire.

Un bootstrap relancé ne doit jamais créer silencieusement des doublons.

---

## 11. Ordre par module

```text
M-001
→ permissions Dossier
→ pas de migration historique
→ pas de seed Dossier
→ Owner suffisant pour bêta M-001

M-002
→ référentiel Produit canonique
→ bootstrap Produits initial validé

M-003
→ Fournisseurs / Articles / catalogues
→ bootstrap catalogues de référence validés

M-004
→ finalisation des profils FT et autres presets dépendant des permissions Fiches
```

Les presets de rôles métier peuvent être provisionnés progressivement lorsque leur matrice de permissions devient réellement exploitable.

---

## 12. Règles de bootstrap

Tout bootstrap métier doit être :

```text
explicite
versionné
idempotent
testé
traçable
non destructif
compatible avec les invariants normaux du module
```

Il ne doit jamais :

- transformer des données de développement jetables en données de référence ;
- contourner les validations métier ;
- modifier les rôles système du Core ;
- créer des doublons silencieux ;
- publier globalement une donnée dont le droit de partage n'est pas établi.

---

## 13. Principe directeur

```text
Core
→ moteur générique

Produit
→ vocabulaire métier
→ profils métier
→ données de référence métier
→ bootstrap métier
```
