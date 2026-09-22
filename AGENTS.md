# AGENTS.md — Règles de travail sur SAAS-FICHES-TECHNIQUES-GMS

## 1. Objet

Ce dépôt contient le SaaS métier `saas-fiches-techniques-gms`.

Il est dérivé du Core :

```text
greg44500/saas-core-api
```

La provenance exacte du Core intégré est enregistrée dans :

```text
core-origin.json
```

La version propre au produit est enregistrée dans :

```text
product-release.json
```

Principe directeur :

```text
Core = fondations génériques
Produit = métier
```

Ce fichier constitue le point d'entrée opérationnel pour tout agent IA ou développeur assisté intervenant sur `saas-fiches-techniques-gms`.

Il ne remplace pas les contrats canoniques. Il définit la méthode de travail, l'ordre d'autorité et les règles minimales à respecter avant toute modification.

---

## 2. Ordre d'autorité

En cas de contradiction, respecter cet ordre :

1. code actuel et contraintes réelles de base de données ;
2. tests automatisés réellement exécutés et validés ;
3. contrats fonctionnels produit validés ;
4. contrats du Core correspondant à la version enregistrée dans `core-origin.json` ;
5. architecture, sécurité et guidelines canoniques ;
6. `docs/DEBT.md` ;
7. documentation opérationnelle ;
8. `docs/REPRISE-CURRENT.md`.

Une amorce de conversation, une ancienne synthèse ou une checklist historique ne peut jamais redéfinir le comportement réel du produit.

Git, le code et les tests priment.

---

## 3. Avant toute modification importante

Toujours :

1. vérifier la branche active ;
2. vérifier le HEAD réel ;
3. vérifier l'état Git ;
4. lire `docs/REPRISE-CURRENT.md` ;
5. vérifier `core-origin.json` ;
6. vérifier `product-release.json` ;
7. lire les sections pertinentes de `docs/DEBT.md` ;
8. lire les contrats et guidelines liés au lot ;
9. inspecter le code et les tests réellement concernés ;
10. déterminer si le besoin relève du Core ou du produit ;
11. définir le périmètre avant toute modification.

Ne pas modifier un fichier uniquement parce qu'il semble logiquement concerné.

Ne pas créer une fonctionnalité uniquement pour compléter une checklist ou un test si aucun contrat fonctionnel validé ne la prévoit.

---

## 4. Frontière Core / métier

Avant toute évolution, classer le besoin :

```text
générique et réutilisable par plusieurs SaaS
→ candidat Core

spécifique à saas-fiches-techniques-gms
→ module métier produit
```

Ne jamais corriger silencieusement un besoin générique directement dans le produit.

Si une évolution générique est nécessaire :

1. la traiter dans `saas-core-api` ;
2. la tester ;
3. la versionner ;
4. publier une nouvelle version Core ;
5. l'intégrer ensuite dans le produit via une branche `core-update/vX.Y.Z`.

Utiliser les points d'extension du Core avant de modifier ses fondations.

Les références principales sont notamment :

```text
docs/derived-saas/DERIVED-SAAS.md
docs/derived-saas/EXTENSION-POINTS.md
```

---

## 5. Cadrage produit obligatoire

Aucun modèle métier Mongoose ne doit être créé avant validation du cadrage global du produit.

Documents attendus :

```text
docs/PRODUCT-SCOPE.md
docs/ROADMAP.md
docs/DEBT.md
docs/REPRISE-CURRENT.md
docs/domain/GLOSSARY.md
docs/domain/DOMAIN-MODEL.md
```

Le cadrage global doit définir au minimum :

- problème métier ;
- utilisateurs ;
- proposition de valeur ;
- périmètre V1 ;
- hors périmètre ;
- domaines fonctionnels ;
- vocabulaire métier ;
- ownership et tenancy ;
- rôles ;
- capabilities commerciales ;
- quotas éventuels ;
- intégrations externes ;
- contraintes réglementaires ;
- roadmap initiale.

Aucune entité métier, relation, règle fonctionnelle ou contrainte ne doit être inventée avant validation de ce cadrage.

---

## 6. Cadrage de chaque module métier

Chaque module métier doit être cadré avant implémentation.

Convention :

```text
M-001
M-002
M-003
...
```

Le cadrage couvre au minimum :

