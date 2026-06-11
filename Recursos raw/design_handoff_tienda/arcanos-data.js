// PersonaDays — ARCANOS (Tarot Mayor 0–XXI).
// Datos de muestra; en producción salen de SQLite. Cada arcano:
//   id      número (0–21)
//   rom     numeral romano para el medallón
//   name    nombre ES (MAYÚSCULAS)
//   en      nombre EN (referencia tarot/Persona)
//   stat    clave de stat | 'comodin' | 'todos'
//   statEs  etiqueta del stat
//   effect  regla de efecto (aditiva) — corta
//   flavor  línea de esencia mística (sólo detalle)
//   color   acento jewel-tone del arcano
//   state   'active' | 'available' | 'cooldown' | 'shop' | 'level'
//   days    (active) días restantes equipado
//   price   (shop) precio en yenes
//   level   (level) nivel requerido para desbloquear su compra
window.PLAYER = { level: 22, yenes: 12800 };

// 2 slots desbloqueados (empiezas con 1, este jugador compró 1 extra).
// El siguiente slot cuesta yenes en la tienda.
window.SLOTS = { unlocked: 2, equipped: [3, null], nextPrice: 10000 };

window.CYCLE = { length: 3, daysLeft: 2, resetDay: 'LUNES' };

window.ARCANOS = [
  { id:0,  rom:'0',     name:'EL LOCO',        en:'THE FOOL',        stat:'comodin',      statEs:'COMODÍN',      effect:'Siempre +2%',                    flavor:'Infinitas posibilidades, cero ataduras.', color:'#E9D27A', state:'available' },
  { id:1,  rom:'I',     name:'EL MAGO',        en:'THE MAGICIAN',    stat:'conocimiento', statEs:'CONOCIMIENTO', effect:'Dificultad Media +10%',          flavor:'La voluntad que da forma a lo real.',     color:'#9B6BE0', state:'available' },
  { id:2,  rom:'II',    name:'LA SACERDOTISA', en:'THE PRIESTESS',   stat:'conocimiento', statEs:'CONOCIMIENTO', effect:'Conocimiento +10% · Gentileza +5%', flavor:'El saber oculto tras el velo.',         color:'#7FB2E8', state:'available' },
  { id:3,  rom:'III',   name:'LA EMPERATRIZ',  en:'THE EMPRESS',     stat:'gentileza',    statEs:'GENTILEZA',    effect:'Gentileza +15%',                 flavor:'Abundancia que nutre y florece.',         color:'#5FBF98', state:'active', days:2 },
  { id:4,  rom:'IV',    name:'EL EMPERADOR',   en:'THE EMPEROR',     stat:'destreza',     statEs:'DESTREZA',     effect:'Misión de Arco +15%',            flavor:'Estructura, mando y dominio.',            color:'#D5564B', state:'shop', price:3500 },
  { id:5,  rom:'V',     name:'EL HIEROFANTE',  en:'THE HIEROPHANT',  stat:'conocimiento', statEs:'CONOCIMIENTO', effect:'Conocimiento +15%',              flavor:'La tradición que guía el camino.',        color:'#D8B24A', state:'available' },
  { id:6,  rom:'VI',    name:'LOS AMANTES',    en:'THE LOVERS',      stat:'carisma',      statEs:'CARISMA',      effect:'Carisma +15%',                   flavor:'La elección que une dos destinos.',       color:'#EC93B6', state:'available' },
  { id:7,  rom:'VII',   name:'EL CARRO',       en:'THE CHARIOT',     stat:'coraje',       statEs:'CORAJE',       effect:'Racha ≥ 3 → +5%',                flavor:'Avanza; la victoria sigue al impulso.',   color:'#6E92CC', state:'cooldown' },
  { id:8,  rom:'VIII',  name:'LA JUSTICIA',    en:'JUSTICE',         stat:'destreza',     statEs:'DESTREZA',     effect:'Misión Diaria +5%',              flavor:'Equilibrio exacto de causa y efecto.',    color:'#3FB0A6', state:'available' },
  { id:9,  rom:'IX',    name:'EL ERMITAÑO',    en:'THE HERMIT',      stat:'conocimiento', statEs:'CONOCIMIENTO', effect:'Misión Semanal +10%',            flavor:'En el silencio se halla la verdad.',      color:'#B6A06A', state:'shop', price:4500 },
  { id:10, rom:'X',     name:'FORTUNA',        en:'WHEEL OF FORTUNE', stat:'destreza',    statEs:'DESTREZA',     effect:'Misión Extra +30%',              flavor:'La rueda gira para quien se atreve.',     color:'#E0BC4E', state:'level', level:25 },
  { id:11, rom:'XI',    name:'LA FUERZA',      en:'STRENGTH',        stat:'coraje',       statEs:'CORAJE',       effect:'Dificultad Difícil +15%',        flavor:'Fuerza serena que doma a la bestia.',     color:'#E08A3C', state:'cooldown' },
  { id:12, rom:'XII',   name:'EL AHORCADO',    en:'THE HANGED MAN',  stat:'destreza',     statEs:'DESTREZA',     effect:'Destreza +7% · Gentileza +7%',   flavor:'Rendirse para ver desde otro ángulo.',    color:'#54C4BC', state:'shop', price:5000 },
  { id:13, rom:'XIII',  name:'LA MUERTE',      en:'DEATH',           stat:'coraje',       statEs:'CORAJE',       effect:'Coraje +15%',                    flavor:'Todo final es una transformación.',       color:'#C7CDD4', state:'cooldown' },
  { id:14, rom:'XIV',   name:'LA TEMPLANZA',   en:'TEMPERANCE',      stat:'gentileza',    statEs:'GENTILEZA',    effect:'Gentileza +10% · Carisma +5%',   flavor:'La mezcla justa que armoniza.',           color:'#8FCFD4', state:'available' },
  { id:15, rom:'XV',    name:'EL DIABLO',      en:'THE DEVIL',       stat:'carisma',      statEs:'CARISMA',      effect:'Semanal +30% · Diaria −15%',     flavor:'Poder atado a un precio.',                color:'#B23A60', state:'level', level:30 },
  { id:16, rom:'XVI',   name:'LA TORRE',       en:'THE TOWER',       stat:'coraje',       statEs:'CORAJE',       effect:'Dificultad Fácil +5%',           flavor:'Lo que cae deja sitio a lo nuevo.',       color:'#E25A38', state:'shop', price:4000 },
  { id:17, rom:'XVII',  name:'LA ESTRELLA',    en:'THE STAR',        stat:'carisma',      statEs:'CARISMA',      effect:'Siempre +2.5%',                  flavor:'Esperanza que nunca se apaga.',           color:'#5FCDE6', state:'shop', price:6000 },
  { id:18, rom:'XVIII', name:'LA LUNA',        en:'THE MOON',        stat:'gentileza',    statEs:'GENTILEZA',    effect:'Gentileza · Destreza · Coraje +5%', flavor:'Bajo la luna, lo incierto revela.',    color:'#A99BD8', state:'level', level:26 },
  { id:19, rom:'XIX',   name:'EL SOL',         en:'THE SUN',         stat:'carisma',      statEs:'CARISMA',      effect:'Carisma · Conocimiento · Coraje +5%', flavor:'La claridad que todo lo ilumina.',   color:'#F0B43E', state:'level', level:35 },
  { id:20, rom:'XX',    name:'EL JUICIO',      en:'JUDGEMENT',       stat:'gentileza',    statEs:'GENTILEZA',    effect:'Gentileza · Conocimiento · Carisma +5%', flavor:'El llamado que despierta y renueva.', color:'#B07EE0', state:'level', level:28 },
  { id:21, rom:'XXI',   name:'EL MUNDO',       en:'THE WORLD',       stat:'todos',        statEs:'TODOS',        effect:'Siempre +8%',                    flavor:'El ciclo completo. Todo converge.',       color:'#D9C66A', state:'level', level:50 },
];
