/* global React, ReactDOM, DesignCanvas, DCSection, DCArtboard */

/* shared wordmark + footer */
function Wordmark({ size = 30 }) {
  return <div className="lg-wm" style={{ fontSize: size }}><span className="p">PERSONA</span><span className="d">DAYS</span></div>;
}
function Foot({ children, sub }) {
  return (
    <div className="lg-foot">
      <div className="lg-squircle">{children}</div>
      <div className="lg-foot-txt">
        <div className="lg-foot-lab">PersonaDays</div>
        <div className="lg-foot-sub">{sub}</div>
      </div>
    </div>
  );
}
function Card({ eyebrow, sub, glow = true, children, icon }) {
  return (
    <div className="lg-stage">
      <div className="lg-hero">
        {eyebrow && <div className="lg-eyebrow">{eyebrow}</div>}
        <div className={"em-wrap" + (glow ? " em-glow" : "")}>{children}</div>
        <Wordmark />
      </div>
      <Foot sub={sub}>{icon}</Foot>
    </div>
  );
}

/* ============ 1 · ESTRELLA SEES (charm star + volt cut) ============ */
const STAR = "M24,3 L28,19 L45,24 L28,29 L24,45 L20,29 L3,24 L20,19 Z";
function EmStar({ s = 132 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 48 48">
      <defs>
        <linearGradient id="stG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--acc-hi)"/><stop offset="55%" stopColor="var(--acc)"/><stop offset="100%" stopColor="var(--acc2)"/>
        </linearGradient>
        <clipPath id="stClip"><path d={STAR}/></clipPath>
      </defs>
      <path d={STAR} fill="url(#stG)"/>
      {/* volt twin-slash cut */}
      <g clipPath="url(#stClip)">
        <path d="M30,-2 L34,-2 L14,50 L10,50 Z" fill="var(--ink2)" opacity="0.85"/>
        <path d="M40,2 L43,2 L23,50 L20,50 Z" fill="var(--ink2)" opacity="0.85"/>
      </g>
      <path d={STAR} fill="none" stroke="var(--acc-hi)" strokeWidth="0.6" opacity="0.6"/>
    </svg>
  );
}

/* ============ 2 · MARIPOSA velvet ============ */
function EmButterfly({ s = 150 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 150 150">
      {/* upper wings */}
      <path d="M75 60 L40 26 L20 50 L36 82 L75 74 Z" fill="var(--acc)" stroke="var(--acc-hi)" strokeWidth="1" strokeLinejoin="round"/>
      <path d="M75 60 L110 26 L130 50 L114 82 L75 74 Z" fill="var(--acc)" stroke="var(--acc-hi)" strokeWidth="1" strokeLinejoin="round"/>
      {/* lower wings */}
      <path d="M75 76 L49 96 L53 120 L75 106 Z" fill="var(--acc2)" stroke="var(--acc)" strokeWidth="1" strokeLinejoin="round"/>
      <path d="M75 76 L101 96 L97 120 L75 106 Z" fill="var(--acc2)" stroke="var(--acc)" strokeWidth="1" strokeLinejoin="round"/>
      {/* inner facets */}
      <path d="M75 64 L44 40 M75 70 L40 74" stroke="var(--ink2)" strokeWidth="1.4" opacity="0.5"/>
      <path d="M75 64 L106 40 M75 70 L110 74" stroke="var(--ink2)" strokeWidth="1.4" opacity="0.5"/>
      {/* accent dots */}
      <circle cx="48" cy="52" r="3.4" fill="var(--acc-hi)"/>
      <circle cx="102" cy="52" r="3.4" fill="var(--acc-hi)"/>
      {/* body + head + antennae */}
      <rect x="72.5" y="54" width="5" height="56" rx="2.5" fill="var(--text)"/>
      <circle cx="75" cy="50" r="4.4" fill="var(--text)"/>
      <path d="M75 48 Q66 36 62 28 M75 48 Q84 36 88 28" stroke="var(--text)" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="62" cy="27" r="2.4" fill="var(--acc-hi)"/><circle cx="88" cy="27" r="2.4" fill="var(--acc-hi)"/>
    </svg>
  );
}

