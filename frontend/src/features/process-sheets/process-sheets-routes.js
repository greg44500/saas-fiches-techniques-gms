const dossierProcessSheetFrontendRoutes = Object.freeze([
  Object.freeze({
    path: 'process-sheets',
    lazy: async () => {
      const { ProcessSheetsRoute } = await import(
        '@/features/process-sheets/components/process-sheets-route'
      );
      return { Component: ProcessSheetsRoute };
    },
  }),
  Object.freeze({
    path: 'process-sheets/:processSheetId',
    lazy: async () => {
      const { ProcessSheetWorkspaceRoute } = await import(
        '@/features/process-sheets/components/process-sheet-workspace-route'
      );
      return { Component: ProcessSheetWorkspaceRoute };
    },
  }),
]);

export { dossierProcessSheetFrontendRoutes };
