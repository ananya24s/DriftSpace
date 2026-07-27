import { useRef, useState, useLayoutEffect, useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import { MARK_BOUNDS, MarkShapes } from './DriftSpaceMark';

/*
  DriftSpaceLogo — the official DriftSpace wordmark.

  The letter A in DRIFTSPACE is the official DriftSpace emblem (drawn
  from the shared artwork in DriftSpaceMark — the same master used by
  the favicon, splash, and Steam assets). The emblem is treated as its
  own object inside the word: a touch larger than a cap, a brighter
  outline than the flat letters, and its own stronger glow — so the eye
  reads DRIFTSPACE first, then catches the emblem.

  Everything is SVG — infinitely scalable, crisp, reusable. Internally
  it lays out in a fixed 100-unit em so measurements are
  resolution-independent; only the `height` prop drives final size.

  Props:
    height          rendered height in px (default 84)
    color           letter core fill (default cyan-white)
    markFill        emblem fill (default brighter near-white)
    markStroke      emblem outline color (default brighter cyan than text)
    glowColor       glow color (default game cyan)
    letterSpacing   tracking, in internal em units (default 6)
    markScale       emblem size relative to cap height (default 1.06)
    markGap         manual optical padding L/R of the emblem, em units
    subtitle        optional string under the wordmark
    pulse           subtle slow glow pulse (default true; off under reduced-motion)
    title           accessible label (default "DriftSpace")
*/

const EM = 100;        // internal font size (SVG user units)
const CAP = 72;        // Space Grotesk cap height ≈ 0.72em
const PAD = 30;        // padding around the wordmark for glow bleed
const SUB_SIZE = 15;   // subtitle size in em units
const SUB_GAP = 18;    // gap between wordmark baseline and subtitle

export function DriftSpaceLogo({
  height = 84,
  color = '#dff4fb',
  markFill = '#eef8fc',
  markStroke = '#7ff0ff',
  glowColor = '#00e5ff',
  letterSpacing = 6,
  markScale = 1.06,
  markGap = { left: 2, right: 3 },
  subtitle = null,
  pulse = true,
  title = 'DriftSpace',
  style,
  className,
}) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  // Emblem sizing/placement in internal em units. Height ~= cap height
  // (× markScale); mapped so the emblem's apex sits near cap-top and its
  // leg bases sit on the baseline.
  const s = (CAP * markScale) / MARK_BOUNDS.height;
  const markW = MARK_BOUNDS.width * s;
  const markStrokeW = 3.4; // in emblem units; scales with the emblem

  // Measured advance widths of the two letter runs, so the emblem sits
  // at the correct optical position between them regardless of font
  // rendering. Measured in internal em units (font-size EM).
  const [m, setM] = useState({ wLeft: 0, wRight: 0, ready: false });

  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled || !leftRef.current || !rightRef.current) return;
      try {
        const wLeft = leftRef.current.getComputedTextLength();
        const wRight = rightRef.current.getComputedTextLength();
        setM({ wLeft, wRight, ready: true });
      } catch {
        setM((prev) => ({ ...prev, ready: true }));
      }
    };
    measure();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => measure());
    }
    return () => { cancelled = true; };
  }, [letterSpacing, subtitle, markScale]);

  const baseline = PAD + CAP;

  // Optical spacing: measured letter runs + manual left/right nudges so
  // the emblem sits like a designed glyph rather than an inserted SVG.
  const markLeftX = PAD + m.wLeft + letterSpacing + markGap.left;
  const markCenterX = markLeftX + markW / 2;
  const rightX = markLeftX + markW + letterSpacing + markGap.right;
  const totalW = rightX + m.wRight + PAD;

  const subBaseline = baseline + SUB_GAP + SUB_SIZE;
  const totalH = (subtitle ? subBaseline : baseline) + PAD;

  const doPulse = pulse && !reduceMotion;

  const textCommon = {
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontWeight: 700,
    fontSize: EM,
    letterSpacing,
    fill: color,
    dominantBaseline: 'alphabetic',
  };

  return (
    <svg
      role="img"
      aria-label={title}
      className={className}
      width={(height * totalW) / totalH}
      height={height}
      viewBox={`0 0 ${totalW} ${totalH}`}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <defs>
        {/* Base glow for the letters — the SVG analog of the canvas
            shadowBlur glow used throughout gameplay. */}
        <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="blur" />
          <feFlood floodColor={glowColor} floodOpacity="0.75" result="cyan">
            {doPulse && (
              <animate attributeName="flood-opacity" values="0.45;0.8;0.45" dur="6s" repeatCount="indefinite"
                calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
            )}
          </feFlood>
          <feComposite in="cyan" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Stronger, wider glow reserved for the emblem so it reads as
            its own object inside the word. */}
        <filter id={`markglow-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
          <feFlood floodColor={glowColor} floodOpacity="1" result="cyan">
            {doPulse && (
              <animate attributeName="flood-opacity" values="0.6;1;0.6" dur="6s" repeatCount="indefinite"
                calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
            )}
          </feFlood>
          <feComposite in="cyan" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="glow" />
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g opacity={m.ready ? 1 : 0}>
        {/* DRIFTSP + CE share the base letter glow */}
        <g filter={`url(#glow-${uid})`}>
          <text ref={leftRef} x={PAD} y={baseline} {...textCommon}>DRIFTSP</text>
          <text ref={rightRef} x={rightX} y={baseline} {...textCommon}>CE</text>
        </g>

        {/* A = the official emblem, apex near cap-top, bases on baseline */}
        <g
          transform={`translate(${markCenterX}, ${baseline - CAP * markScale}) scale(${s})`}
          filter={`url(#markglow-${uid})`}
        >
          <MarkShapes fill={markFill} stroke={markStroke} strokeWidth={markStrokeW} fillOpacity={0.95} />
        </g>

        {subtitle && (
          <text
            x={totalW / 2}
            y={subBaseline}
            textAnchor="middle"
            fontFamily="'Space Grotesk', 'Inter', sans-serif"
            fontWeight={500}
            fontSize={SUB_SIZE}
            letterSpacing={SUB_SIZE * 0.62}
            fill={color}
            opacity={0.72}
            dominantBaseline="alphabetic"
            filter={`url(#glow-${uid})`}
          >
            {subtitle}
          </text>
        )}
      </g>
    </svg>
  );
}
// import { useRef, useState, useLayoutEffect, useId } from 'react';
// import { useReducedMotion } from 'framer-motion';
// import { SHIP_GLYPH_POINTS } from '../game/shipGlyph';