/* ============ 3 · MÁSCARA dual ============ */
const MASK = "M75 16 L110 28 Q116 31 113 50 L107 90 Q101 120 75 135 Q49 120 43 90 L37 50 Q34 31 40 28 Z";
function EmMask({ s = 142 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 150 150">
      <defs><clipPath id="mkL"><rect x="0" y="0" width="75" height="150"/></clipPath></defs>
      {/* right half: outline only */}
      <path d={MASK} fill="color-mix(in srgb,var(--acc) 8%, transparent)" stroke="var(--acc)" strokeWidth="2.4" strokeLinejoin="round"/>
      {/* left half: solid */}
      <g clipPath="url(#mkL)"><path d={MASK} fill="var(--acc)"/></g>
      {/* left eye (cut) */}
      <path d="M52 56 L68 51 L64 65 Z" fill="var(--ink)"/>
      {/* right eye (outline) */}
      <path d="M98 56 L82 51 L86 65 Z" fill="none" stroke="var(--acc)" strokeWidth="2.2" strokeLinejoin="round"/>
      {/* center crack */}
      <path d="M75 16 L71 46 L79 72 L72 102 L75 135" stroke="var(--ink2)" strokeWidth="2" fill="none"/>
      <path d="M75 16 L71 46 L79 72 L72 102 L75 135" stroke="var(--acc-hi)" strokeWidth="0.8" fill="none" opacity="0.5" clipPath="url(#mkL)"/>
    </svg>
  );
}

/* ============ 4 · DÍA / NOCHE (ciclo) ============ */
function EmDayNight({ s = 144 }) {
  const rays = [180, 162, 198, 146, 214].map((d, i) => {
    const a = d * Math.PI / 180;
    return <line key={i} x1={75 + 62 * Math.cos(a)} y1={75 + 62 * Math.sin(a)} x2={75 + 72 * Math.cos(a)} y2={75 + 72 * Math.sin(a)} stroke="var(--acc)" strokeWidth="3" strokeLinecap="round"/>;
  });
  return (
    <svg width={s} height={s} viewBox="0 0 150 150">
      <circle cx="75" cy="75" r="60" fill="none" stroke="color-mix(in srgb,var(--acc) 28%, transparent)" strokeWidth="1.3"/>
      {rays}
      {/* day half */}
      <path d="M75 15 A60 60 0 0 0 75 135 Z" fill="var(--acc)"/>
      {/* night half */}
      <path d="M75 15 A60 60 0 0 1 75 135 Z" fill="var(--ink2)"/>
      {/* crescent */}
      <circle cx="93" cy="74" r="25" fill="var(--acc)"/>
      <circle cx="103" cy="66" r="23" fill="var(--ink2)"/>
      {/* stars */}
      <path d="M112 96 l2.4 5 5 2.4 -5 2.4 -2.4 5 -2.4 -5 -5 -2.4 5 -2.4 Z" fill="var(--acc-hi)"/>
      <path d="M120 54 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 Z" fill="var(--acc-hi)"/>
      <line x1="75" y1="15" x2="75" y2="135" stroke="color-mix(in srgb,var(--acc) 45%, transparent)" strokeWidth="1.4"/>
    </svg>
  );
}

/* ============ 5 · MONOGRAMA PD ============ */
function EmMono({ big = true }) {
  const fs = big ? 132 : 30;
  return (
    <div style={{ position: "relative", width: big ? 168 : 46, height: big ? 124 : 36 }}>
      <span style={{ position: "absolute", left: big ? 0 : 0, top: 0, fontFamily: "Anton", fontSize: fs, lineHeight: .9,
        color: "transparent", WebkitTextStroke: (big ? 2.4 : 1.2) + "px var(--text)", transform: "skewX(-8deg)" }}>P</span>
      <span style={{ position: "absolute", left: big ? 62 : 17, top: 0, fontFamily: "Anton", fontSize: fs, lineHeight: .9,
        color: "var(--acc)", transform: "skewX(-8deg)", textShadow: "0 0 22px color-mix(in srgb,var(--acc) 55%, transparent)" }}>D</span>
      {big && <div style={{ position: "absolute", left: 50, top: 14, width: 12, height: 96, background: "var(--acc)",
        transform: "skewX(-8deg)", boxShadow: "0 0 14px var(--acc)", opacity: .9 }}></div>}
    </div>
  );
}

/* ============ 6 · ASCENSO (level up) ============ */
function EmChevron({ s = 140 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 150 150" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="36,118 75,94 114,118" stroke="var(--acc)" strokeWidth="8" opacity="0.28"/>
      <polyline points="36,90 75,66 114,90" stroke="var(--acc)" strokeWidth="8" opacity="0.58"/>
      <polyline points="36,62 75,38 114,62" stroke="var(--acc)" strokeWidth="9"/>
      <circle cx="75" cy="30" r="3.2" fill="var(--acc-hi)"/>
    </svg>
  );
}

