/* global React, ReactDOM, DesignCanvas, DCSection, DCArtboard */

/* ---------- geometry helpers ---------- */
function starPath(cx, cy, ro, ri, pts = 5, rot = -Math.PI / 2) {
  let d = "";
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = rot + i * Math.PI / pts;
    d += (i === 0 ? "M" : "L") + (cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1) + " ";
  }
  return d + "Z";
}
function pentagramPath(cx, cy, r, rot = -Math.PI / 2) {
  const p = [0, 1, 2, 3, 4].map(i => [cx + r * Math.cos(rot + i * 2 * Math.PI / 5), cy + r * Math.sin(rot + i * 2 * Math.PI / 5)]);
  const order = [0, 2, 4, 1, 3];
  return "M" + order.map(i => p[i][0].toFixed(1) + "," + p[i][1].toFixed(1)).join(" L") + " Z";
}
function gearPath(cx, cy, teeth, rO, rI) {
  let d = ""; const seg = Math.PI * 2 / teeth, tw = seg * 0.26, vw = seg * 0.3;
  for (let i = 0; i < teeth; i++) {
    const a = i * seg - Math.PI / 2;
    const p1 = [cx + rO * Math.cos(a - tw), cy + rO * Math.sin(a - tw)];
    const p2 = [cx + rO * Math.cos(a + tw), cy + rO * Math.sin(a + tw)];
    const vm = a + seg / 2;
    const p3 = [cx + rI * Math.cos(vm - vw), cy + rI * Math.sin(vm - vw)];
    const p4 = [cx + rI * Math.cos(vm + vw), cy + rI * Math.sin(vm + vw)];
    const f = q => q[0].toFixed(1) + "," + q[1].toFixed(1);
    d += (i === 0 ? "M" : "L") + f(p1) + " L" + f(p2) + " L" + f(p3) + " L" + f(p4) + " ";
  }
  return d + "Z";
}

/* ---------- shared ---------- */
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

/* ===== 1 · CALENDARIO ===== */
function EmCal({ s = 138 }) {
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const x = 44 + c * 22, y = 70 + r * 20, on = r === 1 && c === 1;
    cells.push(<rect key={r + "" + c} x={x} y={y} width="14" height="13" rx="1.5"
      fill={on ? "var(--acc)" : "none"} stroke={on ? "none" : "color-mix(in srgb,var(--acc) 30%, transparent)"} strokeWidth="1.4"/>);
  }
  return (
    <svg width={s} height={s} viewBox="0 0 150 150">
      <g transform="skewX(-7) translate(10 0)">
        {/* binding tabs */}
        <rect x="50" y="26" width="8" height="18" rx="3" fill="var(--acc-lo)"/>
        <rect x="92" y="26" width="8" height="18" rx="3" fill="var(--acc-lo)"/>
        {/* card */}
        <rect x="32" y="36" width="86" height="92" rx="3" fill="var(--ink2)" stroke="var(--acc)" strokeWidth="2.4"/>
        {/* header */}
        <rect x="32" y="36" width="86" height="20" rx="3" fill="var(--acc)"/>
        <rect x="40" y="44" width="20" height="4" rx="2" fill="var(--ink-on)" opacity="0.5"/>
        {cells}
        {/* check on highlighted day */}
        <path d="M62 88 l3 3 6 -7" stroke="var(--ink-on)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
}

/* ===== 2 · LLAVE VELVET ===== */
function EmKey({ s = 140 }) {
  const bow = [0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return `${75 + 22 * Math.cos(a)},${44 + 22 * Math.sin(a)}`; }).join(" ");
  const bowIn = [0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return `${75 + 11 * Math.cos(a)},${44 + 11 * Math.sin(a)}`; }).join(" ");
  return (
    <svg width={s} height={s} viewBox="0 0 150 150">
      <g transform="rotate(18 75 78)">
        <polygon points={bow} fill="color-mix(in srgb,var(--acc) 16%, var(--ink2))" stroke="var(--acc)" strokeWidth="2.6" strokeLinejoin="round"/>
        <polygon points={bowIn} fill="none" stroke="var(--acc-hi)" strokeWidth="1.4"/>
        {/* shaft */}
        <rect x="71" y="64" width="8" height="54" fill="var(--acc)"/>
        {/* collar */}
        <rect x="66" y="74" width="18" height="6" rx="1" fill="var(--acc-hi)"/>
        {/* teeth */}
        <rect x="79" y="100" width="11" height="7" fill="var(--acc)"/>
        <rect x="79" y="111" width="7" height="7" fill="var(--acc)"/>
        <circle cx="75" cy="44" r="4" fill="var(--acc-hi)"/>
      </g>
    </svg>
  );
}

