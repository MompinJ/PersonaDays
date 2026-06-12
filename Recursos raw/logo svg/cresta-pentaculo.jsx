/* global React, ReactDOM, DesignCanvas, DCSection, DCArtboard */

/* ---------- geometry ---------- */
function pentagramPath(cx, cy, r, rot = -Math.PI / 2) {
  const p = [0, 1, 2, 3, 4].map(i => [cx + r * Math.cos(rot + i * 2 * Math.PI / 5), cy + r * Math.sin(rot + i * 2 * Math.PI / 5)]);
  const order = [0, 2, 4, 1, 3];
  return "M" + order.map(i => p[i][0].toFixed(1) + "," + p[i][1].toFixed(1)).join(" L") + " Z";
}
function pentaPts(cx, cy, r, rot = -Math.PI / 2) {
  return [0, 1, 2, 3, 4].map(i => [cx + r * Math.cos(rot + i * 2 * Math.PI / 5), cy + r * Math.sin(rot + i * 2 * Math.PI / 5)]);
}
function gearPath(cx, cy, teeth, rO, rI, tf = 0.26, vf = 0.3) {
  let d = ""; const seg = Math.PI * 2 / teeth, tw = seg * tf, vw = seg * vf;
  const f = q => q[0].toFixed(1) + "," + q[1].toFixed(1);
  for (let i = 0; i < teeth; i++) {
    const a = i * seg - Math.PI / 2;
    const p1 = [cx + rO * Math.cos(a - tw), cy + rO * Math.sin(a - tw)];
    const p2 = [cx + rO * Math.cos(a + tw), cy + rO * Math.sin(a + tw)];
    const vm = a + seg / 2;
    const p3 = [cx + rI * Math.cos(vm - vw), cy + rI * Math.sin(vm - vw)];
    const p4 = [cx + rI * Math.cos(vm + vw), cy + rI * Math.sin(vm + vw)];
    d += (i === 0 ? "M" : "L") + f(p1) + " L" + f(p2) + " L" + f(p3) + " L" + f(p4) + " ";
  }
  return d + "Z";
}

/* ---------- shared ---------- */
function Wordmark() { return <div className="lg-wm"><span className="p">PERSONA</span><span className="d">DAYS</span></div>; }
function Foot({ children, sub }) {
  return (
    <div className="lg-foot">
      <div className="lg-squircle">{children}</div>
      <div className="lg-foot-txt"><div className="lg-foot-lab">PersonaDays</div><div className="lg-foot-sub">{sub}</div></div>
    </div>
  );
}
function Card({ eyebrow, sub, children, icon }) {
  return (
    <div className="lg-stage">
      <div className="lg-hero">
        <div className="lg-eyebrow">{eyebrow}</div>
        <div className="em-wrap em-glow">{children}</div>
        <Wordmark />
      </div>
      <Foot sub={sub}>{icon}</Foot>
    </div>
  );
}

/* ====================================================================
   A · SELLO ARCANO — engrane de 12 dientes + pentagrama inscrito
   ==================================================================== */
