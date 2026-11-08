// src/pages/Home/landing/Building.jsx
// The hero's architectural illustration: three maroon campus blocks drawn as SVG,
// traced from the reference elevation (coordinates below are in that image's pixels, shifted by OX/OY).
// Each block is its own layer, so it can move at its own parallax depth and light its windows on hover.
import { useId } from "react";

/** Entrance timings (seconds) — tweak here */
const RISE = { dur: 1.2, ease: "cubic-bezier(0.2, 0.8, 0.2, 1)", left: 0, middle: 0.4, right: 0.8 };
const riseStyle = (delay) => ({ "--rise-d": `${delay}s`, "--rise-dur": `${RISE.dur}s`, "--rise-ease": RISE.ease });

const OX = 50;
const OY = 170;
/** "x,y x,y …" in reference-image pixels -> polygon points in viewBox space */
const P = (s) => s.trim().split(/\s+/).map((q) => { const [x, y] = q.split(","); return `${x - OX},${y - OY}`; }).join(" ");
/** rect props from reference-image pixels */
const R = (x, y, width, height) => ({ x: x - OX, y: y - OY, width, height });

/**
 * Grid of window panes; a few are lit at rest (fixed pattern), all light up when the block is hovered.
 * `natural`: dark at rest; hovering the `hit` area (reference-image points) lights an even, symmetric
 * stagger of panes, switching on from the centre outwards.
 */
function Windows({ x, y, cols, rows, w, h, gapX, gapY, seed, natural, hit }) {
  const panes = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const i = r * cols + c;
      if (natural) {
        // every other row, every 4th column, alternate rows shifted by 2: an even, mirror-symmetric stagger
        const k = r / 2;
        if (r % 2 !== 0 || c % 4 !== (k % 2 === 0 ? 1 : 3)) continue;
      }
      panes.push(
        <rect
          key={i}
          className={`w ${!natural && (i * 7 + seed) % 11 === 0 ? "on" : ""}`}
          x={x - OX + c * (w + gapX)}
          y={y - OY + r * (h + gapY)}
          width={w}
          height={h}
          rx="0.6"
          style={{ "--i": natural ? Math.abs(c - (cols - 1) / 2) / 2 + r : (c + r * 2) % 14 }}
        />
      );
    }
  }
  if (!natural) return <g className="lp-panes">{panes}</g>;
  return (
    <g className="lp-panes nat">
      <polygon className="lp-hit" points={P(hit)} />
      {panes}
    </g>
  );
}

