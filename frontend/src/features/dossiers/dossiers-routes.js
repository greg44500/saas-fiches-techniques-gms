const dossiersFrontendRouteModule = Object.freeze({
  workspaceRoutes: Object.freeze([
    Object.freeze({
      path: 'dossiers',
      lazy: async () => {
        const { DossiersRoute } = await import(
          '@/features/dossiers/components/dossiers-route'
        );
        return { Component: DossiersRoute };
      },
    }),
    Object.freeze({
      path: 'dossiers/:dossierId',
      lazy: async () => {
        const { DossierWorkspaceRoute } = await import(
          '@/features/dossiers/components/dossier-workspace-route'
        );
        return { Component: DossierWorkspaceRoute };
      },
    }),
  ]),
});

export { dossiersFrontendRouteModule };
