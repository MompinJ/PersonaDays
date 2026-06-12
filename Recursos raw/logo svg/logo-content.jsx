/* global React, DesignCanvas, DCSection, DCArtboard */
const { useState } = React;

/* ---------- shared bits ---------- */
function Wordmark({ size = 30 }) {
  return (
    <div className="lg-wm" style={{ fontSize: size }}>
      <span className="p">PERSONA</span><span className="d">DAYS</span>
    </div>
  );
}

/* persona mask glyph — angular, geometric */
function MaskGlyph({ s = 46, c = "currentColor" }) {
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
      <path d="M24 4 L40 11 L37 30 Q24 46 11 30 L8 11 Z" stroke={c} strokeWidth="2.4" strokeLinejoin="round" fill="none"/>
      <path d="M14 18 L22 16 L20 23 Z" fill={c}/>
      <path d="M34 18 L26 16 L28 23 Z" fill={c}/>
      <path d="M21 31 L24 34 L27 31" stroke={c} strokeWidth="2.2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

/* footer: app-icon proof */
function Foot({ children, sub = "ÍCONO DE APP · 1024" }) {
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

/* ===== 1 · SHARD MONOGRAM ===== */
function CardShard() {
  return (
    <div className="lg-stage">
      <div className="lg-hero">
        <div className="lg-eyebrow">THE REAL LIFE RPG</div>
        <div className="em-shard">
          <div className="em-glow"></div>
          <div className="body"></div>
          <div className="notch"></div>
          <div className="bar"></div>
          <div className="mono">P</div>
        </div>
        <Wordmark size={30} />
      </div>
      <Foot>
        <div style={{ position: "relative", width: 30, height: 32 }}>
          <div style={{ position: "absolute", inset: 0, background: "var(--acc)", clipPath: "polygon(16% 0,100% 0,84% 100%,0 100%)" }}></div>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: "Anton", fontSize: 22, color: "var(--ink-on)", transform: "skewX(-9deg)" }}>P</div>
        </div>
      </Foot>
    </div>
  );
}

/* ===== 2 · ARCANO ===== */
function CardArcano() {
  return (
    <div className="lg-stage">
      <div className="lg-hero">
        <div className="em-card">
          <div className="em-glow"></div>
          <div className="metal"></div>
          <div className="panel">
            <div className="lattice"></div>
            <div className="rom">XII</div>
            <div className="en">ARCANA · PERSONA</div>
            <div className="sigil"><MaskGlyph s={52} /></div>
            <div className="name">PERSONADAYS</div>
          </div>
          <div className="corner tl"></div><div className="corner tr"></div>
          <div className="corner bl"></div><div className="corner br"></div>
        </div>
        <Wordmark size={26} />
      </div>
      <Foot sub="CARTA · ARCANO MAYOR">
        <svg width="34" height="46" viewBox="0 0 34 46" fill="none">
          <path d="M3 4 L31 4 L31 42 L3 42 Z" stroke="var(--acc)" strokeWidth="1.6" fill="color-mix(in srgb,var(--acc) 10%, transparent)"/>
          <g transform="translate(5,11) scale(0.5)"><MaskGlyph s={48} c="var(--acc)" /></g>
        </svg>
      </Foot>
    </div>
  );
}

