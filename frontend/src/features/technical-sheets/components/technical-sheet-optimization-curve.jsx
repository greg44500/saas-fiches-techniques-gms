import { useMemo } from 'react';

const SVG_WIDTH = 360;
const SVG_HEIGHT = 138;
const PADDING_X = 28;
const PADDING_Y = 16;

const DEFAULT_RANGE = Object.freeze({
  min: -90,
  max: 100,
});

function clampAdjustment(
  value,
  range,
) {
  return Math.max(
    range.min,
    Math.min(
      range.max,
      Math.round(value),
    ),
  );
}

function pointCoordinates(
  point,
  adjustment,
  range,
) {
  const x =
    PADDING_X
    + (
      point.position / 100
    ) * (
      SVG_WIDTH
      - PADDING_X * 2
    );
  const span =
    range.max - range.min;
  const y =
    PADDING_Y
    + (
      (adjustment - range.min)
      / span
    ) * (
      SVG_HEIGHT
      - PADDING_Y * 2
    );

  return { x, y };
}

function formatAdjustment(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return (
    (number > 0 ? '+' : '')
    + number
    + ' %'
  );
}

function adjustmentAriaText(value) {
  if (value < 0) {
    return 'Réduction du coût de '
      + Math.abs(value)
      + ' %';
  }

  if (value > 0) {
    return 'Hausse du coût de '
      + value
      + ' %';
  }

  return 'Coût de référence';
}

function TechnicalSheetOptimizationCurve({
  curve,
  disabled = false,
  onChange,
  points,
  range = DEFAULT_RANGE,
}) {
  const effectiveRange = {
    min:
      Number.isFinite(Number(range?.min))
        ? Number(range.min)
        : DEFAULT_RANGE.min,
    max:
      Number.isFinite(Number(range?.max))
        ? Number(range.max)
        : DEFAULT_RANGE.max,
  };
  const coordinates = useMemo(
    () => points.map((point) => ({
      ...pointCoordinates(
        point,
        curve.pressures[point.key],
        effectiveRange,
      ),
      ...point,
      adjustment:
        curve.pressures[point.key],
    })),
    [
      curve.pressures,
      effectiveRange.max,
      effectiveRange.min,
      points,
    ],
  );
  const zeroY =
    pointCoordinates(
      { position: 0 },
      0,
      effectiveRange,
    ).y;

  function updatePoint(key, value) {
    onChange({
      ...curve,
      pressures: {
        ...curve.pressures,
        [key]:
          clampAdjustment(
            value,
            effectiveRange,
          ),
      },
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
    const topPadding =
      (
        PADDING_Y
        / SVG_HEIGHT
      ) * rect.height;
    const usableHeight =
      rect.height
      - topPadding * 2;
    const relative =
      Math.max(
        0,
        Math.min(
          usableHeight,
          event.clientY
          - rect.top
          - topPadding,
        ),
      );
    const adjustment =
      effectiveRange.min
      + (
        relative
        / usableHeight
      ) * (
        effectiveRange.max
        - effectiveRange.min
      );

    updatePoint(
      point.key,
      adjustment,
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-muted-foreground">
        Réduire le coût
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-muted/10 p-2">
        <svg
          aria-label="Courbe d’ajustement économique"
          className="h-auto max-h-[150px] min-w-[320px] w-full touch-none"
          role="group"
          viewBox={
            '0 0 '
            + SVG_WIDTH
            + ' '
            + SVG_HEIGHT
          }
        >
          <line
            stroke="currentColor"
            strokeDasharray="5 5"
            strokeOpacity="0.22"
            x1={PADDING_X}
            x2={SVG_WIDTH - PADDING_X}
            y1={zeroY}
            y2={zeroY}
          />
          <polyline
            fill="none"
            points={coordinates
              .map(({ x, y }) => x + ',' + y)
              .join(' ')}
            stroke="currentColor"
            strokeWidth="2.5"
          />
          {coordinates.map((point) => (
            <circle
              aria-label={
                'Ajustement '
                + point.label
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
                adjustmentAriaText(
                  point.adjustment,
                )
              }
              cx={point.x}
              cy={point.y}
              fill="currentColor"
              key={point.key}
              onKeyDown={(event) => {
                if (disabled) return;

                if (
                  event.key === 'ArrowUp'
                  || event.key === 'ArrowLeft'
                ) {
                  event.preventDefault();
                  updatePoint(
                    point.key,
                    point.adjustment - 5,
                  );
                }

                if (
                  event.key === 'ArrowDown'
                  || event.key === 'ArrowRight'
                ) {
                  event.preventDefault();
                  updatePoint(
                    point.key,
                    point.adjustment + 5,
                  );
                }

                if (event.key === 'Home') {
                  event.preventDefault();
                  updatePoint(
                    point.key,
                    effectiveRange.min,
                  );
                }

                if (event.key === 'End') {
                  event.preventDefault();
                  updatePoint(
                    point.key,
                    effectiveRange.max,
                  );
                }
              }}
              onPointerDown={(event) => {
                if (disabled) return;
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
                if (
                  disabled
                  || !event.currentTarget
                    .hasPointerCapture(
                      event.pointerId,
                    )
                ) {
                  return;
                }

                updateFromPointer(
                  event,
                  point,
                );
              }}
              r="7"
              role="slider"
              tabIndex={disabled ? -1 : 0}
            />
          ))}
        </svg>
      </div>

      <p className="text-[11px] font-medium text-muted-foreground">
        Augmenter le coût
      </p>

      <div className="grid grid-cols-5 gap-1 text-center">
        {points.map((point) => (
          <div
            className="min-w-0"
            key={point.key}
          >
            <p className="truncate text-[10px] text-muted-foreground">
              {point.label}
            </p>
            <p className="text-xs font-semibold tabular-nums">
              {formatAdjustment(
                curve.pressures[
                  point.key
                ],
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export {
  TechnicalSheetOptimizationCurve,
};
