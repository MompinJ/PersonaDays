/* global React, ReactDOM, useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakRadio, TweakSelect */
const { useState, useEffect, useRef } = React;

/* ---------- character themes (P3R · de palettes.ts) ---------- */
const THEMES = {
  MAKOTO:   { acc:"#00D4FF", acc2:"#0E80B8", ink:"#0A1628", surface:"#12243D", text:"#EAF2FF", dim:"#7E90BC", on:"#04131A", glow:"rgba(0,212,255,.32)", tag:"MEMENTO MORI" },
  KOTONE:   { acc:"#FF5E7D", acc2:"#FF9EB5", ink:"#2B0A12", surface:"#3E121E", text:"#FFF0F3", dim:"#D4A5A5", on:"#2B0A12", glow:"rgba(255,94,125,.34)", tag:"CARPE DIEM" },
  YUKARI:   { acc:"#EF96D0", acc2:"#F451FF", ink:"#2F002A", surface:"#3D2A35", text:"#F6E6EC", dim:"#ED9593", on:"#2F002A", glow:"rgba(239,150,208,.36)", tag:"I WON'T LOSE" },
  AKIHIKO:  { acc:"#E11323", acc2:"#9B2730", ink:"#14161A", surface:"#2B3238", text:"#FFFFFF", dim:"#AEB8C0", on:"#FFFFFF", glow:"rgba(225,19,35,.36)", tag:"BRING IT ON" },
  MITSURU:  { acc:"#E60063", acc2:"#9D0070", ink:"#1F0126", surface:"#3A0030", text:"#FAFDF9", dim:"#B79FB7", on:"#FFFFFF", glow:"rgba(230,0,99,.38)", tag:"EXECUTE" },
  SHINJIRO: { acc:"#F4413F", acc2:"#DDCEA7", ink:"#0A0712", surface:"#1A0505", text:"#E7DABA", dim:"#B0808A", on:"#FFFFFF", glow:"rgba(244,65,63,.32)", tag:"NO REGRETS" },
  KEN:      { acc:"#F07E25", acc2:"#F1B63E", ink:"#1B120C", surface:"#43372B", text:"#EFE7DC", dim:"#D0A079", on:"#1B120C", glow:"rgba(240,126,37,.36)", tag:"NOT A KID" },
  FUUKA:    { acc:"#12FEB9", acc2:"#41DEC3", ink:"#06181C", surface:"#0C282E", text:"#C8FFEF", dim:"#5C9097", on:"#04131A", glow:"rgba(18,254,185,.34)", tag:"I SEE EVERYTHING" },
  JUNPEI:   { acc:"#F5A623", acc2:"#4A90E2", ink:"#121921", surface:"#1E2A38", text:"#FFFFFF", dim:"#8CA0B3", on:"#1B120C", glow:"rgba(245,166,35,.36)", tag:"BRING IT, BIG TIME" },
  AIGIS:    { acc:"#FFE600", acc2:"#00D4FF", ink:"#15152A", surface:"#252540", text:"#FFFFFF", dim:"#B0B0C0", on:"#101019", glow:"rgba(255,230,0,.34)", tag:"I WILL PROTECT YOU" },
};
const ROSTER = Object.keys(THEMES);
const TAGLINES = ["MEMENTO MORI", "THE REAL LIFE RPG", "CARPE DIEM", "LEMA DEL PERSONAJE"];

/* ---------- geometry ---------- */
function pentagramPath(cx, cy, r, rot = -Math.PI / 2) {
  const p = [0,1,2,3,4].map(i => [cx + r*Math.cos(rot+i*2*Math.PI/5), cy + r*Math.sin(rot+i*2*Math.PI/5)]);
  const o = [0,2,4,1,3];
  return "M" + o.map(i => p[i][0].toFixed(1)+","+p[i][1].toFixed(1)).join(" L") + " Z";
}
function pentaPts(cx, cy, r, rot = -Math.PI / 2) {
  return [0,1,2,3,4].map(i => [cx + r*Math.cos(rot+i*2*Math.PI/5), cy + r*Math.sin(rot+i*2*Math.PI/5)]);
}

