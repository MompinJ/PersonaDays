/* ============================================================
   P3RDatePicker — date picker estilo Persona 3 Reload (SHARD).
   Pop-up oscuro que reemplaza al selector de fecha nativo.

   Requiere: React 18 + window.P3RCal (p3r-datepicker-core.js)
             y p3r-datepicker.css

   Uso:
     <P3RDatePicker
        value={date}                 // Date | null
        onChange={(d) => setDate(d)} // se dispara al pulsar "Aceptar"
        accent="#3D7BFF"             // color de tema (opcional)
        accent2="#16C7E6"            // color secundario (opcional)
        minDate={...} maxDate={...}  // restricciones (opcional)
        placeholder="Elige fecha"    // texto del campo vacío (opcional)
     />

   También exporta P3RCalendar (solo el panel, sin campo) por si
   quieres incrustarlo en tu propio modal.
   ============================================================ */
(function () {
  const { useState, useRef, useLayoutEffect, useMemo, useEffect, useCallback } = React;
  const C = window.P3RCal;

  function Chevron({ dir = 'right', size = 16 }) {
    const d = dir === 'left' ? 'M15 4l-7 8 7 8' : 'M9 4l7 8-7 8';
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    );
  }
  function CalIcon({ size = 18 }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4.5" width="18" height="16" rx="1" />
        <path d="M3 9h18M8 2.5v4M16 2.5v4" />
      </svg>
    );
  }

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const beforeMin = (d, min) => min && startOfDay(d) < startOfDay(min);
  const afterMax = (d, max) => max && startOfDay(d) > startOfDay(max);
  const isDisabled = (d, min, max) => beforeMin(d, min) || afterMax(d, max);

  /* ---------------- panel del calendario (reutilizable) ---------------- */
  function P3RCalendar({ value, onPick, onAccept, onCancel, minDate, maxDate }) {
    const today = useMemo(() => new Date(), []);
    const init = value || today;
    const [view, setView] = useState({ y: init.getFullYear(), m: init.getMonth() });
    const [sel, setSel] = useState(value || null);
    const [mode, setMode] = useState('days');
    const [pulse, setPulse] = useState(0);

    const prevMonth = () => setView(v => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
    const nextMonth = () => setView(v => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
    const toggleYears = () => setMode(m => (m === 'years' ? 'days' : 'years'));
    const pickYear = (y) => { setView(v => ({ y, m: v.m })); setMode('days'); };
    const pick = (d) => {
      if (isDisabled(d, minDate, maxDate)) return;
      setSel(d); setView({ y: d.getFullYear(), m: d.getMonth() }); setPulse(p => p + 1);
      onPick && onPick(d);
    };
    const goToday = () => pick(new Date());

    const headDate = sel
      ? `${C.DIA_ABBR[(sel.getDay() + 6) % 7]} ${sel.getDate()}`
      : '— —';

    const cells = useMemo(() => C.buildGrid(view.y, view.m), [view.y, view.m]);

    /* rejilla de años con auto-centrado (sin scrollIntoView) */
    const yearsRef = useRef(null);
    const years = useMemo(() => C.yearRange(today.getFullYear(), 80, 40), [today]);
    useLayoutEffect(() => {
      if (mode !== 'years') return;
      const box = yearsRef.current; if (!box) return;
      const node = box.querySelector('.p3rdp-yr.sel');
      if (node) box.scrollTop = node.offsetTop - box.clientHeight / 2 + node.offsetHeight / 2;
    }, [mode]);

    return (
      <div className="p3rdp-card">
        <div className="p3rdp-head">
          <button className="p3rdp-year" onClick={toggleYears}>{view.y}</button>
          <div className="p3rdp-shard"><span className="p3rdp-date">{headDate}</span></div>
          <div className="p3rdp-stripe" />
        </div>

        {mode === 'years' ? (
          <div className="p3rdp-years" ref={yearsRef}>
            {years.map(y => {
              const k = ['p3rdp-yr', y === view.y && 'sel', y === today.getFullYear() && 'now']
                .filter(Boolean).join(' ');
              return <div key={y} className={k} onClick={() => pickYear(y)}><i>{y}</i></div>;
            })}
          </div>
        ) : (
          <div className="p3rdp-body">
            <div className="p3rdp-monthrow">
              <button className="p3rdp-nav" onClick={prevMonth} aria-label="Mes anterior"><Chevron dir="left" /></button>
              <div className="p3rdp-monthlbl">{C.MESES[view.m]} <b onClick={toggleYears}>{view.y}</b></div>
              <button className="p3rdp-nav" onClick={nextMonth} aria-label="Mes siguiente"><Chevron dir="right" /></button>
            </div>
            <div className="p3rdp-wk">{C.DIA_LETRA.map((d, i) => <span key={i}>{d}</span>)}</div>
            <div className="p3rdp-grid">
              {cells.map((d, i) => {
                const out = !C.inMonth(d, view.y, view.m);
                const dis = isDisabled(d, minDate, maxDate);
                const isSel = C.sameDay(d, sel);
                const isToday = C.sameDay(d, today);
                const cn = ['p3rdp-day', out && 'out', dis && 'dis', isSel && 'sel', isToday && 'today']
                  .filter(Boolean).join(' ');
                return (
                  <div key={i} className={cn} onClick={() => pick(d)}>
                    <div className="p3rdp-mk" key={isSel ? 'sel' + pulse : 'd'}><i>{d.getDate()}</i></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="p3rdp-foot">
          <button className="p3rdp-act ghost" onClick={goToday}><span>Hoy</span></button>
          <div className="sp" />
          <button className="p3rdp-act text" onClick={onCancel}><span>Cancelar</span></button>
          <button className="p3rdp-act solid" onClick={() => onAccept && onAccept(sel)}><span>Aceptar</span></button>
        </div>
      </div>
    );
  }

  /* ---------------- date picker completo (campo + pop-up) ---------------- */
  function P3RDatePicker({
    value = null, onChange, accent, accent2, minDate, maxDate,
    placeholder = 'Elegir fecha', locale, className = '', style,
  }) {
    const [open, setOpen] = useState(false);
    const vars = {};
    if (accent) vars['--accent'] = accent;
    if (accent2) vars['--accent2'] = accent2;

    const label = value
      ? `${value.getDate()} ${C.MES_ABBR[value.getMonth()]} ${value.getFullYear()}`
      : placeholder;

    // cerrar con Esc + bloquear scroll de fondo mientras está abierto
    useEffect(() => {
      if (!open) return;
      const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const accept = useCallback((d) => { onChange && onChange(d); setOpen(false); }, [onChange]);

    return (
      <div className={'p3rdp ' + className} style={{ ...vars, ...style }}>
        <div className={'p3rdp-field' + (value ? '' : '')} onClick={() => setOpen(true)}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}>
          <span className="p3rdp-field-ico"><CalIcon /></span>
          <span className={'p3rdp-field-val' + (value ? '' : ' empty')}>{label}</span>
        </div>

        {open && (
          <div className="p3rdp-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
            <div className="p3rdp-modal" role="dialog" aria-modal="true" aria-label="Selector de fecha">
              <P3RCalendar
                value={value}
                minDate={minDate} maxDate={maxDate}
                onAccept={accept}
                onCancel={() => setOpen(false)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  window.P3RDatePicker = P3RDatePicker;
  window.P3RCalendar = P3RCalendar;
})();
