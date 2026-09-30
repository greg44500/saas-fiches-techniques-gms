import { useParams } from 'react-router';

import {
  useGetWorkspaceHelpCatalogQuery,
  useGetWorkspaceHelpEntryQuery,
} from '@/features/help/api/help-api';
import { HelpPage } from '@/features/help/components/help-page';

function WorkspaceHelpPage() {
  const { workspaceId, entryId } = useParams();
  const catalogQuery = useGetWorkspaceHelpCatalogQuery(workspaceId, {
    refetchOnMountOrArgChange: true,
  });
  const entryQuery = useGetWorkspaceHelpEntryQuery(
    { workspaceId, entryId },
    {
      skip: !entryId,
      refetchOnMountOrArgChange: true,
    },
  );

  return (
    <HelpPage
      basePath={`/workspaces/${workspaceId}/help`}
      catalog={catalogQuery.data}
      catalogError={catalogQuery.error}
      catalogLoading={catalogQuery.isLoading}
      description="Retrouvez les procédures Core et applicatives disponibles avec vos droits, votre offre et l’état actuel de cet espace de travail."
      entry={entryQuery.data}
      entryError={entryQuery.error}
      entryId={entryId}
      entryLoading={entryQuery.isLoading}
      title="Centre d’aide du workspace"
    />
  );
}

export { WorkspaceHelpPage };
