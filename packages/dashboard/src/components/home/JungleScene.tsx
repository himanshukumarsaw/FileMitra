/**
 * JungleScene — the full-bleed hero backdrop for the landing page.
 *
 * Pure CSS/SVG, no image asset: five depth layers (haze, far treeline,
 * emergent canopy, mid canopy, undergrowth) plus foreground fronds and a
 * vignette. `preserveAspectRatio="xMidYMid slice"` makes it behave like
 * `object-fit: cover`, so it fills any viewport without letterboxing.
 *
 * Foliage clumps are generated from a seeded PRNG rather than Math.random so
 * the scene is identical on every render.
 */

/** mulberry32 — small deterministic PRNG, so a seed always yields one scene. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Clump {
  cx: number
  cy: number
  r: number
}

/** A band of overlapping blobs that reads as a mass of foliage. */
function canopy(
  seed: number,
  o: { x0: number; x1: number; baseline: number; amp: number; count: number; rMin: number; rMax: number }
): Clump[] {
  const rand = rng(seed)
  const out: Clump[] = []
  for (let i = 0; i < o.count; i++) {
    const t = i / (o.count - 1)
    out.push({
      cx: o.x0 + (o.x1 - o.x0) * t + (rand() - 0.5) * 90,
      cy: o.baseline - Math.sin(t * Math.PI * 3 + seed) * o.amp - rand() * o.amp * 0.8,
      r: o.rMin + rand() * (o.rMax - o.rMin),
    })
  }
  return out
}

/** Compound leaf: leaflets stepped along a curving rachis. */
function fern(seed: number, len: number, pairs: number) {
  const rand = rng(seed)
  const parts: React.ReactNode[] = []
  for (let i = 0; i < pairs; i++) {
    const t = i / pairs
    const x = t * len
    const y = -Math.pow(t, 1.7) * len * 0.42
    const leaflet = (len / pairs) * (1.35 - t) * 1.5
    for (const dir of [-1, 1]) {
      parts.push(
        <ellipse
          key={`${i}-${dir}`}
          cx={x}
          cy={y + dir * leaflet * 0.42}
          rx={leaflet * 0.92}
          ry={leaflet * 0.34}
          transform={`rotate(${dir * (26 + rand() * 12)} ${x} ${y})`}
        />
      )
    }
  }
  return parts
}

/** Broad banana-style leaf, drawn from the stem outward along +x. */
const BROAD_LEAF = 'M0 0C46-36 138-50 224-13 138 28 46 37 0 0Z'

/** Radiating palm fan. */
function palm(blades: number, len: number, spread: number) {
  return Array.from({ length: blades }, (_, i) => {
    const a = -spread / 2 + (spread / (blades - 1)) * i
    return (
      <path
        key={i}
        d={`M0 0C${len * 0.3}${' '}${-len * 0.09} ${len * 0.72} ${-len * 0.1} ${len} 0 ${len * 0.72} ${len * 0.1} ${len * 0.3} ${len * 0.09} 0 0Z`}
        transform={`rotate(${a})`}
      />
    )
  })
}

