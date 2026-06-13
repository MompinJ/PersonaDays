/* ============================================================
   P3RTimePicker — selector de hora estilo Persona 3 Reload (SHARD).
   Pop-up oscuro que reemplaza al selector de hora nativo.

   Requiere: React 18 + window.P3RTime (p3r-timepicker-core.js)
             y p3r-timepicker.css

   Uso:
     const [hora, setHora] = useState(null);   // {h,m} | null
     <P3RTimePicker
        value={hora}
        onChange={setHora}        // se dispara al pulsar "Aceptar"
        variant="steppers"        // 'steppers' | 'wheel' | 'grid'
        defaultMode="24"          // '24' | '12'  (el usuario lo intercala dentro)
        accent="#3D7BFF" accent2="#16C7E6"
     />

   El modelo SIEMPRE es {h:0-23, m:0-59}. El toggle 24H/12H sólo
   cambia la presentación; el valor no se altera al intercalar.
   ============================================================ */
(function () {
  const { useState, useRef, useLayoutEffect, useEffect, useCallback } = React;
  const T = window.P3RTime;

  /* ---------------- iconos ---------------- */
  function Chevron({ dir = 'up', size = 18 }) {
    const d = {
      up: 'M4 15l8-7 8 7', down: 'M4 9l8 7 8-7',
      left: 'M15 4l-7 8 7 8', right: 'M9 4l7 8-7 8',
    }[dir];
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    );
  }
  function ClockIcon({ size = 18 }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    );
  }

  /* ---------------- press-and-hold (auto-repeat) ---------------- */
  function useHold() {
    const timer = useRef(null);
    const run = (fn) => {
      fn();
      const repeat = (delay) => { timer.current = setTimeout(() => { fn(); repeat(80); }, delay); };
      repeat(380);
    };
    const stop = () => clearTimeout(timer.current);
    useEffect(() => () => clearTimeout(timer.current), []);
    return (fn) => ({
      onPointerDown: (e) => { e.preventDefault(); stop(); run(fn); },
      onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop,
      onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } },
    });
  }

  /* ---------------- toggle 24H / 12H ---------------- */
  function ModeToggle({ mode, onMode }) {
    return (
      <div className="p3rtp-modetog" role="group" aria-label="Formato de hora">
        <button className={'seg' + (mode === '24' ? ' on' : '')} onClick={() => onMode('24')} aria-pressed={mode === '24'}><span>24H</span></button>
        <button className={'seg' + (mode === '12' ? ' on' : '')} onClick={() => onMode('12')} aria-pressed={mode === '12'}><span>12H</span></button>
      </div>
    );
  }

  /* ---------------- cabecera shard (compartida) ---------------- */
  function Head({ t, mode, onMode }) {
    const txt = mode === '12'
      ? T.pad(T.to12(t.h).h12) + ':' + T.pad(t.m)
      : T.pad(t.h) + ':' + T.pad(t.m);
    const ampm = mode === '12' ? T.to12(t.h).ampm : null;
    return (
      <div className="p3rtp-head">
        <div className="p3rtp-headtop">
          <ModeToggle mode={mode} onMode={onMode} />
          {ampm && <span className="p3rtp-headmer">{ampm}</span>}
        </div>
        <div className="p3rtp-shard"><span className="p3rtp-time">{txt}</span></div>
        <div className="p3rtp-stripe" />
      </div>
    );
  }

  /* ====================================================================== */
  /* VARIANTE 1 · STEPPERS                                                   */
  /* ====================================================================== */
  function StepperCol({ label, value, onUp, onDown }) {
    const hold = useHold();
    return (
      <div className="p3rtp-col">
        <button className="p3rtp-step" tabIndex={0} aria-label={'Subir ' + label} {...hold(onUp)}><Chevron dir="up" /></button>
        <div className="p3rtp-num"><i key={value}>{value}</i></div>
        <button className="p3rtp-step" tabIndex={0} aria-label={'Bajar ' + label} {...hold(onDown)}><Chevron dir="down" /></button>
      </div>
    );
  }
  function StepperBody({ t, set, mode, minuteStep }) {
    const incH = () => set({ h: T.wrapHour(t.h + 1), m: t.m });
    const decH = () => set({ h: T.wrapHour(t.h - 1), m: t.m });
    const incM = () => set({ h: t.h, m: T.wrapMin(t.m + minuteStep) });
    const decM = () => set({ h: t.h, m: T.wrapMin(t.m - minuteStep) });
    const { h12, ampm } = T.to12(t.h);
    const setAmpm = (ap) => set({ h: T.from12(h12, ap), m: t.m });
    const hourTxt = mode === '12' ? T.pad(h12) : T.pad(t.h);
    return (
      <div className="p3rtp-body p3rtp-steppers">
        <StepperCol label="hora" value={hourTxt} onUp={incH} onDown={decH} />
        <div className="p3rtp-colon">:</div>
        <StepperCol label="minutos" value={T.pad(t.m)} onUp={incM} onDown={decM} />
        {mode === '12' && (
          <div className="p3rtp-mer">
            <button className={'p3rtp-merbtn' + (ampm === 'AM' ? ' on' : '')} onClick={() => setAmpm('AM')}><span>AM</span></button>
            <button className={'p3rtp-merbtn' + (ampm === 'PM' ? ' on' : '')} onClick={() => setAmpm('PM')}><span>PM</span></button>
          </div>
        )}
      </div>
    );
  }

  /* ====================================================================== */
  /* VARIANTE 2 · WHEEL                                                      */
  /* ====================================================================== */
  const ITEM_H = 44;
  function Wheel({ items, index, onIndex, render, label }) {
    const ref = useRef(null);
    const lock = useRef(false);
    const raf = useRef(0);
    useLayoutEffect(() => {
      const el = ref.current; if (!el) return;
      lock.current = true;
      el.scrollTop = index * ITEM_H;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => { lock.current = false; });
    }, [index, items.length]);
    const onScroll = () => {
      if (lock.current) return;
      const el = ref.current;
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)));
      if (idx !== index) onIndex(idx);
    };
    return (
      <div className="p3rtp-wheel" ref={ref} onScroll={onScroll} role="listbox" aria-label={label}>
        <div className="p3rtp-wheelpad" />
        {items.map((it, i) => (
          <div key={i} className={'p3rtp-wheelitem' + (i === index ? ' on' : '')}
            role="option" aria-selected={i === index} onClick={() => onIndex(i)}>
            <i>{render ? render(it) : it}</i>
          </div>
        ))}
        <div className="p3rtp-wheelpad" />
      </div>
    );
  }
  function WheelBody({ t, set, mode }) {
    if (mode === '12') {
      const { h12, ampm } = T.to12(t.h);
      return (
        <div className="p3rtp-body p3rtp-wheels">
          <div className="p3rtp-wheelband" />
          <Wheel label="hora" items={T.HOURS12} index={h12 - 1} render={(n) => T.pad(n)}
            onIndex={(i) => set({ h: T.from12(i + 1, ampm), m: t.m })} />
          <div className="p3rtp-wcolon">:</div>
          <Wheel label="minutos" items={T.MINUTES} index={t.m} render={(n) => T.pad(n)}
            onIndex={(i) => set({ h: t.h, m: i })} />
          <Wheel label="AM/PM" items={['AM', 'PM']} index={ampm === 'AM' ? 0 : 1}
            onIndex={(i) => set({ h: T.from12(h12, i ? 'PM' : 'AM'), m: t.m })} />
        </div>
      );
    }
    return (
      <div className="p3rtp-body p3rtp-wheels">
        <div className="p3rtp-wheelband" />
        <Wheel label="hora" items={T.HOURS24} index={t.h} render={(n) => T.pad(n)}
          onIndex={(i) => set({ h: i, m: t.m })} />
        <div className="p3rtp-wcolon">:</div>
        <Wheel label="minutos" items={T.MINUTES} index={t.m} render={(n) => T.pad(n)}
          onIndex={(i) => set({ h: t.h, m: i })} />
      </div>
    );
  }

  /* ====================================================================== */
  /* VARIANTE 3 · GRID                                                       */
  /* ====================================================================== */
  function GridBody({ t, set, mode, gridStep }) {
    const [tab, setTab] = useState('h');
    const { h12, ampm } = T.to12(t.h);
    const hours = mode === '12' ? T.HOURS12 : T.HOURS24;
    const mins = [];
    for (let i = 0; i < 60; i += gridStep) mins.push(i);
    return (
      <div className="p3rtp-body p3rtp-gridbody">
        <div className="p3rtp-gtabs">
          <button className={'p3rtp-gtab' + (tab === 'h' ? ' on' : '')} onClick={() => setTab('h')}><span>HORA</span></button>
          <button className={'p3rtp-gtab' + (tab === 'm' ? ' on' : '')} onClick={() => setTab('m')}><span>MIN</span></button>
          {mode === '12' && (
            <div className="p3rtp-gmer">
              <button className={'p3rtp-merbtn' + (ampm === 'AM' ? ' on' : '')} onClick={() => set({ h: T.from12(h12, 'AM'), m: t.m })}><span>AM</span></button>
              <button className={'p3rtp-merbtn' + (ampm === 'PM' ? ' on' : '')} onClick={() => set({ h: T.from12(h12, 'PM'), m: t.m })}><span>PM</span></button>
            </div>
          )}
        </div>
        {tab === 'h' ? (
          <div className={'p3rtp-grid ' + (mode === '12' ? 'cols4' : 'cols6')}>
            {hours.map((h) => {
              const sel = mode === '12' ? (h === h12) : (h === t.h);
              return (
                <button key={h} className={'p3rtp-cell' + (sel ? ' sel' : '')}
                  onClick={() => { const nh = mode === '12' ? T.from12(h, ampm) : h; set({ h: nh, m: t.m }); setTab('m'); }}>
                  <i>{T.pad(h)}</i>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p3rtp-grid cols6">
            {mins.map((m) => (
              <button key={m} className={'p3rtp-cell' + (m === t.m ? ' sel' : '')} onClick={() => set({ h: t.h, m })}>
                <i>{T.pad(m)}</i>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const BODIES = { steppers: StepperBody, wheel: WheelBody, grid: GridBody };

  /* ---------------- panel (reutilizable, sin campo) ---------------- */
  function P3RTimePanel({
    value, mode = '24', onMode, variant = 'steppers',
    minuteStep = 1, gridStep = 5, onAccept, onCancel,
  }) {
    const [t, setT] = useState(() => T.coerce(value) || T.now());
    const Body = BODIES[variant] || StepperBody;
    return (
      <div className="p3rtp-card">
        <Head t={t} mode={mode} onMode={onMode} />
        <Body t={t} set={setT} mode={mode} minuteStep={minuteStep} gridStep={gridStep} />
        <div className="p3rtp-foot">
          <button className="p3rtp-act ghost" onClick={() => setT(T.now())}><span>Ahora</span></button>
          <div className="sp" />
          <button className="p3rtp-act text" onClick={onCancel}><span>Cancelar</span></button>
          <button className="p3rtp-act solid" onClick={() => onAccept && onAccept(t)}><span>Aceptar</span></button>
        </div>
      </div>
    );
  }

  /* ---------------- time picker completo (campo + pop-up) ---------------- */
  function P3RTimePicker({
    value = null, onChange, accent, accent2,
    variant = 'steppers', defaultMode = '24', minuteStep = 1, gridStep = 5,
    placeholder = 'Elegir hora', className = '', style,
  }) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState(defaultMode);
    const v = T.coerce(value);
    const vars = {};
    if (accent) vars['--accent'] = accent;
    if (accent2) vars['--accent2'] = accent2;

    const label = v ? T.fmt(v, mode) : placeholder;

    useEffect(() => {
      if (!open) return;
      const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const accept = useCallback((t) => { onChange && onChange(t); setOpen(false); }, [onChange]);

    return (
      <div className={'p3rtp ' + className} style={{ ...vars, ...style }}>
        <div className="p3rtp-field" onClick={() => setOpen(true)} role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}>
          <span className="p3rtp-field-ico"><ClockIcon /></span>
          <span className={'p3rtp-field-val' + (v ? '' : ' empty')}>{label}</span>
        </div>

        {open && (
          <div className="p3rtp-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
            <div className="p3rtp-modal" role="dialog" aria-modal="true" aria-label="Selector de hora">
              <P3RTimePanel
                value={v} mode={mode} onMode={setMode} variant={variant}
                minuteStep={minuteStep} gridStep={gridStep}
                onAccept={accept} onCancel={() => setOpen(false)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  window.P3RTimePicker = P3RTimePicker;
  window.P3RTimePanel = P3RTimePanel;
})();
