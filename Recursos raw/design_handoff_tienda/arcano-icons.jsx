// arcano-icons.jsx — glifos de stat + iconos de UI. Trazo = currentColor.
// Exporta <Ico name size stroke/> a window. Sin emojis (regla P3R).
const ICO_PATHS = {
  // ---- stats ----
  conocimiento: <><path d="M4 5.5C4 4.7 4.7 4 6.5 4S11 4.7 12 5.8C13 4.7 15.7 4 17.5 4S20 4.7 20 5.5V18c0 .7-.6 1-1.4 1C17 19 14 19.4 12 20.6 10 19.4 7 19 5.4 19 4.6 19 4 18.7 4 18z"/><path d="M12 5.8V20.6"/></>,
  coraje: <><path d="M12 3c1.6 3 4.5 4.4 4.5 8.2A4.5 4.5 0 0 1 12 21a4.5 4.5 0 0 1-4.5-4.8C7.5 13.2 9 12 9 9.6c1.2.8 1.6 2 1.6 2C11 9.5 10.5 6 12 3z"/></>,
  destreza: <><path d="M13 2 4.5 13.2c-.4.5 0 1.3.6 1.3H11l-1 7.5 8.5-11.2c.4-.5 0-1.3-.6-1.3H12z"/></>,
  gentileza: <><path d="M12 20.5 4.6 13A4.7 4.7 0 0 1 12 7a4.7 4.7 0 0 1 7.4 6z"/></>,
  carisma: <><path d="M12 3l2.5 5.4 5.9.7-4.4 4 1.2 5.8L12 16.9 6.8 18.9 8 13.1 3.6 9.1l5.9-.7z"/></>,
  comodin: <><path d="M12 2.5v19M2.5 12h19M5 5l14 14M19 5 5 19"/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/></>,
  todos: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 2.4 4.3 5.6 4.3 9S14.8 18.6 12 21M12 3C9.2 5.4 7.7 8.6 7.7 12S9.2 18.6 12 21"/></>,
  // ---- ui ----
  lock: <><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>,
  level: <><path d="M12 3 3 8l9 5 9-5z"/><path d="M3 8v6l9 5 9-5V8"/></>,
  clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></>,
  cart: <><circle cx="9.5" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5H5l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L21 7H6"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  check: <><path d="M4 12.5 9.5 18 20 6.5"/></>,
  bolt: <><path d="M13 2 4.5 13.2c-.4.5 0 1.3.6 1.3H11l-1 7.5 8.5-11.2c.4-.5 0-1.3-.6-1.3H12z"/></>,
  cal: <><rect x="3.5" y="5" width="17" height="16" rx="1.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></>,
  swap: <><path d="M4 8h13l-3-3M20 16H7l3 3"/></>,
  slot: <><rect x="4" y="4" width="16" height="16" rx="1.5" strokeDasharray="3 3"/><path d="M12 9v6M9 12h6"/></>,
  close: <><path d="M6 6l12 12M18 6 6 18"/></>,
  sparkle: <><path d="M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8z"/><path d="M18.5 14.5l.7 2.2 2.3.8-2.3.8-.7 2.2-.7-2.2-2.3-.8 2.3-.8z"/></>,
};

function Ico({ name, size = 18, stroke = 1.8, fill = 'none', style }) {
  const d = ICO_PATHS[name];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke="currentColor"
         strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
         style={{ display:'block', flex:'0 0 auto', ...style }}>{d}</svg>
  );
}

window.Ico = Ico;
