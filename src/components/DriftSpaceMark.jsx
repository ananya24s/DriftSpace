import { useId } from 'react';
import { useReducedMotion } from 'framer-motion';

/*
  DriftSpaceMark — the official DriftSpace emblem and the single source
  of truth for its artwork. The favicon, the wordmark's "A"
  (DriftSpaceLogo), the splash screen, and Steam/social assets all draw
  from the geometry and <MarkShapes> defined here, so there is exactly
  one definition of the mark.

  Design units: symmetric about x = 0, apex at y = 0, the leg bases at
  y = 100. The silhouette is a stylized rocket/"A": an outer triangle
  split into two legs by a central fin, with the A-counters opening at
  the bottom, plus a detached engine nozzle in the lower-centre gap.

  (Note: this is a purpose-drawn brand emblem. The in-game ship geometry
  in shipGlyph.js remains the gameplay source of truth and is unchanged;
  the emblem is now the separate branding master.)
*/

export const MARK_BODY_POINTS = [
  { x: 0, y: 0 },
  { x: 42, y: 100 },
  { x: 16, y: 100 },
  { x: 6, y: 22 },
  { x: 0, y: 68 },
  { x: -6, y: 22 },
  { x: -16, y: 100 },
  { x: -42, y: 100 },
];

export const MARK_NOZZLE_POINTS = [
  { x: -13, y: 76 },
  { x: 13, y: 76 },
  { x: 10, y: 92 },
  { x: -10, y: 92 },
];

export const MARK_BOUNDS = { minX: -42, minY: 0, maxX: 42, maxY: 100, width: 84, height: 100 };

const toPts = (arr) => arr.map((p) => `${p.x},${p.y}`).join(' ');
export const MARK_BODY_PATH = toPts(MARK_BODY_POINTS);
export const MARK_NOZZLE_PATH = toPts(MARK_NOZZLE_POINTS);

/**
 * The emblem's two shapes, drawn in design-unit local space (centered on
 * x=0, y in [0,100]). Both the standalone <DriftSpaceMark> and the
 * wordmark's "A" render through this, so the artwork is defined once.
 * Wrap in a <g transform=…> to position/scale, and apply glow on that g.
 */
export function MarkShapes({ fill, stroke, strokeWidth = 3.2, fillOpacity = 1 }) {
  const common = {
    fill,
    fillOpacity,
    stroke,
    strokeWidth,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
  };
  return (
    <>
      <polygon points={MARK_BODY_PATH} {...common} />
      <polygon points={MARK_NOZZLE_PATH} {...common} />
    </>
  );
}

/**
 * Standalone emblem — square viewBox, glow included. Use for favicon,
 * splash, app icon, Steam/social. `size` is the rendered px width.
 */
export function DriftSpaceMark({
  size = 128,
  fill = '#eaf7fc',
  stroke = '#5fe4f7',
  glowColor = '#00e5ff',
  strokeWidth = 3.2,
  pulse = false,
  title = 'DriftSpace',
  style,
  className,
}) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const doPulse = pulse && !reduceMotion;

  // Square viewBox with the content centered, so it drops in as an icon.
  const side = MARK_BOUNDS.height + 44; // 144
  const tx = (side - MARK_BOUNDS.width) / 2 - MARK_BOUNDS.minX;
  const ty = (side - MARK_BOUNDS.height) / 2;

  return (
    <svg
      role="img"
      aria-label={title}
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${side} ${side}`}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <defs>
        <filter id={`mk-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
          <feFlood floodColor={glowColor} floodOpacity="0.95" result="c">
            {doPulse && (
              <animate attributeName="flood-opacity" values="0.6;1;0.6" dur="6s" repeatCount="indefinite"
                calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
            )}
          </feFlood>
          <feComposite in="c" in2="blur" operator="in" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#mk-${uid})`} transform={`translate(${tx}, ${ty})`}>
        <MarkShapes fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      </g>
    </svg>
  );
}