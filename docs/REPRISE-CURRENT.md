# SAAS-FICHES-TECHNIQUES-GMS — Reprise courante

> **Statut : upgrade Core post-tag 1.2.1 en finalisation dans la PR #19. Première Core Gate #122 verte. M-002 reste suspendu jusqu'au merge et à la Core Gate post-merge.**
>
> **Dernière mise à jour : 2026-09-24**
>
> Le code réel, les contraintes DB, les tests/gates réellement exécutés et les contrats canoniques priment sur cette synthèse.

---

## 1. Autorité

Ordre d'autorité :

1. code réel + contraintes DB ;
2. tests/gates réellement exécutés ;
3. contrats fonctionnels validés ;
4. contrats Core correspondant à la version intégrée ;
5. architecture/sécurité/guidelines ;
6. dette active ;
7. documentation opérationnelle ;
8. présente reprise.

Principe directeur :

```text
Core = fondations génériques
Produit = métier
```

---

## 2. État Git et provenance Core

Dépôt produit :

```text
greg44500/saas-fiches-techniques-gms
```

`main` de référence avant la PR #19 :

```text
2fb8273311fc91e81153c0537d28279d234f9229
Merge pull request #18 from greg44500/core-update/v1.2.1
```

Branche d'upgrade :

```text
core-update/platform-navigation-db55f83
```

PR :

```text
#19 — chore(core): integrate Platform navigation extension
```

Provenance Core finalisée dans la PR :

```text
repository : greg44500/saas-core-api
version    : 1.2.1
tag        : v1.2.1
commit     : db55f8342837d7fe3d333fd962bdc7939a8c4603
```

Le commit `db55f834…` est un descendant du tag stable `v1.2.1`. Aucune version ou tag `1.2.2` n'est inventé.

L'historique Git du Core est conservé : la branche produit contient un vrai merge de `db55f834…`, et ce commit est un ancêtre du HEAD de la branche d'upgrade.

`core-origin.json` est l'autorité de provenance.

---

## 3. Lot Core intégré

Le lot apporte notamment :

- l'exposition séparée de `applicationGlobalPermissions` dans le contexte Platform ;
- le point d'extension frontend `frontend/src/app/application-platform-navigation.js` ;
- la composition de la navigation Platform Core + produit ;
- le filtrage des entrées de navigation selon les autorisations ;
- les adaptations de `PlatformGuard` et de la sidebar ;
- les tests et contrats Core associés ;
- la documentation Core dérivée correspondante.

Invariant d'autorisation :

```text
permissions
→ permissions Platform Core

applicationGlobalPermissions
→ permissions globales applicatives du produit
```

Un Platform Super Admin ne devient pas implicitement gouverneur global du référentiel Produit.

---

## 4. Validation de l'upgrade Core

État confirmé :

```text
merge réel upstream-core db55f834… dans la branche produit
→ OK

git merge-base --is-ancestor db55f834… HEAD
→ 0

diff initial Core
→ 14 fichiers
→ 891 ajouts
→ 55 suppressions

Core Gate #122 sur PR #19
→ success
```

Après cette première gate, `core-origin.json` et la présente reprise ont été finalisés dans la même PR.

Reste obligatoire avant reprise fonctionnelle de M-002 :

```text
nouvelle Core Gate sur le HEAD final de PR #19
→ merge PR #19 dans main
→ Core Gate post-merge sur main
→ seulement ensuite réaligner feature/m002-catalogue-produits
```

---

## 5. Branche M-002 à préserver

La branche métier existante doit être conservée :

```text
feature/m002-catalogue-produits
```

Dernier HEAD connu avant réalignement Core :

```text
f7b9ec4c06bfaaa59a683aee75dfbddcf95fe8a5
```

Ne pas recréer cette branche et ne pas intégrer le Core directement dedans.

Après validation post-merge de la PR #19 :

```text
main à jour
→ merge main dans feature/m002-catalogue-produits
→ résolution éventuelle des conflits
→ gates
→ reprise M-002
```

---

## 6. Recadrage M-002 validé à conserver

### 6.1 Produit canonique et variantes

- un `CanonicalProduct` peut avoir zéro `ProductVariant` ;
- aucune variante générique artificielle ne doit être créée ;
- les produits sans variante restent visibles avec un état explicite du type « Aucune déclinaison exploitable » ;
- le seed M-002 suivant est `m002-reference-v3` ;
- les seeds v1/v2 restent immuables.

### 6.2 Caractéristiques et usages

Ajouter le type de caractéristique :

```text
CUT
→ Pièce / découpe
```

Il est distinct de `PRESENTATION`.

Ajouter :

```text
usageType = null | PAI | PAE
```

`usageType` participe à la signature d'une `ProductVariant`.

Ne pas reclasser automatiquement les charcuteries comme `Jambon blanc` ou `Bacon` en PAI/PAE.

### 6.3 Gammes alimentaires

Les gammes restent strictement limitées à :

1. Frais ;
2. Conserves ;
3. Surgelés ;
4. Sous-vide cru / épluchés ;
5. Sous-vide cuit.

La gamme 6 est supprimée.

Toute migration doit être déterministe et refuser les cas ambigus plutôt que d'inventer une correspondance.

### 6.4 Recherche et UX

Recherche attendue notamment sur des expressions comme :

```text
carotte râpée
bœuf paleron
agneau gigot tranché
```

UX retenue :

```text
Produit canonique
→ variantes groupées

pagination
→ par CanonicalProduct

actions + / -
→ au niveau variante
```

Placeholder Workspace :

```text
Rechercher un produit…
```

Ne pas exposer le terme technique « alias » dans l'interface utilisateur.

---

## 7. Autorisation globale Produit à reprendre après upgrade

Permissions applicatives prévues :

```text
product:reference:read
product:reference:manage
```

Rôle système produit prévu :

```text
product_reference_governor
```

La future entrée Platform :

```text
Référentiel Produits
```

doit être déclarée par le produit via le nouveau point d'extension de navigation et sa visibilité doit dépendre de `applicationGlobalPermissions`.

La route métier globale `/product-reference` reste protégée par l'autorisation Application Global du produit. Elle ne doit pas être placée aveuglément sous `PlatformGuard`.

---

## 8. Tests M-002 à reprendre

Après réalignement de la branche M-002 :

- vérifier les tests backend M-002 ;
- vérifier les tests frontend M-002 ;
- vérifier tenancy / RBAC / Application Global auth ;
- vérifier seeds et migrations ;
- exécuter les E2E critiques ;
- exécuter la gate canonique complète.

Le dernier recadrage M-002 n'a pas encore de preuve explicite d'une exécution globale E2E finale ; ne pas annoncer cette validation sans nouvelle preuve.

---

## 9. Règle de reprise immédiate

Tant que la PR #19 n'est pas fusionnée avec une Core Gate post-merge verte :

```text
ne pas développer M-002
```

Une fois la séquence Core terminée :

```text
vérifier main réel
→ vérifier core-origin.json
→ réaligner feature/m002-catalogue-produits sur main
→ exécuter les gates applicables
→ reprendre le lot M-002 recadré
→ QA visuelle
→ une PR M-002 cohérente
```
