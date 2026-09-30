import { useParams } from 'react-router';

import {
  useGetPlatformHelpCatalogQuery,
  useGetPlatformHelpEntryQuery,
} from '@/features/help/api/help-api';
import { HelpPage } from '@/features/help/components/help-page';

function PlatformHelpPage() {
  const { entryId } = useParams();
  const catalogQuery = useGetPlatformHelpCatalogQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const entryQuery = useGetPlatformHelpEntryQuery(entryId, {
    skip: !entryId,
    refetchOnMountOrArgChange: true,
  });

  return (
    <HelpPage
      basePath="/platform/help"
      catalog={catalogQuery.data}
      catalogError={catalogQuery.error}
      catalogLoading={catalogQuery.isLoading}
      description="Consultez les procédures d’administration disponibles selon vos permissions Platform et, lorsqu’un module le requiert, vos permissions globales applicatives."
      entry={entryQuery.data}
      entryError={entryQuery.error}
      entryId={entryId}
      entryLoading={entryQuery.isLoading}
      title="Centre d’aide Platform"
    />
  );
}

export { PlatformHelpPage };
