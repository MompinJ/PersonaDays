// tienda-data.js — datos de la TIENDA (muestra; en producción vienen de la BD).
// Depende de arcanos-data.js (window.ARCANOS / PLAYER / SLOTS) cargado antes.

// Precio base en yenes por Arcano (rareza/poder). Los de estado 'shop' ya traen
// price en arcanos-data; aquí completamos los 22 para el catálogo.
window.PRICES = {
  0: 2500, 1: 3000, 2: 6500, 3: 5500, 4: 3500, 5: 6000, 6: 5500,
  7: 3000, 8: 3000, 9: 4500, 10: 11000, 11: 6000, 12: 5000, 13: 6000,
  14: 6500, 15: 12000, 16: 4000, 17: 6000, 18: 9000, 19: 9500, 20: 9000, 21: 20000,
};

// Mapea el estado del Arcano (del selector) a su estado en la TIENDA.
//   owned : ya lo tienes (equipado / disponible / en espera)
//   buy   : comprable ahora (tienes el nivel)
//   level : bloqueado por nivel (teaser)
window.shopStatus = function (a) {
  if (a.state === 'shop') return 'buy';
  if (a.state === 'level') return 'level';
  return 'owned';
};

// Destacados rotativos (cambian con la rotación de tienda).
window.FEATURED = [
  { id: 17, kind: 'oferta', off: 0.20, tag: 'OFERTA DEL DÍA' }, // La Estrella 6000 → 4800
  { id: 12, kind: 'destacado', tag: 'DESTACADO' },              // El Ahorcado
  { id: 10, kind: 'teaser', tag: 'PRÓXIMAMENTE' },              // Fortuna (NV 25)
];
window.SHOP_ROTATE = '2D 06H'; // tiempo hasta la próxima rotación

// Slots extra. unlocked viene de SLOTS.unlocked (2). Precios escalados.
window.SLOT_TIERS = [
  { n: 3, price: 10000, status: 'buy' },
  { n: 4, price: 25000, status: 'next' },
  { n: 5, price: 50000, status: 'max' },
];

// Boosts temporales (idea/teaser — mecánica futura).
window.BOOSTS = [
  { id: 'yen2x', name: 'DOBLE YENES', desc: 'x2 yenes ganados · 30 min', price: 1500, icon: 'sparkle', color: '#E0BC4E' },
  { id: 'xp50',  name: 'IMPULSO XP',  desc: '+50% XP · 1 hora',           price: 2000, icon: 'level',   color: '#A98CE6' },
];

// Consumibles (idea/teaser — mecánica futura).
window.CONSUMABLES = [
  { id: 'breakcd', name: 'ROMPER ESPERA',         desc: 'Libera un Arcano en cooldown ya', price: 3000, icon: 'clock', color: '#67C796' },
  { id: 'early',   name: 'DESBLOQUEO ANTICIPADO', desc: 'Compra un Arcano sin tener el nivel', price: 8000, icon: 'swap', color: '#7FB2E8', soon: true },
];

window.priceOf = function (id) {
  const a = window.ARCANOS.find((x) => x.id === id);
  return (a && a.price) || window.PRICES[id] || 0;
};
