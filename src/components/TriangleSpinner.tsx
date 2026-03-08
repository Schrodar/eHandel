/**
 * TriangleSpinner
 * Three SVG line-segments drawn sequentially to form an equilateral triangle,
 * then erased in the same order, looping infinitely.
 *
 * Geometry (viewBox 0 0 100 100, circumradius = 40, center = 50,50):
 *   V0 (top)          = (50,   10)
 *   V1 (bottom-right) = (84.6, 70)
 *   V2 (bottom-left)  = (15.4, 70)
 */
export function TriangleSpinner() {
  return (
    <>
      <style>{`
        @keyframes ts-leg1 {
          /* Phase 1: draw  (0–16.67%)   Phase 4: erase (50–66.67%)   */
          0%     { stroke-dashoffset:  70; }
          16.67% { stroke-dashoffset:   0; }
          50%    { stroke-dashoffset:   0; }
          66.67% { stroke-dashoffset: -70; }
          100%   { stroke-dashoffset: -70; }
        }
        @keyframes ts-leg2 {
          /* Phase 2: draw  (16.67–33.33%)   Phase 5: erase (66.67–83.33%) */
          0%     { stroke-dashoffset:  70; }
          16.67% { stroke-dashoffset:  70; }
          33.33% { stroke-dashoffset:   0; }
          66.67% { stroke-dashoffset:   0; }
          83.33% { stroke-dashoffset: -70; }
          100%   { stroke-dashoffset: -70; }
        }
        @keyframes ts-leg3 {
          /* Phase 3: draw  (33.33–50%)   Phase 6: erase (83.33–100%) */
          0%     { stroke-dashoffset:  70; }
          33.33% { stroke-dashoffset:  70; }
          50%    { stroke-dashoffset:   0; }
          83.33% { stroke-dashoffset:   0; }
          100%   { stroke-dashoffset: -70; }
        }
        .ts-leg { stroke-dasharray: 70 140; stroke-linecap: round; fill: none; stroke: #007acc; stroke-width: 3.5; }
        .ts-leg1 { animation: ts-leg1 2.4s linear infinite; }
        .ts-leg2 { animation: ts-leg2 2.4s linear infinite; }
        .ts-leg3 { animation: ts-leg3 2.4s linear infinite; }
      `}</style>

      <svg
        viewBox="0 0 100 100"
        width="64"
        height="64"
        aria-label="Laddar…"
        role="status"
      >
        {/* Leg 1: V0 → V1 (top to bottom-right) */}
        <line className="ts-leg ts-leg1" x1="50" y1="10" x2="84.6" y2="70" />
        {/* Leg 2: V1 → V2 (bottom-right to bottom-left) */}
        <line className="ts-leg ts-leg2" x1="84.6" y1="70" x2="15.4" y2="70" />
        {/* Leg 3: V2 → V0 (bottom-left to top) */}
        <line className="ts-leg ts-leg3" x1="15.4" y1="70" x2="50" y2="10" />
      </svg>
    </>
  );
}
