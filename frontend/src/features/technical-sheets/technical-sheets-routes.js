const technicalSheetsFrontendRouteModule = Object.freeze({
  workspaceRoutes: Object.freeze([
    Object.freeze({
      path: 'dossiers/:dossierId/technical-sheets',
      lazy: async () => {
        const { TechnicalSheetsRoute } = await import(
          '@/features/technical-sheets/components/technical-sheets-route'
        );
        return { Component: TechnicalSheetsRoute };
      },
    }),
    Object.freeze({
      path: 'dossiers/:dossierId/technical-sheets/:technicalSheetId',
      lazy: async () => {
        const { TechnicalSheetWorkspaceRoute } = await import(
          '@/features/technical-sheets/components/technical-sheet-workspace-route'
        );
        return { Component: TechnicalSheetWorkspaceRoute };
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

export { technicalSheetsFrontendRouteModule };