// /*
//   DriftSpaceLogo — the official DriftSpace wordmark.

//   The letter A in DRIFTSPACE is replaced by the actual gameplay ship
//   silhouette, rebuilt from the same SHIP_GLYPH_POINTS the game renders,
//   rotated to point up so it doubles as an "A". To make that branding
//   moment land, the ship is treated as its own object inside the word:
//   a touch larger than an A, a brighter/thicker cyan outline than the
//   flat letters, and a stronger dedicated glow — so the eye reads
//   DRIFTSPACE first, then catches the ship. A thin crossbar (punched as
//   negative space) completes the letterform on any background.

//   Everything is SVG — infinitely scalable, crisp, reusable for the
//   title screen, splash, website, GitHub, Steam, etc. Internally it lays
//   out in a fixed 100-unit em so measurements are resolution-independent;
//   only the `height` prop drives final size.

//   Props:
//     height          rendered height in px (default 84)
//     color           letter core fill (default cyan-white)
//     shipColor       ship outline color (default brighter cyan than text)
//     glowColor       glow color (default game cyan)
//     letterSpacing   tracking, in internal em units (default 6)
//     shipScale       ship size relative to cap height (default 1.10)
//     shipGap         manual optical padding L/R of the ship, em units (default {left, right})
//     subtitle        optional string under the wordmark
//     pulse           subtle slow glow pulse (default true; off under reduced-motion)
//     title           accessible label (default "DriftSpace")
// */

// const EM = 100;        // internal font size (SVG user units)
// const CAP = 72;        // Space Grotesk cap height ≈ 0.72em
// const PAD = 30;        // padding around the wordmark for glow bleed
// const SUB_SIZE = 15;   // subtitle size in em units
// const SUB_GAP = 18;    // gap between wordmark baseline and subtitle

