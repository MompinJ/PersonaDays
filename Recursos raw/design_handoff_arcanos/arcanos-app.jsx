// arcanos-app.jsx — orquestador. Depende de MiniCard, DetailCard, Ico,
// useTweaks + Tweak* (de tweaks-panel.jsx) y window.ARCANOS/PLAYER/SLOTS/CYCLE.
const { useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "direction": "Clásico",
  "metal": "Oro",
  "glow": 1,
  "romaji": 0.10,
  "lattice": true
}/*EDITMODE-END*/;

const DIRS = { 'Clásico': 'classic', 'Neón': 'neon', 'Velo': 'veil' };
const METALS = {
  Oro:     ['#F2D784', '#C79B3E', '#7E5E22'],
  Plata:   ['#E8F0F6', '#9FB4C4', '#5E7385'],
  Violeta: ['#D9C7F2', '#9E7BD8', '#5B3E8E'],
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [open, setOpen] = React.useState(null);
  const arcanos = window.ARCANOS, player = window.PLAYER, slots = window.SLOTS, cycle = window.CYCLE;
  const byId = (id) => arcanos.find((a) => a.id === id);

  // apply tweaks to the stage tokens
  useEffect(() => {
    const st = document.getElementById('stage');
    st.dataset.dir = DIRS[t.direction] || 'classic';
    const m = METALS[t.metal] || METALS.Oro;
    st.style.setProperty('--m-hi', m[0]);
    st.style.setProperty('--m-mid', m[1]);
    st.style.setProperty('--m-lo', m[2]);
    st.style.setProperty('--glow-mult', t.glow);
    st.style.setProperty('--romaji-op', t.romaji);
    st.style.setProperty('--lattice-op', t.lattice ? 1 : 0);
  }, [t]);

  // esc closes modal
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const ownedCount = arcanos.filter((a) => a.state === 'active' || a.state === 'available' || a.state === 'cooldown').length;

  return (
    <React.Fragment>
      {/* ---------------- HEADER ---------------- */}
      <div className="hdr">
        <div className="hdr-l">
          <div className="eyebrow"><span className="tick"></span>ARCANOS MAYORES · 0–XXI</div>
          <div className="hdr-title">AR<em>CA</em>NOS</div>
        </div>
        <div className="hdr-r">
          <div className="pill lv"><span className="unskew"><span className="lab">NV</span>{player.level}</span></div>
          <div className="pill yen"><span className="unskew"><span className="y">¥</span>{player.yenes.toLocaleString()}</span></div>
        </div>
      </div>

      {/* ---------------- SLOT TRAY ---------------- */}
      <div className="tray">
        <div className="tray-head">
          <div className="tray-title"><span className="bar"></span><span className="unskew">MIS SLOTS</span></div>
          <div className="cycle"><Ico name="cal" size={14} /><span>CICLO · QUEDAN <b>{cycle.daysLeft} DÍAS</b></span></div>
        </div>
        <div className="slots">
          {Array.from({ length: slots.unlocked }).map((_, i) => {
            const id = slots.equipped[i];
            const a = id != null ? byId(id) : null;
            if (a) {
              return (
                <button key={i} className="slot filled" style={{ '--sc': a.color }} onClick={() => setOpen(a)}>
                  <div className="slot-skin"></div>
                  <div className="slot-rom">{a.rom}</div>
                  <div className="slot-days"><span className="unskew"><Ico name="clock" size={11} />{a.days}D</span></div>
                  <div className="slot-body">
                    <div className="slot-top">
                      <span className="slot-stat"><span className="unskew"><Ico name={a.stat} size={14} stroke={1.7} /></span></span>
                      <span className="slot-tag">{a.statEs}</span>
                    </div>
                    <div>
                      <div className="slot-name">{a.name}</div>
                      <div className="slot-eff">{a.effect}</div>
                    </div>
                  </div>
                </button>
              );
            }
            return (
              <button key={i} className="slot empty" onClick={() => setOpen(null)}>
                <div className="slot-skin"></div>
                <div className="slot-body">
                  <span className="ico"><Ico name="slot" size={26} stroke={1.6} /></span>
                  <span className="lbl">VACÍO</span>
                </div>
              </button>
            );
          })}
          <button className="slot buy">
            <div className="slot-skin"></div>
            <div className="slot-body">
              <span className="price">¥{slots.nextPrice.toLocaleString()}</span>
              <span className="lbl">+ Slot extra</span>
            </div>
          </button>
        </div>
      </div>

      {/* ---------------- COLLECTION ---------------- */}
      <div className="collect">
        <div className="coll-head">
          <div className="coll-title"><span className="bar"></span><span className="unskew">COLECCIÓN</span></div>
          <div className="coll-count"><b>{ownedCount}</b> / {arcanos.length} EN PODER</div>
        </div>
        <div className="grid">
          {arcanos.map((a) => <MiniCard key={a.id} a={a} onOpen={setOpen} />)}
        </div>
      </div>

      {/* ---------------- DETAIL MODAL ---------------- */}
      <div className={'modal' + (open ? ' show' : '')}>
        <div className="modal-bd" onClick={() => setOpen(null)}></div>
        {open && (
          <div className="modal-stage" key={open.id} style={{ '--ac': open.color }}>
            <button className="modal-close" onClick={() => setOpen(null)}><span className="unskew"><Ico name="close" size={18} stroke={2.2} /></span></button>
            <DetailCard a={open} player={player} resetDay={cycle.resetDay} />
          </div>
        )}
      </div>

      {/* ---------------- TWEAKS ---------------- */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Tarjeta" />
        <TweakRadio label="Dirección visual" value={t.direction}
          options={['Clásico', 'Neón', 'Velo']}
          onChange={(v) => setTweak('direction', v)} />
        <TweakRadio label="Metal del marco" value={t.metal}
          options={['Oro', 'Plata', 'Violeta']}
          onChange={(v) => setTweak('metal', v)} />
        <TweakSection label="Atmósfera" />
        <TweakSlider label="Resplandor" value={t.glow} min={0} max={2} step={0.1}
          onChange={(v) => setTweak('glow', v)} />
        <TweakSlider label="Numeral de fondo" value={t.romaji} min={0} max={0.4} step={0.02}
          onChange={(v) => setTweak('romaji', v)} />
        <TweakToggle label="Retícula de rombos" value={t.lattice}
          onChange={(v) => setTweak('lattice', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