- objectif ;
- acteurs ;
- cas d'usage ;
- hors périmètre ;
- modèles ;
- relations ;
- règles métier ;
- invariants ;
- cycle de vie ;
- tenancy ;
- ownership ;
- RBAC ;
- capabilities ;
- quotas ;
- API ;
- validation ;
- audit ;
- archivage ou suppression ;
- frontend attendu ;
- points d'extension Core ;
- migrations ;
- seeds ;
- tests unitaires ;
- tests d'intégration ;
- tests frontend ;
- tests E2E si nécessaires ;
- cas limites ;
- critères d'acceptation ;
- dette différée ;
- ordre d'implémentation.

Après validation seulement :

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

## 7. Stack et contraintes techniques

Le produit conserve la stack du Core :

- JavaScript uniquement ;
- ESM ;
- Node.js 24.x selon la contrainte `engines` du dépôt ;
- Express ;
- MongoDB ;
- Mongoose ;
- Zod ;
- React ;
- Vite ;
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

## 8. Architecture backend

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

validations
→ protection des entrées
```

Aucune logique métier lourde dans les routes ou controllers.

Toute modification de modèle, index, contrainte ou comportement transactionnel doit être analysée pour déterminer si une migration est nécessaire.

Les invariants transactionnels hérités du Core ne doivent pas être contournés.

---

## 9. Architecture frontend

Respecter la structure suivante :

```text
components/ui
→ primitives shadcn/ui

components/shared
→ composants transverses réutilisables

features/<feature>
→ fonctionnalités métier

pages
→ assemblage

app/
→ composition globale
```

Gestion d'état :

```text
useState
→ état local

Redux Toolkit
→ véritable état global client

RTK Query
→ état serveur et appels API
```

Les pages assemblent les composants et ne doivent pas porter de logique métier lourde.

Toujours rechercher un composant réutilisable avant d'en créer un nouveau.

---

## 10. Tenancy et ownership

Toute donnée métier doit avoir une ownership explicite.

Pour une ressource appartenant à un Workspace, privilégier :

```text
resource.workspace
```

`createdBy` et `updatedBy` servent à l'audit.

Ils ne doivent pas être utilisés comme substituts implicites à l'ownership.

L'isolation stricte des Workspaces héritée du Core doit toujours être préservée.

---

## 11. RBAC, capabilities et quotas

Toujours distinguer :

```text
RBAC
→ qui peut agir ?

Capability
→ le plan commercial autorise-t-il cette fonction ?

Quota
→ combien peut-on en utiliser ?
```

Ne pas mélanger ces trois responsabilités.

Les permissions métier doivent utiliser les points d'extension prévus par le Core plutôt que modifier arbitrairement ses constantes ou fondations.

---

## 12. Sécurité

Toujours préserver :

- authentification Core ;
- sessions et tokens existants ;
- isolation des Workspaces ;
- distinction rôle Platform / rôle Workspace ;
- validation stricte des entrées ;
- secrets hors du frontend ;
- secrets hors de Git ;
- AuditLog lorsque le contrat le prévoit ;
- protections transactionnelles existantes ;
- contrôles d'accès côté backend.

Une protection frontend ne remplace jamais une autorisation backend.

---

## 13. MongoDB

Le développement local utilise le serveur MongoDB existant :

```text
127.0.0.1:27017
replica set : rs0
```

Le produit utilise ses propres bases logiques.

Développement :

```text
saas_fiches_techniques_gms_dev
```

Tests backend :

```text
saas_fiches_techniques_gms_test
```

E2E :

```text
saas_fiches_techniques_gms_e2e_test
```

Ne pas créer un nouveau serveur, port, cluster ou replica set sans besoin réel.

Les tests ne doivent jamais utiliser une base de développement ou de production.

---

## 14. Git et branches

Ne pas modifier directement `main` lorsqu'un lot nécessite validation.

Utiliser une branche dédiée et une Pull Request.

Ne pas mélanger plusieurs fonctionnalités indépendantes dans un même lot.

Rester strictement dans le périmètre validé.

---

## 15. Upgrades Core

Les remotes de référence sont :

```text
origin
→ dépôt saas-fiches-techniques-gms

