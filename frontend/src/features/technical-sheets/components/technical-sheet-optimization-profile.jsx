import {
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  useMemo,
  useState,
} from 'react';

import { ingredientColor } from '@/features/technical-sheets/lib/technical-sheet-optimizer-colors';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  findOptimizerLine,
  findProjectionLine,
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatSignedPercent,
} from '@/features/technical-sheets/lib/technical-sheet-optimizer';

const SVG_WIDTH = 620;
const SVG_HEIGHT = 132;
const PADDING_X = 46;
const PADDING_Y = 13;
const DEFAULT_RANGE = Object.freeze({
  min: -99,
  max: 100,
});

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value),
  );
}

function resolveRange(range) {
  const min =
    Number.isFinite(Number(range?.min))
      ? Number(range.min)
      : DEFAULT_RANGE.min;
  const max =
    Number.isFinite(Number(range?.max))
      ? Number(range.max)
      : DEFAULT_RANGE.max;

  return { min, max };
}

function xForAdjustment(
  adjustment,
  range,
) {
  const usable =
    SVG_WIDTH - PADDING_X * 2;

  return PADDING_X
    + (
      (
        clamp(
          adjustment,
          range.min,
          range.max,
        )
        - range.min
      )
      / (range.max - range.min)
    ) * usable;
}

function yForShare(share) {
  const usable =
    SVG_HEIGHT - PADDING_Y * 2;

  return SVG_HEIGHT
    - PADDING_Y
    - (
      clamp(share, 0, 100)
      / 100
    ) * usable;
}

function constraintLabel(
  line,
  projectionLine,
) {
  if (line.locked) {
    return 'Quantité verrouillée';
  }

  const quantity =
    safeNumber(
      projectionLine?.netQuantity,
      Number.NaN,
    );
  const min =
    line.minNetQuantity === ''
      ? null
      : safeNumber(
        line.minNetQuantity,
        Number.NaN,
      );
  const max =
    line.maxNetQuantity === ''
      ? null
      : safeNumber(
        line.maxNetQuantity,
        Number.NaN,
      );

  if (
    Number.isFinite(min)
    && Number.isFinite(max)
    && Math.abs(min - max) < 1e-9
  ) {
    return 'Bornes identiques ignorées · utilisez Verrouiller pour figer la quantité';
  }

  if (
    Number.isFinite(quantity)
    && Number.isFinite(min)
    && Math.abs(quantity - min) < 1e-9
  ) {
    return 'Minimum atteint';
  }

  if (
    Number.isFinite(quantity)
    && Number.isFinite(max)
    && Math.abs(quantity - max) < 1e-9
  ) {
    return 'Maximum atteint';
  }

  if (
    Number.isFinite(min)
    || Number.isFinite(max)
  ) {
    return 'Garde-fous actifs';
  }

  return 'Plage libre';
}

