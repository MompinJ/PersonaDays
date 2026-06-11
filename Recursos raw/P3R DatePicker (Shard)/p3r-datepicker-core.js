/* P3R Calendar — date helpers (ES, lunes-primero). Plain JS → window.P3RCal */
window.P3RCal = (function () {
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const MES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const DIA_LETRA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];      // lunes-primero
  const DIA_ABBR = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  // índice lunes-primero (0=Lun .. 6=Dom) del día 1 del mes
  const firstWeekday = (y, m) => (new Date(y, m, 1).getDay() + 6) % 7;

  // rejilla fija de 42 celdas (6 filas) con Date reales, incluye días vecinos
  function buildGrid(y, m) {
    const fw = firstWeekday(y, m);
    const start = new Date(y, m, 1 - fw);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }

  const sameDay = (a, b) => !!a && !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const inMonth = (d, y, m) => d.getFullYear() === y && d.getMonth() === m;

  // "mar · 9" → weekday abbr + day; helpers de formato de cabecera
  const fmtWeekday = (d) => DIA_ABBR[(d.getDay() + 6) % 7];
  const fmtHeader = (d) => `${DIA_ABBR[(d.getDay() + 6) % 7]}, ${d.getDate()} ${MES_ABBR[d.getMonth()]}`;

  function yearRange(center, back, fwd) {
    const out = [];
    for (let y = center - back; y <= center + fwd; y++) out.push(y);
    return out;
  }

  return {
    MESES, MES_ABBR, DIA_LETRA, DIA_ABBR,
    daysInMonth, firstWeekday, buildGrid, sameDay, inMonth,
    fmtWeekday, fmtHeader, yearRange,
  };
})();
