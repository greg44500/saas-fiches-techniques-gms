import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  ProductReferenceGovernanceReviewPanel,
} from '@/features/products/components/product-reference-governance-review-panel';

/**
 * La revue qualité d'une Dimension ne vaut pas approbation de son identité.
 * Les statuts proviennent des lectures du référentiel, mais seule la décision
 * backend reste autoritaire au moment de publier la Référence.
 */
function buildReferenceReviewDependencies({
  product,
  variant,
  varieties,
  characteristics,
  kindLabels,
}) {
  const dependencies = [{
    dataType: 'PRODUCT',
    id: product.id,
    label: 'Produit parent',
    name: product.name,
    governanceStatus: product.governanceStatus,
    entity: product,
  }];

  if (variant.variety) {
    const variety = varieties.find(({ id }) => id === variant.variety.id)
      ?? variant.variety;
    dependencies.push({
      dataType: 'DIMENSION',
      dimensionType: 'VARIETY',
      id: variety.id,
      label: 'Variété',
      name: variety.name ?? 'Variété introuvable',
      governanceStatus: variety.governanceStatus,
      entity: variety,
    });
  }

  for (const item of variant.characteristics ?? []) {
    const characteristic = characteristics.find(({ id }) => id === item.id)
      ?? item;
    dependencies.push({
      dataType: 'DIMENSION',
      dimensionType: 'CHARACTERISTIC',
      id: characteristic.id,
      label: kindLabels.get(characteristic.kind) ?? 'Caractéristique',
      name: characteristic.name ?? 'Caractéristique introuvable',
      governanceStatus: characteristic.governanceStatus,
      entity: characteristic,
    });
  }

  return dependencies;
}

function ProductReferenceReviewWorkflow({
  product,
  variant,
  varieties,
  characteristics,
  kindLabels,
  context,
  dependencyContext,
  onExamine,
  onCloseDependency,
  onDecideDependency,
  onEditDependency,
  onApprove,
  onEdit,
  onMerge,
  onReject,
  pending,
}) {
  const dependencies = buildReferenceReviewDependencies({
    product, variant, varieties, characteristics, kindLabels,
  });
  const blockers = dependencies.filter(
    (item) => item.governanceStatus !== 'APPROVED',
  );
  const activeDependency = dependencies.find((item) => (
    dependencyContext?.targetId === item.id
    && dependencyContext?.dataType === item.dataType
  ));

  return (
    <section aria-label={'Contrôle de publication de ' + variant.name} className="space-y-3">
      <div>
        <h4 className="font-semibold">Contrôle de publication</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          {blockers.length
            ? blockers.length + ' élément(s) à examiner avant de valider la Référence.'
            : 'Les identités associées sont validées. Vous pouvez examiner la Référence.'}
        </p>
      </div>

      <ul className="space-y-2">
        {dependencies.map((item) => {
          const approved = item.governanceStatus === 'APPROVED';
          const canReview = item.governanceStatus === 'PROVISIONAL';
          const selected = activeDependency?.id === item.id;
          return (
            <li className="rounded-md border border-border bg-card p-3" key={item.dataType + ':' + item.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="break-words text-sm font-medium">{item.name}</p>
                </div>
                {approved ? (
                  <StatusBadge tone="success">Identité validée</StatusBadge>
                ) : canReview ? (
                  <Button
                    aria-label={(selected ? 'Masquer le contrôle de ' : 'Examiner ')
                      + item.label + ' ' + item.name}
                    disabled={pending}
                    onClick={() => (selected
                      ? onCloseDependency()
                      : onExamine(item))}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {selected ? 'Masquer le contrôle' : 'Examiner'}
                  </Button>
                ) : (
                  <StatusBadge tone="warning">Identité indisponible</StatusBadge>
                )}
              </div>

              {selected && (
                <div className="mt-3 border-t border-border pt-3">
                  <ProductReferenceGovernanceReviewPanel
                    context={dependencyContext}
                    onApprove={() => onDecideDependency('APPROVE')}
                    onEdit={() => onEditDependency(item)}
                    onMerge={(candidate) => onDecideDependency('MERGE', candidate.id)}
                    onReject={() => onDecideDependency('REJECT')}
                    pending={pending}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {blockers.length > 0 && (
        <p className="text-sm text-warning" role="status">
          La validation finale attend l’examen des identités signalées.
          Vous pouvez toujours corriger, rapprocher ou refuser la Référence.
        </p>
      )}

      <ProductReferenceGovernanceReviewPanel
        approveDisabled={blockers.length > 0}
        context={context}
        onApprove={onApprove}
        onEdit={onEdit}
        onMerge={onMerge}
        onReject={onReject}
        pending={pending}
      />
    </section>
  );
}

export { buildReferenceReviewDependencies, ProductReferenceReviewWorkflow };
