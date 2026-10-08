import {
  Sparkles,
} from 'lucide-react';
import {
  useMemo,
  useState,
} from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import {
  findOptimizerLine,
  findProjectionLine,
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatSignedPercent,
} from '@/features/technical-sheets/lib/technical-sheet-optimizer';

const SVG_WIDTH = 620;
const SVG_HEIGHT = 154;
const PADDING_X = 46;
const PADDING_Y = 22;
const DEFAULT_RANGE = Object.freeze({
  min: -99,
  max: 100,
});
const PROFILE_TONES = Object.freeze([
  {
    stroke: 'stroke-sky-500',
    fill: 'fill-sky-500',
  },
  {
    stroke: 'stroke-emerald-500',
    fill: 'fill-emerald-500',
  },
  {
    stroke: 'stroke-amber-500',
    fill: 'fill-amber-500',
  },
  {
    stroke: 'stroke-rose-500',
    fill: 'fill-rose-500',
  },
  {
    stroke: 'stroke-violet-500',
    fill: 'fill-violet-500',
  },
  {
    stroke: 'stroke-cyan-500',
    fill: 'fill-cyan-500',
  },
]);

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

function hasPinnedEnvelope(line) {
  if (
    !line.minNetQuantity
    || !line.maxNetQuantity
  ) {
    return false;
  }

  const min =
    safeNumber(
      line.minNetQuantity,
      Number.NaN,
    );
  const max =
    safeNumber(
      line.maxNetQuantity,
      Number.NaN,
    );

  return (
    Number.isFinite(min)
    && Number.isFinite(max)
    && Math.abs(min - max) < 1e-9
  );
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
    && Math.abs(min - max)
      < 1e-9
  ) {
    return 'Quantité figée par les garde-fous';
  }

  if (
    Number.isFinite(quantity)
    && Number.isFinite(min)
    && Math.abs(quantity - min)
      < 1e-9
  ) {
    return 'Minimum atteint';
  }

  if (
    Number.isFinite(quantity)
    && Number.isFinite(max)
    && Math.abs(quantity - max)
      < 1e-9
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

function tracePath(point) {
  const baseY =
    SVG_HEIGHT - PADDING_Y;
  const width = 28;
  const left =
    clamp(
      point.x - width,
      PADDING_X,
      SVG_WIDTH - PADDING_X,
    );
  const right =
    clamp(
      point.x + width,
      PADDING_X,
      SVG_WIDTH - PADDING_X,
    );
  const controlY =
    Math.min(
      baseY - 8,
      point.y + (
        baseY - point.y
      ) * 0.52,
    );

  return [
    'M',
    left,
    baseY,
    'C',
    left + 8,
    controlY,
    point.x - 10,
    point.y + 5,
    point.x,
    point.y,
    'C',
    point.x + 10,
    point.y + 5,
    right - 8,
    controlY,
    right,
    baseY,
  ].join(' ');
}

function AxisLabel({
  anchor = 'middle',
  description,
  x,
  y,
  children,
}) {
  return (
    <g className="cursor-help">
      <title>{description}</title>
      <text
        className="fill-muted-foreground text-[9px]"
        textAnchor={anchor}
        x={x}
        y={y}
      >
        {children}
      </text>
    </g>
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
  onSelect,
  range = DEFAULT_RANGE,
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
      .map((beforeLine, index) => {
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

        return {
          lineId: beforeLine.id,
          adjustment,
          disabled:
            intent.locked
            || hasPinnedEnvelope(intent),
          share,
          x:
            xForAdjustment(
              adjustment,
              effectiveRange,
            ),
          y:
            yForShare(share),
          tone:
            PROFILE_TONES[
              index
              % PROFILE_TONES.length
            ],
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
            content="Chaque trace représente un ingrédient. Seuls son sommet et son point portent la donnée : ajustement horizontal et part du coût matière en hauteur."
            label="Comprendre le profil économique"
          />
        </div>

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

      <div className="relative px-2 pb-1 pt-1">
        <svg
          aria-label="Répartition économique des ingrédients"
          className="h-[132px] w-full touch-none"
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
            className="stroke-foreground/35"
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

            return (
              <g
                key={point.lineId}
                onPointerEnter={() =>
                  setHoveredLineId(
                    point.lineId,
                  )}
                onPointerLeave={() =>
                  setHoveredLineId(
                    null,
                  )}
              >
                <path
                  className={
                    point.tone.stroke
                    + ' fill-none transition-opacity '
                    + (
                      selected
                        ? 'opacity-100'
                        : 'opacity-65'
                    )
                  }
                  d={tracePath(point)}
                  fill="none"
                  strokeLinecap="round"
                  strokeWidth={
                    selected
                      ? '2.5'
                      : '1.75'
                  }
                />

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
                    + point.tone.fill
                    + ' outline-none ring-offset-background focus-visible:stroke-ring focus-visible:stroke-[3px]'
                  }
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

          <AxisLabel
            anchor="start"
            description="Réduction : diminution de la quantité par rapport à la recette de référence."
            x={PADDING_X}
            y={SVG_HEIGHT - 4}
          >
            Réduction
          </AxisLabel>
          <AxisLabel
            description="Référence : quantité initiale de la recette, soit un ajustement de 0 %."
            x={zeroX}
            y={SVG_HEIGHT - 4}
          >
            Référence
          </AxisLabel>
          <AxisLabel
            anchor="end"
            description="Enrichissement : augmentation de la quantité par rapport à la recette de référence."
            x={SVG_WIDTH - PADDING_X}
            y={SVG_HEIGHT - 4}
          >
            Enrichissement
          </AxisLabel>
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute z-10 w-60 -translate-x-1/2 -translate-y-[108%] rounded-lg border border-border bg-popover p-3 text-xs shadow-lg"
            style={{
              left:
                (
                  hovered.x
                  / SVG_WIDTH
                  * 100
                ) + '%',
              top:
                (
                  hovered.y
                  / SVG_HEIGHT
                  * 100
                ) + '%',
            }}
          >
            <p className="font-semibold text-foreground">
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