/* ===== 3 · PENTÁGONO STATS ===== */
function pentaPoints(cx, cy, r) {
  return [0, 1, 2, 3, 4].map(i => {
    const a = -Math.PI / 2 + i * (2 * Math.PI / 5);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}
function CardPenta() {
  const outer = pentaPoints(75, 75, 60);
  const mid = pentaPoints(75, 75, 38);
  const sample = [60, 44, 56, 34, 50]; // irregular stat web
  const inner = [0, 1, 2, 3, 4].map(i => {
    const a = -Math.PI / 2 + i * (2 * Math.PI / 5);
    const r = sample[i];
    return [75 + r * Math.cos(a), 75 + r * Math.sin(a)];
  });
  const toStr = pts => pts.map(p => p.join(",")).join(" ");
  return (
    <div className="lg-stage">
      <div className="lg-hero">
        <div className="lg-eyebrow">5 ATRIBUTOS · 1 PROTAGONISTA</div>
        <div style={{ position: "relative", width: 150, height: 150 }}>
          <div className="em-glow"></div>
          <svg width="150" height="150" viewBox="0 0 150 150" style={{ position: "relative" }}>
            <polygon points={toStr(outer)} fill="none" stroke="color-mix(in srgb,var(--acc) 38%, transparent)" strokeWidth="1.4"/>
            <polygon points={toStr(mid)} fill="none" stroke="color-mix(in srgb,var(--acc) 22%, transparent)" strokeWidth="1"/>
            {outer.map((p, i) => <line key={i} x1="75" y1="75" x2={p[0]} y2={p[1]} stroke="color-mix(in srgb,var(--acc) 18%, transparent)" strokeWidth="1"/>)}
            <polygon points={toStr(inner)} fill="color-mix(in srgb,var(--acc) 26%, transparent)" stroke="var(--acc)" strokeWidth="2"/>
            {outer.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.4" fill="var(--acc)"/>)}
            <circle cx="75" cy="75" r="5" fill="var(--ink)" stroke="var(--acc)" strokeWidth="2"/>
          </svg>
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%) skewX(-8deg)", fontFamily: "Anton", fontSize: 24, color: "var(--text)", textShadow: "0 0 14px var(--ink)" }}>P</div>
        </div>
        <Wordmark size={30} />
      </div>
      <Foot sub="PENTÁGONO DE STATS">
        <svg width="40" height="40" viewBox="0 0 40 40">
          <polygon points={toStr(pentaPoints(20, 20, 16))} fill="color-mix(in srgb,var(--acc) 18%, transparent)" stroke="var(--acc)" strokeWidth="1.8"/>
          {pentaPoints(20, 20, 16).map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="1.8" fill="var(--acc)"/>)}
        </svg>
      </Foot>
    </div>
  );
}

/* ===== 4 · LUNA / HORA OSCURA ===== */
function CardLuna() {
  return (
    <div className="lg-stage">
      <div className="lg-hero">
        <div className="lg-eyebrow">LA HORA OSCURA · 00:00</div>
        <div style={{ position: "relative", width: 150, height: 150 }}>
          <div className="em-glow"></div>
          <svg width="150" height="150" viewBox="0 0 150 150">
            <defs>
              <radialGradient id="moonG" cx="42%" cy="38%" r="64%">
                <stop offset="0%" stopColor="color-mix(in srgb,var(--acc) 55%, #EAF2FF)"/>
                <stop offset="62%" stopColor="var(--acc)"/>
                <stop offset="100%" stopColor="var(--acc2)"/>
              </radialGradient>
            </defs>
            <circle cx="75" cy="75" r="58" fill="none" stroke="color-mix(in srgb,var(--acc) 34%, transparent)" strokeWidth="1.2"/>
            <circle cx="75" cy="75" r="44" fill="url(#moonG)"/>
            {/* eclipse cut */}
            <circle cx="95" cy="62" r="40" fill="var(--ink2)" opacity="0.92"/>
            {/* craters / texture */}
            <circle cx="62" cy="84" r="6" fill="color-mix(in srgb,var(--ink) 40%, transparent)"/>
            <circle cx="56" cy="68" r="3.5" fill="color-mix(in srgb,var(--ink) 35%, transparent)"/>
            {/* clock hands to midnight */}
            <line x1="75" y1="75" x2="75" y2="44" stroke="var(--ink-on)" strokeWidth="3.2" strokeLinecap="round"/>
            <line x1="75" y1="75" x2="92" y2="62" stroke="var(--ink-on)" strokeWidth="3.2" strokeLinecap="round"/>
            <circle cx="75" cy="75" r="4" fill="var(--ink-on)"/>
            {/* tick marks */}
            {[0, 1, 2, 3].map(i => {
              const a = i * Math.PI / 2;
              return <line key={i} x1={75 + 50 * Math.cos(a)} y1={75 + 50 * Math.sin(a)} x2={75 + 56 * Math.cos(a)} y2={75 + 56 * Math.sin(a)} stroke="var(--acc)" strokeWidth="2"/>;
            })}
          </svg>
        </div>
        <Wordmark size={30} />
      </div>
      <Foot sub="LUNA · HORA OSCURA">
        <svg width="38" height="38" viewBox="0 0 38 38">
          <circle cx="19" cy="19" r="13" fill="var(--acc)"/>
          <circle cx="25" cy="14" r="11" fill="var(--ink2)"/>
          <line x1="19" y1="19" x2="19" y2="8" stroke="var(--ink-on)" strokeWidth="2" strokeLinecap="round"/>
          <line x1="19" y1="19" x2="26" y2="14" stroke="var(--ink-on)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </Foot>
    </div>
  );
}

/* ===== 5 · WORDMARK (type-led) ===== */
function CardType() {
  return (
    <div className="lg-stage">
      <div className="lg-hero">
        <div className="em-type">
          <div className="tick"></div>
          <div className="l1">PERSONA</div>
          <div className="l2wrap">
            <div className="l2bg"></div>
            <div className="l2">DAYS</div>
          </div>
        </div>
        <div className="lg-eyebrow" style={{ marginTop: 8 }}>MEMENTO MORI</div>
      </div>
      <Foot sub="MONOGRAMA PD">
        <div style={{ position: "relative", width: 40, height: 34, display: "grid", placeItems: "center" }}>
          <span style={{ fontFamily: "Anton", fontSize: 26, transform: "skewX(-9deg)", color: "var(--text)" }}>P<span style={{ color: "var(--acc)" }}>D</span></span>
        </div>
      </Foot>
    </div>
  );
}

function App() {
  return (
    <DesignCanvas>
      <DCSection id="logos" title="PersonaDays · Logo" subtitle="5 direcciones · estética P3R · tema Makoto (cyan). El nombre lleva DAYS en acento.">
        <DCArtboard id="shard" label="A · SHARD — monograma angular" width={360} height={460}><CardShard /></DCArtboard>
        <DCArtboard id="arcano" label="B · ARCANO — carta de tarot" width={360} height={460}><CardArcano /></DCArtboard>
        <DCArtboard id="penta" label="C · PENTÁGONO — 5 stats" width={360} height={460}><CardPenta /></DCArtboard>
        <DCArtboard id="luna" label="D · LUNA — hora oscura" width={360} height={460}><CardLuna /></DCArtboard>
        <DCArtboard id="type" label="E · WORDMARK — logotipo puro" width={360} height={460}><CardType /></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