/* ---------- emblems ---------- */
function Emblem({ kind }) {
  if (kind === "rueda") {
    const ticks = [];
    for (let i=0;i<30;i++){
      const a=i*Math.PI/15, big=i%6===0, r1=big?56:60, r2=65;
      ticks.push(<line key={i} x1={75+r1*Math.cos(a)} y1={75+r1*Math.sin(a)} x2={75+r2*Math.cos(a)} y2={75+r2*Math.sin(a)} stroke="var(--acc)" strokeWidth={big?2.2:1} opacity={big?0.95:0.5}/>);
    }
    return (
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r="66" fill="none" stroke="var(--acc)" strokeWidth="2"/>
        <g className="rueda-spin">{ticks}</g>
        <circle cx="75" cy="75" r="50" fill="var(--ink2)" stroke="color-mix(in srgb,var(--acc) 45%, transparent)" strokeWidth="1.4"/>
        <polygon points={pentaPts(75,75,46,Math.PI/2).map(p=>p.join(",")).join(" ")} fill="none" stroke="color-mix(in srgb,var(--acc) 30%, transparent)" strokeWidth="1.2"/>
        <path d={pentagramPath(75,75,46)} fill="color-mix(in srgb,var(--acc) 12%, transparent)" stroke="var(--acc)" strokeWidth="2.6" strokeLinejoin="round"/>
        <path d={pentagramPath(75,75,46)} fill="none" stroke="var(--acc-hi)" strokeWidth="0.7" strokeLinejoin="round" opacity="0.6"/>
        {pentaPts(75,75,46).map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="2.6" fill="var(--acc-hi)"/>)}
        <circle cx="75" cy="75" r="3.4" fill="var(--acc)"/>
      </svg>
    );
  }
  if (kind === "luna") {
    return (
      <svg width="138" height="138" viewBox="0 0 150 150">
        <defs>
          <radialGradient id="mg" cx="42%" cy="38%" r="64%">
            <stop offset="0%" stopColor="var(--acc-hi)"/>
            <stop offset="60%" stopColor="var(--acc)"/>
            <stop offset="100%" stopColor="var(--acc2)"/>
          </radialGradient>
        </defs>
        <circle cx="75" cy="75" r="60" fill="none" stroke="color-mix(in srgb,var(--acc) 32%, transparent)" strokeWidth="1.2"/>
        <circle cx="75" cy="75" r="46" fill="url(#mg)"/>
        <circle cx="96" cy="61" r="42" fill="var(--ink2)" opacity="0.94"/>
        <line x1="75" y1="75" x2="75" y2="42" stroke="var(--ink-on)" strokeWidth="3.4" strokeLinecap="round"/>
        <line x1="75" y1="75" x2="94" y2="61" stroke="var(--ink-on)" strokeWidth="3.4" strokeLinecap="round"/>
        <circle cx="75" cy="75" r="4.4" fill="var(--ink-on)"/>
        {[0,1,2,3].map(i=>{const a=i*Math.PI/2;return <line key={i} x1={75+52*Math.cos(a)} y1={75+52*Math.sin(a)} x2={75+59*Math.cos(a)} y2={75+59*Math.sin(a)} stroke="var(--acc)" strokeWidth="2.2"/>;})}
      </svg>
    );
  }
  if (kind === "penta") {
    const pts = (r)=>[0,1,2,3,4].map(i=>{const a=-Math.PI/2+i*2*Math.PI/5;return [75+r*Math.cos(a),75+r*Math.sin(a)];});
    const web = [60,44,56,36,52].map((r,i)=>{const a=-Math.PI/2+i*2*Math.PI/5;return [75+r*Math.cos(a),75+r*Math.sin(a)];});
    const str = a=>a.map(p=>p.join(",")).join(" ");
    return (
      <div style={{ position:"relative", width:138, height:138 }}>
        <svg width="138" height="138" viewBox="0 0 150 150">
          <polygon points={str(pts(62))} fill="none" stroke="color-mix(in srgb,var(--acc) 36%, transparent)" strokeWidth="1.4"/>
          <polygon points={str(pts(40))} fill="none" stroke="color-mix(in srgb,var(--acc) 20%, transparent)" strokeWidth="1"/>
          {pts(62).map((p,i)=><line key={i} x1="75" y1="75" x2={p[0]} y2={p[1]} stroke="color-mix(in srgb,var(--acc) 16%, transparent)" strokeWidth="1"/>)}
          <polygon points={str(web)} fill="color-mix(in srgb,var(--acc) 26%, transparent)" stroke="var(--acc)" strokeWidth="2"/>
          {pts(62).map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="3.4" fill="var(--acc)"/>)}
        </svg>
        <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%) skewX(-8deg)", fontFamily:"Anton", fontSize:26, color:"var(--text)", textShadow:"0 0 14px var(--ink)" }}>P</div>
      </div>
    );
  }
  /* shard (default) */
  return (
    <div className="em-shard">
      <div className="body"></div>
      <div className="notch"></div>
      <div className="mono">P</div>
    </div>
  );
}