upstream-core
→ greg44500/saas-core-api
```

Les upgrades Core suivent par défaut :

```text
upstream-core
→ tag stable
→ branche core-update/vX.Y.Z
→ intégration
→ résolution des conflits produit
→ adaptations produit nécessaires
→ tests
→ gate
→ mise à jour core-origin.json
→ PR
→ merge
→ validation post-merge
```

Exception explicite : lorsqu'un lot Core validé est volontairement livré sans nouvelle release ni nouveau tag, le produit peut intégrer le commit exact validé depuis `upstream-core/main`. Dans ce cas :

- le SHA complet du commit devient l'autorité de provenance dans `core-origin.json` ;
- la `version` et le `tag` existants restent ceux de la dernière release stable et ne sont jamais artificiellement incrémentés ;
- la branche produit utilise un nom explicite de type `core-update/<objet>-<sha7>` ;
- le diff entre le commit Core précédemment intégré et le nouveau commit est revu avant intégration ;
- cette exception ne vaut jamais autorisation d'intégrer aveuglément le dernier `upstream-core/main`.

Les tags Core publiés sont immuables.

`core-origin.json` ne doit être mis à jour qu'après validation réelle de l'intégration.

---

## 16. Identité Core et identité produit

Les responsabilités sont distinctes :

```text
core-release.json
→ identité/version du Core

core-origin.json
→ provenance exacte du Core intégré au produit

product-release.json
→ identité/version propre à saas-fiches-techniques-gms
```

Les versions applicatives du produit sont indépendantes des versions du Core.

Les `package.json` et lockfiles conservent l'identité et la version du Core conformément au contrat de dérivation.

Ne pas les renommer ou les reversionner uniquement pour refléter l'identité commerciale du produit.

---

## 17. Tests et qualité

Ne jamais annoncer un test ou une gate comme validé sans preuve réellement exécutée.

Pour chaque module métier, prévoir selon le risque :

- tests unitaires ;
- tests d'intégration backend ;
- tests frontend ;
- tests de permissions ;
- tests de tenancy ;
- tests des règles métier ;
- E2E critiques.

Les tests Core ne remplacent jamais les tests métier.

La gate canonique héritée du Core est :

```bash
npm run release:check
```

`npm run format:check` reste un contrôle séparé tant que la documentation canonique le définit ainsi.

Les bases MongoDB de tests doivent être explicitement dédiées aux tests.

---

## 18. Documentation

Toute modification doit vérifier si elle nécessite une mise à jour de :

- contrats fonctionnels produit ;
- `docs/PRODUCT-SCOPE.md` ;
- `docs/ROADMAP.md` ;
- `docs/DEBT.md` ;
- `docs/REPRISE-CURRENT.md` ;
- `docs/domain/GLOSSARY.md` ;
- `docs/domain/DOMAIN-MODEL.md` ;
- documentation opérationnelle ;
- documentation de module.

Documenter :

- pourquoi ;
- règles métier ;
- invariants ;
- contrats ;
- décisions ;
- limites connues.

Éviter les documents qui répètent simplement le code.

---

## 19. Synthèse de reprise

`docs/REPRISE-CURRENT.md` décrit exclusivement l'état réel courant de :

```text
saas-fiches-techniques-gms
```

La synthèse `docs/REPRISE-CURRENT.md` du dépôt `saas-core-api` décrit exclusivement l'état du Core au moment de sa propre mise à jour.

Une synthèse Core ne doit jamais remplacer la synthèse produit lors d'un upgrade.

Après un upgrade Core, la synthèse produit doit être mise à jour avec les faits réellement validés sur le produit.

---

## 20. Dette

`docs/DEBT.md` est le registre canonique des dettes actives applicables au produit.

Toute dette doit être qualifiée selon son périmètre :

```text
Core
Produit
Production
```

Une dette générique Core ne doit pas être implémentée directement dans le produit.

Une dette différée ne doit pas être implémentée sans activation réelle de sa condition ou décision explicite de replanification.

---

## 21. Méthode attendue

Pour chaque lot :

```text
état réel
→ analyse
→ périmètre
→ cadrage
→ approche
→ implémentation
→ tests
→ gate
→ PR
→ documentation
```

Toujours expliquer :

1. ce que nous faisons ;
2. pourquoi ;
3. les impacts ;
4. les erreurs possibles ;
5. comment vérifier.

En cas d'incertitude matérielle, vérifier Git, le code, la base de données ou les tests plutôt que supposer.

Principe final :

```text
Core = fondations génériques
SAAS-FICHES-TECHNIQUES-GMS = métier
```
