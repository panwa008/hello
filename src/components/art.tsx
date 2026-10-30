import type { Person } from '../data/types'

export function PawLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Hello logo">
      <defs>
        <linearGradient id="lg-paw" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C4A8EC" />
          <stop offset="1" stopColor="#7E5BB5" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="20" fill="url(#lg-paw)" />
      <g fill="#fff">
        <ellipse cx="32" cy="41" rx="12" ry="10" />
        <ellipse cx="18" cy="28" rx="5" ry="6.5" transform="rotate(-15 18 28)" />
        <ellipse cx="46" cy="28" rx="5" ry="6.5" transform="rotate(15 46 28)" />
        <ellipse cx="25.5" cy="18" rx="5" ry="6.5" />
        <ellipse cx="38.5" cy="18" rx="5" ry="6.5" />
      </g>
      <circle cx="50" cy="12" r="3" fill="#F5A9C5" />
    </svg>
  )
}

/** Kawaii chibi face avatar, fully inline SVG (offline). */
export function Face({ p, size = 48, ring }: { p: Pick<Person, 'id' | 'hair' | 'skin' | 'bg' | 'gender'>; size?: number; ring?: string }) {
  const id = 'f' + p.id
  const long = p.gender === 'f'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0 rounded-full" style={ring ? { boxShadow: `0 0 0 3px white, 0 0 0 5px ${ring}` } : undefined}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.bg[0]} />
          <stop offset="1" stopColor={p.bg[1]} />
        </linearGradient>
        <clipPath id={id + 'c'}><circle cx="50" cy="50" r="50" /></clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect width="100" height="100" fill={`url(#${id})`} />
        {long && <path d="M18 52 Q16 22 50 18 Q84 22 82 52 L86 100 L14 100 Z" fill={p.hair} />}
        <path d="M30 86 Q50 74 70 86 L78 100 L22 100 Z" fill="#fff" opacity=".9" />
        <rect x="44" y="68" width="12" height="12" rx="5" fill={p.skin} />
        <ellipse cx="50" cy="52" rx="24" ry="25" fill={p.skin} />
        <path d={long ? 'M25 52 Q24 26 50 25 Q76 26 75 52 Q70 38 58 34 Q48 42 30 42 Q27 46 25 52Z' : 'M25 50 Q24 24 50 23 Q76 24 75 50 Q72 36 62 34 Q50 40 36 36 Q28 40 25 50Z'} fill={p.hair} />
        <g className="anim-blink">
          <ellipse cx="40" cy="55" rx="4.2" ry="5.2" fill="#2E2342" />
          <ellipse cx="60" cy="55" rx="4.2" ry="5.2" fill="#2E2342" />
        </g>
        <circle cx="41.5" cy="53" r="1.6" fill="#fff" />
        <circle cx="61.5" cy="53" r="1.6" fill="#fff" />
        <ellipse cx="33" cy="63" rx="4.5" ry="2.6" fill="#F5A9C5" opacity=".7" />
        <ellipse cx="67" cy="63" rx="4.5" ry="2.6" fill="#F5A9C5" opacity=".7" />
        <path d="M46 65 Q50 69 54 65" stroke="#C0607A" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export interface PetPalette { body: string; belly: string; wing: string; horn: string; accent: string }
export const PALETTES: Record<string, PetPalette> = {
  lumi: { body: '#F4EEFF', belly: '#FFFFFF', wing: '#F7C6DC', horn: '#FFE7B0', accent: '#C9A8F0' },
  mochi: { body: '#FFE3EE', belly: '#FFF6FA', wing: '#FFC0D9', horn: '#FFF0C2', accent: '#F59AC0' },
  sora: { body: '#DDF7EC', belly: '#F6FFFB', wing: '#B8E8F7', horn: '#FFF0C2', accent: '#7FD3B4' },
  nova: { body: '#E1E6FF', belly: '#F7F8FF', wing: '#C9B6F5', horn: '#FFE7B0', accent: '#8B9CF0' },
}

/** Fantasy baby dragon — the hero pet. Pure SVG + CSS animation. */
export function PetDragon({ palette = PALETTES.lumi, size = 220, pose = 'pose1', className = '' }: { palette?: PetPalette; size?: number; pose?: string; className?: string }) {
  const sleeping = pose === 'pose4'
  const wingsOpen = pose === 'pose2'
  const uid = palette.body.replace('#', '')
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" className={className}>
      <defs>
        <radialGradient id={'body' + uid} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".55" stopColor={palette.body} />
          <stop offset="1" stopColor={palette.accent} stopOpacity=".55" />
        </radialGradient>
        <linearGradient id={'wing' + uid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor={palette.wing} />
        </linearGradient>
        <filter id={'soft' + uid}><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      {/* ground shadow */}
      <ellipse cx="120" cy="214" rx="62" ry="10" fill="#7E5BB5" opacity=".15" filter={`url(#soft${uid})`} />
      <g className="anim-breathe">
        {/* wings */}
        <g transform={wingsOpen ? 'rotate(-14 100 110)' : undefined}><g className="anim-wing">
          <path d="M92 118 C56 80 28 92 22 70 C40 70 46 58 60 64 C62 52 78 50 84 60 C90 52 100 60 100 74 Z" fill={`url(#wing${uid})`} stroke={palette.accent} strokeOpacity=".35" strokeWidth="1.5" />
          <path d="M90 110 C70 92 50 90 38 78" stroke={palette.accent} strokeOpacity=".35" strokeWidth="1.5" fill="none" />
        </g></g>
        <g transform={wingsOpen ? 'rotate(14 140 110)' : undefined}><g className="anim-wingR">
          <path d="M148 118 C184 80 212 92 218 70 C200 70 194 58 180 64 C178 52 162 50 156 60 C150 52 140 60 140 74 Z" fill={`url(#wing${uid})`} stroke={palette.accent} strokeOpacity=".35" strokeWidth="1.5" />
          <path d="M150 110 C170 92 190 90 202 78" stroke={palette.accent} strokeOpacity=".35" strokeWidth="1.5" fill="none" />
        </g></g>
        {/* tail */}
        <path d="M150 182 C186 190 196 168 186 156 C200 160 206 182 190 196 C176 206 156 200 146 194 Z" fill={`url(#body${uid})`} />
        <path d="M188 154 l10 -8 l-2 12 z" fill={palette.wing} />
        {/* body */}
        <ellipse cx="120" cy="164" rx="46" ry="42" fill={`url(#body${uid})`} />
        <ellipse cx="120" cy="172" rx="28" ry="28" fill={palette.belly} opacity=".95" />
        {[160, 172, 184].map((y) => <path key={y} d={`M104 ${y} Q120 ${y + 5} 136 ${y}`} stroke={palette.accent} strokeOpacity=".25" strokeWidth="2" fill="none" />)}
        {/* feet & arms */}
        <ellipse cx="96" cy="202" rx="14" ry="9" fill={palette.body} stroke={palette.accent} strokeOpacity=".3" />
        <ellipse cx="144" cy="202" rx="14" ry="9" fill={palette.body} stroke={palette.accent} strokeOpacity=".3" />
        {pose === 'pose3'
          ? <><ellipse cx="82" cy="150" rx="9" ry="13" fill={palette.body} transform="rotate(-40 82 150)" /><circle cx="64" cy="128" r="12" fill="#FFD3B5" stroke="#F5A9C5" strokeWidth="2" /></>
          : <ellipse cx="88" cy="164" rx="9" ry="13" fill={palette.body} transform="rotate(25 88 164)" />}
        <ellipse cx="152" cy="164" rx="9" ry="13" fill={palette.body} transform="rotate(-25 152 164)" />
        {/* head */}
        <g>
          <path d="M82 66 C74 44 84 30 92 26 C92 40 96 50 100 58 Z" fill={palette.horn} />
          <path d="M158 66 C166 44 156 30 148 26 C148 40 144 50 140 58 Z" fill={palette.horn} />
          <path d="M70 92 C52 84 50 66 56 58 C62 70 72 74 80 76 Z" fill={palette.wing} />
          <path d="M170 92 C188 84 190 66 184 58 C178 70 168 74 160 76 Z" fill={palette.wing} />
          <ellipse cx="120" cy="100" rx="54" ry="48" fill={`url(#body${uid})`} />
          <path d="M112 54 q8 -14 16 0 q-8 6 -16 0z" fill={palette.wing} />
          <path d="M118 46 q2 -8 4 0z" fill={palette.wing} />
          {sleeping ? (
            <>
              <path d="M90 104 q10 8 20 0" stroke="#3B2A55" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M130 104 q10 8 20 0" stroke="#3B2A55" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <text x="168" y="62" fontSize="18" fill={palette.accent} fontWeight="700">z</text>
              <text x="182" y="46" fontSize="13" fill={palette.accent} fontWeight="700">z</text>
            </>
          ) : (
            <g className="anim-blink">
              <ellipse cx="98" cy="102" rx="13" ry="15" fill="#3B2A55" />
              <ellipse cx="142" cy="102" rx="13" ry="15" fill="#3B2A55" />
              <ellipse cx="98" cy="106" rx="9" ry="9" fill={palette.accent} opacity=".7" />
              <ellipse cx="142" cy="106" rx="9" ry="9" fill={palette.accent} opacity=".7" />
              <circle cx="103" cy="95" r="5" fill="#fff" />
              <circle cx="147" cy="95" r="5" fill="#fff" />
              <circle cx="93" cy="110" r="2.2" fill="#fff" />
              <circle cx="137" cy="110" r="2.2" fill="#fff" />
            </g>
          )}
          <ellipse cx="80" cy="122" rx="10" ry="6" fill="#F5A9C5" opacity=".6" />
          <ellipse cx="160" cy="122" rx="10" ry="6" fill="#F5A9C5" opacity=".6" />
          <path d="M112 124 q4 5 8 0 q4 5 8 0" stroke="#7A4B6A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      </g>
      {/* sparkles */}
      {[[36, 40, 0], [204, 36, 0.8], [214, 140, 1.6], [24, 150, 1.2]].map(([x, y, d], i) => (
        <path key={i} className="anim-sparkle" style={{ animationDelay: `${d}s`, transformOrigin: `${x}px ${y}px` }} d={`M${x} ${y - 8} L${x + 2} ${y - 2} L${x + 8} ${y} L${x + 2} ${y + 2} L${x} ${y + 8} L${x - 2} ${y + 2} L${x - 8} ${y} L${x - 2} ${y - 2} Z`} fill="#FFE7B0" />
      ))}
    </svg>
  )
}

export function Egg({ hue = '#F5A9C5', size = 56, glow = false }: { hue?: string; size?: number; glow?: boolean }) {
  const id = 'egg' + hue.replace('#', '')
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 50 60">
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".5" stopColor={hue} stopOpacity=".7" />
          <stop offset="1" stopColor={hue} />
        </radialGradient>
      </defs>
      {glow && <ellipse cx="25" cy="34" rx="24" ry="26" fill={hue} opacity=".25" />}
      <path d="M25 3 C38 3 46 24 46 37 C46 50 37 57 25 57 C13 57 4 50 4 37 C4 24 12 3 25 3Z" fill={`url(#${id})`} />
      <path d="M7 34 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l6 5" stroke="#fff" strokeWidth="2.2" fill="none" opacity=".85" />
      <circle cx="16" cy="44" r="2.5" fill="#fff" opacity=".7" />
      <circle cx="33" cy="47" r="3.2" fill="#fff" opacity=".6" />
      <circle cx="26" cy="20" r="2" fill="#fff" opacity=".7" />
      <ellipse cx="17" cy="16" rx="4" ry="7" fill="#fff" opacity=".5" transform="rotate(20 17 16)" />
    </svg>
  )
}

