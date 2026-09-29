# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-29  
**Lot clôturé :** GMS-UX-002 — Référentiel Produits Platform : catégories et lisibilité  
**Lot courant :** M-004 — Fiches techniques + valorisation  
**État M-004 :** IMPLÉMENTATION DU BLOC HORS EXPORTS TERMINÉE SUR BRANCHE — stabilisation UX de QA en cours ; tests ciblés et release:check à rejouer après validation visuelle  
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

Aucune évolution Core n'est nécessaire pour M-004. La corbeille des Fiches techniques est gérée dans le produit : réglage Workspace 1–90 jours (30 par défaut), `purgeScheduledAt` figé à la suppression et job métier global de purge.

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

Les clés techniques réellement implémentées sont :

~~~text
technical-sheet:read
technical-sheet:create
technical-sheet:update
technical-sheet:sourcing:manage
technical-sheet:valuation:manage
technical-sheet:validate
technical-sheet:lifecycle:manage
technical-sheet:delete
technical-sheet:restore
technical-sheet:purge
technical-sheet:copy
technical-sheet:settings:manage
~~~

Le rôle système Owner reçoit toutes ces permissions via le registre applicatif. Les profils métier restent composés par des Roles Workspace personnalisés, sans modifier les rôles système Core.

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

## 13. État d'implémentation au 2026-09-28

Le bloc M-004 hors exports est maintenant présent sur :

~~~text
feature/m004-fiches-techniques-valorisation
~~~

Implémenté :

- modèles `TechnicalSheet`, `TechnicalSheetDraft`, `TechnicalSheetValidation` et `WorkspaceBusinessSettings` ;
- composition Ingrédients / Économat, rendement M-002 et conversions compatibles ;
- résolution Article / Prix via M-003, y compris ambiguïté explicite ;
- valorisation HT/TTC, marge cible, Prix conseillé, Prix final et contrôle du plancher ;
- détection de données tarifaires obsolètes et revalorisation obligatoire avant validation ;
- snapshots validés immuables et historique ;
- RBAC M-004 avec séparation édition recette / sourcing ;
- création, mise à jour, archivage, réactivation, corbeille, restauration et purge ;
- copie inter-Dossier sans données financières source ;
- quota Workspace `technical_sheets`, corbeille comprise jusqu'à purge ;
- rétention Workspace 1–90 jours et job de purge métier ;
- migrations M-004 et scripts npm associés ;
- frontend React/RTK Query : liste, création, éditeur, sourcing, valorisation, validation, historique, réglages, copie, corbeille et widget de capacité ;
- tests backend ciblés, tests frontend ciblés et quatre scénarios Playwright M-004 ajoutés au dépôt.

À ce stade, **aucun résultat local n'est encore déclaré vert dans cette synthèse**. La prochaine autorité est l'exécution locale demandée à l'utilisateur, puis la Core Gate de l'unique PR.

## 14. Documents synchronisés avec le contrat

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

## 15. Validation locale et QA visuelle

Une exécution locale complète de :

~~~text
npm run release:check
~~~

a été confirmée entièrement verte par l’utilisateur avant les derniers ajustements UX de QA.

Point Windows à conserver pour toutes les futures exécutions E2E impliquant un import ou téléversement :

~~~powershell
$env:Path += ";C:\Program Files\ClamAV"
Get-Command clamscan
clamscan --version
~~~

Dans cet environnement, ClamAV est installé sous Windows mais `clamscan` n’est pas nécessairement présent dans le `PATH` de la session PowerShell. Un HTTP 503 pendant l’inspection d’un fichier ne doit donc pas être interprété comme une régression applicative avant vérification de ce prérequis.

La QA visuelle a ensuite conduit aux arbitrages UX suivants, en cours de stabilisation sur la même branche :

