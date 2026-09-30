import {
    TECHNICAL_SHEET_PERMISSION,
} from './technicalSheetPermission.registry.js';
import { HELP_CONTEXT } from '../help/help.registry.js';

const TECHNICAL_SHEET_HELP_MODULE = Object.freeze({
    key: 'technical-sheets',
    categories: Object.freeze([
        {
            id: 'workspace_technical_sheets',
            context: HELP_CONTEXT.WORKSPACE,
            label: 'Fiches techniques',
            description: 'Création, composition, valorisation et validation des Fiches techniques.',
            order: 130,
        },
    ]),
    entries: Object.freeze([
        {
            id: 'workspace.technical_sheets.create',
            context: HELP_CONTEXT.WORKSPACE,
            categoryId: 'workspace_technical_sheets',
            title: 'Créer et composer une Fiche technique',
            summary: 'Créer une Fiche dans un Dossier puis renseigner sa composition.',
            search: {
                keywords: ['fiche technique', 'créer', 'ingrédient', 'économat'],
                questions: [
                    'Comment créer une Fiche technique ?',
                    'Comment ajouter un ingrédient ?',
                ],
            },
            audience: {
                permissions: [TECHNICAL_SHEET_PERMISSION.CREATE],
                applicationGlobalPermissions: [],
                ownerOnly: false,
            },
            requirements: { features: [] },
            whoCanPerform: 'Un membre autorisé à créer des Fiches techniques.',
            prerequisites: [
                'Un Dossier accessible doit être sélectionné pour porter la Fiche.',
            ],
            steps: [
                'Ouvrez les Fiches techniques du Dossier.',
                'Créez une nouvelle Fiche.',
                'Ajoutez les lignes Ingrédients et Économat à partir des Références Produit.',
                'Enregistrez le brouillon.',
            ],
            outcome: 'La Fiche durable possède un brouillon modifiable dans le Dossier courant.',
            edgeCases: [
                'Le quota commercial compte les identités de Fiche, pas le nombre de brouillons ou de validations.',
            ],
            sensitiveConsequences: [],
            relatedEntryIds: [],
            order: 100,
        },
        {
            id: 'workspace.technical_sheets.valuation',
            context: HELP_CONTEXT.WORKSPACE,
            categoryId: 'workspace_technical_sheets',
            title: 'Valoriser une Fiche technique',
            summary: 'Résoudre les Articles et prix du Dossier puis calculer la valorisation économique.',
            search: {
                keywords: ['fiche technique', 'valorisation', 'prix', 'coût', 'marge'],
                questions: [
                    'Comment valoriser une Fiche technique ?',
                    'Pourquoi une ligne n’est-elle pas valorisée ?',
                ],
            },
            audience: {
                permissions: [TECHNICAL_SHEET_PERMISSION.VALUATION_MANAGE],
                applicationGlobalPermissions: [],
                ownerOnly: false,
            },
            requirements: { features: [] },
            whoCanPerform: 'Un membre autorisé à gérer la valorisation des Fiches techniques.',
            prerequisites: [
                'Les lignes doivent utiliser des Références Produit M-002.',
                'Les sources de prix sont résolues dans le contexte du Dossier via M-003.',
            ],
            steps: [
                'Ouvrez la Fiche à valoriser.',
                'Résolvez les éventuelles ambiguïtés d’Article fournisseur.',
                'Lancez ou actualisez la valorisation.',
                'Vérifiez les coûts, la marge cible et le prix final.',
            ],
            outcome: 'La Fiche dispose d’une valorisation explicable à partir des données économiques du Dossier.',
            edgeCases: [
                'Un prix absent n’est jamais remplacé par 0 €.',
                'Si les prix ont changé, une revalorisation explicite est requise avant validation.',
            ],
            sensitiveConsequences: [],
            relatedEntryIds: [],
            order: 110,
        },
        {
            id: 'workspace.technical_sheets.validate',
            context: HELP_CONTEXT.WORKSPACE,
            categoryId: 'workspace_technical_sheets',
            title: 'Valider une Fiche technique',
            summary: 'Créer un état validé courant et conserver automatiquement l’historique précédent.',
            search: {
                keywords: ['fiche technique', 'valider', 'historique', 'version'],
                questions: [
                    'Comment valider une Fiche technique ?',
                    'Que devient la version précédente ?',
                ],
            },
            audience: {
                permissions: [TECHNICAL_SHEET_PERMISSION.VALIDATE],
                applicationGlobalPermissions: [],
                ownerOnly: false,
            },
            requirements: { features: [] },
            whoCanPerform: 'Un membre autorisé à valider les Fiches techniques.',
            prerequisites: [
                'La Fiche doit être valorisée avec des données tarifaires encore fraîches.',
                'Aucune ligne obligatoire ne doit rester non résolue.',
            ],
            steps: [
                'Vérifiez la composition et la valorisation.',
                'Ajoutez le commentaire de validation si nécessaire.',
                'Confirmez la validation.',
            ],
            outcome: 'Un nouvel état validé devient courant et l’état validé précédent reste conservé dans l’historique.',
            edgeCases: [
                'Une sauvegarde de brouillon ne crée pas une nouvelle version validée.',
            ],
            sensitiveConsequences: [
                'Les snapshots économiques validés sont historiques et ne sont pas réécrits par les évolutions ultérieures du référentiel.',
            ],
            relatedEntryIds: [],
            order: 120,
        },
    ]),
    workspaceRemediationEntryIds: Object.freeze([]),
});

export { TECHNICAL_SHEET_HELP_MODULE };