// // Build the ship-as-A geometry once from the shared gameplay points.
// // Rotate the local (nose-right) ship -90° so the nose points up:
// // (x, y) -> (y, -x). Scale to (cap height * shipScale), centered on 0,0.
// function buildShipA(shipScale) {
//   const up = SHIP_GLYPH_POINTS.map((p) => ({ x: p.y, y: -p.x }));
//   const xs = up.map((p) => p.x);
//   const ys = up.map((p) => p.y);
//   const minX = Math.min(...xs), maxX = Math.max(...xs);
//   const minY = Math.min(...ys), maxY = Math.max(...ys);
//   const natH = maxY - minY, natW = maxX - minX;
//   const targetH = CAP * shipScale;
//   const s = targetH / natH;
//   const cxN = (minX + maxX) / 2, cyN = (minY + maxY) / 2;
//   const pts = up.map((p) => ({ x: (p.x - cxN) * s, y: (p.y - cyN) * s }));
//   const width = natW * s;
//   const apexY = -targetH / 2, baseY = targetH / 2;
//   // Crossbar low on the shape, spanning between the two legs.
//   const cbY = targetH * 0.16;
//   const t = (cbY - apexY) / (baseY - apexY);
//   const cbHalf = t * (width / 2);
//   return {
//     points: pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
//     width,
//     height: targetH,
//     cbY,
//     cbHalf,
//     cbThickness: 5.5,
//   };
// }

// export function DriftSpaceLogo({
//   height = 84,
//   color = '#dff4fb',
//   shipColor = '#7ff0ff',
//   glowColor = '#00e5ff',
//   letterSpacing = 6,
//   shipScale = 1.10,
//   shipGap = { left: 3, right: 4 },
//   subtitle = null,
//   pulse = true,
//   title = 'DriftSpace',
//   style,
//   className,
// }) {
//   const reduceMotion = useReducedMotion();
//   const uid = useId().replace(/:/g, '');
//   const leftRef = useRef(null);
//   const rightRef = useRef(null);

//   const shipA = buildShipA(shipScale);

//   // Measured advance widths of the two letter runs, so the ship sits at
//   // the correct optical position between them regardless of font
//   // rendering. Measured in internal em units (font-size EM).
//   const [m, setM] = useState({ wLeft: 0, wRight: 0, ready: false });

//   useLayoutEffect(() => {
//     let cancelled = false;
//     const measure = () => {
//       if (cancelled || !leftRef.current || !rightRef.current) return;
//       try {
//         const wLeft = leftRef.current.getComputedTextLength();
//         const wRight = rightRef.current.getComputedTextLength();
//         setM({ wLeft, wRight, ready: true });
//       } catch {
//         setM((prev) => ({ ...prev, ready: true }));
//       }
//     };
//     measure();
//     if (document.fonts && document.fonts.ready) {
//       document.fonts.ready.then(() => measure());
//     }
//     return () => { cancelled = true; };
//   }, [letterSpacing, subtitle, shipScale]);

//   const baseline = PAD + CAP;

//   // Optical spacing: start from the measured letter run, then apply the
//   // manual left/right nudges so the ship sits like a designed glyph
//   // rather than an auto-inserted SVG. The ship is optically narrower
//   // than its bounding box near the apex, so it wants slightly tighter
//   // tracking than a full-width letter — hence the small negative-ish
//   // default gaps layered on top of normal letter-spacing.
//   const shipLeftX = PAD + m.wLeft + letterSpacing + shipGap.left;
//   const shipCenterX = shipLeftX + shipA.width / 2;
//   const rightX = shipLeftX + shipA.width + letterSpacing + shipGap.right;
//   const totalW = rightX + m.wRight + PAD;

//   const subBaseline = baseline + SUB_GAP + SUB_SIZE;
//   const totalH = (subtitle ? subBaseline : baseline) + PAD;

//   const doPulse = pulse && !reduceMotion;

//   const textCommon = {
//     fontFamily: "'Space Grotesk', 'Inter', sans-serif",
//     fontWeight: 700,
//     fontSize: EM,
//     letterSpacing,
//     fill: color,
//     dominantBaseline: 'alphabetic',
//   };