/* ============ 7 · OJO despertar ============ */
function EmEye({ s = 146 }) {
  const r = 21, cx = 75, cy = 78;
  const penta = [0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`; }).join(" ");
  return (
    <svg width={s} height={s} viewBox="0 0 150 150">
      <path d="M26 78 Q75 36 124 78 Q75 120 26 78 Z" fill="color-mix(in srgb,var(--acc) 9%, transparent)" stroke="var(--acc)" strokeWidth="2.6" strokeLinejoin="round"/>
      <polygon points={penta} fill="color-mix(in srgb,var(--acc) 28%, transparent)" stroke="var(--acc)" strokeWidth="2"/>
      <circle cx={cx} cy={cy} r="6.5" fill="var(--ink2)"/>
      <circle cx={cx} cy={cy} r="2.6" fill="var(--acc-hi)"/>
      {/* awakening rays above */}
      <line x1="55" y1="48" x2="51" y2="38" stroke="var(--acc)" strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="75" y1="40" x2="75" y2="28" stroke="var(--acc)" strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="95" y1="48" x2="99" y2="38" stroke="var(--acc)" strokeWidth="2.4" strokeLinecap="round"/>
    </svg>
  );
}

/* ============ 8 · TORRE Tartarus ============ */
function EmTower({ s = 150 }) {
  const segs = [];
  for (let i = 0; i < 6; i++) {
    const yb = 132 - i * 17.5, yt = yb - 14.5;
    const wb = 38 - i * 5, wt = 38 - (i + 1) * 5, lean = 4;
    segs.push(
      <polygon key={i}
        points={`${75 - wb},${yb} ${75 + wb},${yb} ${75 + wt + lean},${yt} ${75 - wt + lean},${yt}`}
        fill={`color-mix(in srgb,var(--acc) ${28 + i * 12}%, var(--ink2))`}
        stroke="var(--acc)" strokeWidth="1" opacity={0.6 + i * 0.07}/>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 150 150">
      {segs}
      {/* apex shard */}
      <polygon points="75,18 84,34 70,34" fill="var(--acc-hi)"/>
      <line x1="78" y1="34" x2="86" y2="132" stroke="var(--ink2)" strokeWidth="1.2" opacity="0.45"/>
      {/* side accent */}
      <line x1="30" y1="40" x2="30" y2="128" stroke="var(--acc)" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
    </svg>
  );
}

function App() {
  return (
    <DesignCanvas>
      <DCSection id="dna" title="PersonaDays · Logo v2" subtitle="8 direcciones nuevas — fundadas en el ADN del sistema (estrella de stats, corte VOLT, shards) + iconografía Persona. Tema Makoto.">
        <DCArtboard id="star" label="F · ESTRELLA — stat charm + corte VOLT" width={360} height={460}><Card eyebrow="SÉ EL PROTAGONISTA" sub="ESTRELLA SEES" icon={<EmStar s={40} />}><EmStar /></Card></DCArtboard>
        <DCArtboard id="bfly" label="G · MARIPOSA — alma Velvet" width={360} height={460}><Card eyebrow="TRANSFORMACIÓN" sub="MARIPOSA VELVET" icon={<EmButterfly s={46} />}><EmButterfly /></Card></DCArtboard>
        <DCArtboard id="mask" label="H · MÁSCARA — dualidad del yo" width={360} height={460}><Card eyebrow="DOS CARAS · UN ALMA" sub="MÁSCARA PERSONA" icon={<EmMask s={44} />}><EmMask /></Card></DCArtboard>
        <DCArtboard id="cycle" label="I · DÍA/NOCHE — el ciclo" width={360} height={460}><Card eyebrow="CADA DÍA CUENTA" sub="CICLO DÍA · NOCHE" icon={<EmDayNight s={44} />}><EmDayNight /></Card></DCArtboard>
        <DCArtboard id="mono" label="J · MONOGRAMA — ligadura PD" width={360} height={460}><Card eyebrow="THE REAL LIFE RPG" sub="MONOGRAMA PD" glow={false} icon={<EmMono big={false} />}><EmMono /></Card></DCArtboard>
        <DCArtboard id="asc" label="K · ASCENSO — sube de nivel" width={360} height={460}><Card eyebrow="LEVEL UP YOUR LIFE" sub="ASCENSO · XP" icon={<EmChevron s={42} />}><EmChevron /></Card></DCArtboard>
        <DCArtboard id="eye" label="L · OJO — despertar" width={360} height={460}><Card eyebrow="DESPIERTA TU PERSONA" sub="OJO DEL DESPERTAR" icon={<EmEye s={44} />}><EmEye /></Card></DCArtboard>
        <DCArtboard id="tower" label="M · TORRE — Tartarus" width={360} height={460}><Card eyebrow="ESCALA TU HISTORIA" sub="TORRE · TARTARUS" icon={<EmTower s={44} />}><EmTower /></Card></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
