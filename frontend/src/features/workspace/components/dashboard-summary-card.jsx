import { Link } from 'react-router';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardSummaryCard({
  label,
  value,
  description,
  href,
  isLoading = false,
  isError = false,
}) {
  const linked = Boolean(
    href
    && !isLoading
    && !isError,
  );

  return (
    <div className="relative h-full">
      <Card className="h-full shadow-sm transition-colors hover:border-primary/30">
        <CardContent>
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground">
              {label}
            </p>
            {description && (
              <>
                <InfoTooltip
                  className="relative z-20 size-5"
                  content={description}
                  label={`À propos de ${label}`}
                />
                <span className="sr-only">
                  {description}
                </span>
              </>
            )}
          </div>

          {isLoading ? (
            <div
              aria-live="polite"
              className="mt-2"
              role="status"
            >
              <span className="sr-only">
                Chargement de {label.toLowerCase()}…
              </span>
              <Skeleton className="h-8 w-1/2" />
            </div>
          ) : (
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {isError ? 'Indisponible' : value}
            </p>
          )}
        </CardContent>
      </Card>

      {linked && (
        <Link
          aria-label={`Ouvrir ${label}`}
          className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          to={href}
        >
          <span className="sr-only">
            Ouvrir {label}
          </span>
        </Link>
      )}
    </div>
  );
}

export { DashboardSummaryCard };