export function JungleScene() {
  const far = canopy(7, { x0: -80, x1: 1680, baseline: 386, amp: 30, count: 34, rMin: 46, rMax: 104 })
  const mid = canopy(21, { x0: -120, x1: 1720, baseline: 486, amp: 44, count: 30, rMin: 62, rMax: 132 })
  const near = canopy(43, { x0: -140, x1: 1740, baseline: 616, amp: 52, count: 26, rMin: 84, rMax: 168 })
  const scrub = canopy(89, { x0: -140, x1: 1740, baseline: 812, amp: 40, count: 30, rMin: 78, rMax: 156 })

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="jg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d1a1e" />
          <stop offset="42%" stopColor="#1b3230" />
          <stop offset="100%" stopColor="#2c4a3b" />
        </linearGradient>
        {/* Moonlit haze sitting just above the treeline */}
        <radialGradient id="jg-haze" cx="52%" cy="44%" r="46%">
          <stop offset="0%" stopColor="#7ea88b" stopOpacity=".42" />
          <stop offset="55%" stopColor="#3f6553" stopOpacity=".16" />
          <stop offset="100%" stopColor="#12211b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="jg-vignette" cx="50%" cy="46%" r="72%">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="62%" stopColor="#000" stopOpacity=".16" />
          <stop offset="100%" stopColor="#000" stopOpacity=".76" />
        </radialGradient>
        <linearGradient id="jg-topscrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020905" stopOpacity=".82" />
          <stop offset="100%" stopColor="#020905" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="jg-botscrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020905" stopOpacity="0" />
          <stop offset="100%" stopColor="#020905" stopOpacity=".92" />
        </linearGradient>
      </defs>

      {/* ── Sky + haze ───────────────────────────────────────────── */}
      <rect width="1600" height="900" fill="url(#jg-sky)" />
      <rect width="1600" height="900" fill="url(#jg-haze)" />

      {/* ── Distant misted treeline (lowest contrast = furthest away) */}
      <g fill="#20392f" opacity=".62">
        {canopy(3, { x0: -60, x1: 1660, baseline: 356, amp: 22, count: 26, rMin: 40, rMax: 88 }).map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />
        ))}
        <rect x="-60" y="350" width="1720" height="120" />
      </g>

      {/* ── Emergent umbrella trees breaking the canopy line ─────── */}
      <g fill="#16291f">
        {[
          { x: 700, y: 372, s: 1 },
          { x: 905, y: 366, s: 1.14 },
          { x: 1210, y: 380, s: 0.78 },
        ].map((t, i) => (
          <g key={i} transform={`translate(${t.x} ${t.y}) scale(${t.s})`}>
            <path d="M-7 0C-5-52-3-96-2-132l6 0C5-96 6-52 8 0Z" />
            {/* branching */}
            <path d="M-2-118C-30-134-58-146-88-150M2-124C30-140 58-152 88-156M0-104C-22-116-44-124-64-126"
              stroke="#16291f" strokeWidth="4" fill="none" strokeLinecap="round" />
            {canopy(11 + i * 5, { x0: -104, x1: 104, baseline: -150, amp: 16, count: 11, rMin: 26, rMax: 46 }).map((c, j) => (
              <ellipse key={j} cx={c.cx} cy={c.cy} rx={c.r} ry={c.r * 0.62} />
            ))}
          </g>
        ))}
      </g>

      {/* ── Far canopy ───────────────────────────────────────────── */}
      <g fill="#13271c">
        {far.map((c, i) => (
          <ellipse key={i} cx={c.cx} cy={c.cy} rx={c.r} ry={c.r * 0.78} />
        ))}
        <rect x="-80" y="380" width="1760" height="140" />
      </g>

      {/* ── Mid canopy ───────────────────────────────────────────── */}
      <g fill="#0e2016">
        {mid.map((c, i) => (
          <ellipse key={i} cx={c.cx} cy={c.cy} rx={c.r} ry={c.r * 0.72} />
        ))}
        <rect x="-120" y="480" width="1840" height="180" />
      </g>

      {/* ── Near canopy ──────────────────────────────────────────── */}
      <g fill="#0a1a11">
        {near.map((c, i) => (
          <ellipse key={i} cx={c.cx} cy={c.cy} rx={c.r} ry={c.r * 0.66} />
        ))}
        <rect x="-140" y="610" width="1880" height="200" />
      </g>

      {/* ── Undergrowth, with ferns catching a little edge light ─── */}
      <g fill="#07130c">
        {scrub.map((c, i) => (
          <ellipse key={i} cx={c.cx} cy={c.cy} rx={c.r} ry={c.r * 0.58} />
        ))}
        <rect x="-140" y="806" width="1880" height="140" />
      </g>
      <g fill="#0d2416">
        {[
          { x: 120, y: 830, r: -34, s: 1 },
          { x: 320, y: 848, r: -14, s: 0.8 },
          { x: 560, y: 838, r: -26, s: 0.9 },
          { x: 860, y: 852, r: -8, s: 0.74 },
          { x: 1080, y: 836, r: -30, s: 0.95 },
          { x: 1360, y: 846, r: -18, s: 0.86 },
          { x: 1520, y: 832, r: -40, s: 1.05 },
        ].map((f, i) => (
          <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.r}) scale(${f.s})`}>
            {fern(31 + i * 7, 190, 9)}
          </g>
        ))}
      </g>

      {/* ── Foreground fronds — near-black, framing the edges ────── */}
      <g fill="#040c07">
        {/* bottom-left banana leaves */}
        <g className="jungle-sway" style={{ transformOrigin: '40px 900px' }}>
          <g transform="translate(-30 892) rotate(-38)">
            <path d={BROAD_LEAF} transform="scale(1.5)" />
          </g>
          <g transform="translate(-20 900) rotate(-8)">
            <path d={BROAD_LEAF} transform="scale(1.25)" />
          </g>
          <g transform="translate(96 900) rotate(-64)">
            <path d={BROAD_LEAF} transform="scale(1.15)" />
          </g>
        </g>

        {/* bottom-right palm fan */}
        <g className="jungle-sway-slow" style={{ transformOrigin: '1580px 900px' }}>
          <g transform="translate(1628 900) rotate(198)">{palm(7, 330, 96)}</g>
          <g transform="translate(1596 900) rotate(236)">{palm(6, 250, 84)}</g>
        </g>

        {/* top-left hanging vine */}
        <g className="jungle-sway" style={{ transformOrigin: '0px 0px' }}>
          <path d="M-10-6C60 40 96 116 104 196" stroke="#040c07" strokeWidth="7" fill="none" />
          {[
            { x: 18, y: 26, r: 34 },
            { x: 46, y: 74, r: 8 },
            { x: 72, y: 122, r: 42 },
            { x: 96, y: 178, r: 16 },
          ].map((l, i) => (
            <path key={i} d={BROAD_LEAF} transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(.46)`} />
          ))}
        </g>

        {/* top-right branch */}
        <g className="jungle-sway-slow" style={{ transformOrigin: '1600px 0px' }}>
          <path d="M1610-8C1540 26 1496 78 1470 140" stroke="#040c07" strokeWidth="8" fill="none" />
          {[
            { x: 1566, y: 14, r: 158 },
            { x: 1528, y: 46, r: 196 },
            { x: 1496, y: 92, r: 150 },
            { x: 1474, y: 136, r: 205 },
          ].map((l, i) => (
            <path key={i} d={BROAD_LEAF} transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(.5)`} />
          ))}
        </g>
      </g>

      {/* ── Legibility scrims + vignette ─────────────────────────── */}
      <rect width="1600" height="900" fill="url(#jg-vignette)" />
      <rect width="1600" height="190" fill="url(#jg-topscrim)" />
      <rect y="660" width="1600" height="240" fill="url(#jg-botscrim)" />
    </svg>
  )
}