export function Scene({ kind }: { kind: 'sunset' | 'lavender' | 'city' | 'beach' | 'cafe' | 'night' }) {
  const sky: Record<string, [string, string]> = {
    sunset: ['#FFB8C9', '#FFE1B8'], lavender: ['#CDB8F2', '#FCE3F0'], city: ['#BFD9FF', '#F6E6FF'],
    beach: ['#9FD3F5', '#E6F7FF'], cafe: ['#FFE1C7', '#FFF4EA'], night: ['#3C2F6E', '#9B7EBD'],
  }
  const [a, b] = sky[kind]
  const gid = 'sky' + kind
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
      </defs>
      <rect width="400" height="240" fill={`url(#${gid})`} />
      {kind === 'night' && Array.from({ length: 40 }).map((_, i) => <circle key={i} cx={(i * 97) % 400} cy={(i * 53) % 140} r={(i % 3) * 0.6 + 0.6} fill="#fff" opacity={0.5 + (i % 4) * 0.12} />)}
      {(kind === 'sunset' || kind === 'beach') && <circle cx="300" cy={kind === 'sunset' ? 150 : 60} r="34" fill={kind === 'sunset' ? '#FFF2C7' : '#FFFBE6'} opacity=".95" />}
      {kind === 'night' && <circle cx="320" cy="50" r="22" fill="#FFF5D6" />}
      {kind === 'lavender' && (
        <>
          <path d="M0 140 Q100 110 200 135 T400 125 V240 H0Z" fill="#B49AE0" opacity=".6" />
          {Array.from({ length: 60 }).map((_, i) => {
            const x = (i * 37) % 420, y = 150 + ((i * 29) % 90)
            return <g key={i}><line x1={x} y1={y} x2={x} y2={y + 26} stroke="#7FB58F" strokeWidth="1.5" /><ellipse cx={x} cy={y} rx="3" ry="9" fill={i % 3 ? '#9B7EBD' : '#B79BE0'} /></g>
          })}
          {Array.from({ length: 14 }).map((_, i) => <circle key={'g' + i} className="anim-sparkle" style={{ animationDelay: `${i * 0.3}s`, transformOrigin: `${(i * 61) % 400}px ${120 + (i * 17) % 90}px` }} cx={(i * 61) % 400} cy={120 + (i * 17) % 90} r="3" fill="#B6FFD9" />)}
        </>
      )}
      {kind === 'sunset' && (<><path d="M0 170 Q120 140 240 165 T400 160 V240 H0Z" fill="#E9A2B8" /><path d="M0 200 Q140 180 260 200 T400 195 V240 H0Z" fill="#C987A8" /></>)}
      {kind === 'beach' && (<><rect y="120" width="400" height="60" fill="#6EC1EA" /><path d="M0 120 Q50 114 100 120 T200 120 T300 120 T400 120" stroke="#fff" strokeWidth="3" fill="none" opacity=".7" /><path d="M0 175 Q200 150 400 178 V240 H0Z" fill="#FBE3C2" /></>)}
      {(kind === 'city' || kind === 'night') && [20, 70, 110, 170, 230, 280, 330, 370].map((x, i) => (
        <g key={x}>
          <rect x={x} y={240 - (60 + (i * 37) % 90)} width={38} height={60 + (i * 37) % 90} rx="4" fill={kind === 'night' ? '#2A2150' : '#E6DBFA'} />
          {Array.from({ length: 6 }).map((_, j) => <rect key={j} x={x + 8 + (j % 2) * 14} y={240 - (50 + (i * 37) % 90) + Math.floor(j / 2) * 18} width="8" height="8" rx="2" fill={kind === 'night' ? '#FFE7B0' : '#fff'} opacity=".8" />)}
        </g>
      ))}
      {kind === 'night' && <path d="M0 225 Q200 210 400 228 V240 H0Z" fill="#5E4A9A" />}
      {kind === 'cafe' && (<><rect x="60" y="120" width="280" height="12" rx="6" fill="#D9B08C" /><text x="150" y="110" fontSize="60">☕🥐</text></>)}
    </svg>
  )
}
