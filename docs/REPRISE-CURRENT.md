# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-28  
**Lot clôturé :** GMS-UX-002 — Référentiel Produits Platform : catégories et lisibilité  
**Lot courant :** M-004 — Fiches techniques + valorisation  
**État M-004 :** CONTRAT FONCTIONNEL VALIDÉ — conception technique autorisée, aucun code métier M-004 créé à ce stade  
**Branche :** `feature/m004-fiches-techniques-valorisation`  
**Base de branche :** `main@b479b217815fad885f233e98b8f3145656641352`

## 1. Ordre d'autorité

~~~text
KB-START-HERE
→ GitHub réel
→ code / contraintes DB
→ tests réellement exécutés
→ docs/m004/M-004-FINAL-CONTRACT.md
→ contrats validés M-001 / M-002 / M-003
→ Core v1.2.1 réellement intégré
→ dette active
→ présente reprise
~~~

En cas de contradiction, Git/code/tests priment sur cette synthèse.

## 2. État Git et Core vérifié

Dépôt :

~~~text
greg44500/saas-fiches-techniques-gms
~~~

État de départ M-004 vérifié le 2026-09-28 :

~~~text
main = b479b217815fad885f233e98b8f3145656641352
merge = PR #24 — fix(m002): améliorer la lisibilité du référentiel Produits Platform
Core Gate du main = success
run GitHub Actions = 36430902323
~~~

Le workflow `Core Gate` exécute `npm run release:check`, soit :

~~~text
release:verify
→ lint backend
→ tests backend
→ lint frontend
→ tests frontend
→ build frontend
→ E2E Playwright
~~~

Core intégré :

~~~text
repository = greg44500/saas-core-api
version    = 1.2.1
tag        = v1.2.1
commit     = d90d8f1e6034cbbf4f63de2be7312eae69b1d698
~~~

Aucune évolution Core nécessaire à M-004 n'a été démontrée.

## 3. Contrat canonique M-004

Source de vérité :

~~~text
docs/m004/M-004-FINAL-CONTRACT.md
~~~

Contrat validé le 2026-09-28.

Principes structurants :

~~~text
1 Fiche durable
+
0 ou 1 brouillon
+
0 ou 1 état validé courant
+
historique automatique immuable
~~~

Ownership :

~~~text
Workspace
× Dossier
~~~

`createdBy` / `updatedBy` = audit uniquement, jamais ownership.

Une Fiche ou un brouillon n'appartient pas personnellement à son créateur.

## 4. Composition et valorisation

Toute ligne utilise obligatoirement un `ProductVariant` M-002.

~~~text
quantité nette saisie
→ rendement M-002
→ quantité brute calculée
~~~

Pas de surcharge locale du rendement en V1.

Les sections restent distinctes :

~~~text
Ingrédients
Économat
~~~

M-004 réutilise impérativement M-003 :

~~~text
ProductVariant
→ SupplierArticle
→ Prix applicable
→ contexte Dossier
~~~

Résolution Article :

~~~text
0 Article
→ non résolu

1 Article
→ résolution automatique possible

N Articles
→ choix humain obligatoire
~~~

Jamais de sélection automatique de l'Article le moins cher.

Prix absent :

~~~text
jamais 0 €
→ ligne non valorisée
→ validation impossible tant que non résolue
~~~

## 5. Calcul économique validé

~~~text
Coût matière HT
= somme Ingrédients

Économat HT
= somme Économat

Coût fabrication HT
= Coût matière HT + Économat HT
~~~

Marge cible :

~~~text
coefficient = 1 / (1 - marge cible)
Prix théorique HT = Coût fabrication HT × coefficient
~~~

Prix conseillé TTC :

~~~text
Prix théorique TTC
→ arrondi au prochain multiple de 0,50 € supérieur ou égal
~~~

Prix final :

~~~text
peut être >, = ou < au Prix conseillé

mais

Prix final TTC >= plancher économique TTC
~~~

Une revalorisation ne remplace jamais silencieusement un Prix final choisi explicitement.

## 6. Historique et fraîcheur économique

À la validation :

~~~text
nouvel état validé courant
+
ancien état validé conservé dans l'historique
~~~

Les sauvegardes de brouillon ne créent pas de versions utilisateur.

Si les Prix M-003 ont changé depuis la valorisation :

~~~text
validation refusée
→ revalorisation explicite obligatoire
~~~

Les snapshots validés doivent rester historiquement explicables même si Produit, Article ou Fournisseur évoluent ensuite.

## 7. Lifecycle

États principaux de l'identité Fiche :

~~~text
ACTIVE
ARCHIVED
DELETED
~~~

Suppression :

~~~text
Fiche entière
→ corbeille
→ restauration pendant rétention
→ purge définitive
~~~