- Dossiers regroupé dans la sidebar avec Compte Client, Corbeille et Paramètres ;
- entête Compte Client compacte ;
- paramètres de marge accessibles depuis le Dossier ;
- politique de prix déplacée dans Paramètres des Dossiers ;
- conservation de la Corbeille réglée directement depuis la Corbeille ;
- capacité des Fiches présentée sur le Tableau de bord avec répartition Dossiers / Corbeille ;
- vocabulaire utilisateur « suppression définitive » à la place de « purge » ;
- Fiche avec brouillon ouvert non copiable ;
- statuts visuels : Brouillon = warning, Non valorisée = alert, Archivée = archived ;
- actions globales de la Fiche regroupées dans un conteneur dédié `Panneau de contrôle` à droite du titre ;
- retour Fiche compacté en icône à côté du titre ;
- badges lifecycle / brouillon / valorisation placés directement à côté du titre de la Fiche ;
- Informations générales sorties du flux principal et déplacées dans un drawer droit accessible par une languette flottante `Infos` ;
- bouton d’enregistrement des Informations visuellement `warning` tant que nom/description sont modifiés sans être enregistrés ;
- commentaire de validation conservé dans le drawer et appliqué seulement lors de la validation ;
- `Base de production` remplacé par `Indicateur de production` avec infobulle explicative ;
- paramètres Quantité / Unité / Portion(s) / TVA de vente regroupés avec les KPI économiques dans le même conteneur sticky ;
- KPI permanents compactés en sigles avec infobulles : `CM HT`, `CE HT`, `CF HT`, `%MC`, `PC TTC`, `PF TTC`, `%MR` ; valeur indisponible affichée `NC` dans la vue compacte ;
- détail économique ouvrable à droite ; valorisation/revalorisation intégrée au même cockpit ;
- Composition présentée dans un seul tableau vertical sans scroll horizontal, avec groupes Ingrédients / Économat visuellement séparés ;
- colonnes compactes : Produit / Qté / U / PUHT / CMU HT / %TR / Note / Actions ;
- aide de saisie Produit affichée une seule fois au niveau du groupe Ingrédients ;
- ajout Produit intégré directement dans chaque groupe avec remise à zéro du champ après sélection ;
- Produit existant remplaçable par recherche prédictive ; remplacement = nouvelle ligne logique conservant type/quantité/note mais réinitialisant sourcing et valorisation ;
- Article/Fournisseur retiré des colonnes permanentes et exposé dans le détail Produit ; action Approvisionnement dédiée pour consulter/choisir l’Article fournisseur ;
- sources Produit `Tous les produits` / `Favoris` réduites à des actions icônes ;
- Favori signalé dans les suggestions par une étoile seule, couleur warning/gold, avec libellé accessible/infobulle.

Ces ajustements modifient le frontend et, pour la règle de copie d’un brouillon, le contrat backend. Ils doivent donc être retestés avant la PR finale.

Dette fonctionnelle identifiée pendant cette QA :

- `GMS-TAX-001 — TVA Produit / fiscalité d’achat` est enregistrée dans `docs/DEBT.md` ;
- M-004 conserve uniquement la TVA de vente de la Fiche pour le passage HT → TTC ;
- M-002 ne porte actuellement aucun taux de TVA sur `ProductVariant` et M-003 travaille sur les prix d’achat HT ;
- cette dette ne bloque pas M-004 mais devra être cadrée avant tout besoin de comptabilité d’achat, TVA déductible, facture ou export fiscal ;
- aucune TVA Produit ne doit être ajoutée opportunément à M-002/M-003 sans contrat dédié.

## 16. Prochaine action

Le code du bloc M-004 hors exports est prêt pour validation locale.

Ordre restant :

~~~text
pull de feature/m004-fiches-techniques-valorisation
→ migrations M-004 sur la base locale de développement
→ tests ciblés backend/frontend
→ E2E M-004
→ release:check complet
→ QA visuelle utilisateur
→ corrections éventuelles sur la même branche
→ une seule PR
→ Core Gate PR
→ un seul merge
→ Core Gate post-merge
→ mise à jour finale de la reprise
~~~

Ne pas ouvrir la PR finale tant que les tests locaux et la QA visuelle demandés ne sont pas validés.

Principe directeur :

~~~text
Core = fondations génériques
Produit = métier
~~~
