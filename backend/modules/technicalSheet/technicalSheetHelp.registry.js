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
                'Le Dossier doit posséder une marge cible par défaut.',
            ],
            steps: [
                'Ouvrez les Fiches techniques du Dossier.',
                'Créez une nouvelle Fiche en renseignant le nom, la quantité produite, l’unité de production et la TVA.',
                'Vérifiez la marge cible héritée du Dossier.',
                'Ajoutez les lignes Ingrédients et Économat à partir des Références Produit.',
                'Les modifications sont enregistrées et recalculées automatiquement.',
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
            title: 'Comprendre les calculs d’une Fiche technique',
            summary: 'Les coûts et prix sont recalculés automatiquement à partir des paramètres, de la composition et des prix du Dossier.',
            search: {
                keywords: ['fiche technique', 'valorisation', 'prix', 'coût', 'marge'],
                questions: [
                    'Comment sont calculés les coûts d’une Fiche technique ?',
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
                'Ouvrez la Fiche technique.',
                'Vérifiez les paramètres de production, la TVA et la marge cible.',
                'Ajoutez ou modifiez les lignes Ingrédients et Économat.',
                'Résolvez les éventuelles ambiguïtés d’Article fournisseur.',
                'Vérifiez les coûts et prix recalculés automatiquement.',
            ],
            outcome: 'La Fiche dispose d’une valorisation explicable à partir des données économiques du Dossier.',
            edgeCases: [
                'Un prix absent n’est jamais remplacé par 0 €.',
                'Si un prix a changé avant validation, les calculs sont actualisés et la validation doit être confirmée à nouveau après vérification.',
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
        {
            "id": "workspace.technical_sheets.read",
            "context": "workspace",
            "categoryId": "workspace_technical_sheets",
            "title": "Consulter une Fiche et son historique",
            "summary": "Accéder à une Fiche et distinguer brouillon, validation courante et historique.",
            "search": {
                "keywords": [
                    "fiche",
                    "prévisualiser",
                    "historique"
                ],
                "questions": [
                    "Où voir une Fiche validée ?"
                ]
            },
            "audience": {
                "permissions": [
                    TECHNICAL_SHEET_PERMISSION.READ
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
                "Ouvrez un Dossier autorisé puis ses Fiches techniques.",
                "Ouvrez une Fiche ou utilisez Prévisualiser dans son menu d’actions.",
                "Consultez l’état validé courant et l’historique disponible."
            ],
            "outcome": "Les versions validées restent distinctes du brouillon courant.",
            "edgeCases": [
                "Une modification de brouillon ne remplace pas une version validée tant que la validation n’a pas eu lieu."
            ],
            "sensitiveConsequences": [],
            "relatedEntryIds": [],
            "order": 90
        },
        {
            "id": "workspace.technical_sheets.export",
            "context": "workspace",
            "categoryId": "workspace_technical_sheets",
            "title": "Exporter une Fiche validée",
            "summary": "Télécharger une Fiche validée en PDF, XLSX ou CSV.",
            "search": {
                "keywords": [
                    "export",
                    "pdf",
                    "csv",
                    "xlsx",
                    "téléchargement"
                ],
                "questions": [
                    "Comment exporter une Fiche technique ?"
                ]
            },
            "audience": {
                "permissions": [
                    TECHNICAL_SHEET_PERMISSION.EXPORT
                ],
                "applicationGlobalPermissions": [],
                "ownerOnly": false
            },
            "requirements": {
                "features": [
                    "technical_sheet_export"
                ]
            },
            "whoCanPerform": "Un membre disposant de la permission métier correspondante et de l’accès effectif au contexte.",
            "prerequisites": [],
            "steps": [
                "Ouvrez la Fiche technique validée depuis son Dossier.",
                "Dans le panneau de contrôle de la Fiche, ouvrez Exports.",
                "Choisissez le format PDF, XLSX ou CSV."
            ],
            "outcome": "Le document correspondant à l’état validé est généré pour téléchargement.",
            "edgeCases": [
                "L’export nécessite la capacité commerciale et un quota mensuel disponible.",
                "Les exports ne sont pas proposés dans le menu d’actions de la liste."
            ],
            "sensitiveConsequences": [],
            "relatedEntryIds": [],
            "order": 130
        },
        {
            "id": "workspace.technical_sheets.optimize",
            "context": "workspace",
            "categoryId": "workspace_technical_sheets",
            "title": "Utiliser l’Atelier d’optimisation",
            "summary": "Simuler des ajustements économiques avant de les appliquer explicitement au brouillon.",
            "search": {
                "keywords": [
                    "atelier",
                    "optimisation",
                    "simulation",
                    "économies"
                ],
                "questions": [
                    "Comment optimiser une Fiche ?"
                ]
            },
            "audience": {
                "permissions": [
                    TECHNICAL_SHEET_PERMISSION.UPDATE
                ],
                "applicationGlobalPermissions": [],
                "ownerOnly": false
            },
            "requirements": {
                "features": [
                    "technical_sheet_optimizer"
                ]
            },
            "whoCanPerform": "Un membre disposant de la permission métier correspondante et de l’accès effectif au contexte.",
            "prerequisites": [],
            "steps": [
                "Ouvrez l’Atelier d’optimisation depuis la navigation Dossiers ou l’action Optimiser d’une Fiche.",
                "Choisissez une Fiche disposant d’un brouillon de travail.",
                "Utilisez le mode Manuel ou Auto pour simuler les ajustements et examiner les écarts économiques.",
                "Choisissez explicitement Appliquer au brouillon pour enregistrer les changements retenus."
            ],
            "outcome": "Une simulation seule ne modifie pas le brouillon ; l’application met à jour celui-ci.",
            "edgeCases": [
                "Une Fiche uniquement validée nécessite d’abord la création d’un nouveau brouillon.",
                "Le mode Auto ne valide pas automatiquement la Fiche et ne calcule pas de score de qualité."
            ],
            "sensitiveConsequences": [],
            "relatedEntryIds": [],
            "order": 140
        },
        {
            "id": "workspace.technical_sheets.copy",
            "context": "workspace",
            "categoryId": "workspace_technical_sheets",
            "title": "Copier une Fiche vers un autre Dossier",
            "summary": "Réutiliser une composition dans un autre Dossier avec les prix de sa destination.",
            "search": {
                "keywords": [
                    "copier",
                    "dossier",
                    "valorisation"
                ],
                "questions": [
                    "Comment copier une Fiche ?"
                ]
            },
            "audience": {
                "permissions": [
                    TECHNICAL_SHEET_PERMISSION.COPY
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
                "Ouvrez la Fiche depuis son Dossier source.",
                "Dans le panneau de contrôle, choisissez Copier vers un autre Dossier.",
                "Sélectionnez le Dossier cible autorisé et confirmez."
            ],
            "outcome": "Une Fiche distincte est créée dans le Dossier cible avec une valorisation contextualisée.",
            "edgeCases": [
                "Les prix et données financières propres au Dossier source ne sont pas recopiés.",
                "La création reste soumise à la capacité de Fiches techniques du Workspace."
            ],
            "sensitiveConsequences": [],
            "relatedEntryIds": [],
            "order": 150
        },
        {
            "id": "workspace.technical_sheets.trash",
            "context": "workspace",
            "categoryId": "workspace_technical_sheets",
            "title": "Comprendre la Corbeille et la capacité",
            "summary": "Retrouver les Fiches supprimées et comprendre leur effet sur le quota.",
            "search": {
                "keywords": [
                    "corbeille",
                    "quota",
                    "restaurer",
                    "purger"
                ],
                "questions": [
                    "Pourquoi une Fiche supprimée compte-t-elle encore ?"
                ]
            },
            "audience": {
                "permissions": [
                    TECHNICAL_SHEET_PERMISSION.READ
                ],
                "applicationGlobalPermissions": [],
                "ownerOnly": true
            },
            "requirements": {
                "features": []
            },
            "whoCanPerform": "Le propriétaire du Workspace disposant de la permission indiquée.",
            "prerequisites": [],
            "steps": [
                "Sur le tableau de bord Workspace, consultez la capacité des Fiches techniques.",
                "Utilisez la carte Dans la Corbeille pour ouvrir la Corbeille.",
                "Vérifiez les Fiches encore conservées avant restauration ou suppression définitive."
            ],
            "outcome": "La capacité affiche les Fiches présentes dans les Dossiers et dans la Corbeille.",
            "edgeCases": [
                "La suppression logique ne libère pas le quota ; la purge définitive le libère.",
                "La Corbeille globale des Fiches techniques est réservée au propriétaire du Workspace."
            ],
            "sensitiveConsequences": [],
            "relatedEntryIds": [],
            "order": 160
        },
        {
            "id": "workspace.technical_sheets.restore",
            "context": "workspace",
            "categoryId": "workspace_technical_sheets",
            "title": "Restaurer une Fiche supprimée",
            "summary": "Restaurer une Fiche encore conservée dans la Corbeille.",
            "search": {
                "keywords": [
                    "corbeille",
                    "restauration"
                ],
                "questions": [
                    "Comment restaurer une Fiche ?"
                ]
            },
            "audience": {
                "permissions": [
                    TECHNICAL_SHEET_PERMISSION.RESTORE
                ],
                "applicationGlobalPermissions": [],
                "ownerOnly": true
            },
            "requirements": {
                "features": []
            },
            "whoCanPerform": "Le propriétaire du Workspace disposant de la permission indiquée.",
            "prerequisites": [],
            "steps": [
                "Ouvrez la Corbeille des Fiches techniques.",
                "Choisissez Restaurer sur la Fiche concernée.",
                "Vérifiez que la Fiche est de nouveau disponible dans son Dossier."
            ],
            "outcome": "La Fiche restaurée retrouve son usage normal selon son état et les droits disponibles.",
            "edgeCases": [
                "La restauration ne libère pas de place supplémentaire : la Fiche était déjà comptée dans le quota."
            ],
            "sensitiveConsequences": [],
            "relatedEntryIds": [],
            "order": 170
        },
        {
            "id": "workspace.technical_sheets.purge",
            "context": "workspace",
            "categoryId": "workspace_technical_sheets",
            "title": "Supprimer définitivement une Fiche",
            "summary": "Libérer la capacité en purgeant une Fiche de la Corbeille.",
            "search": {
                "keywords": [
                    "purge",
                    "suppression définitive",
                    "quota"
                ],
                "questions": [
                    "Comment libérer une place de Fiche technique ?"
                ]
            },
            "audience": {
                "permissions": [
                    TECHNICAL_SHEET_PERMISSION.PURGE
                ],
                "applicationGlobalPermissions": [],
                "ownerOnly": true
            },
            "requirements": {
                "features": []
            },
            "whoCanPerform": "Le propriétaire du Workspace disposant de la permission indiquée.",
            "prerequisites": [],
            "steps": [
                "Ouvrez la Corbeille des Fiches techniques.",
                "Choisissez Supprimer définitivement sur la Fiche concernée.",
                "Vérifiez le contenu de la confirmation avant de la valider."
            ],
            "outcome": "La Fiche purgée ne compte plus dans la capacité.",
            "edgeCases": [
                "Cette suppression est définitive ; ne la confondez pas avec le placement dans la Corbeille."
            ],
            "sensitiveConsequences": [],
            "relatedEntryIds": [],
            "order": 180
        },
    ]),
    workspaceRemediationEntryIds: Object.freeze([]),
});

export { TECHNICAL_SHEET_HELP_MODULE };
