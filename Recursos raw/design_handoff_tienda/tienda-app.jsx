// tienda-app.jsx — orquestador de la TIENDA.
// Depende de ShopCard/FeaturedCard/SlotShop/ItemRow/RevealFront/Ico,
// useTweaks + Tweak*, y window.ARCANOS/PLAYER/SLOTS/FEATURED/SLOT_TIERS/BOOSTS/CONSUMABLES.
const { useState, useEffect, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "direction": "Clásico",
  "metal": "Oro",
  "glow": 1,
  "romaji": 0.10,
  "lattice": true
}/*EDITMODE-END*/;
const DIRS = { 'Clásico': 'classic', 'Neón': 'neon', 'Velo': 'veil' };
const METALS = {
  Oro: ['#F2D784', '#C79B3E', '#7E5E22'],
  Plata: ['#E8F0F6', '#9FB4C4', '#5E7385'],
  Violeta: ['#D9C7F2', '#9E7BD8', '#5B3E8E'],
};
const FILTERS = ['Todos', 'Comprar', 'En poder', 'Bloqueados'];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const A = window.ARCANOS, P = window.PLAYER, S = window.SLOTS;
  const [yenes, setYenes] = useState(P.yenes);
  const [owned, setOwned] = useState(() => new Set());
  const [confirm, setConfirm] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('Todos');

  useEffect(() => {
    const st = document.getElementById('stage');
    st.dataset.dir = DIRS[t.direction] || 'classic';
    const m = METALS[t.metal] || METALS.Oro;
    st.style.setProperty('--m-hi', m[0]); st.style.setProperty('--m-mid', m[1]); st.style.setProperty('--m-lo', m[2]);
    st.style.setProperty('--glow-mult', t.glow);
    st.style.setProperty('--romaji-op', t.romaji);
    st.style.setProperty('--lattice-op', t.lattice ? 1 : 0);
  }, [t]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') { setConfirm(null); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const statusOf = (a) => (owned.has(a.id) ? 'owned' : window.shopStatus(a));

  const buyArcano = (a, priceOverride) =>
    setConfirm({ kind: 'arcano', a, price: priceOverride || window.priceOf(a.id), name: a.name, color: a.color });
  const buySlot = (tier) =>
    setConfirm({ kind: 'slot', tier, price: tier.price, name: 'Slot ' + tier.n, color: '#D9B24A' });
  const buyItem = (item) =>
    setConfirm({ kind: 'item', item, price: item.price, name: item.name, color: item.color });
  const openInfo = (a) => {
    const s = statusOf(a);
    setToast(s === 'level' ? `Se desbloquea en Nivel ${a.level}` : 'Ya está en tu poder');
  };

  const doConfirm = () => {
    if (!confirm || confirm.price > yenes) return;
    setYenes((y) => y - confirm.price);
    if (confirm.kind === 'arcano') {
      const a = confirm.a, paid = confirm.price;
      setConfirm(null); setFlipped(false); setBusy(false);
      setReveal({ a, paid });
    } else {
      const n = confirm.name; setConfirm(null);
      setToast('✓ ' + n + ' adquirido');
    }
  };

  const onFlip = () => {
    if (flipped) return;
    setFlipped(true); setBusy(true);
    setTimeout(() => setBusy(false), 600);
  };
  const onContinue = () => {
    if (reveal) setOwned((s) => new Set(s).add(reveal.a.id));
    setReveal(null); setFlipped(false); setBusy(false);
  };

  const buyableCount = A.filter((a) => statusOf(a) === 'buy').length;
  const catalog = useMemo(() => A.filter((a) => {
    const s = statusOf(a);
    if (filter === 'Comprar') return s === 'buy';
    if (filter === 'En poder') return s === 'owned';
    if (filter === 'Bloqueados') return s === 'level';
    return true;
  }), [filter, owned]);

  return (
    <React.Fragment>
      {/* ===== HEADER ===== */}
      <div className="shop-hd">
        <div className="hl">
          <div className="eyebrow"><span className="tick"></span>EMPORIO · ARCANOS</div>
          <div className="ttl">TIEN<em>DA</em></div>
        </div>
        <div className="balance">
          <div className="wallet"><span className="unskew"><span className="coin">¥</span><span className="amt">{yenes.toLocaleString()}</span></span></div>
          <div className="lvl">NIVEL <b>{P.level}</b></div>
        </div>
      </div>

      {/* ===== SCROLL ===== */}
      <div className="shop-scroll">
        {/* destacados */}
        <div className="sec">
          <div className="sec-l"><span className="bar gold"></span><span className="sec-ttl">DESTACADOS</span></div>
          <div className="sec-sub"><Ico name="clock" size={13} />ROTA EN <b>{window.SHOP_ROTATE}</b></div>
        </div>
        <div className="feat-row">
          {window.FEATURED.map((f) => (
            <FeaturedCard key={f.id} f={f} owned={owned.has(f.id)} onBuy={buyArcano} onOpen={openInfo} />
          ))}
        </div>

        {/* slots */}
        <div className="sec">
          <div className="sec-l"><span className="bar violet"></span><span className="sec-ttl">SLOTS DE EQUIPO</span></div>
          <div className="sec-sub">TIENES <b>{S.unlocked}</b></div>
        </div>
        <div className="slot-shop">
          {window.SLOT_TIERS.slice(0, 2).map((tier) => (
            <SlotShop key={tier.n} tier={tier} unlocked={S.unlocked} onBuy={buySlot} />
          ))}
        </div>

        {/* boosts / consumibles */}
        <div className="sec">
          <div className="sec-l"><span className="bar teal"></span><span className="sec-ttl">BOOSTS &amp; CONSUMIBLES</span></div>
          <div className="sec-sub">PRONTO</div>
        </div>
        <div className="item-list">
          {window.BOOSTS.map((it) => <ItemRow key={it.id} item={it} onBuy={buyItem} />)}
          {window.CONSUMABLES.map((it) => <ItemRow key={it.id} item={it} onBuy={buyItem} />)}
        </div>

        {/* catálogo */}
        <div className="sec">
          <div className="sec-l"><span className="bar gold"></span><span className="sec-ttl">CATÁLOGO · 0–XXI</span></div>
          <div className="sec-sub"><b>{buyableCount}</b>{' '}DISPONIBLES</div>
        </div>
        <div className="filters">
          {FILTERS.map((f) => (
            <button key={f} className={'fchip' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>
              <span className="unskew">{f}</span>
            </button>
          ))}
        </div>
        <div className="cat-grid">
          {catalog.map((a) => (
            <ShopCard key={a.id} a={a} owned={owned.has(a.id)} onBuy={buyArcano} onOpen={openInfo} />
          ))}
          {catalog.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 0', color: 'var(--faint)', fontFamily: "'Barlow Condensed'", letterSpacing: '.1em', textTransform: 'uppercase' }}>Nada por aquí</div>}
        </div>
      </div>

      {/* ===== CONFIRM MODAL ===== */}
      <div className={'cmodal' + (confirm ? ' show' : '')}>
        <div className="cmodal-bd" onClick={() => setConfirm(null)}></div>
        {confirm && (
          <div className="cbox" style={{ '--ac': confirm.color }}>
            <div className="ceyebrow">{confirm.kind === 'arcano' ? 'CONFIRMAR INVOCACIÓN' : 'CONFIRMAR COMPRA'}</div>
            {confirm.kind === 'arcano' && (
              <div className="cmini" style={{ pointerEvents: 'none' }}>
                <ShopCard a={confirm.a} owned={false} onBuy={() => {}} onOpen={() => {}} />
              </div>
            )}
            <div className="cname">{confirm.name}</div>
            {confirm.a && <div className="ceff">{confirm.a.effect}</div>}
            {confirm.item && <div className="ceff">{confirm.item.desc}</div>}
            <div className="cprice-row">
              <span className="cprice-l">Precio</span>
              <span className="cprice-v"><span className="y">¥</span>{confirm.price.toLocaleString()}</span>
            </div>
            <div className="cbal">Saldo tras compra: <b>¥{Math.max(0, yenes - confirm.price).toLocaleString()}</b></div>
            <div className="cbtns">
              <button className="cbtn cancel" onClick={() => setConfirm(null)}>
                <span className="fill"></span><span className="lbl"><span className="unskew">CANCELAR</span></span>
              </button>
              <button className="cbtn confirm" disabled={confirm.price > yenes} onClick={doConfirm}>
                <span className="fill"></span>
                <span className="lbl"><span className="unskew">{confirm.price > yenes ? 'SIN SALDO' : (<React.Fragment><Ico name="check" size={18} stroke={2.4} />CONFIRMAR</React.Fragment>)}</span></span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== REVEAL (gacha) ===== */}
      <div className={'reveal' + (reveal ? ' show lit' : '') + (flipped ? ' flipped' : '') + (busy ? ' bursting' : '')}
        style={reveal ? { '--ac': reveal.a.color } : null}>
        <div className="reveal-bd"></div>
        <div className="reveal-rays"></div>
        <div className="reveal-flash"></div>
        <div className="reveal-stage">
          <div className="flip" onClick={onFlip}>
            <div className="flip-face flip-back">
              <div className="backlat"></div>
              <div className="seal"><Ico name="sparkle" size={62} stroke={1.3} /></div>
              <div className="backrom">· ARCANO ·</div>
            </div>
            {reveal && <RevealFront a={reveal.a} />}
          </div>
          {!flipped && <div className="reveal-hint">Toca para revelar</div>}
          <div className="reveal-cta">
            <div className="reveal-got">¡Obtenido!</div>
            <div className="reveal-sub">{reveal ? reveal.a.name : ''} · <b>−¥{reveal ? reveal.paid.toLocaleString() : ''}</b></div>
            <button className="reveal-cont" onClick={onContinue}>
              <span className="fill"></span><span className="lbl"><span className="unskew">CONTINUAR</span></span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== TOAST ===== */}
      {toast && <div className="toast">{toast}</div>}

      {/* ===== TWEAKS ===== */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Tarjeta" />
        <TweakRadio label="Dirección visual" value={t.direction} options={['Clásico', 'Neón', 'Velo']} onChange={(v) => setTweak('direction', v)} />
        <TweakRadio label="Metal del marco" value={t.metal} options={['Oro', 'Plata', 'Violeta']} onChange={(v) => setTweak('metal', v)} />
        <TweakSection label="Atmósfera" />
        <TweakSlider label="Resplandor" value={t.glow} min={0} max={2} step={0.1} onChange={(v) => setTweak('glow', v)} />
        <TweakSlider label="Numeral de fondo" value={t.romaji} min={0} max={0.4} step={0.02} onChange={(v) => setTweak('romaji', v)} />
        <TweakToggle label="Retícula de rombos" value={t.lattice} onChange={(v) => setTweak('lattice', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
