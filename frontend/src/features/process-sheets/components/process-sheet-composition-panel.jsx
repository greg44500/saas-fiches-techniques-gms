import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  useGetProcessSheetCompositionQuery,
} from '@/features/process-sheets/api/process-sheets-api';

function IngredientSourceSection({ composition, label }) {
  if (!composition) {
    return (
      <section className="space-y-2" aria-label={label}>
        <h4 className="text-sm font-semibold">{label}</h4>
        <p className="text-sm text-muted-foreground">
          Aucune composition {label === 'Brouillon' ? 'en cours' : 'validée'}.
        </p>
      </section>
    );
  }

  return (
    <section aria-label={label} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">{label}</h4>
        <StatusBadge tone={composition.sourceKind === 'VALIDATION' ? 'success' : 'warning'}>
          {composition.sourceKind === 'VALIDATION' ? 'Validation M-004' : 'Travail en cours M-004'}
        </StatusBadge>
      </div>
      {composition.hasLegacyLineIdentity && (
        <p role="note" className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
          Cette validation historique ne possède pas d’identifiants de lignes
          permanents. Le rapprochement avec d’autres versions devra être
          vérifié explicitement avant toute validation d’un process.
        </p>
      )}
      {composition.lines.length === 0 ? (
        <EmptyState
          className="rounded-lg border border-dashed border-border p-4"
          title="Aucun ingrédient dans cette composition"
          description="Les lignes d'économat ne sont pas considérées comme des ingrédients de fabrication."
        />
      ) : (
        <>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Références regroupées ({composition.groupedIngredients.length})
            </p>
            <ul className="flex flex-wrap gap-2" aria-label={'Références regroupées — ' + label}>
              {composition.groupedIngredients.map((ingredient) => (
                <li className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs" key={ingredient.productVariantId}>
                  {ingredient.productVariantName ?? 'Référence indisponible'}
                  {ingredient.lineKeys.length > 1 && (
                    <span className="ml-1 text-muted-foreground">
                      · {ingredient.lineKeys.length} occurrences
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <ol className="divide-y divide-border rounded-lg border border-border" aria-label={'Lignes de composition — ' + label}>
            {composition.lines.map((line, index) => (
              <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm" key={line.lineKey}>
                <span className="min-w-0">
                  <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                  {line.productVariantName ?? 'Référence indisponible'}
                </span>
                {line.identityKind === 'LEGACY_POSITION' && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Ligne historique
                  </span>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function ProcessSheetCompositionPanel({
  dossierId,
  technicalSheetId,
  workspaceId,
}) {
  const compositionQuery = useGetProcessSheetCompositionQuery(
    { workspaceId, dossierId, technicalSheetId },
    { skip: !technicalSheetId },
  );

  if (!technicalSheetId) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            className="p-0"
            title="Sélectionnez une Fiche technique"
            description="Consultez ici ses ingrédients sans modifier la composition M-004."
          />
        </CardContent>
      </Card>
    );
  }

  if (compositionQuery.isLoading && !compositionQuery.data) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Chargement de la composition…
        </CardContent>
      </Card>
    );
  }

  if (compositionQuery.isError || !compositionQuery.data) {
    return (
      <Card>
        <CardContent>
          <ErrorState
            title="Composition indisponible"
            description="La Fiche technique sélectionnée est peut-être inaccessible ou a été modifiée."
            onRetry={compositionQuery.refetch}
          />
        </CardContent>
      </Card>
    );
  }

  const composition = compositionQuery.data;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">Composition de référence M-004</CardTitle>
        <p className="break-words text-sm font-medium">{composition.technicalSheetName}</p>
        <p className="text-xs text-muted-foreground">
          Aperçu en lecture seule — aucune Fiche process n'est encore créée.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {composition.requiresExplicitLegacyMapping && (
          <p role="note" className="text-sm text-muted-foreground">
            Des lignes historiques nécessiteront une correspondance manuelle
            lors de la construction d'un process.
          </p>
        )}
        <IngredientSourceSection composition={composition.draft} label="Brouillon" />
        <IngredientSourceSection composition={composition.validated} label="Validée" />
      </CardContent>
    </Card>
  );
}

export { ProcessSheetCompositionPanel };
