import { DOSSIER_PERMISSION } from './dossierPermission.registry.js';
import { HELP_CONTEXT } from '../help/help.registry.js';

const DOSSIER_HELP_MODULE = Object.freeze({
    key: 'dossiers',
    categories: Object.freeze([
        {
            id: 'workspace_dossiers',
            context: HELP_CONTEXT.WORKSPACE,
            label: 'Dossiers',
            description: 'Accès, consultation et gestion des Dossiers / magasins.',
            order: 100,
        },
    ]),
    entries: Object.freeze([
        {
            id: 'workspace.dossiers.open',
            context: HELP_CONTEXT.WORKSPACE,
            categoryId: 'workspace_dossiers',
            title: 'Consulter et ouvrir un Dossier',
            summary: 'Accéder à un Dossier autorisé puis ouvrir son espace de travail.',
            search: {
                keywords: ['dossier', 'magasin', 'ouvrir', 'accès'],
                questions: [
                    'Comment ouvrir un Dossier ?',
                    'Pourquoi un Dossier n’apparaît-il pas ?',
                ],
            },
            audience: {
                permissions: [DOSSIER_PERMISSION.READ],
                applicationGlobalPermissions: [],
                ownerOnly: false,
            },
            requirements: { features: [] },
            whoCanPerform: 'Un membre disposant du droit de consulter les Dossiers et d’un accès effectif au Dossier concerné.',
            prerequisites: [
                'Le Dossier doit être accessible dans l’espace de travail courant.',
            ],
            steps: [
                'Ouvrez la liste des Dossiers.',
                'Consultez le Dossier souhaité.',
                'Utilisez l’action d’ouverture pour entrer dans son espace de travail.',
            ],
            outcome: 'Le Dossier devient le contexte métier consulté sans mélanger ses données avec celles d’un autre magasin.',
            edgeCases: [
                'Un membre sans affectation effective ne peut pas ouvrir directement un Dossier par son URL.',
                'Un Dossier supprimé n’est pas utilisable dans les flux métier normaux.',
            ],
            sensitiveConsequences: [],
            relatedEntryIds: [],
            order: 100,
        },
        {
            id: 'workspace.dossiers.access',
            context: HELP_CONTEXT.WORKSPACE,
            categoryId: 'workspace_dossiers',
            title: 'Gérer les accès d’un Dossier',
            summary: 'Affecter ou retirer les membres autorisés à travailler sur un Dossier.',
            search: {
                keywords: ['dossier', 'membre', 'affectation', 'accès'],
                questions: [
                    'Comment affecter un membre à un Dossier ?',
                    'Comment retirer l’accès à un magasin ?',
                ],
            },
            audience: {
                permissions: [DOSSIER_PERMISSION.ACCESS_MANAGE],
                applicationGlobalPermissions: [],
                ownerOnly: false,
            },
            requirements: { features: [] },
            whoCanPerform: 'Un membre autorisé à gérer les accès Dossier.',
            prerequisites: [
                'Le membre doit appartenir à l’espace de travail.',
            ],
            steps: [
                'Ouvrez le Dossier puis son onglet Accès.',
                'Ajoutez ou retirez les affectations nécessaires.',
                'Vérifiez la liste des membres effectivement affectés.',
            ],
            outcome: 'Les droits métier du membre sont limités aux Dossiers qui lui sont effectivement accessibles.',
            edgeCases: [
                'Le propriétaire de l’espace dispose d’un périmètre Dossier implicite.',
                'La suppression d’un Dossier révoque les affectations actives ; une restauration ne les réactive pas automatiquement.',
            ],
            sensitiveConsequences: [
                'Retirer une affectation coupe immédiatement l’accès métier au Dossier concerné.',
            ],
            relatedEntryIds: [],
            order: 110,
        },
        {
            "id": "workspace.dossiers.create",
            "context": "workspace",
            "categoryId": "workspace_dossiers",
            "title": "Créer et régler un Dossier",
            "summary": "Créer un Dossier avec son nom et sa marge cible par défaut.",
            "search": {
                "keywords": [
                    "dossier",
                    "création",
                    "marge cible"
                ],
                "questions": [
                    "Comment créer un Dossier ?"
                ]
            },
            "audience": {
                "permissions": [
                    DOSSIER_PERMISSION.CREATE
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
                "Ouvrez Dossiers puis l’action de création.",
                "Renseignez le nom et la marge cible par défaut, tous deux obligatoires.",
                "Complétez les autres informations si nécessaire, puis confirmez la création."
            ],
            "outcome": "Un nouveau Dossier est disponible dans votre espace de travail.",
            "edgeCases": [
                "La validation signale les champs obligatoires manquants et retire leur erreur après correction."
            ],
            "sensitiveConsequences": [],
            "relatedEntryIds": [],
            "order": 120
        },
        {
            "id": "workspace.dossiers.settings",
            "context": "workspace",
            "categoryId": "workspace_dossiers",
            "title": "Modifier les informations d’un Dossier",
            "summary": "Mettre à jour les informations générales et accéder aux réglages d’un Dossier.",
            "search": {
                "keywords": [
                    "dossier",
                    "réglages",
                    "modifier"
                ],
                "questions": [
                    "Où modifier un Dossier ?"
                ]
            },
            "audience": {
                "permissions": [
                    DOSSIER_PERMISSION.UPDATE
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
                "Ouvrez Dossiers et sélectionnez le Dossier autorisé.",
                "Accédez aux informations ou à l’administration du Dossier selon votre besoin.",
                "Modifiez les champs autorisés et enregistrez."
            ],
            "outcome": "Les informations du Dossier sont actualisées.",
            "edgeCases": [
                "La marge cible de la Fiche technique relève de ses réglages métier et ne doit pas être confondue avec les informations générales."
            ],
            "sensitiveConsequences": [],
            "relatedEntryIds": [],
            "order": 130
        },
    ]),
    workspaceRemediationEntryIds: Object.freeze([]),
});

export { DOSSIER_HELP_MODULE };
