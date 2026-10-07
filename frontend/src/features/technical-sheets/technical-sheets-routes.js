const dossierTechnicalSheetFrontendRoutes = Object.freeze([
  Object.freeze({
    path: 'technical-sheets',
    lazy: async () => {
      const { TechnicalSheetsRoute } = await import(
        '@/features/technical-sheets/components/technical-sheets-route'
      );
      return { Component: TechnicalSheetsRoute };
    },
  }),
  Object.freeze({
    path: 'technical-sheets/:technicalSheetId',
    lazy: async () => {
      const { TechnicalSheetWorkspaceRoute } = await import(
        '@/features/technical-sheets/components/technical-sheet-workspace-route'
      );
      return { Component: TechnicalSheetWorkspaceRoute };
    },
  }),
  Object.freeze({
    path: 'technical-sheets/:technicalSheetId/optimization',
    lazy: async () => {
      const { TechnicalSheetOptimizerRoute } = await import(
        '@/features/technical-sheets/components/technical-sheet-optimizer-route'
      );
      return { Component: TechnicalSheetOptimizerRoute };
    },
  }),
]);

const technicalSheetsFrontendRouteModule = Object.freeze({
  workspaceRoutes: Object.freeze([
    Object.freeze({
      path: 'technical-sheets/optimization',
      lazy: async () => {
        const { TechnicalSheetOptimizerLauncherPage } = await import(
          '@/features/technical-sheets/pages/technical-sheet-optimizer-launcher-page'
        );
        return { Component: TechnicalSheetOptimizerLauncherPage };
      },
    }),
    Object.freeze({
      path: 'technical-sheets/trash',
      lazy: async () => {
        const { TechnicalSheetTrashRoute } = await import(
          '@/features/technical-sheets/components/technical-sheet-trash-route'
        );
        return { Component: TechnicalSheetTrashRoute };
      },
    }),
  ]),
});

export {
  dossierTechnicalSheetFrontendRoutes,
  technicalSheetsFrontendRouteModule,
};