/* ---------- rotating background sigil ---------- */
function Sigil() {
  const pts = (r)=>[0,1,2,3,4].map(i=>{const a=-Math.PI/2+i*2*Math.PI/5;return `${260+r*Math.cos(a)},${260+r*Math.sin(a)}`;}).join(" ");
  return (
    <svg className="ring" viewBox="0 0 520 520" fill="none" stroke="var(--acc)" strokeWidth="1.4">
      <circle cx="260" cy="260" r="250"/>
      <circle cx="260" cy="260" r="200"/>
      <polygon points={pts(250)}/>
      <polygon points={pts(170)} transform="rotate(36 260 260)"/>
    </svg>
  );
}

/* ---------- percentage with tenue leading zeros ---------- */
function Pct({ v }) {
  const s = String(v).padStart(3, "0");
  const firstReal = s.search(/[1-9]/);
  return (
    <div className="ld-pct">
      {s.split("").map((c, i) => (
        <span key={i} className={firstReal === -1 ? (i < 2 ? "z" : "") : (i < firstReal ? "z" : "")}>{c}</span>
      ))}
      <span className="s">%</span>
    </div>
  );
}

const PHASES = [
  [0,   "ESTABLECIENDO VÍNCULO"],
  [22,  "SINCRONIZANDO ARCANOS"],
  [48,  "INVOCANDO PERSONA"],
  [72,  "ENTRANDO A LA HORA OSCURA"],
  [94,  "BIENVENIDO, PROTAGONISTA"],
];
function phaseFor(v){ let t=PHASES[0][1]; for(const [p,l] of PHASES){ if(v>=p) t=l; } return t; }

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "character": "MAKOTO",
  "motif": "rueda",
  "tagline": "MEMENTO MORI",
  "speed": 4.5,
  "speedlines": true,
  "watermark": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const th = THEMES[t.character] || THEMES.MAKOTO;
  const [pct, setPct] = useState(0);
  const [reveal, setReveal] = useState(false);

  /* apply theme tokens to #stage */
  useEffect(() => {
    const st = document.getElementById("stage");
    const set = (k,v)=>st.style.setProperty(k,v);
    set("--acc", th.acc); set("--acc2", th.acc2);
    set("--acc-lo", `color-mix(in srgb, ${th.acc} 52%, #000)`);
    set("--acc-hi", `color-mix(in srgb, ${th.acc} 50%, #fff)`);
    set("--ink", th.ink);
    set("--ink2", `color-mix(in srgb, ${th.ink} 66%, #000)`);
    set("--surface", th.surface); set("--text", th.text); set("--dim", th.dim);
    set("--faint", `color-mix(in srgb, ${th.dim} 46%, ${th.ink})`);
    set("--ink-on", th.on); set("--glow", th.glow);
  }, [th]);

  /* entrance */
  useEffect(() => { const id = setTimeout(() => setReveal(true), 80); return () => clearTimeout(id); }, []);

  /* loading loop */
  useEffect(() => {
    let raf, start = null, hold = 0;
    const dur = Math.max(1.4, t.speed) * 1000;
    const step = (ts) => {
      if (start == null) start = ts;
      const e = ts - start;
      if (e <= dur) { setPct(Math.min(100, Math.round((e / dur) * 100))); }
      else { setPct(100); hold += 16; if (hold > 850) { start = ts; hold = 0; } }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [t.speed, t.character]);

  const tag = t.tagline === "LEMA DEL PERSONAJE" ? th.tag : t.tagline;
  const delay = (i) => ({ animationDelay: `${0.12 + i * 0.13}s` });

  return (
    <React.Fragment>
      <div className="bg">
        {t.watermark && <div className="wm-rom">III</div>}
        {t.motif !== "rueda" && <Sigil />}
        {t.speedlines && [0,1,2,3,4,5].map(i => (
          <div key={i} className="speed" style={{ top: `${10 + i * 15}%`, animationDuration: `${6 + i * 1.4}s`, animationDelay: `${-i * 1.1}s`, opacity: 0.18 + (i % 3) * 0.12 }}></div>
        ))}
      </div>

      <div className="sees skb"><span className="bar"></span><span className="uskb">SEES · NIGHT OPS</span></div>
      <div className="ver">VER 3.0</div>

      <div className={"center" + (reveal ? " reveal" : "")}>
        <div className="eyebrow seq" style={delay(0)}><span className="tick"></span>THE REAL LIFE RPG<span className="tick"></span></div>
        <div className="emblem seq" style={delay(1)}>
          <div className="halo"></div>
          <Emblem kind={t.motif} />
        </div>
        <div className="wordmark seq" style={delay(2)}><span className="p">PERSONA</span><span className="d">DAYS</span></div>
        <div className="tagline seq" style={delay(3)}><span className="ln"></span>{tag}<span className="ln"></span></div>
      </div>

      <div className={"loader" + (reveal ? " reveal" : "")}>
        <div className="ld-top seq" style={delay(4)}>
          <div className="ld-now"><span className="dot"></span><span>NOW LOADING</span></div>
          <Pct v={pct} />
        </div>
        <div className="ld-track seq" style={delay(4)}>
          <div className="ld-fill" style={{ width: pct + "%" }}></div>
          <div className="ld-ticks">{[...Array(10)].map((_, i) => <i key={i}></i>)}</div>
        </div>
        <div className="ld-sub seq" style={delay(4)}>
          <span className="hint">{phaseFor(pct)}</span>
          <span>{t.character} · SEES</span>
        </div>
      </div>

      {ReactDOM.createPortal(
        <TweaksPanel>
          <TweakSection label="Protagonista" />
          <TweakSelect label="Personaje (tema)" value={t.character} options={ROSTER}
            onChange={(v) => setTweak("character", v)} />
          <TweakSection label="Identidad" />
          <TweakSelect label="Emblema" value={t.motif} options={["rueda", "shard", "luna", "penta"]}
            onChange={(v) => setTweak("motif", v)} />
          <TweakSelect label="Tagline" value={t.tagline} options={TAGLINES}
            onChange={(v) => setTweak("tagline", v)} />
          <TweakSection label="Movimiento" />
          <TweakSlider label="Duración de carga" value={t.speed} min={2} max={8} step={0.5} unit="s"
            onChange={(v) => setTweak("speed", v)} />
          <TweakToggle label="Líneas de velocidad" value={t.speedlines} onChange={(v) => setTweak("speedlines", v)} />
          <TweakToggle label="Marca de agua «III»" value={t.watermark} onChange={(v) => setTweak("watermark", v)} />
        </TweaksPanel>,
        document.body)}
    </React.Fragment>
  );
}

/* ---------- mount + scale ---------- */
const stage = document.getElementById("stage");
ReactDOM.createRoot(stage).render(<App />);
function fit() {
  const s = Math.min(window.innerWidth / 460, window.innerHeight / 940);
  stage.style.transform = `scale(${s})`;
}
window.addEventListener("resize", fit);
fit();