/* ===== 3 · CRESTA SEES (gear + star) ===== */
function EmCrest({ s = 146 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 150 150">
      <path d={gearPath(75, 75, 12, 64, 52)} fill="var(--acc-lo)" stroke="var(--acc)" strokeWidth="1.4"/>
      <circle cx="75" cy="75" r="46" fill="var(--ink2)" stroke="var(--acc)" strokeWidth="1.6"/>
      <circle cx="75" cy="75" r="46" fill="none" stroke="color-mix(in srgb,var(--acc) 30%, transparent)" strokeWidth="6" opacity="0.4"/>
      <path d={starPath(75, 75, 30, 13)} fill="var(--acc)" stroke="var(--acc-hi)" strokeWidth="0.8"/>
      <circle cx="75" cy="75" r="5" fill="var(--ink2)"/>
    </svg>
  );
}

/* ===== 4 · RELOJ DE ARENA ===== */
function EmHour({ s = 132 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 150 150">
      <rect x="42" y="26" width="66" height="8" rx="2" fill="var(--acc)"/>
      <rect x="42" y="116" width="66" height="8" rx="2" fill="var(--acc)"/>
      {/* glass */}
      <path d="M50 38 L100 38 L75 78 Z" fill="color-mix(in srgb,var(--acc) 10%, transparent)" stroke="var(--acc)" strokeWidth="2.4" strokeLinejoin="round"/>
      <path d="M75 78 L100 112 L50 112 Z" fill="color-mix(in srgb,var(--acc) 10%, transparent)" stroke="var(--acc)" strokeWidth="2.4" strokeLinejoin="round"/>
      {/* sand */}
      <path d="M61 50 L89 50 L75 72 Z" fill="var(--acc)"/>
      <path d="M58 112 L92 112 L83 100 L67 100 Z" fill="var(--acc)"/>
      <line x1="75" y1="80" x2="75" y2="104" stroke="var(--acc-hi)" strokeWidth="2" strokeDasharray="1 4" strokeLinecap="round"/>
    </svg>
  );
}

/* ===== 5 · PENTÁCULO arcana ===== */
function EmPentacle({ s = 144 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 150 150">
      <circle cx="75" cy="75" r="62" fill="none" stroke="var(--acc)" strokeWidth="2"/>
      <circle cx="75" cy="75" r="54" fill="none" stroke="color-mix(in srgb,var(--acc) 30%, transparent)" strokeWidth="1"/>
      <path d={pentagramPath(75, 75, 50)} fill="color-mix(in srgb,var(--acc) 14%, transparent)" stroke="var(--acc)" strokeWidth="2.2" strokeLinejoin="round"/>
      {[0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return <circle key={i} cx={75 + 50 * Math.cos(a)} cy={75 + 50 * Math.sin(a)} r="3.2" fill="var(--acc-hi)"/>; })}
    </svg>
  );
}

/* ===== 6 · RANGO / INSIGNIA ===== */
function EmRank({ big = true }) {
  const sc = big ? 1 : 0.34;
  return (
    <div style={{ position: "relative", width: 150 * sc, height: 150 * sc, display: "grid", placeItems: "center" }}>
      <svg width={150 * sc} height={150 * sc} viewBox="0 0 150 150" style={{ position: "absolute", inset: 0 }} className={big ? "" : ""}>
        <polygon points="75,20 120,42 120,98 75,130 30,98 30,42" fill="var(--ink2)" stroke="var(--acc)" strokeWidth="2.6" strokeLinejoin="round"/>
        <polygon points="75,28 112,46 112,94 75,120 38,94 38,46" fill="none" stroke="color-mix(in srgb,var(--acc) 35%, transparent)" strokeWidth="1.4"/>
      </svg>
      {big && <div style={{ position: "absolute", top: "34%", left: 0, right: 0, textAlign: "center", fontFamily: "Anton", fontSize: 44, color: "var(--acc)", transform: "skewX(-8deg)", textShadow: "0 0 20px color-mix(in srgb,var(--acc) 55%, transparent)", lineHeight: 1 }}>X</div>}
      {big && <div style={{ position: "absolute", top: "62%", left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4 }}>
        {[0, 1, 2, 3, 4].map(i => <span key={i} style={{ width: 8, height: 8, background: i < 3 ? "var(--acc)" : "transparent", border: "1.2px solid var(--acc)", transform: "rotate(45deg)", display: "block" }}></span>)}
      </div>}
      {!big && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: "Anton", fontSize: 18, color: "var(--acc)", transform: "skewX(-8deg)" }}>X</div>}
    </div>
  );
}