La suppression porte ensemble sur :

- brouillon éventuel ;
- état validé courant ;
- historique ;
- snapshots économiques.

Aucun état historique n'est supprimé individuellement.

## 8. Copie inter-Dossier

Source possible :

~~~text
ACTIVE
ARCHIVED
~~~

Source interdite :

~~~text
DELETED
~~~

La copie crée une nouvelle identité Fiche et un nouveau brouillon.

Aucune donnée financière du Dossier source n'est copiée.

Dans le Dossier cible :

~~~text
TVA
→ copiée depuis la Fiche source

marge cible
→ marge par défaut du Dossier cible

Article / Prix
→ résolution M-003 du Dossier cible
~~~

## 9. RBAC validé

Principes :

- Owner = toutes permissions M-004 ;
- Responsable FT = création, édition, composition, sourcing, valorisation, validation, lifecycle métier, copie et marge par défaut ;
- Contributeur FT = création, édition, composition, sourcing, valorisation et copie, sans validation/lifecycle destructif ;
- Acheteur / Économe = sourcing et valorisation sans modification de recette ni validation FT ;
- Lecteur = consultation uniquement ;
- purge définitive = Owner uniquement.

Le périmètre Dossier M-001 reste applicable.

Les détails exacts des clés de permissions sont à définir dans la conception technique.

## 10. Quota commercial validé

~~~text
1 identité Fiche = 1 unité
~~~

Le comptage ne dépend pas :

- du brouillon ;
- du nombre de validations ;
- de l'historique ;
- de l'archivage ;
- de la mise en corbeille.

~~~text
création = +1
copie = +1
purge définitive = -1
toutes les autres opérations = 0
~~~

La limite est Workspace-scoped.

Le seuil commercial Free définitif reste à décider.

Pour développement/tests :

~~~text
valeur temporaire possible = 10 Fiches
ou valeur plus basse dans les tests
~~~

Cette valeur ne doit jamais être codée en dur : le runtime compare l'usage avec la limite effective Plan / entitlement.

## 11. Exports et diffusion V1

Appartiennent à la V1 produit :

~~~text
CSV
XLSX
PDF
impression
e-mail
~~~

Ils ne font pas partie du premier bloc d'implémentation M-004.

Ordre retenu :

~~~text
M-004 Fiche technique
→ backend
→ tests backend
→ frontend
→ tests frontend
→ E2E
→ Core Gate
→ QA visuelle utilisateur
→ stabilisation

puis

bloc V1 Exports et diffusion
→ cadrage dédié
→ implémentation
→ tests
→ QA visuelle
~~~

Les autres exports restent V2.

## 12. UX

Les invariants UX structurants sont validés :

- vocabulaire métier français ;
- pas de jargon Core exposé ;
- réutilisation des composants existants ;
- gestion explicite des états vides, erreurs, ambiguïtés Article, Prix absent, quota et conflits ;
- accessibilité des actions par icônes / tooltips.

Les détails de mise en page, placement d'actions, densité et microcopie sont **non bloquants** pour la conception technique et restent ajustables après validation visuelle.

Une correction UX ne doit pas modifier silencieusement les invariants métier ou RBAC du contrat.

## 13. Documents synchronisés avec le contrat

Le lot documentaire M-004 met à jour :

~~~text
docs/m004/M-004-FINAL-CONTRACT.md
docs/ROADMAP.md
docs/PRODUCT-SCOPE.md
docs/domain/STORAGE-RETENTION.md
docs/DEBT.md
docs/REPRISE-CURRENT.md
~~~

Contradictions historiques résolues :

- ancien invariant `Prix final >= Prix conseillé` supprimé ;
- anciens quotas séparés DRAFT / VALIDATED supprimés ;
- ancienne notion `ses DRAFTS` supprimée au profit du périmètre Dossier + RBAC ;
- stratégie d'arrondi personnalisable différée hors M-004 V1 ;
- GMS-UX-002 clôturé ;
- exports CSV/XLSX/PDF, impression et e-mail confirmés en V1 mais dans un bloc ultérieur séparé.

## 14. Prochaine action

Ne pas implémenter de modèle, route ou endpoint M-004 avant d'avoir produit et relu la conception technique.

Conception technique attendue :

~~~text
agrégats / modèles
relations
indexes
transactions
snapshots
concurrency control
services
controllers
routes
Zod
permissions applicatives
métrique / quota
migrations
bootstrap / seeds
rétention
audit
frontend
RTK Query
tests
~~~

Après validation de la conception :

~~~text
même branche M-004
→ backend
→ tests backend
→ frontend
→ tests frontend
→ E2E
→ QA visuelle
→ release:check
→ une seule PR
→ un seul merge
~~~

Principe directeur :

~~~text
Core = fondations génériques
Produit = métier
~~~
