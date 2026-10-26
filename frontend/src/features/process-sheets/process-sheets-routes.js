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
]);

export { dossierProcessSheetFrontendRoutes };
