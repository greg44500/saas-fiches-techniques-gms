import {
  formatEffectiveLimitValue,
  formatFeatureAvailability,
  formatFeatureLabel,
  formatLimitLabel,
} from '@/features/subscription/lib/subscription-formatters';

/**
 * Affiche les capabilities effectives déjà résolues par le backend.
 *
 * Le composant ne reçoit volontairement pas le Plan catalogue comme source de
 * droits : un EntitlementOverride peut activer, retirer ou modifier une
 * capability sans changer le Plan. Cette vue reste informative ; les contrôles
 * de sécurité réels restent exclusivement côté backend.
 */
function EffectivePlanCapabilities({ entitlement, now = new Date() }) {
  const features = entitlement?.features ?? [];
  const featureAvailability = entitlement?.featureAvailability ?? {};
  const featurePresentations = entitlement?.featurePresentations ?? {};
  const limitPresentations = entitlement?.limitPresentations ?? {};
  const limitEntries = Object.entries(entitlement?.limits ?? {});

  return (
    <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="effective-plan-capabilities-title">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Droits effectifs</p>
        <h2 id="effective-plan-capabilities-title" className="mt-1 text-lg font-semibold">
          Fonctionnalités et limites
        </h2>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-medium">Fonctionnalités disponibles</h3>
          {features.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Aucune fonctionnalité spécifique n’est actuellement disponible.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {features.map((featureKey) => (
                <li
                  className="flex flex-col gap-1 rounded-md bg-muted/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  key={featureKey}
                >
                  <span className="font-medium">
                    {formatFeatureLabel(featureKey, featurePresentations)}
                  </span>
                  <span className="text-xs text-muted-foreground sm:text-right">
                    {formatFeatureAvailability(featureAvailability[featureKey], { now })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="font-medium">Limites effectives</h3>
          {limitEntries.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Aucune limite chiffrée n’est actuellement déclarée.</p>
          ) : (
            <dl className="mt-3 divide-y divide-border rounded-md border border-border">
              {limitEntries.map(([limitKey, value]) => (
                <div className="flex items-center justify-between gap-4 px-3 py-2 text-sm" key={limitKey}>
                  <dt className="text-muted-foreground">
                    {formatLimitLabel(limitKey, limitPresentations)}
                  </dt>
                  <dd className="font-medium">
                    {formatEffectiveLimitValue(limitKey, value, features)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}

export { EffectivePlanCapabilities };