/* ===== 7 · CONSTELACIÓN (P) ===== */
function EmConst({ s = 146 }) {
  const nodes = [[52, 32], [52, 72], [52, 116], [86, 36], [98, 56], [82, 74], [52, 70]];
  const path = "M52,116 L52,72 L52,32 L86,36 L98,56 L82,74 L52,70";
  const bgStars = [[110, 30], [120, 90], [34, 50], [40, 110], [108, 118], [95, 100]];
  return (
    <svg width={s} height={s} viewBox="0 0 150 150">
      {bgStars.map((p, i) => <circle key={"b" + i} cx={p[0]} cy={p[1]} r={1.4 + (i % 2)} fill="color-mix(in srgb,var(--acc) 45%, transparent)"/>)}
      <path d={path} fill="none" stroke="var(--acc)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" opacity="0.85"/>
      {nodes.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === 0 ? 4.5 : 3.2} fill={i === 0 ? "var(--acc-hi)" : "var(--acc)"}/>)}
      {/* north star glint */}
      <path d="M52 22 l1.6 7 7 1.6 -7 1.6 -1.6 7 -1.6 -7 -7 -1.6 7 -1.6 Z" fill="var(--acc-hi)" transform="translate(0 4)"/>
    </svg>
  );
}

/* ===== 8 · LETTERMARK P (autor) ===== */
function EmLetter({ big = true }) {
  const fs = big ? 168 : 30;
  return (
    <div style={{ position: "relative", width: big ? 130 : 40, height: big ? 140 : 40, display: "grid", placeItems: "center" }}>
      <span style={{ fontFamily: "Anton", fontSize: fs, lineHeight: .82, transform: "skewX(-9deg)",
        background: "linear-gradient(150deg, var(--acc-hi), var(--acc) 45%, var(--acc2))",
        WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
        filter: "drop-shadow(0 4px 0 rgba(0,0,0,.45))" }}>P</span>
      {big && <>
        {/* volt cut slashes */}
        <div style={{ position: "absolute", left: "34%", top: "-6%", width: 7, height: "112%", background: "var(--ink2)", transform: "rotate(20deg)", opacity: .85 }}></div>
        <div style={{ position: "absolute", left: "52%", top: "-6%", width: 5, height: "112%", background: "var(--ink2)", transform: "rotate(20deg)", opacity: .85 }}></div>
        {/* corner shards */}
        <span style={{ position: "absolute", left: "8%", top: "6%", width: 9, height: 9, background: "var(--acc-hi)", transform: "rotate(45deg)", boxShadow: "0 0 8px var(--acc)" }}></span>
        <span style={{ position: "absolute", right: "6%", bottom: "10%", width: 9, height: 9, background: "var(--acc-hi)", transform: "rotate(45deg)", boxShadow: "0 0 8px var(--acc)" }}></span>
      </>}
    </div>
  );
}

function App() {
  return (
    <DesignCanvas>
      <DCSection id="v3" title="PersonaDays · Logo v3" subtitle="8 ideas nuevas — calendario, llave Velvet, cresta SEES, reloj de arena, pentáculo, insignia, constelación y lettermark de autor. Tema Makoto.">
        <DCArtboard id="cal" label="N · CALENDARIO — cada día cuenta" width={360} height={460}><Card eyebrow="UN DÍA, UNA MISIÓN" sub="CALENDARIO" glow={false} icon={<EmCal s={44} />}><EmCal /></Card></DCArtboard>
        <DCArtboard id="key" label="O · LLAVE — Velvet Room" width={360} height={460}><Card eyebrow="ABRE TU POTENCIAL" sub="LLAVE VELVET" icon={<EmKey s={44} />}><EmKey /></Card></DCArtboard>
        <DCArtboard id="crest" label="P · CRESTA — emblema SEES" width={360} height={460}><Card eyebrow="ESCUADRÓN · SEES" sub="CRESTA SEES" icon={<EmCrest s={46} />}><EmCrest /></Card></DCArtboard>
        <DCArtboard id="hour" label="Q · RELOJ DE ARENA — el tiempo" width={360} height={460}><Card eyebrow="EL TIEMPO NO ESPERA" sub="RELOJ DE ARENA" icon={<EmHour s={42} />}><EmHour /></Card></DCArtboard>
        <DCArtboard id="pent" label="R · PENTÁCULO — arcana" width={360} height={460}><Card eyebrow="EL CONTRATO" sub="PENTÁCULO ARCANA" icon={<EmPentacle s={44} />}><EmPentacle /></Card></DCArtboard>
        <DCArtboard id="rank" label="S · INSIGNIA — rango de vínculo" width={360} height={460}><Card eyebrow="SUBE DE RANGO" sub="INSIGNIA · RANK" glow={false} icon={<EmRank big={false} />}><EmRank /></Card></DCArtboard>
        <DCArtboard id="const" label="T · CONSTELACIÓN — traza tu historia" width={360} height={460}><Card eyebrow="DÍAS Y NOCHES" sub="CONSTELACIÓN" icon={<EmConst s={44} />}><EmConst /></Card></DCArtboard>
        <DCArtboard id="letter" label="U · LETTERMARK — «P» de autor" width={360} height={460}><Card eyebrow="THE REAL LIFE RPG" sub="LETTERMARK P" glow={false} icon={<EmLetter big={false} />}><EmLetter /></Card></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
