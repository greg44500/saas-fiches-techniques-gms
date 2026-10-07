import { useMemo } from 'react';

import { Slider } from '@/components/ui/slider';

const SVG_WIDTH = 520;
const SVG_HEIGHT = 190;
const PADDING_X = 30;
const PADDING_Y = 24;

function clampPressure(value) {
  return Math.max(
    -100,
    Math.min(100, Math.round(value)),
  );
}

function pointCoordinates(point, pressure) {
  const x =
    PADDING_X
    + (
      point.position / 100
    ) * (
      SVG_WIDTH
      - PADDING_X * 2
    );
  const y =
    PADDING_Y
    + (
      (100 - pressure) / 200
    ) * (
      SVG_HEIGHT
      - PADDING_Y * 2
    );

  return { x, y };
}

function TechnicalSheetOptimizationCurve({
  curve,
  disabled = false,
  onChange,
  points,
}) {
  const coordinates = useMemo(
    () => points.map((point) => ({
      ...pointCoordinates(
        point,
        curve.pressures[point.key],
      ),
      ...point,
      pressure:
        curve.pressures[point.key],
    })),
    [curve.pressures, points],
  );

  function updatePoint(key, value) {
    onChange({
      ...curve,
      pressures: {
        ...curve.pressures,
        [key]:
          clampPressure(value),
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
    const y =
      event.clientY
      - rect.top;
    const usableHeight =
      rect.height
      - (
        PADDING_Y
        / SVG_HEIGHT
      ) * rect.height * 2;
    const relative =
      Math.max(
        0,
        Math.min(
          usableHeight,
          y
          - (
            PADDING_Y
            / SVG_HEIGHT
          ) * rect.height,
        ),
      );
    const pressure =
      100
      - (
        relative
        / usableHeight
      ) * 200;

    updatePoint(
      point.key,
      pressure,
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border bg-muted/10 p-3">
        <svg
          aria-label="Courbe globale d’optimisation"
          className="min-w-[520px] touch-none"
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
            strokeOpacity="0.2"
            x1={PADDING_X}
            x2={SVG_WIDTH - PADDING_X}
            y1={SVG_HEIGHT / 2}
            y2={SVG_HEIGHT / 2}
          />
          <polyline
            fill="none"
            points={coordinates
              .map(({ x, y }) => x + ',' + y)
              .join(' ')}
            stroke="currentColor"
            strokeWidth="3"
          />
          {coordinates.map((point) => (
            <circle
              aria-label={
                point.label
                + ' : '
                + point.pressure
              }
              aria-valuemax={100}
              aria-valuemin={-100}
              aria-valuenow={
                point.pressure
              }
              cx={point.x}
              cy={point.y}
              fill="currentColor"
              key={point.key}
              onKeyDown={(event) => {
                if (disabled) return;

                if (
                  event.key === 'ArrowUp'
                  || event.key === 'ArrowRight'
                ) {
                  event.preventDefault();
                  updatePoint(
                    point.key,
                    point.pressure + 5,
                  );
                }

                if (
                  event.key === 'ArrowDown'
                  || event.key === 'ArrowLeft'
                ) {
                  event.preventDefault();
                  updatePoint(
                    point.key,
                    point.pressure - 5,
                  );
                }

                if (event.key === 'Home') {
                  event.preventDefault();
                  updatePoint(
                    point.key,
                    -100,
                  );
                }

                if (event.key === 'End') {
                  event.preventDefault();
                  updatePoint(
                    point.key,
                    100,
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
              r="8"
              role="slider"
              tabIndex={disabled ? -1 : 0}
            />
          ))}
        </svg>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {points.map((point) => (
          <div
            className="space-y-2"
            key={point.key}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium">
                {point.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {curve.pressures[point.key]}
              </span>
            </div>
            <Slider
              aria-label={
                'Pression '
                + point.label
              }
              disabled={disabled}
              max={100}
              min={-100}
              onValueChange={(value) =>
                updatePoint(
                  point.key,
                  value[0],
                )}
              step={5}
              value={[
                curve.pressures[
                  point.key
                ],
              ]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export {
  TechnicalSheetOptimizationCurve,
};
