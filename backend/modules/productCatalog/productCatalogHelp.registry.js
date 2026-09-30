import {
    PRODUCT_CATALOG_PERMISSION,
} from './productCatalogPermission.registry.js';
import {
    PRODUCT_CATALOG_GLOBAL_PERMISSION,
} from './productCatalogGlobalPermission.registry.js';
import { HELP_CONTEXT } from '../help/help.registry.js';

const PRODUCT_CATALOG_HELP_MODULE = Object.freeze({
    key: 'products',
    categories: Object.freeze([
        {
            id: 'workspace_products',
            context: HELP_CONTEXT.WORKSPACE,
            label: 'Produits',
            description: 'Références Produit, favoris et enrichissement du référentiel.',
            order: 110,
        },
        {
            id: 'platform_product_references',
            context: HELP_CONTEXT.PLATFORM,
            label: 'Référentiel Produits',
            description: 'Gouvernance du référentiel Produit partagé.',
            order: 100,
        },
    ]),
    entries: Object.freeze([
        {
            id: 'workspace.products.reference',
            context: HELP_CONTEXT.WORKSPACE,
            categoryId: 'workspace_products',
            title: 'Utiliser le référentiel Produits',
            summary: 'Rechercher les Références Produit disponibles et gérer les favoris de l’espace de travail.',
            search: {
                keywords: ['produit', 'référence', 'favori', 'catalogue'],
                questions: [
                    'Comment trouver un Produit ?',
                    'Comment ajouter une Référence aux favoris ?',
                ],
            },
            audience: {
                permissions: [PRODUCT_CATALOG_PERMISSION.READ],
                applicationGlobalPermissions: [],
                ownerOnly: false,
            },
            requirements: { features: [] },
            whoCanPerform: 'Un membre autorisé à consulter le référentiel Produits.',
            prerequisites: [],
            steps: [
                'Ouvrez Produits depuis la navigation de l’espace.',
                'Recherchez la Référence Produit souhaitée.',
                'Consultez ses informations et, si nécessaire, gérez son statut de favori.',
            ],
            outcome: 'La Référence Produit reste partagée par le SaaS tandis que le favori reste propre à l’espace de travail.',
            edgeCases: [
                'Une Référence globale peut être utilisée sans être ajoutée aux favoris.',
            ],
            sensitiveConsequences: [],
            relatedEntryIds: [],
            order: 100,
        },
        {
            id: 'workspace.products.contribute',
            context: HELP_CONTEXT.WORKSPACE,
            categoryId: 'workspace_products',
            title: 'Proposer une nouvelle valeur Produit',
            summary: 'Ajouter une valeur absente du référentiel sans bloquer le travail du Workspace.',
            search: {
                keywords: ['produit', 'variété', 'couleur', 'calibre', 'contribution'],
                questions: [
                    'Comment ajouter une variété absente ?',
                    'Que signifie À valider ?',
                ],
            },
            audience: {
                permissions: [PRODUCT_CATALOG_PERMISSION.CONTRIBUTE],
                applicationGlobalPermissions: [],
                ownerOnly: false,
            },
            requirements: { features: [] },
            whoCanPerform: 'Un membre autorisé à contribuer au référentiel Produit.',
            prerequisites: [
                'Vérifiez d’abord qu’une valeur équivalente n’existe pas déjà.',
            ],
            steps: [
                'Ouvrez la Référence Produit à enrichir.',
                'Ajoutez la variété ou la caractéristique nécessaire.',
                'Confirmez explicitement la création lorsqu’une valeur proche est détectée.',
            ],
            outcome: 'La valeur provisoire est utilisable dans le Workspace contributeur puis soumise à la gouvernance globale.',
            edgeCases: [
                'Une valeur provisoire n’est pas exposée automatiquement aux autres Workspaces.',
            ],
            sensitiveConsequences: [],
            relatedEntryIds: [],
            order: 110,
        },
        {
            id: 'platform.products.reference',
            context: HELP_CONTEXT.PLATFORM,
            categoryId: 'platform_product_references',
            title: 'Consulter le référentiel Produits global',
            summary: 'Accéder aux Produits et contributions visibles selon les autorisations métier globales.',
            search: {
                keywords: ['produit', 'référentiel', 'global', 'contribution'],
                questions: [
                    'Comment consulter le référentiel Produits global ?',
                ],
            },
            audience: {
                permissions: [],
                applicationGlobalPermissions: [
                    PRODUCT_CATALOG_GLOBAL_PERMISSION.READ,
                ],
                ownerOnly: false,
            },
            requirements: { features: [] },
            whoCanPerform: 'Un membre disposant de la permission métier globale de consultation du référentiel Produits.',
            prerequisites: [],
            steps: [
                'Ouvrez la surface Platform.',
                'Accédez au référentiel Produits depuis la navigation autorisée.',
                'Consultez les Produits, catégories et contributions disponibles.',
            ],
            outcome: 'Le référentiel global est consulté sans élévation implicite liée au rôle Platform.',
            edgeCases: [],
            sensitiveConsequences: [],
            relatedEntryIds: [],
            order: 100,
        },
        {
            id: 'platform.products.governance',
            context: HELP_CONTEXT.PLATFORM,
            categoryId: 'platform_product_references',
            title: 'Gouverner les contributions Produit',
            summary: 'Valider, fusionner ou refuser les valeurs provisoires proposées par les Workspaces.',
            search: {
                keywords: ['produit', 'gouvernance', 'valider', 'fusionner', 'refuser'],
                questions: [
                    'Comment valider une contribution Produit ?',
                    'Comment traiter un doublon ?',
                ],
            },
            audience: {
                permissions: [],
                applicationGlobalPermissions: [
                    PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
                ],
                ownerOnly: false,
            },
            requirements: { features: [] },
            whoCanPerform: 'Un gestionnaire disposant de la permission métier globale de gestion du référentiel Produits.',
            prerequisites: [
                'Examiner la valeur proposée et les éventuelles références existantes proches.',
            ],
            steps: [
                'Ouvrez les contributions Produit.',
                'Examinez la proposition et son contexte.',
                'Validez, fusionnez ou refusez explicitement la contribution.',
            ],
            outcome: 'Le référentiel partagé est harmonisé tout en conservant les snapshots historiques validés.',
            edgeCases: [
                'Une résolution peut repointer les dépendances opérationnelles courantes mais ne réécrit pas les snapshots de validation des Fiches techniques.',
            ],
            sensitiveConsequences: [
                'Une fusion modifie la référence utilisée par les données opérationnelles compatibles avec la résolution.',
            ],
            relatedEntryIds: [],
            order: 110,
        },
    ]),
    workspaceRemediationEntryIds: Object.freeze([]),
});

export { PRODUCT_CATALOG_HELP_MODULE };
