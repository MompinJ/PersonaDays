// arcano-card.jsx — MiniCard (celda de colección) + DetailCard (modal tarot).
// Depende de window.Ico. Exporta MiniCard, DetailCard a window.
const { useState } = React;

/* ---------- MiniCard: celda compacta de la colección ---------- */
function MiniCard({ a, onOpen }) {
  const locked = a.state === 'shop' || a.state === 'level';
  const cls = ['mini', 's-' + a.state, locked ? 'locked' : ''].filter(Boolean).join(' ');
  return (
    <button className={cls} style={{ '--ac': a.color }} onClick={() => onOpen(a)}>
      <div className="mini-metal"></div>
      <div className="mini-panel">
        <div className="mini-lattice"></div>
        <div className="mini-glow"></div>
        <div className="mini-rom">{a.rom}</div>
        <div className="mini-emblem">
          <span className="glyph"><Ico name={a.stat} size={38} stroke={1.5} /></span>
        </div>
        <div className="mini-scrim"></div>
        <div className="mini-foot">
          <div className="mini-medal">{a.rom}</div>
          <div className="mini-name">{a.name}</div>
          <div className="mini-eff">{a.effect}</div>
        </div>
      </div>
      <span className="mini-corner tl"></span>
      <span className="mini-corner tr"></span>
      <span className="mini-corner bl"></span>
      <span className="mini-corner br"></span>

      {/* ---- state overlays ---- */}
      {a.state === 'active' && (
        <React.Fragment>
          <span className="badge ribbon"><span className="unskew"><Ico name="check" size={11} stroke={2.6} />EQUIPADO</span></span>
          <span className="badge days"><span className="unskew"><Ico name="clock" size={11} />{a.days}D</span></span>
        </React.Fragment>
      )}
      {a.state === 'available' && (
        <span className="badge owned"><Ico name="check" size={11} stroke={2.6} /></span>
      )}
      {a.state === 'shop' && (
        <React.Fragment>
          <span className="badge tagtop"><span className="unskew"><Ico name="cart" size={10} />TIENDA</span></span>
          <span className="badge chip"><span className="unskew"><span className="y">¥</span>{a.price.toLocaleString()}</span></span>
        </React.Fragment>
      )}
      {a.state === 'level' && (
        <React.Fragment>
          <span className="mini-mark"><Ico name="lock" size={20} stroke={1.7} /></span>
          <span className="badge chip"><span className="unskew"><Ico name="level" size={12} />NV {a.level}</span></span>
        </React.Fragment>
      )}
      {a.state === 'cooldown' && (
        <React.Fragment>
          <span className="mini-mark"><Ico name="clock" size={20} stroke={1.8} /></span>
          <span className="badge chip"><span className="unskew"><Ico name="cal" size={11} />LUNES</span></span>
        </React.Fragment>
      )}
    </button>
  );
}

/* ---------- effect text: resalta el primer número/stat ---------- */
function EffectText({ text }) {
  // resalta porcentajes (+15%, −15%, +2.5%)
  const parts = text.split(/([+−-]?\d[\d.]*%)/g);
  return parts.map((p, i) => /[+−-]?\d[\d.]*%/.test(p) ? <b key={i}>{p}</b> : <span key={i}>{p}</span>);
}

/* ---------- DetailCard: carta tarot grande + plate + acción ---------- */
function DetailCard({ a, player, resetDay }) {
  const need = a.state === 'level' ? Math.max(0, a.level - player.level) : 0;
  return (
    <React.Fragment>
      <div className="dcard">
        <div className="dc-metal"></div>
        <div className="dc-panel">
          <div className="dc-lattice"></div>
          <div className="dc-glow"></div>
          <div className="dc-rom">{a.rom}</div>
        </div>
        <div className="dc-en">{a.en}</div>
        <div className="dc-emblem">
          <span className="glyph"><Ico name={a.stat} size={64} stroke={1.4} /></span>
          <image-slot id={'art-arcano-' + a.id} shape="rect" placeholder="ARTE"></image-slot>
        </div>
        <div className="dc-scrim"></div>
        <div className="dc-info">
          <div className="dc-medal">{a.rom}</div>
          <div className="dc-name">{a.name}</div>
          <div className="dc-stat"><span className="unskew"><Ico name={a.stat} size={13} stroke={1.8} />{a.statEs}</span></div>
        </div>
        <span className="dc-corner tl"></span>
        <span className="dc-corner tr"></span>
        <span className="dc-corner bl"></span>
        <span className="dc-corner br"></span>
        <div className="dc-frameline"></div>
      </div>

      <div className="plate">
        <div className="plate-eff" style={{ '--ac': a.color }}>
          <div className="lab">Efecto · aditivo</div>
          <div className="val"><EffectText text={a.effect} /></div>
        </div>
        <div className="plate-flavor">{a.flavor}</div>

        {a.state === 'active' && (
          <div className="metarow ok"><span className="dot"></span>EQUIPADO · QUEDAN {a.days} DÍA{a.days === 1 ? '' : 'S'}</div>
        )}
        {a.state === 'cooldown' && (
          <div className="metarow warn"><span className="dot"></span>USADO ESTE CICLO</div>
        )}
        {a.state === 'level' && (
          <div className="metarow warn"><span className="dot"></span>BLOQUEADO · NIVEL {a.level}</div>
        )}
        {a.state === 'shop' && (
          <div className="metarow gold"><span className="dot"></span>DISPONIBLE EN LA TIENDA</div>
        )}
      </div>

      {/* ---- action ---- */}
      {a.state === 'available' && (
        <React.Fragment>
          <button className="act equipc" style={{ '--ac': a.color }}>
            <span className="fill"></span>
            <span className="lbl"><span className="unskew"><Ico name="bolt" size={20} stroke={2} />EQUIPAR</span></span>
          </button>
          <div className="act-sub">Ocupa 1 slot · activo {3} días</div>
        </React.Fragment>
      )}
      {a.state === 'active' && (
        <React.Fragment>
          <button className="act buy">
            <span className="fill"></span>
            <span className="lbl"><span className="unskew"><Ico name="check" size={20} stroke={2.4} />EFECTO ACTIVO</span></span>
          </button>
          <div className="act-sub">Se libera el {resetDay} · no se puede quitar antes</div>
        </React.Fragment>
      )}
      {a.state === 'shop' && (
        <React.Fragment>
          <button className="act buy">
            <span className="fill"></span>
            <span className="lbl"><span className="unskew"><Ico name="cart" size={20} stroke={2} />COMPRAR · ¥{a.price.toLocaleString()}</span></span>
          </button>
          <div className="act-sub">Tu saldo: ¥{player.yenes.toLocaleString()}</div>
        </React.Fragment>
      )}
      {a.state === 'level' && (
        <React.Fragment>
          <button className="act off" disabled>
            <span className="fill"></span>
            <span className="lbl"><span className="unskew"><Ico name="lock" size={19} stroke={1.9} />REQUIERE NV {a.level}</span></span>
          </button>
          <div className="act-sub">Te faltan {need} nivel{need === 1 ? '' : 'es'} para comprarlo</div>
        </React.Fragment>
      )}
      {a.state === 'cooldown' && (
        <React.Fragment>
          <button className="act off" disabled>
            <span className="fill"></span>
            <span className="lbl"><span className="unskew"><Ico name="clock" size={19} stroke={2} />EN ESPERA</span></span>
          </button>
          <div className="act-sub">Se reactiva el {resetDay}</div>
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

Object.assign(window, { MiniCard, DetailCard, EffectText });