function SealA({ s = 150, spin = true }) {
  return (
    <svg width={s} height={s} viewBox="0 0 150 150">
      <g className={spin ? "em-spin" : ""} style={{ transformOrigin: "75px 75px" }}>
        <path d={gearPath(75, 75, 12, 65, 54)} fill="var(--acc-lo)" stroke="var(--acc)" strokeWidth="1.4"/>
      </g>
      <circle cx="75" cy="75" r="49" fill="var(--ink2)" stroke="var(--acc)" strokeWidth="1.8"/>
      <circle cx="75" cy="75" r="43" fill="none" stroke="color-mix(in srgb,var(--acc) 28%, transparent)" strokeWidth="1"/>
      <circle cx="75" cy="75" r="43" fill="none" stroke="var(--acc)" strokeWidth="0.8" strokeDasharray="1.5 6" opacity="0.6"/>
      <path d={pentagramPath(75, 75, 41)} fill="color-mix(in srgb,var(--acc) 14%, transparent)" stroke="var(--acc)" strokeWidth="2.2" strokeLinejoin="round"/>
      {pentaPts(75, 75, 41).map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.2" fill="var(--acc-hi)"/>)}
      <circle cx="75" cy="75" r="5" fill="var(--ink2)" stroke="var(--acc)" strokeWidth="1.4"/>
      <circle cx="75" cy="75" r="1.8" fill="var(--acc-hi)"/>
    </svg>
  );
}

/* ====================================================================
   B · MEDALLÓN PENTA — engrane de 10 dientes (simetría 5) + pentagrama
   sólido con corte VOLT + shards en los vértices
   ==================================================================== */
function SealB({ s = 150 }) {
  const verts = pentaPts(75, 75, 39);
  return (
    <svg width={s} height={s} viewBox="0 0 150 150">
      <defs><clipPath id="pgB"><path d={pentagramPath(75, 75, 39)}/></clipPath></defs>
      <path d={gearPath(75, 75, 10, 64, 50, 0.3, 0.32)} fill="color-mix(in srgb,var(--acc) 22%, var(--ink2))" stroke="var(--acc)" strokeWidth="1.6"/>
      <circle cx="75" cy="75" r="47" fill="none" stroke="color-mix(in srgb,var(--acc) 32%, transparent)" strokeWidth="5" opacity="0.5"/>
      <circle cx="75" cy="75" r="44" fill="var(--ink2)" stroke="var(--acc)" strokeWidth="1.6"/>
      <path d={pentagramPath(75, 75, 39)} fill="color-mix(in srgb,var(--acc) 26%, transparent)" stroke="var(--acc)" strokeWidth="2.4" strokeLinejoin="round"/>
      <g clipPath="url(#pgB)">
        <path d="M58,-2 L63,-2 L40,152 L35,152 Z" fill="var(--ink2)" opacity="0.8"/>
        <path d="M92,-2 L96,-2 L73,152 L69,152 Z" fill="var(--ink2)" opacity="0.8"/>
      </g>
      {verts.map((p, i) => <rect key={i} x={p[0] - 4} y={p[1] - 4} width="8" height="8" fill="var(--acc-hi)" transform={`rotate(45 ${p[0]} ${p[1]})`}/>)}
      <circle cx="75" cy="75" r="4" fill="var(--ink2)"/>
    </svg>
  );
}

/* ====================================================================
   C · RUEDA RITUAL — anillo con marcas tipo reloj/zodiaco + pentagrama
   de doble trazo + pentágono interior invertido
   ==================================================================== */
function SealC({ s = 150, spin = true }) {
  const ticks = [];
  for (let i = 0; i < 30; i++) {
    const a = i * Math.PI / 15, big = i % 6 === 0;
    const r1 = big ? 56 : 60, r2 = 65;
    ticks.push(<line key={i} x1={75 + r1 * Math.cos(a)} y1={75 + r1 * Math.sin(a)} x2={75 + r2 * Math.cos(a)} y2={75 + r2 * Math.sin(a)}
      stroke="var(--acc)" strokeWidth={big ? 2.2 : 1} opacity={big ? 0.95 : 0.5}/>);
  }
  return (
    <svg width={s} height={s} viewBox="0 0 150 150">
      <circle cx="75" cy="75" r="66" fill="none" stroke="var(--acc)" strokeWidth="2"/>
      <g className={spin ? "em-spin" : ""} style={{ transformOrigin: "75px 75px" }}>{ticks}</g>
      <circle cx="75" cy="75" r="50" fill="var(--ink2)" stroke="color-mix(in srgb,var(--acc) 45%, transparent)" strokeWidth="1.4"/>
      <polygon points={pentaPts(75, 75, 46, Math.PI / 2).map(p => p.join(",")).join(" ")} fill="none" stroke="color-mix(in srgb,var(--acc) 30%, transparent)" strokeWidth="1.2"/>
      <path d={pentagramPath(75, 75, 46)} fill="color-mix(in srgb,var(--acc) 12%, transparent)" stroke="var(--acc)" strokeWidth="2.6" strokeLinejoin="round"/>
      <path d={pentagramPath(75, 75, 46)} fill="none" stroke="var(--acc-hi)" strokeWidth="0.7" strokeLinejoin="round" opacity="0.6"/>
      {pentaPts(75, 75, 46).map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.6" fill="var(--acc-hi)"/>)}
      <circle cx="75" cy="75" r="3.4" fill="var(--acc)"/>
    </svg>
  );
}

function App() {
  return (
    <DesignCanvas>
      <DCSection id="fusion" title="PersonaDays · Cresta × Pentáculo" subtitle="El pentagrama arcana dentro del marco mecánico/heráldico de la cresta SEES. 3 tratamientos. El anillo gira lento en vivo. Tema Makoto.">
        <DCArtboard id="seal" label="A · SELLO ARCANO — engrane + pentagrama" width={360} height={460}>
          <Card eyebrow="EL CONTRATO · SEES" sub="SELLO ARCANO" icon={<SealA s={46} spin={false} />}><SealA /></Card>
        </DCArtboard>
        <DCArtboard id="medal" label="B · MEDALLÓN — simetría 5 + corte VOLT" width={360} height={460}>
          <Card eyebrow="VÍNCULO · ARCANA" sub="MEDALLÓN PENTA" icon={<SealB s={46} />}><SealB /></Card>
        </DCArtboard>
        <DCArtboard id="wheel" label="C · RUEDA RITUAL — marcas + doble trazo" width={360} height={460}>
          <Card eyebrow="LA RUEDA DEL DESTINO" sub="RUEDA RITUAL" icon={<SealC s={46} spin={false} />}><SealC /></Card>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
