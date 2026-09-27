# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-27  
**Lot clôturé :** M-002 — Référentiel Produits  
**Lot courant :** M-003 — Fournisseurs + Articles + conditionnements + prix/catalogues  
**État M-003 :** implémentation backend/frontend/E2E présente ; gates techniques pré-UX confirmés verts localement ; lot UX Fournisseurs implémenté — revalidation frontend et validation visuelle en attente  
**Branche :** \`feature/m003-suppliers-catalogs-pricing\`  
**HEAD fonctionnel avant mise à jour documentaire :** \`d04a85f3d83bbe02b86de8369110cd476cb134e2\`

## 1. Ordre d'autorité

~~~text
KB-START-HERE
→ GitHub réel
→ code / contraintes DB
→ tests réellement exécutés
→ docs/m003/M-003-FINAL-CONTRACT.md
→ contrats M-002 nécessaires à la frontière Produit
→ Core réellement intégré
→ présente reprise
~~~

Aucun test ou gate M-003 n'est déclaré vert dans ce document tant qu'une exécution réelle ne l'a pas démontré.

## 2. Git et Core

Dépôt :

~~~text
greg44500/saas-fiches-techniques-gms
~~~

Base M-003 :

~~~text
main = 386e64cacd97cab15e712697c2d7fdd985a4f62e
Merge PR #20 — feat(m002): deliver the shared product reference catalog
~~~

La branche M-003 est actuellement en avance sur \`main\` et n'était pas en retard lors de la dernière vérification.

Core intégré :

~~~text
repository = greg44500/saas-core-api
version    = 1.2.1
tag        = v1.2.1
commit     = d90d8f1e6034cbbf4f63de2be7312eae69b1d698
~~~

Aucune évolution Core n'a été nécessaire pour M-003.

## 3. Contrat canonique

Source de vérité :

~~~text
docs/m003/M-003-FINAL-CONTRACT.md
~~~

Le contrat M-003 a été validé le 2026-09-27.

Invariants structurants conservés :

- Workspace = frontière de tenancy ;
- \`WORKSPACE_PRIVATE\` n'est jamais visible hors Workspace ;
- Tarif négocié et Prix facturé restent strictement Dossier ;
- aucun fallback de prix inter-Dossier ;
- Référence Produit M-002 et Article fournisseur M-003 restent distincts ;
- ligne ambiguë = aucune création automatique dangereuse ;
- absence de prix ≠ zéro ;
- backend = autorité du Prix applicable ;
- aucune sélection automatique de l'Article le moins cher ;
- Owner Workspace reçoit le RBAC M-003 mais ne devient pas autorité Application Global ;
- import privé = RBAC + capability \`supplier_catalog_import\`.

## 4. Implémentation M-003 présente

### Backend

Le module \`backend/modules/supplierCatalog\` contient désormais :

- Fournisseurs \`GLOBAL_SHARED | WORKSPACE_PRIVATE\` ;
- Articles fournisseur et \`replacedBy\` ;
- conditionnements structurés ;
- éditions de catalogues historisées ;
- lignes de catalogue révisées via \`revision / isCurrent\` ;
- Tarifs fournisseur historisés ;
- imports CSV/XLS/XLSX \`inspect → preview → commit\` ;
- rapprochement prudent : MATCHED / CREATE_ARTICLE / UNMATCHED / AMBIGUOUS / IGNORED / INVALID ;
- réimport de la même édition sans duplication attendue ;
- calcul exact des normalisations de prix avant Decimal128 via arithmétique rationnelle BigInt ;
- Tarifs négociés Dossier avec refus des périodes actives chevauchantes ;
- Prix facturés Dossier avec validation/rejet ;
- fraîcheur du Prix facturé = 12 mois calendaires depuis \`invoiceDate\` ;
- politique Workspace du Prix applicable ;
- fallback strict dans le Dossier ;
- résolution par Référence Produit : 0 candidat = refus, 1 = sélection, plusieurs = sélection explicite requise ;
- favoris Dossier × Article sans copie de prix ;
- événements métier M-003 ;
- verrous métier \`SupplierCommerceLock\` pour les invariants concurrentiels.

Routes composées :

~~~text
/api/workspaces/:workspaceId/suppliers
/api/workspaces/:workspaceId/supplier-articles
/api/workspaces/:workspaceId/supplier-catalogs
/api/workspaces/:workspaceId/dossiers/:dossierId/supplier-pricing
/api/workspaces/:workspaceId/supplier-pricing-policy
/api/supplier-reference
/api/supplier-reference/catalogs
~~~

### Permissions / capability

RBAC Workspace :

~~~text
supplier:read
supplier:manage
supplier:article:read
supplier:article:manage
supplier:catalog:read
supplier:catalog:import
supplier:catalog:manage
supplier:negotiated-price:read
supplier:negotiated-price:manage
supplier:invoiced-price:read
supplier:invoiced-price:manage
supplier:invoiced-price:validate
supplier:dossier-reference:read
supplier:dossier-reference:manage
supplier:applicable-price:read
supplier:price-policy:manage
~~~

Application Global :

~~~text
supplier:reference:read
supplier:reference:manage
~~~

Capability :

~~~text
supplier_catalog_import
~~~

Le contrat ne fixe pas encore quel plan commercial précis active cette capability. Aucune attribution Free/Premium/IA n'a été inventée.

### Migrations / bootstrap

Commande migration M-003 :

~~~bash
npm run migration:m003-supplier-catalog
~~~

Elle :

- crée/vérifie 24 index M-003 attendus ;
- backfill les permissions des rôles système Workspace existants.

Bootstrap de gouvernance globale :

~~~bash
npm run seed:m003-governance
~~~

Il crée le rôle système Application Global combiné :

~~~text
business_reference_governor
→ product:reference:read
→ product:reference:manage
→ supplier:reference:read
→ supplier:reference:manage
~~~

Lorsqu'un Fondateur possède déjà le membership issu du bootstrap M-002, le seed migre ce membership actif vers le rôle combiné. Il refuse de remplacer silencieusement un rôle personnalisé ou un membership suspendu.

### Frontend

Surface Workspace \`/workspaces/:workspaceId/suppliers\` :

- Fournisseurs partagés et privés ;
- recherche ;
- création/édition/archivage des Fournisseurs privés ;
- Articles fournisseur ;
- création manuelle d'Article privé avec Référence Produit M-002 ;
- lifecycle Article ;
- catalogues accessibles avec portée, période et provenance ;
- import privé conditionné par permission + capability.

Surface Dossier \`/workspaces/:workspaceId/dossiers/:dossierId/suppliers\` :

- contrôle d'accès Dossier M-001 conservé ;
- Références favorites ;
- catalogues accessibles ;
- Tarifs négociés ;
- Prix facturés ;
- validation/rejet des Prix facturés ;
- politique Workspace ;
- Prix applicable ;
- source, fallback et alertes.

Surface globale \`/supplier-reference\` :

- autorisation Application Global explicite ;
- Fournisseurs globaux ;
- Articles globaux ;
- catalogues globaux ;
- imports globaux ;
- lifecycle global.

## 5. Tests présents dans la branche

### Backend

Couverture ajoutée pour :

- registres permissions/capability/global ;
- modèles/indexes/migration ;
- isolation Fournisseur privé ;
- catalogue privé invisible hors Workspace ;
- Fournisseur global visible dans plusieurs Workspaces ;
- RBAC refus et rôle personnalisé positif ;
- normalisation/unicité Article ;
- remplacement Article ;
- capability import ;
- preview ambigu/non rapproché ;
- rollback transactionnel import ;
- normalisation de prix ;
- réimport idempotent ;
- chevauchements négociés ;
- résolution Article 0/1/N ;
- absence de sélection automatique entre plusieurs Articles ;
- isolation Tarif négocié inter-Dossier ;
- isolation Prix facturé inter-Dossier ;
- fallback fournisseur ;
- fraîcheur 12 mois ;
- favori sans prix copié ;
- bootstrap de gouvernance globale M-003.

### Frontend

Couverture ajoutée pour :

- composition routes/navigation ;
- permission Workspace ;
- permission Application Global ;
- contrats RTK Query ;
- capability d'import ;
- distinction global/privé ;
- mapping import ;
- preview ambiguë ;
- catalogues et provenance dans le contexte Dossier ;
- Prix applicable, source/fallback ;
- absence d'onglet non autorisé.

### E2E Playwright

Scénarios ajoutés :

1. autorité Application Global accède au Référentiel Fournisseurs ;
2. Workspace A importe puis réimporte la même édition privée, Workspace B ne la voit pas ;
3. Dossier A et Dossier B utilisent le même Article avec des Tarifs négociés et Prix applicables distincts ;
4. catalogue global visible depuis plusieurs Workspaces.

La préparation E2E initialise désormais la gouvernance M-002 puis M-003.

## 6. État réel de validation

Après correction des premiers défauts M-003, le porteur produit a confirmé localement verts sur le HEAD \`2662f74f17ecb68d898576a0f38c7020901566d5\` :

~~~text
npm test
npm run lint
npm --prefix frontend run test
npm --prefix frontend run lint
npm --prefix frontend run build
~~~

Cette exécution constitue la baseline technique pré-UX.

Depuis cette baseline, le lot UX Fournisseurs a modifié uniquement le frontend :

- actions de tableau en icônes avec infobulles verbales ;
- action Voir ;
- drawer Fournisseur ;
- détail Articles / Catalogues ;
- onglet Utilisation Workspace sans agrégation de prix inter-Dossier ;
- même convention d'actions sur le référentiel global.

Ces changements frontend doivent être revalidés avant le contrôle visuel.

Restent à valider avant la PR finale :

~~~text
npm run test:e2e
npm run release:check
Core Gate PR
~~~

## 7. Prochaine validation locale

Depuis le clone local :

~~~bash
git fetch origin
git switch feature/m003-suppliers-catalogs-pricing
git pull --ff-only origin feature/m003-suppliers-catalogs-pricing

npm --prefix frontend run test
npm --prefix frontend run lint
npm --prefix frontend run build
~~~

Si ces trois gates sont verts, lancer ensuite backend et frontend pour le contrôle visuel.

Pour tester l'import privé, le Workspace de test doit disposer de la capability :

~~~text
supplier_catalog_import
~~~

Le contrat ne l'attribue encore à aucun plan précis ; utiliser un entitlement override de test si nécessaire plutôt que modifier arbitrairement un plan commercial.
## 8. Points à vérifier visuellement

Workspace Fournisseurs :

- navigation « Fournisseurs » ;
- distinction Partagé / Privé ;
- actions de ligne en icônes avec infobulles « Voir », « Modifier », « Archiver » / « Réactiver » ;
- « Voir » ouvre le drawer Fournisseur ;
- drawer : Informations | Articles | Catalogues | Utilisation ;
- Articles et catalogues du drawer filtrés par Fournisseur ;
- onglet Utilisation sans agrégation de Tarifs négociés/Prix facturés entre Dossiers ;
- création/modification/archivage privé ;
- onglet Catalogues : bouton « Importer un catalogue » uniquement avec permission + capability ;
- inspect/mapping/preview/confirmation.

Dossier :

- bouton « Fournisseurs et prix » depuis un Dossier actif ;
- nom du Dossier affiché ;
- catalogues accessibles ;
- favoris ;
- Tarifs négociés ;
- Prix facturés ;
- Prix applicable ;
- source/fallback.

Global :

- \`/supplier-reference\` accessible après \`seed:m003-governance\` ;
- Fournisseurs/catalogues globaux ;
- import global.

## 9. Étapes restantes avant merge

~~~text
revalidation frontend test + lint + build
→ validation visuelle porteur produit
→ corrections fonctionnelles/UX justifiées en lot si nécessaire
→ E2E + release:check
→ une PR M-003
→ validation Core Gate PR
→ merge
→ validation post-merge
→ documentation de clôture
~~~

Ne pas démarrer M-004 avant clôture M-003.
