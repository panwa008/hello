import type { Outfit } from '../store/AppStore'

export const HAIR_COLORS: Record<string, string> = { h1: '#7A4A35', h2: '#A98BE0', h3: '#F2A5C3', h4: '#2A2433' }
const TOP: Record<string, { c: string; dress?: boolean; cardigan?: boolean }> = {
  a1: { c: '#FFFFFF' }, a2: { c: '#C9B2EE', cardigan: true }, a3: { c: '#BDEBD8' }, a4: { c: '#FBD3E3', dress: true },
}
const BOTTOM: Record<string, { c: string; skirt?: boolean; long?: boolean }> = {
  b1: { c: '#8DB7E6' }, b2: { c: '#F7BFD5', skirt: true }, b3: { c: '#F1E4CF', long: true },
}
const SHOES: Record<string, string> = { s1: '#FFFFFF', s2: '#E8D3B8', s3: '#F5C6DA' }

/** Chibi full-body avatar. `back` renders the rear view for rotation. */
const AURA: Record<string, [string, string, string] | undefined> = { z1: ['#E6DBFA', '#B9A2E8', '#9B7EBD'], z2: ['#FFE0EE', '#F5A9C5', '#E87FA8'], z3: ['#FFF6C9', '#FFD36E', '#E8B53A'] }
const PACK: Record<string, [string, string, string] | undefined> = { k1: ['#E9C8A6', '#B98A64', '🧸'], k2: ['#FFFFFF', '#D8CCF0', '🪽'], k3: ['#BFEBD6', '#6FC7A2', '🐉'] }

