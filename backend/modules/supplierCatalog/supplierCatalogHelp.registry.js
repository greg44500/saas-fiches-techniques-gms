import {
    SUPPLIER_CATALOG_PERMISSION,
} from './supplierCatalogPermission.registry.js';
import {
    SUPPLIER_CATALOG_GLOBAL_PERMISSION,
} from './supplierCatalogGlobalPermission.registry.js';
import { HELP_CONTEXT } from '../help/help.registry.js';
import {
    PLATFORM_REFERENCE_MANAGEMENT_HELP_CATEGORY_ID,
} from '../referenceManagement/referenceManagementHelp.registry.js';

const SUPPLIER_CATALOG_HELP_MODULE = Object.freeze({
    key: 'suppliers',
    categories: Object.freeze([
        {
            id: 'workspace_suppliers',
            context: HELP_CONTEXT.WORKSPACE,
            label: 'Fournisseurs & prix',
            description: 'Fournisseurs, Articles, catalogues et prix applicables.',
            order: 120,
        },
    ]),
    entries: Object.freeze([
        {
            id: 'workspace.suppliers.reference',
            context: HELP_CONTEXT.WORKSPACE,
            categoryId: 'workspace_suppliers',
            title: 'Gérer les Fournisseurs et Articles',
            summary: 'Consulter les Fournisseurs, Articles et conditionnements disponibles dans l’espace de travail.',
            search: {
                keywords: ['fournisseur', 'article', 'conditionnement', 'catalogue'],
                questions: [
                    'Comment retrouver un Article fournisseur ?',
                    'Où gérer mes Fournisseurs ?',
                ],
            },
            audience: {
                permissions: [SUPPLIER_CATALOG_PERMISSION.SUPPLIER_READ],
                applicationGlobalPermissions: [],
                ownerOnly: false,
            },
            requirements: { features: [] },
            whoCanPerform: 'Un membre autorisé à consulter les Fournisseurs.',
            prerequisites: [],
            steps: [
                'Ouvrez Fournisseurs depuis la navigation de l’espace.',
                'Consultez le Fournisseur ou l’Article souhaité.',
                'Utilisez les vues Dossier lorsque vous devez travailler avec un prix local.',
            ],
            outcome: 'Les données fournisseur restent distinguées des Références Produit et des prix propres à chaque Dossier.',
            edgeCases: [],
            sensitiveConsequences: [],
            relatedEntryIds: [],
            order: 100,
        },
        {
            id: 'workspace.suppliers.pricing',
            context: HELP_CONTEXT.WORKSPACE,
            categoryId: 'workspace_suppliers',
            title: 'Comprendre le Prix applicable',
            summary: 'Vérifier la source de prix réellement utilisée dans un Dossier.',
            search: {
                keywords: ['prix', 'tarif négocié', 'prix facturé', 'indicatif', 'dossier'],
                questions: [
                    'Quel prix sera utilisé dans ce Dossier ?',
                    'Pourquoi le prix diffère-t-il entre deux magasins ?',
                ],
            },
            audience: {
                permissions: [SUPPLIER_CATALOG_PERMISSION.APPLICABLE_PRICE_READ],
                applicationGlobalPermissions: [],
                ownerOnly: false,
            },
            requirements: { features: [] },
            whoCanPerform: 'Un membre autorisé à consulter le Prix applicable.',
            prerequisites: [
                'Travaillez dans le Dossier concerné afin de conserver le bon contexte économique.',
            ],
            steps: [
                'Ouvrez Fournisseurs et prix du Dossier.',
                'Sélectionnez l’Article fournisseur à vérifier.',
                'Lisez le prix résolu et sa source.',
            ],
            outcome: 'Le prix affiché respecte la politique Workspace et reste strictement contextualisé au Dossier.',
            edgeCases: [
                'Un prix négocié d’un autre Dossier n’est jamais utilisé comme fallback.',
                'En l’absence de source fournisseur exploitable, un Prix indicatif Dossier puis Workspace peut servir de dernier recours.',
            ],
            sensitiveConsequences: [],
            relatedEntryIds: [],
            order: 110,
        },
        {
            id: 'platform.suppliers.reference',
            context: HELP_CONTEXT.PLATFORM,
            categoryId: PLATFORM_REFERENCE_MANAGEMENT_HELP_CATEGORY_ID,
            title: 'Consulter le référentiel Fournisseurs',
            summary: 'Consulter les Fournisseurs et catalogues partagés depuis la gestion unifiée des référentiels.',
            search: {
                keywords: [
                    'fournisseur',
                    'référentiel',
                    'global',
                    'catalogue',
                    'gestion des référentiels',
                ],
                questions: [
                    'Comment consulter le référentiel Fournisseurs ?',
                    'Où trouver les Fournisseurs dans Gestion des référentiels ?',
                ],
            },
            audience: {
                permissions: [],
                applicationGlobalPermissions: [
                    SUPPLIER_CATALOG_GLOBAL_PERMISSION.READ,
                ],
                ownerOnly: false,
            },
            requirements: { features: [] },
            whoCanPerform: 'Un membre disposant de la permission métier globale de consultation du référentiel Fournisseurs.',
            prerequisites: [],
            steps: [
                'Ouvrez la surface Platform.',
                'Dans la section GMS, ouvrez Gestion des référentiels.',
                'Sélectionnez l’onglet Fournisseurs.',
                'Consultez les Fournisseurs, Articles et catalogues partagés disponibles.',
            ],
            outcome: 'Les données globales partagées sont consultées sans exposer les catalogues privés d’un autre Workspace.',
            edgeCases: [],
            sensitiveConsequences: [],
            relatedEntryIds: [],
            order: 100,
        },
        {
            id: 'platform.suppliers.manage',
            context: HELP_CONTEXT.PLATFORM,
            categoryId: PLATFORM_REFERENCE_MANAGEMENT_HELP_CATEGORY_ID,
            title: 'Gérer le référentiel Fournisseurs',
            summary: 'Créer, corriger ou archiver les données fournisseur partagées.',
            search: {
                keywords: ['fournisseur', 'catalogue', 'gérer', 'archiver'],
                questions: [
                    'Comment administrer les Fournisseurs partagés ?',
                ],
            },
            audience: {
                permissions: [],
                applicationGlobalPermissions: [
                    SUPPLIER_CATALOG_GLOBAL_PERMISSION.MANAGE,
                ],
                ownerOnly: false,
            },
            requirements: { features: [] },
            whoCanPerform: 'Un gestionnaire disposant de la permission métier globale de gestion du référentiel Fournisseurs.',
            prerequisites: [],
            steps: [
                'Dans la section GMS, ouvrez Gestion des référentiels puis l’onglet Fournisseurs.',
                'Sélectionnez Fournisseurs, Articles ou Catalogues selon l’objet à administrer.',
                'Créez, corrigez, importez ou archivez explicitement selon le besoin.',
            ],
            outcome: 'Le référentiel fournisseur partagé est administré sans modifier les catalogues privés des Workspaces.',
            edgeCases: [],
            sensitiveConsequences: [
                'Archiver une donnée globale peut la rendre indisponible pour de nouveaux usages selon les règles métier.',
            ],
            relatedEntryIds: [],
            order: 110,
        },
        {
            "id": "workspace.suppliers.import",
            "context": "workspace",
            "categoryId": "workspace_suppliers",
            "title": "Importer un catalogue fournisseur privé",
            "summary": "Importer ou réimporter un catalogue CSV, XLS ou XLSX dans votre espace.",
            "search": {
                "keywords": [
                    "catalogue",
                    "import",
                    "csv",
                    "xlsx"
                ],
                "questions": [
                    "Comment importer un catalogue fournisseur ?"
                ]
            },
            "audience": {
                "permissions": [
                    SUPPLIER_CATALOG_PERMISSION.CATALOG_IMPORT
                ],
                "applicationGlobalPermissions": [],
                "ownerOnly": false
            },
            "requirements": {
                "features": [
                    "supplier_catalog_import"
                ]
            },
            "whoCanPerform": "Un membre disposant de la permission métier correspondante et de l’accès effectif au contexte.",
            "prerequisites": [],
            "steps": [
                "Ouvrez Fournisseurs puis Catalogues.",
                "Choisissez l’import dans votre Workspace et fournissez un fichier structuré compatible.",
                "Contrôlez le résultat de l’import et les éventuels éléments à rapprocher."
            ],
            "outcome": "Le catalogue privé est disponible dans son Workspace et peut être réimporté sans duplication automatique.",
            "edgeCases": [
                "L’import nécessite une capacité commerciale active.",
                "Un catalogue privé ne devient pas visible dans un autre Workspace."
            ],
            "sensitiveConsequences": [],
            "relatedEntryIds": [],
            "order": 120
        },
        {
            "id": "workspace.suppliers.indicative",
            "context": "workspace",
            "categoryId": "workspace_suppliers",
            "title": "Consulter les Prix indicatifs",
            "summary": "Comprendre les prix de dernier recours et leur origine.",
            "search": {
                "keywords": [
                    "prix indicatif",
                    "prix repère",
                    "provenance"
                ],
                "questions": [
                    "Que faire sans prix fournisseur ?"
                ]
            },
            "audience": {
                "permissions": [
                    SUPPLIER_CATALOG_PERMISSION.INDICATIVE_PRICE_READ
                ],
                "applicationGlobalPermissions": [],
                "ownerOnly": false
            },
            "requirements": {
                "features": []
            },
            "whoCanPerform": "Un membre disposant de la permission métier correspondante et de l’accès effectif au contexte.",
            "prerequisites": [],
            "steps": [
                "Consultez les prix disponibles sur la Référence Produit ou dans la vue fournisseur appropriée.",
                "Vérifiez la provenance et le conditionnement du Prix repère global lorsqu’il est renseigné.",
                "Vérifiez les Prix indicatifs disponibles dans le contexte du Dossier et du Workspace."
            ],
            "outcome": "Une source indicative peut aider à valoriser en dernier recours selon la politique de prix applicable.",
            "edgeCases": [
                "Un Prix repère absent ne doit pas être remplacé par un montant inventé.",
                "Les Prix négociés et facturés restent propres à leur Dossier."
            ],
            "sensitiveConsequences": [],
            "relatedEntryIds": [],
            "order": 130
        },
    ]),
    workspaceRemediationEntryIds: Object.freeze([]),
});

export { SUPPLIER_CATALOG_HELP_MODULE };