export default function Building() {
  const uid = useId().replace(/:/g, "");
  const stripes = `lp-stripes-${uid}`;
  const slats = `lp-slats-${uid}`;
  const wallClip = `lp-wall-${uid}`;
  const shade = `lp-shade-${uid}`;

  return (
    <svg className="lp-building" viewBox="0 0 1480 350" role="img" aria-label="Illustration of maroon campus buildings">
      <defs>
        {/* fine horizontal courses */}
        <pattern id={stripes} width="10" height="9" patternUnits="userSpaceOnUse">
          <rect className="lp-stripe" width="10" height="1" />
        </pattern>
        {/* bands of fine vertical slats, one band per storey */}
        <pattern id={slats} width="4" height="25" patternUnits="userSpaceOnUse">
          <rect className="lp-stripe" width="1.2" height="19" y="2" />
        </pattern>
        <radialGradient id={shade}>
          <stop offset="0" className="lp-shade-stop" />
          <stop offset="1" className="lp-shade-stop" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ground + low platform */}
      <g className="lp-layer" style={{ "--depth": 3 }}>
        <ellipse className="lp-shade" cx={793 - OX} cy={512 - OY + 4} rx="780" ry="9" fill={`url(#${shade})`} />
        <rect className="lp-ground" {...R(0, 510, 1585, 5)} rx="2.5" />
        <polygon className="lp-annex" points={P("335,495 898,490 898,503 335,510")} />
      </g>

      {/* Left block */}
      <g className="lp-layer" style={{ "--depth": 9 }}>
        <g className="lp-rise" style={riseStyle(RISE.left)}>
        <g className="lp-bld">
          {/* slatted storeys, left face */}
          <polygon className="front" points={P("91,218 335,187 335,510 91,510")} />
          <polygon className="tex" points={P("91,218 335,187 335,372 91,380")} fill={`url(#${slats})`} />
          {/* brick-coursed wall */}
          <polygon className="front" points={P("335,187 550,247 550,495 335,495")} />
          {/* courses fan from the rising roofline down to the flat ground line, so they sit in perspective */}
          <clipPath id={wallClip}><polygon points={P("335,187 550,247 550,330 335,330")} /></clipPath>
          <g className="tex" opacity="0.8" clipPath={`url(#${wallClip})`}>
            {Array.from({ length: 16 }, (_, k) => {
              const t = k * 0.031 + 0.01;
              return <line key={k} x1={335 - OX} y1={187 + t * 308 - OY} x2={550 - OX} y2={187 + t * 308 + 26 - t * 40 - OY} stroke="var(--lp-bld-tex)" strokeWidth="0.9" />;
            })}
          </g>
          {/* right return with horizontal banding */}
          <polygon className="side" points={P("550,247 665,357 665,493 550,493")} />
          <polygon className="tex dim" points={P("550,335 665,395 665,480 550,480")} fill={`url(#${stripes})`} />
          {/* plinth line + openings */}
          <rect className="open" {...R(196, 402, 32, 53)} />
          <polygon className="open" points={P("352,418 490,432 490,495 352,495")} />
          <polygon className="open shade" points={P("380,455 440,431 490,437 490,495 380,495")} />
          <Windows x={100} y={228} cols={27} rows={9} w={5} h={13} gapX={3.5} gapY={4} seed={1} natural hit="91,218 335,187 550,247 665,357 665,397 91,397" />
        </g>
        </g>
      </g>

      {/* Middle block */}
      <g className="lp-layer" style={{ "--depth": 5 }}>
        <g className="lp-rise" style={riseStyle(RISE.middle)}>
        <g className="lp-bld">
          <polygon className="front" points={P("858,367 1020,360 1020,503 858,503")} />
          <polygon className="tex" points={P("858,367 1020,360 1020,468 858,470")} fill={`url(#${stripes})`} />
          <polygon className="side" points={P("1020,360 1078,408 1078,502 1020,503")} />
          <polygon className="tex dim" points={P("1020,395 1078,440 1078,495 1020,495")} fill={`url(#${stripes})`} />
          <rect className="open" {...R(920, 468, 30, 35)} />
          <Windows x={866} y={376} cols={5} rows={2} w={12} h={4} gapX={14} gapY={30} seed={4} />
        </g>
        </g>
      </g>

      {/* Right block */}
      <g className="lp-layer" style={{ "--depth": 13 }}>
        <g className="lp-rise" style={riseStyle(RISE.right)}>
        <g className="lp-bld">
          <polygon className="side" points={P("1080,300 1135,248 1135,502 1080,502")} />
          <polygon className="tex dim" points={P("1080,310 1135,260 1135,400 1080,400")} fill={`url(#${slats})`} />
          <polygon className="front" points={P("1135,248 1507,218 1507,498 1135,502")} />
          <polygon className="tex" points={P("1225,243 1507,218 1507,405 1225,408")} fill={`url(#${slats})`} />
          {/* lattice of slits on the left bay */}
          <Windows x={1150} y={252} cols={11} rows={8} w={4} h={15} gapX={3} gapY={5} seed={2} />
          <rect className="tex slat" {...R(1274, 480, 96, 18)} fill={`url(#${slats})`} />
          <polygon className="open" points={P("1090,443 1130,430 1130,502 1090,502")} />
          <rect className="open" {...R(1274, 405, 44, 63)} />
          <rect className="open" {...R(1372, 478, 130, 22)} />
        </g>
        </g>
      </g>
    </svg>
  );
}
