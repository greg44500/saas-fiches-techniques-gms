# SAAS-CORE-API — Frontière Dashboard Workspace / Platform

Date de décision : 2026-09-02  
Dernière mise à jour : 2026-09-30

## 1. Objet

Ce document fige la frontière entre :

- le Dashboard d’un Workspace client ;
- les futurs modules métier ;
- la console Platform réservée au `super_admin`.

L’objectif est d’éviter que le Core générique devienne artificiellement le produit métier ou que la console Platform soit traitée comme une simple variante du Workspace.

---

## 2. Dashboard Workspace actuel

Le Dashboard Workspace développé dans F8.8.2 est considéré comme une **surface Core provisoire**.

Il a permis de valider :

- la composition de plusieurs sources RTK Query ;
- la prise en compte des permissions effectives ;
- l’isolation des états loading/error/unavailable ;
- l’absence de KPI inventé lorsque le backend n’expose pas la donnée ;
- la réutilisation de composants de synthèse.

Il ne constitue pas le dashboard produit final.

Les informations Core déjà accessibles depuis la navigation (`Membres`, `Fichiers`, `Abonnement`, `Activité`, `Paramètres`) ne doivent pas être continuellement dupliquées ou enrichies dans le dashboard principal sans valeur décisionnelle réelle.

Le statut du Workspace et le rôle courant sont des informations de contexte du
shell et non des KPI. Ils sont donc affichés respectivement dans la topbar et
dans l’identité utilisateur, puis retirés du registre de widgets Dashboard.

Après validation technique de F8.8.2, le développement fonctionnel du Dashboard Workspace est **mis en pause** jusqu’au cadrage du premier module métier.

---

## 3. Dashboard Workspace cible avec modules métier

Lorsque les premiers modules métier seront définis, le Dashboard Workspace devra être repensé autour de la valeur métier.

Principe cible :

```text
Dashboard Workspace
├── synthèses métier prioritaires
├── alertes métier
├── tendances / indicateurs métier réellement exposés
├── actions rapides métier selon permissions
├── activité métier récente si pertinente
└── informations Core secondaires uniquement lorsqu’elles apportent une valeur décisionnelle
```

Le Dashboard ne doit pas devenir une duplication de la Sidebar.

Les pages spécialisées restent les surfaces de référence pour consulter et administrer les ressources complètes.

---

## 4. Extension métier du Core

Le Core reste indépendant des domaines métier.

```text
Application métier
→ utilise Auth / Workspace / RBAC / Plans / UsageMetric / Files / AuditLog

Core
→ ne dépend d’aucune ressource métier
```

Les futurs modules pourront apporter leurs propres :

- routes ;
- services ;
- modèles ;
- permissions ;
- métriques de quota ;
- AuditActions ;
- composants ;
- widgets de dashboard.

Le Dashboard Workspace assemblera ces widgets selon les permissions et entitlements effectifs.

---

## 5. Activité et AuditLog

Les événements Core détaillés appartiennent prioritairement à la surface `Activité`.

Le Dashboard peut afficher un extrait d’activité uniquement si cet extrait aide réellement l’utilisateur à piloter son travail.

Quand des modules métier seront ajoutés, les événements métier importants pourront compléter le registre AuditLog sans modifier la frontière tenant du Workspace.

---

## 6. Console Platform

La console Platform est distincte du Workspace client.

Elle est destinée au créateur/opérateur du SaaS et protégée par le rôle global `super_admin`.

Le frontend Platform doit être construit comme une vraie console d’administration, pas comme une collection de placeholders.

Périmètre F9 à construire à partir des contrats backend existants :

```text
/platform/overview
/platform/users
/platform/workspaces
/platform/plans
/platform/subscriptions
/platform/audit-logs
```

Chaque surface doit comprendre, lorsque le backend le permet :

- API RTK Query réelle ;
- listing/table paginée ;
- filtres ;
- détails ;
- Drawer lorsqu’un détail secondaire évite de surcharger la page ;
- actions administratives réellement supportées ;
- confirmations pour les actions sensibles ;
- états loading/empty/error ;
- messages métier en français ;
- tests ;
- audit des permissions et contrats backend.

---

## 7. Dashboard Platform

Le Dashboard Platform doit piloter le SaaS lui-même.

Il pourra agréger uniquement des métriques explicitement exposées ou calculées côté backend avec une sémantique stable.

Exemples de familles d’information possibles :

- utilisateurs ;
- workspaces ;
- plans ;
- subscriptions ;
- situations nécessitant une intervention ;
- activité Platform récente.

Aucun KPI ne doit être inventé côté frontend à partir de listes partielles.

Si une statistique utile n’est pas fournie par les contrats actuels, un endpoint d’agrégation Platform dédié devra être conçu avant son affichage.

---

## 8. EntitlementOverride

Les exceptions commerciales Platform restent un bloc distinct (F10) afin de ne pas mélanger :

- administration opérationnelle Platform ;
- moteur d’entitlement ;
- overrides commerciaux temporaires ou ciblés.

La console Platform devra ensuite intégrer ces capacités lorsque le modèle Workspace-scoped sera finalisé.

---

## 9. Ordre confirmé

```text
F8.8.2    Valider techniquement le Dashboard Core actuel
          puis geler son enrichissement fonctionnel

F8.9      Account / Security frontend

F8-AUDIT  Audit transversal frontend obligatoire

F9        Construire entièrement le frontend Platform V1
          Overview / Users / Workspaces / Plans / Subscriptions / Audit Logs

F10       EntitlementOverride Platform + Workspace-scoped

F11       Consolidation / E2E

Modules métier
          reprise du Dashboard Workspace autour de la valeur métier réelle
```

---

## 10. Invariant produit

Le Core fournit l’infrastructure du SaaS.

Les modules métier fournissent la valeur utilisateur.

La console Platform administre le SaaS.

Le Dashboard Workspace final doit donc être **orienté métier**, tandis que les informations Core restent disponibles dans leurs surfaces spécialisées et ne sont remontées dans le Dashboard que lorsqu’elles apportent une information réellement utile.