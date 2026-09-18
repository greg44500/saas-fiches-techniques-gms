# AGENTS.md — Règles de travail sur SAAS-CORE-API

## 1. Objet

Ce fichier est le point d'entrée opérationnel pour tout agent IA ou développeur assisté intervenant sur `saas-core-api`.

Il ne remplace pas les contrats canoniques. Il impose la méthode de travail, l'ordre d'autorité et les règles minimales à respecter avant toute modification.

Il s'applique à l'ensemble du dépôt sauf instruction plus spécifique portée par un éventuel `AGENTS.md` situé dans un sous-répertoire.

---

## 2. Ordre d'autorité

En cas de contradiction, respecter cet ordre :

1. code actuel et contraintes réelles de base de données ;
2. tests automatisés réellement exécutés et validés ;
3. contrats canoniques actifs ;
4. architecture, sécurité et conventions canoniques ;
5. `docs/DEBT.md` ;
6. documentation opérationnelle ;
7. documents historiques ou temporaires ;
8. `docs/REPRISE-CURRENT.md`.

Une amorce de conversation, une checklist ancienne ou une synthèse historique ne peut jamais redéfinir le comportement réel du Core.

---

## 3. Avant toute modification

Toujours :

1. vérifier la branche et le HEAD réels ;
2. lire `docs/REPRISE-CURRENT.md` ;
3. lire les sections pertinentes de `docs/DEBT.md` ;
4. lire les contrats et guidelines liés au lot ;
5. inspecter le code et les tests réellement concernés ;
6. définir le périmètre avant d'éditer.

Ne pas modifier un fichier uniquement parce qu'il semble logiquement concerné.

Ne pas créer une fonctionnalité uniquement pour compléter une checklist ou un scénario de test si aucun contrat fonctionnel ne la prévoit.

---

## 4. Stack et contraintes

Le Core utilise :

- JavaScript uniquement, ESM ;
- Node.js 24.x selon la contrainte `engines` du dépôt ;
- Express ;
- MongoDB + Mongoose ;
- Zod ;
- React + Vite ;
- Tailwind CSS ;
- shadcn/ui ;
- Redux Toolkit ;
- RTK Query ;
- Vitest ;
- React Testing Library ;
- Supertest ;
- Playwright.

Ne pas introduire TypeScript ni une nouvelle bibliothèque structurante sans décision explicite.

---

## 5. Architecture backend

Respecter la séparation des responsabilités :

```text
routes
→ exposition des endpoints

controllers
→ adaptation HTTP

services
→ logique métier et invariants

models
→ persistance MongoDB

validation
→ protection des entrées
```

Ne pas placer de logique métier lourde dans les routes ou controllers.

Toute modification de modèle, index, contrainte ou comportement transactionnel doit être analysée pour déterminer si une migration est nécessaire.

Les transactions MongoDB existantes font partie des invariants du Core et ne doivent pas être contournées.

---

## 6. Architecture frontend

Respecter les responsabilités suivantes :

```text
useState
→ état local

Redux Toolkit
→ état global client réellement nécessaire

RTK Query
→ état serveur et appels API
```

Les pages assemblent des composants ; elles ne portent pas de logique métier lourde.

Utiliser les composants réutilisables avant d'en créer de nouveaux.

Structure de référence :

```text
components/ui
→ primitives shadcn/ui

components/shared
→ composants transverses réutilisables

features/
→ domaines fonctionnels

app/
→ composition globale
```

Les tableaux, formulaires, skeletons, états vides, filtres, pagination et confirmations doivent rester cohérents et réutilisables.

---

## 7. Sécurité, tenancy et autorisations

Toujours préserver :

- isolation stricte des Workspaces ;
- authentification et contrôle d'accès existants ;
- distinction entre rôle Platform et rôle Workspace ;
- distinction entre permission RBAC, capability commerciale et quota ;
- validation stricte des entrées ;
- secrets hors du frontend et hors de Git ;
- AuditLog lorsque le contrat l'exige.

Ne jamais considérer `createdBy` comme un substitut implicite à l'ownership métier ou au Workspace.

Les contrôles de permissions métier des SaaS dérivés doivent utiliser les points d'extension prévus au lieu d'étendre arbitrairement les constantes Core.

---

## 8. Core et SaaS dérivés

Le Core fournit des mécanismes génériques. Les produits dérivés fournissent le métier.

Avant d'ajouter une fonctionnalité, déterminer :

```text
générique et réutilisable par plusieurs SaaS
→ candidat Core

spécifique à un produit
→ doit rester dans le SaaS dérivé
```

Les points d'extension canoniques sont documentés dans :

- `docs/derived-saas/DERIVED-SAAS.md` ;
- `docs/derived-saas/EXTENSION-POINTS.md`.

Ne pas ajouter au Core une fonctionnalité simplement parce qu'elle pourrait être utile un jour.

---

## 9. Git, branches et releases

Ne pas modifier directement `main` pour un lot nécessitant validation.

Utiliser une branche dédiée et une Pull Request.

Les tags de release publiés sont immuables. Ne jamais déplacer ou réécrire un tag existant.

Pour une évolution Core intégrée à un SaaS dérivé, suivre la procédure de mise à niveau documentée et mettre à jour `core-origin.json` uniquement après validation de l'intégration.

---

## 10. Tests et gates

Ne jamais annoncer qu'un lot est validé sans résultat réellement exécuté.

La gate canonique Core est :

```bash
npm run release:check
```

Elle couvre notamment la vérification de release, le lint, les tests backend, le lint/tests/build frontend et les E2E Playwright.

`npm run format:check` reste un contrôle séparé tant que la documentation canonique le définit ainsi.

Pour un changement ciblé :

1. lancer les tests locaux pertinents ;
2. lancer les suites globales exigées ;
3. lancer la gate canonique lorsque le lot le requiert ;
4. vérifier la CI de la PR ;
5. vérifier la CI post-merge lorsqu'elle est requise.

---

## 11. Documentation

Toute modification doit vérifier si elle implique une mise à jour de :

- contrats canoniques ;
- `docs/DEBT.md` ;
- `docs/REPRISE-CURRENT.md` ;
- `docs/operations/OPERATIONS.md` ;
- documentation de dérivation ;
- documentation de release.

Documenter le pourquoi, les invariants et les décisions ; éviter les commentaires ou documents qui répètent simplement le code.

---

## 12. Dette

`docs/DEBT.md` est le registre canonique des dettes actives.

Ne pas implémenter une dette différée ou conditionnelle sans que sa condition d'activation soit réellement satisfaite ou qu'une décision explicite ne la replanifie.

Toute nouvelle dette identifiée doit être qualifiée, contextualisée et reliée au bon périmètre : Core, SaaS dérivé ou production.

---

## 13. Méthode attendue

Pour chaque lot :

```text
état réel
→ analyse
→ périmètre
→ approche
→ implémentation
→ tests
→ gate
→ PR
→ documentation
```

Rester dans le périmètre validé.

En cas d'incertitude matérielle sur le comportement du dépôt, vérifier le code, Git ou les tests plutôt que supposer.