// La teinte dépend de l'identité stable de la ligne, pas de sa position.
function ProfileAxisHelp({
  align = 'center',
  description,
  children,
}) {
  const alignment =
    align === 'start'
      ? 'justify-self-start'
      : align === 'end'
        ? 'justify-self-end'
        : 'justify-self-center';

  return (
    <Tooltip>
      <TooltipTrigger
        className={
          'rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors '
          + 'hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring '
          + alignment
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}

function globalImpactLabel(
  savingsPercent,
) {
  if (savingsPercent > 0) {
    return (
      'Économie globale '
      + formatPercent(
        Math.abs(savingsPercent),
      )
    );
  }

  if (savingsPercent < 0) {
    return (
      'Surcoût global '
      + formatPercent(
        Math.abs(savingsPercent),
      )
    );
  }

  return 'Aucun écart';
}

function GlobalEconomicIndicator({
  savings,
}) {
  const savingsPercent =
    safeNumber(
      savings?.percent,
    );
  const economicDeltaPercent =
    -savingsPercent;
  const visualDelta =
    clamp(
      economicDeltaPercent,
      -100,
      100,
    );
  const markerPosition =
    (visualDelta + 100) / 2;
  const label =
    globalImpactLabel(
      savingsPercent,
    );

  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <span className="w-11 shrink-0 self-center text-[9px] leading-tight text-muted-foreground">
        Impact
        <span className="block">global</span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex h-5 items-center">
          <div
            aria-label="Impact économique global"
          aria-valuemax="100"
          aria-valuemin="-100"
          aria-valuenow={visualDelta}
          aria-valuetext={label}
          className="relative h-2 w-full rounded-full bg-muted"
          role="meter"
          title="Écart global de coût de fabrication HT renvoyé par le serveur ; ce n’est pas une moyenne arithmétique des ingrédients."
        >
          <span
            aria-hidden="true"
            className="absolute inset-y-[-2px] left-1/2 w-px -translate-x-1/2 bg-foreground/35"
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-sm transition-[left]"
            style={{ left: markerPosition + '%' }}
          />
        </div>
        </div>
        <div className="grid grid-cols-3 text-[8px] text-muted-foreground">
          <span>Économie</span>
          <span className="text-center">Référence</span>
          <span className="text-right">Surcoût</span>
        </div>
        {savingsPercent !== 0 && (
          <span className="block truncate text-right text-[9px] font-medium text-foreground">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

function TechnicalSheetOptimizationProfile({
  after,
  baseline,
  embedded = false,
  lines,
  mode,
  onChangeLine,
  onModeChange,
  onReset,
  onSelect,
  range = DEFAULT_RANGE,
  savings,
  selectedLineId,
}) {
  const [hoveredLineId, setHoveredLineId] =
    useState(null);
  const effectiveRange =
    resolveRange(range);
  const zeroX =
    xForAdjustment(
      0,
      effectiveRange,
    );

  const points = useMemo(
    () => (baseline?.lines ?? [])
      .filter(
        (line) =>
          line.kind === 'INGREDIENT',
      )
      .map((beforeLine) => {
        const projectionLine =
          findProjectionLine(
            after,
            beforeLine.id,
          )
          ?? beforeLine;
        const intent =
          findOptimizerLine(
            lines,
            beforeLine.id,
          );

        if (!intent) return null;

        const adjustment =
          safeNumber(
            intent
              .economicAdjustmentPercent,
          );
        const share =
          safeNumber(
            projectionLine
              .materialCostSharePercent,
          );
        const x =
          xForAdjustment(
            adjustment,
            effectiveRange,
          );

        return {
          lineId: beforeLine.id,
          adjustment,
          disabled:
            intent.locked,
          share,
          x,
          y:
            yForShare(share),
          width:
            Math.max(
              Math.abs(x - zeroX),
              adjustment === 0
                ? 0
                : 2,
            ),
          tone:
            ingredientColor(
              beforeLine.id,
              adjustment,
              effectiveRange,
            ),
          beforeLine,
          projectionLine,
          intent,
        };
      })
      .filter(Boolean),
    [
      after,
      baseline,
      effectiveRange.max,
      effectiveRange.min,
      lines,
      zeroX,
    ],
  );

  const hovered =
    points.find(
      (point) =>
        point.lineId
        === hoveredLineId,
    ) ?? null;

  function updatePoint(
    point,
    nextAdjustment,
  ) {
    if (point.disabled) {
      return;
    }

    onChangeLine({
      ...point.intent,
      economicAdjustmentPercent:
        clamp(
          Math.round(
            nextAdjustment,
          ),
          effectiveRange.min,
          effectiveRange.max,
        ),
      localNetQuantity: '',
    });
  }

  function updateFromPointer(
    event,
    point,
  ) {
    const svg =
      event.currentTarget
        .ownerSVGElement;
    const rect =
      svg.getBoundingClientRect();
    const leftPadding =
      (
        PADDING_X
        / SVG_WIDTH
      ) * rect.width;
    const usableWidth =
      rect.width
      - leftPadding * 2;
    const relative =
      clamp(
        event.clientX
        - rect.left
        - leftPadding,
        0,
        usableWidth,
      );
    const adjustment =
      effectiveRange.min
      + (
        relative / usableWidth
      ) * (
        effectiveRange.max
        - effectiveRange.min
      );

    updatePoint(
      point,
      adjustment,
    );
  }

  return (
    <section
      aria-label="Profil économique global"
      className={
        embedded
          ? 'shrink-0 border-b border-border bg-card'
          : 'shrink-0 rounded-xl border border-border bg-card'
      }
    >
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-1">
          <h2 className="truncate text-sm font-semibold">
            Profil économique global
          </h2>
          <InfoTooltip
            content="Chaque barre représente un ingrédient à sa hauteur de %CM. Elle part de la référence : à gauche la quantité diminue, à droite elle augmente."
            label="Comprendre le profil économique"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={(
                <Button
                  aria-label="Réinitialiser"
                  className="size-7"
                  onClick={onReset}
                  size="icon"
                  type="button"
                  variant="ghost"
                />
              )}
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Réinitialiser</TooltipContent>
          </Tooltip>
          <div
          aria-label="Mode d’optimisation"
          className="flex shrink-0 rounded-md border border-border bg-background p-0.5"
          role="group"
        >
          <Button
            className="h-7 px-2.5 text-xs"
            onClick={() =>
              onModeChange('MANUAL')}
            type="button"
            variant={
              mode === 'MANUAL'
                ? 'secondary'
                : 'ghost'
            }
          >
            Manuel
          </Button>
          <Button
            className="h-7 px-2.5 text-xs"
            onClick={() =>
              onModeChange('AUTO')}
            type="button"
            variant={
              mode === 'AUTO'
                ? 'secondary'
                : 'ghost'
            }
          >
            <Sparkles
              aria-hidden="true"
              className="size-3.5"
            />
            Auto
          </Button>
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[31rem] px-2 pb-0 pt-0">
        <svg
          aria-label="Répartition économique des ingrédients"
          className="h-[105px] w-full touch-none"
          role="group"
          viewBox={
            '0 0 '
            + SVG_WIDTH
            + ' '
            + SVG_HEIGHT
          }
        >
          {[0, 25, 50, 75, 100].map(
            (share) => {
              const y =
                yForShare(share);

              return (
                <g key={share}>
                  <line
                    className="stroke-border/70"
                    strokeDasharray={
                      share === 0
                        ? undefined
                        : '2 5'
                    }
                    x1={PADDING_X}
                    x2={
                      SVG_WIDTH
                      - PADDING_X
                    }
                    y1={y}
                    y2={y}
                  />
                  <text
                    className="fill-muted-foreground text-[8px]"
                    textAnchor="end"
                    x={PADDING_X - 8}
                    y={y + 3}
                  >
                    {share}
                  </text>
                </g>
              );
            },
          )}

          <g className="cursor-help">
            <title>
              %CM : part de l’ingrédient dans le coût matière total simulé.
            </title>
            <text
              className="fill-muted-foreground text-[9px] font-medium"
              transform={
                'translate(11 '
                + (SVG_HEIGHT / 2)
                + ') rotate(-90)'
              }
              textAnchor="middle"
            >
              %CM
            </text>
          </g>

          <line
            className="stroke-foreground/40"
            strokeDasharray="4 4"
            x1={zeroX}
            x2={zeroX}
            y1={PADDING_Y}
            y2={
              SVG_HEIGHT
              - PADDING_Y
            }
          />

          {points.map((point) => {
            const selected =
              point.lineId
              === selectedLineId;
            const barX =
              Math.min(
                zeroX,
                point.x,
              );

            return (
              <g
                key={point.lineId}
                onPointerEnter={() =>
                  setHoveredLineId(
                    point.lineId,
                  )}
                onPointerLeave={(event) => {
                  if (
                    !event.currentTarget
                      .matches(':focus-within')
                  ) {
                    setHoveredLineId(
                      null,
                    );
                  }
                }}
              >
                {point.width > 0 && (
                  <rect
                    style={{
                      fill: point.tone.bar,
                      opacity: selected ? 1 : 0.75,
                    }}
                    height={
                      selected
                        ? 7
                        : 5
                    }
                    rx="2.5"
                    width={point.width}
                    x={barX}
                    y={
                      point.y
                      - (
                        selected
                          ? 3.5
                          : 2.5
                      )
                    }
                  />
                )}

                <circle
                  aria-disabled={
                    point.disabled
                  }
                  aria-label={
                    'Ajustement '
                    + (
                      point.projectionLine
                        .productVariantName
                      ?? point.beforeLine
                        .productVariantName
                    )
                  }
                  aria-valuemax={
                    effectiveRange.max
                  }
                  aria-valuemin={
                    effectiveRange.min
                  }
                  aria-valuenow={
                    point.adjustment
                  }
                  aria-valuetext={
                    formatSignedPercent(
                      point.adjustment,
                      0,
                    )
                    + ', contribution '
                    + formatPercent(
                      point.share,
                    )
                  }
                  className={
                    (
                      point.disabled
                        ? 'cursor-not-allowed '
                        : 'cursor-ew-resize '
                    )
                    + 'outline-none ring-offset-background focus-visible:stroke-ring focus-visible:stroke-[3px]'
                  }
                  style={{ fill: point.tone.handle }}
                  cx={point.x}
                  cy={point.y}
                  onBlur={() =>
                    setHoveredLineId(
                      null,
                    )}
                  onClick={() =>
                    onSelect(
                      point.lineId,
                    )}
                  onFocus={() => {
                    onSelect(
                      point.lineId,
                    );
                    setHoveredLineId(
                      point.lineId,
                    );
                  }}
                  onKeyDown={(event) => {
                    if (point.disabled) {
                      return;
                    }

                    if (
                      event.key
                      === 'ArrowLeft'
                    ) {
                      event.preventDefault();
                      updatePoint(
                        point,
                        point.adjustment
                        - 5,
                      );
                    }

                    if (
                      event.key
                      === 'ArrowRight'
                    ) {
                      event.preventDefault();
                      updatePoint(
                        point,
                        point.adjustment
                        + 5,
                      );
                    }

                    if (
                      event.key
                      === 'Home'
                    ) {
                      event.preventDefault();
                      updatePoint(
                        point,
                        0,
                      );
                    }
                  }}
                  onPointerDown={(event) => {
                    onSelect(
                      point.lineId,
                    );
                    setHoveredLineId(
                      point.lineId,
                    );

                    if (point.disabled) {
                      return;
                    }

                    const canCapturePointer =
                      typeof event.currentTarget
                        .setPointerCapture
                      === 'function';

                    if (!canCapturePointer) {
                      return;
                    }

                    event.currentTarget
                      .setPointerCapture(
                        event.pointerId,
                      );
                    updateFromPointer(
                      event,
                      point,
                    );
                  }}
                  onPointerMove={(event) => {
                    const hasPointerCapture =
                      typeof event.currentTarget
                        .hasPointerCapture
                      === 'function'
                      && event.currentTarget
                        .hasPointerCapture(
                          event.pointerId,
                        );

                    if (
                      point.disabled
                      || !hasPointerCapture
                    ) {
                      return;
                    }

                    updateFromPointer(
                      event,
                      point,
                    );
                  }}
                  r={selected ? 5.5 : 4}
                  role="slider"
                  tabIndex="0"
                />
              </g>
            );
          })}

        </svg>

        <div className="grid grid-cols-3 gap-1 px-9">
          <ProfileAxisHelp
            align="start"
            description="Réduction : diminution de la quantité par rapport à la recette de référence. Cela peut diminuer le coût, sans préjuger de la qualité."
          >
            Réduction
          </ProfileAxisHelp>
          <ProfileAxisHelp
            description="Référence : quantité initiale de la recette, soit un ajustement de 0 %."
          >
            Référence
          </ProfileAxisHelp>
          <ProfileAxisHelp
            align="end"
            description="Augmentation : hausse de la quantité par rapport à la recette de référence. Le terme ne suppose aucun enrichissement qualitatif."
          >
            Augmentation
          </ProfileAxisHelp>
        </div>

        <GlobalEconomicIndicator
          savings={savings}
        />

        {hovered && (
          <div className="pointer-events-none absolute left-2 right-2 top-full z-30 mt-2 rounded-lg border border-border bg-popover p-3 text-xs shadow-lg">
            <p className="truncate font-semibold text-foreground">
              {hovered
                .projectionLine
                .productVariantName
                ?? hovered
                  .beforeLine
                  .productVariantName}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
              <span>Ajustement</span>
              <strong className="text-right text-foreground">
                {formatSignedPercent(
                  hovered.adjustment,
                  0,
                )}
              </strong>
              <span>Quantité</span>
              <strong className="text-right text-foreground">
                {formatQuantity(
                  hovered.beforeLine
                    .netQuantity,
                  hovered.beforeLine
                    .referenceUnit,
                )}
                {' → '}
                {formatQuantity(
                  hovered.projectionLine
                    .netQuantity,
                  hovered.projectionLine
                    .referenceUnit,
                )}
              </strong>
              <span>Coût</span>
              <strong className="text-right text-foreground">
                {formatCurrency(
                  hovered.beforeLine
                    .lineCostHt,
                )}
                {' → '}
                {formatCurrency(
                  hovered.projectionLine
                    .lineCostHt,
                )}
              </strong>
              <span>%CM</span>
              <strong className="text-right text-foreground">
                {formatPercent(
                  hovered.beforeLine
                    .materialCostSharePercent,
                )}
                {' → '}
                {formatPercent(
                  hovered.projectionLine
                    .materialCostSharePercent,
                )}
              </strong>
            </div>
            <p className="mt-2 border-t border-border pt-2 text-muted-foreground">
              {constraintLabel(
                hovered.intent,
                hovered.projectionLine,
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export {
  TechnicalSheetOptimizationProfile,
};