//   return (
//     <svg
//       role="img"
//       aria-label={title}
//       className={className}
//       width={(height * totalW) / totalH}
//       height={height}
//       viewBox={`0 0 ${totalW} ${totalH}`}
//       style={{ display: 'block', overflow: 'visible', ...style }}
//     >
//       <defs>
//         {/* Base glow for the letters — the SVG analog of the canvas
//             shadowBlur glow used throughout gameplay. */}
//         <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
//           <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="blur" />
//           <feFlood floodColor={glowColor} floodOpacity="0.75" result="cyan">
//             {doPulse && (
//               <animate
//                 attributeName="flood-opacity"
//                 values="0.45;0.8;0.45"
//                 dur="6s"
//                 repeatCount="indefinite"
//                 calcMode="spline"
//                 keyTimes="0;0.5;1"
//                 keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
//               />
//             )}
//           </feFlood>
//           <feComposite in="cyan" in2="blur" operator="in" result="glow" />
//           <feMerge>
//             <feMergeNode in="glow" />
//             <feMergeNode in="glow" />
//             <feMergeNode in="SourceGraphic" />
//           </feMerge>
//         </filter>

//         {/* Stronger, wider glow reserved for the ship-A so it reads as
//             its own object inside the word. */}
//         <filter id={`shipglow-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
//           <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
//           <feFlood floodColor={glowColor} floodOpacity="1" result="cyan">
//             {doPulse && (
//               <animate
//                 attributeName="flood-opacity"
//                 values="0.6;1;0.6"
//                 dur="6s"
//                 repeatCount="indefinite"
//                 calcMode="spline"
//                 keyTimes="0;0.5;1"
//                 keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
//               />
//             )}
//           </feFlood>
//           <feComposite in="cyan" in2="blur" operator="in" result="glow" />
//           <feMerge>
//             <feMergeNode in="glow" />
//             <feMergeNode in="glow" />
//             <feMergeNode in="glow" />
//             <feMergeNode in="SourceGraphic" />
//           </feMerge>
//         </filter>

//         {/* Punch the A's crossbar as true transparency so the wordmark
//             reads correctly on any background. */}
//         <mask id={`shipmask-${uid}`} maskUnits="userSpaceOnUse" x="-120" y="-120" width="240" height="240">
//           <polygon points={shipA.points} fill="#fff" />
//           <line
//             x1={-shipA.cbHalf} y1={shipA.cbY}
//             x2={shipA.cbHalf} y2={shipA.cbY}
//             stroke="#000" strokeWidth={shipA.cbThickness} strokeLinecap="butt"
//           />
//         </mask>
//       </defs>

//       <g opacity={m.ready ? 1 : 0}>
//         {/* DRIFTSP + CE share the base letter glow */}
//         <g filter={`url(#glow-${uid})`}>
//           <text ref={leftRef} x={PAD} y={baseline} {...textCommon}>DRIFTSP</text>
//           <text ref={rightRef} x={rightX} y={baseline} {...textCommon}>CE</text>
//         </g>

//         {/* A = the gameplay ship: brighter outline + faint fill + its own
//             stronger glow, so it stands out as the ship within the word */}
//         <g
//           transform={`translate(${shipCenterX}, ${PAD + CAP / 2})`}
//           filter={`url(#shipglow-${uid})`}
//           mask={`url(#shipmask-${uid})`}
//         >
//           <polygon points={shipA.points} fill={shipColor} fillOpacity="0.28" />
//           <polygon
//             points={shipA.points}
//             fill="none"
//             stroke={shipColor}
//             strokeWidth="3.4"
//             strokeLinejoin="round"
//           />
//         </g>

//         {subtitle && (
//           <text
//             x={totalW / 2}
//             y={subBaseline}
//             textAnchor="middle"
//             fontFamily="'Space Grotesk', 'Inter', sans-serif"
//             fontWeight={500}
//             fontSize={SUB_SIZE}
//             letterSpacing={SUB_SIZE * 0.62}
//             fill={color}
//             opacity={0.72}
//             dominantBaseline="alphabetic"
//             filter={`url(#glow-${uid})`}
//           >
//             {subtitle}
//           </text>
//         )}
//       </g>
//     </svg>
//   );
// }