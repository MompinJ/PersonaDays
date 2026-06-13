/* P3R TimePicker — time helpers (24h canonical). Plain JS → window.P3RTime
   Modelo interno SIEMPRE es {h, m} con h en 0-23, m en 0-59.
   El formato 12h es sólo de presentación: cambiar 24H↔12H no altera el valor. */
window.P3RTime = (function () {
  const pad = (n) => String(n).padStart(2, '0');

  const wrapHour = (h) => ((h % 24) + 24) % 24;     // 0-23 cíclico
  const wrapMin  = (m) => ((m % 60) + 60) % 60;     // 0-59 cíclico

  // 24h -> 12h: {h12 (1-12), ampm ('AM'|'PM')}
  function to12(h) {
    const ampm = h < 12 ? 'AM' : 'PM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return { h12, ampm };
  }
  // 12h -> 24h
  function from12(h12, ampm) {
    let h = h12 % 12;            // 12 -> 0
    if (ampm === 'PM') h += 12;  // PM suma 12 (12PM -> 12, 12AM -> 0)
    return h;
  }

  const fmt24 = (t) => pad(t.h) + ':' + pad(t.m);
  function fmt12(t) {
    const { h12, ampm } = to12(t.h);
    return pad(h12) + ':' + pad(t.m) + ' ' + ampm;
  }
  const fmt = (t, mode) => (mode === '12' ? fmt12(t) : fmt24(t));

  function now() {
    const d = new Date();
    return { h: d.getHours(), m: d.getMinutes() };
  }

  // Normaliza value: acepta {h,m}, "HH:MM", Date o null
  function coerce(v) {
    if (v == null) return null;
    if (v instanceof Date) return { h: v.getHours(), m: v.getMinutes() };
    if (typeof v === 'string') {
      const mm = v.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!mm) return null;
      let h = parseInt(mm[1], 10), m = parseInt(mm[2], 10);
      if (mm[3]) h = from12(((h - 1) % 12) + 1, mm[3].toUpperCase());
      return { h: wrapHour(h), m: wrapMin(m) };
    }
    if (typeof v === 'object' && 'h' in v) return { h: wrapHour(v.h), m: wrapMin(v.m) };
    return null;
  }

  const HOURS24 = Array.from({ length: 24 }, (_, i) => i);      // 0..23
  const HOURS12 = Array.from({ length: 12 }, (_, i) => i + 1);  // 1..12
  const MINUTES = Array.from({ length: 60 }, (_, i) => i);      // 0..59

  return {
    pad, wrapHour, wrapMin, to12, from12,
    fmt24, fmt12, fmt, now, coerce,
    HOURS24, HOURS12, MINUTES,
  };
})();