export function AvatarFigure({ outfit, back = false, height = 340 }: { outfit: Outfit; back?: boolean; height?: number }) {
  const hair = HAIR_COLORS[outfit.hair] ?? '#7A4A35'
  const top = TOP[outfit.top] ?? TOP.a1
  const bottom = BOTTOM[outfit.bottom] ?? BOTTOM.b1
  const shoe = SHOES[outfit.shoes] ?? '#fff'
  const skin = '#FCE0CF'
  const shortHair = outfit.hair === 'h4'
  const aura = AURA[outfit.aura ?? 'none']
  const pack = PACK[outfit.backpack ?? 'none']
  return (
    <svg height={height} viewBox="0 0 200 360" className="drop-shadow-[0_18px_24px_rgba(110,80,160,0.25)]">
      {aura && <>
        <defs><radialGradient id={`aura-${outfit.aura}`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={aura[0]} stopOpacity=".85" /><stop offset="70%" stopColor={aura[1]} stopOpacity=".35" /><stop offset="100%" stopColor={aura[1]} stopOpacity="0" /></radialGradient></defs>
        <ellipse cx="100" cy="180" rx="98" ry="178" fill={`url(#aura-${outfit.aura})`}><animate attributeName="opacity" values=".7;1;.7" dur="3s" repeatCount="indefinite" /></ellipse>
        {[[28, 90], [172, 120], [20, 230], [178, 260], [60, 30], [146, 40]].map(([x, y], i) => <text key={i} x={x} y={y} fontSize="14" fill={aura[2]} opacity=".9"><animate attributeName="opacity" values="0;1;0" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />✦</text>)}
      </>}
      <ellipse cx="100" cy="350" rx="48" ry="7" fill="#7E5BB5" opacity=".15" />
      {/* backpack peeking from behind (front view) */}
      {pack && !back && <rect x="58" y="112" width="84" height="96" rx="22" fill={pack[0]} stroke={pack[1]} strokeWidth="3" />}
      {/* back hair */}
      {!shortHair && <path d="M52 70 Q48 20 100 16 Q152 20 148 70 L156 170 Q130 186 100 182 Q70 186 44 170 Z" fill={hair} />}
      {/* legs */}
      {!bottom.long && !top.dress && <><rect x="80" y="230" width="16" height="96" rx="8" fill={skin} /><rect x="104" y="230" width="16" height="96" rx="8" fill={skin} /></>}
      {top.dress && <><rect x="82" y="250" width="14" height="80" rx="7" fill={skin} /><rect x="104" y="250" width="14" height="80" rx="7" fill={skin} /></>}
      {bottom.long && !top.dress && <><rect x="78" y="200" width="20" height="128" rx="9" fill={bottom.c} /><rect x="102" y="200" width="20" height="128" rx="9" fill={bottom.c} /></>}
      {/* shoes */}
      <path d="M74 326 h26 v10 q0 6 -6 6 h-22 q-6 0 -4 -8z" fill={shoe} stroke="#d9cfe8" />
      <path d="M100 326 h26 q6 0 4 8 q0 8 -6 8 h-20 q-4 0 -4 -6z" fill={shoe} stroke="#d9cfe8" />
      {outfit.shoes === 's2' && <><rect x="76" y="300" width="22" height="30" rx="6" fill={shoe} /><rect x="102" y="300" width="22" height="30" rx="6" fill={shoe} /></>}
      {/* bottoms */}
      {!top.dress && !bottom.long && (bottom.skirt
        ? <path d="M70 196 h60 l14 52 q-44 12 -88 0z" fill={bottom.c} />
        : <path d="M74 196 h52 l4 44 h-26 l-4 -14 l-4 14 h-26z" fill={bottom.c} />)}
      {/* arms */}
      <rect x="54" y="122" width="15" height="88" rx="7.5" fill={skin} transform="rotate(6 61 122)" />
      <rect x="131" y="122" width="15" height="88" rx="7.5" fill={skin} transform="rotate(-6 138 122)" />
      {/* top */}
      {top.dress
        ? <path d="M74 116 Q100 108 126 116 L132 196 L156 262 Q100 276 44 262 L68 196Z" fill={top.c} />
        : <path d="M72 116 Q100 108 128 116 L130 200 Q100 206 70 200Z" fill={top.c} stroke="#ece4f6" />}
      {top.dress && <path d="M50 250 Q100 266 150 250" stroke="#fff" strokeWidth="3" fill="none" opacity=".8" strokeDasharray="4 6" />}
      {top.cardigan && <><path d="M64 118 L72 116 L74 204 L62 200Z" fill="#B49AE0" /><path d="M136 118 L128 116 L126 204 L138 200Z" fill="#B49AE0" /></>}
      {/* neck + head */}
      <rect x="92" y="96" width="16" height="22" rx="6" fill={skin} />
      <ellipse cx="100" cy="70" rx="34" ry="36" fill={skin} />
      {back ? (
        <path d="M64 74 Q60 30 100 28 Q140 30 136 74 Q140 110 100 108 Q60 110 64 74Z" fill={hair} />
      ) : (
        <>
          <g className="anim-blink">
            <ellipse cx="87" cy="76" rx="5.5" ry="7" fill="#3B2A55" />
            <ellipse cx="113" cy="76" rx="5.5" ry="7" fill="#3B2A55" />
          </g>
          <circle cx="89" cy="73" r="2" fill="#fff" /><circle cx="115" cy="73" r="2" fill="#fff" />
          <ellipse cx="78" cy="88" rx="6" ry="3.5" fill="#F5A9C5" opacity=".6" />
          <ellipse cx="122" cy="88" rx="6" ry="3.5" fill="#F5A9C5" opacity=".6" />
          <path d="M95 92 Q100 97 105 92" stroke="#C0607A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d={shortHair ? 'M64 74 Q60 30 100 30 Q140 30 136 74 Q132 52 118 48 Q100 58 80 50 Q66 56 64 74Z' : 'M64 70 Q62 30 100 30 Q138 30 136 70 Q128 50 112 46 Q96 60 70 56 Q66 60 64 70Z'} fill={hair} />
        </>
      )}
      {/* accessories */}
      {outfit.acc === 'x3' && <><ellipse cx="100" cy="36" rx="40" ry="14" fill="#FFC9B5" /><circle cx="100" cy="22" r="5" fill="#FFC9B5" /></>}
      {outfit.acc === 'x4' && !back && <g transform="translate(128 46)">{[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-6" rx="4" ry="6" fill="#FFE27A" transform={`rotate(${r})`} />)}<circle r="3.5" fill="#F7A440" /></g>}
      {outfit.acc === 'x2' && !back && <><path d="M86 118 Q100 134 114 118" stroke="#E8C66A" strokeWidth="2" fill="none" /><path d="M100 128 l3 5 l-3 5 l-3 -5z" fill="#FFE27A" /></>}
      {outfit.acc === 'x1' && <><path d="M128 120 L150 200" stroke="#B98A64" strokeWidth="3" /><rect x="138" y="196" width="30" height="26" rx="7" fill="#E9C8A6" /></>}
      {/* backpack */}
      {pack && !back && <><path d="M76 112 Q72 150 78 196" stroke={pack[1]} strokeWidth="6" fill="none" strokeLinecap="round" /><path d="M124 112 Q128 150 122 196" stroke={pack[1]} strokeWidth="6" fill="none" strokeLinecap="round" /></>}
      {pack && back && <g>
        <rect x="64" y="118" width="72" height="92" rx="20" fill={pack[0]} stroke={pack[1]} strokeWidth="3" />
        <rect x="76" y="162" width="48" height="34" rx="10" fill={pack[1]} opacity=".55" />
        <text x="100" y="152" fontSize="26" textAnchor="middle">{pack[2]}</text>
      </g>}
    </svg>
  )
}
