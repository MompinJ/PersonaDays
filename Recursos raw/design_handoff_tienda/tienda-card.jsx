// tienda-card.jsx — ShopCard, FeaturedCard, SlotShop, ItemRow, RevealFront.
// Depende de window.Ico, ARCANOS, shopStatus, priceOf. Exporta a window.

/* ---------- catálogo: shop card (reusa base .mini) ---------- */
function ShopCard({ a, owned, onBuy, onOpen }) {
  const status = owned ? 'owned' : window.shopStatus(a); // buy | owned | level
  const cls = ['mini', 'shop',
    status === 'buy' ? 'buy' : status === 'owned' ? 'owned' : 'lvl',
    status === 'level' ? 'locked' : ''].filter(Boolean).join(' ');
  const price = window.priceOf(a.id);
  return (
    <button className={cls} style={{ '--ac': a.color }}
      onClick={() => (status === 'buy' ? onBuy(a) : onOpen(a))}>
      <div className="mini-metal"></div>
      <div className="mini-panel">
        <div className="mini-lattice"></div>
        <div className="mini-glow"></div>
        <div className="mini-rom">{a.rom}</div>
        <div className="mini-emblem"><span className="glyph"><Ico name={a.stat} size={38} stroke={1.5} /></span></div>
        <div className="mini-scrim"></div>
        <div className="mini-foot">
          <div className="mini-medal">{a.rom}</div>
          <div className="mini-name">{a.name}</div>
        </div>
      </div>
      <span className="mini-corner tl"></span><span className="mini-corner tr"></span>
      <span className="mini-corner bl"></span><span className="mini-corner br"></span>
      {status === 'buy' && (
        <span className="pricechip"><span className="unskew"><span className="y">¥</span>{price.toLocaleString()}</span></span>
      )}
      {status === 'owned' && (
        <span className="ownedrib"><span className="unskew"><Ico name="check" size={10} stroke={2.6} />EN PODER</span></span>
      )}
      {status === 'level' && (
        <React.Fragment>
          <span className="mini-mark"><Ico name="lock" size={20} stroke={1.7} /></span>
          <span className="pricechip"><span className="unskew"><Ico name="level" size={12} />NV {a.level}</span></span>
        </React.Fragment>
      )}
    </button>
  );
}

/* ---------- destacados rotativos ---------- */
function FeaturedCard({ f, owned, onBuy, onOpen }) {
  const a = window.ARCANOS.find((x) => x.id === f.id);
  const base = window.priceOf(a.id);
  const now = f.kind === 'oferta' ? Math.round((base * (1 - f.off)) / 100) * 100 : base;
  const isTeaser = f.kind === 'teaser';
  const cls = ['feat', f.kind === 'oferta' ? 'hot' : '', isTeaser ? 'teaser' : ''].filter(Boolean).join(' ');
  return (
    <button className={cls} style={{ '--ac': a.color }}
      onClick={() => (isTeaser ? onOpen(a) : onBuy(a, now))}>
      <div className="feat-metal"></div>
      <div className="feat-panel">
        <div className="feat-art">
          <div className="feat-lattice"></div>
          <div className="feat-glow"></div>
          <div className="feat-rom">{a.rom}</div>
          <div className="feat-emblem"><Ico name={a.stat} size={56} stroke={1.4} /></div>
        </div>
        <div className="feat-info">
          <div className="feat-name">{a.name}</div>
          <div className="feat-eff">{a.effect}</div>
          {isTeaser ? (
            <div className="feat-lock"><Ico name="lock" size={15} stroke={1.8} />DESBLOQUEA EN NV {a.level}</div>
          ) : (
            <div className="feat-buy">
              <div className="feat-price">
                <span className="now">¥{now.toLocaleString()}</span>
                {f.kind === 'oferta' && <span className="was">¥{base.toLocaleString()}</span>}
              </div>
              <span className="feat-cta"><span className="unskew"><Ico name="cart" size={13} stroke={2} />COMPRAR</span></span>
            </div>
          )}
        </div>
      </div>
      <div className="feat-tag"><span className="unskew">{f.tag}</span></div>
    </button>
  );
}

/* ---------- slots en tienda ---------- */
function SlotShop({ tier, unlocked, onBuy }) {
  const status = tier.status; // buy | next | max
  const locked = status !== 'buy';
  const subs = { buy: 'Equipa 1 Arcano más', next: 'Tras comprar el anterior', max: 'Capacidad máxima' };
  return (
    <button className={'sslot ' + (locked ? 'locked' : 'buy')}
      onClick={() => (!locked ? onBuy(tier) : null)} disabled={locked}>
      {status === 'buy' && <span className="sslot-flag now">DISPONIBLE</span>}
      {status === 'next' && <span className="sslot-flag">SIGUIENTE</span>}
      <div className="sslot-skin">
        <span className="sslot-ico"><span className="unskew"><Ico name={locked ? 'lock' : 'slot'} size={20} stroke={1.7} /></span></span>
        <div className="sslot-meta">
          <div className="sslot-name">SLOT {tier.n}</div>
          <div className="sslot-sub">{subs[status]}</div>
        </div>
        <div className="sslot-price"><span className="y">¥</span>{tier.price.toLocaleString()}</div>
      </div>
    </button>
  );
}

/* ---------- boosts / consumibles ---------- */
function ItemRow({ item, onBuy }) {
  return (
    <button className={'irow' + (item.soon ? ' soon' : '')} style={{ '--ac': item.color }}
      onClick={() => (!item.soon ? onBuy(item) : null)} disabled={item.soon}>
      <span className="irow-ico"><span className="unskew"><Ico name={item.icon} size={20} stroke={1.7} /></span></span>
      <div className="irow-meta">
        <div className="irow-name">{item.name}</div>
        <div className="irow-desc">{item.desc}</div>
      </div>
      {item.soon
        ? <span className="soon-flag"><span className="unskew">Próximamente</span></span>
        : <span className="irow-price"><span className="unskew"><span className="y">¥</span>{item.price.toLocaleString()}</span></span>}
    </button>
  );
}

/* ---------- cara frontal del revelado (gacha) ---------- */
function RevealFront({ a }) {
  if (!a) return null;
  return (
    <div className="flip-front" style={{ '--ac': a.color }}>
      <div className="ffpanel">
        <div className="fflat"></div>
        <div className="ffglow"></div>
        <div className="ffrom">{a.rom}</div>
        <div className="ffemblem"><Ico name={a.stat} size={58} stroke={1.4} /></div>
        <div className="ffscrim"></div>
        <div className="ffinfo">
          <div className="ffmedal">{a.rom}</div>
          <div className="ffname">{a.name}</div>
        </div>
        <span className="ffcorner tl"></span><span className="ffcorner tr"></span>
        <span className="ffcorner bl"></span><span className="ffcorner br"></span>
      </div>
    </div>
  );
}

Object.assign(window, { ShopCard, FeaturedCard, SlotShop, ItemRow, RevealFront });
