(function(){
  var C = window.CHARACTERS || [];
  var stage = document.getElementById('stage');
  var inner = document.getElementById('inner');
  var i = 0, busy = false, swapTimer = null;

  // ---------- fit the fixed canvas to the viewport ----------
  function fit(){
    var s = Math.min(window.innerWidth/460, window.innerHeight/940);
    stage.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit); fit();

  // ---------- element refs ----------
  var el = {
    idxNow:  q('#idxNow'),  idxTot: q('#idxTot'),
    bgRomaji:q('#bgRomaji'),bgKata: q('#bgKata'),
    kataStrip:q('#kataStrip'),
    pArc:    q('#pArc'),    pName:  q('#pName'),  pSurname:q('#pSurname'),
    pTag:    q('#pTag'),    pDesc:  q('#pDesc'),
    art:     q('#art-makoto'),
    info:    q('#info'),
    flash:   q('#flash'),   dots:   q('#dots')
  };
  function q(s){ return document.querySelector(s); }

  // ---------- build dot rail ----------
  C.forEach(function(c, n){
    var b = document.createElement('button');
    b.className = 'dot';
    b.style.color = c.t.primary;
    b.setAttribute('aria-label', c.name);
    b.addEventListener('click', function(){ if(n!==i) go(n); });
    el.dots.appendChild(b);
  });
  var dotEls = Array.prototype.slice.call(el.dots.children);

  // ---------- apply theme tokens ----------
  function theme(c){
    var t = c.t;
    stage.style.setProperty('--primary',  t.primary);
    stage.style.setProperty('--secondary',t.secondary);
    stage.style.setProperty('--bg',       t.bg);
    stage.style.setProperty('--surface',  t.surface);
    stage.style.setProperty('--text',     t.text);
    stage.style.setProperty('--dim',      t.dim);
    stage.style.setProperty('--inverse',  t.inverse);
    stage.style.setProperty('--border',   t.border);
    stage.style.setProperty('--glow',     t.glow);
  }

  // ---------- paint content for index ----------
  function paint(n){
    var c = C[n];
    var two = pad(n+1);
    el.idxNow.textContent = two;
    el.idxTot.textContent = '/ ' + pad(C.length);
    el.bgRomaji.textContent = c.name;
    el.bgKata.textContent = c.kata;
    el.kataStrip.textContent = c.kata;
    el.pArc.textContent = c.arc;
    el.pName.textContent = c.name;
    el.pName.style.fontSize = c.name.length >= 8 ? '58px' : c.name.length >= 7 ? '66px' : '74px';
    el.pSurname.textContent = c.surname;
    el.pTag.textContent = c.tag;
    el.pDesc.innerHTML = '<b>' + c.desc + '</b>';
    // swap portrait slot — changing id loads that character's stored art
    if (el.art.id !== 'art-' + c.key){
      el.art.id = 'art-' + c.key;
      el.art.setAttribute('placeholder', 'DROP\n' + c.name + ' ART');
    }
    // restyle dots
    dotEls.forEach(function(d, k){ d.classList.toggle('on', k===n); });
    theme(c);
  }

  // ---------- transition: hard cut + shard flash ----------
  function go(n, dir){
    if (busy || n===i) return;
    busy = true;
    dir = dir || (n>i ? 1 : -1);

    var fl = el.flash;
    fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');

    // swap content at the flash peak (hard cut)
    setTimeout(function(){
      i = n;
      paint(i);
      // staggered entrance, then REMOVE the class so elements rest at their
      // natural opacity:1 (never get stuck on animation fill state)
      if (swapTimer) clearTimeout(swapTimer);
      el.info.classList.remove('swap'); void el.info.offsetWidth; el.info.classList.add('swap');
      el.kataStrip.classList.remove('swap-in'); void el.kataStrip.offsetWidth; el.kataStrip.classList.add('swap-in');
      swapTimer = setTimeout(function(){
        el.info.classList.remove('swap');
        el.kataStrip.classList.remove('swap-in');
      }, 720);
    }, 120);

    setTimeout(function(){ busy = false; }, 360);
  }

  function step(d){ go((i + d + C.length) % C.length, d); }

  // ---------- controls ----------
  q('#next').addEventListener('click', function(){ step(1); });
  q('#prev').addEventListener('click', function(){ step(-1); });
  q('#confirm').addEventListener('click', function(){
    var card = q('.card');
    card.animate(
      [{transform:'scale(1)'},{transform:'scale(.965)'},{transform:'scale(1)'}],
      {duration:260, easing:'cubic-bezier(.3,1.4,.4,1)'}
    );
  });
  window.addEventListener('keydown', function(e){
    if (e.key==='ArrowRight') step(1);
    else if (e.key==='ArrowLeft') step(-1);
  });

  // ---------- drag / swipe (mouse + touch, live feedback) ----------
  var wrap = q('.card-wrap');
  var card = q('.card');
  var drag = null;

  wrap.addEventListener('pointerdown', function(e){
    if (e.target.closest('.nav')) return;            // let the arrows do their thing
    if (e.button !== undefined && e.button !== 0) return;
    drag = { x:e.clientX, y:e.clientY, id:e.pointerId, active:false };
  });
  wrap.addEventListener('pointermove', function(e){
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.active){
      if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)){
        drag.active = true;
        try{ wrap.setPointerCapture(drag.id); }catch(_){}
        card.style.transition = 'none';
      } else if (Math.abs(dy) > 14){ drag = null; return; }
      else return;
    }
    e.preventDefault();
    var t = Math.max(-1, Math.min(1, dx/260));
    card.style.transform = 'translateX(' + (dx*0.55).toFixed(1) + 'px) rotate(' + (t*1.4).toFixed(2) + 'deg)';
    card.style.opacity = (1 - Math.abs(t)*0.22).toFixed(3);
  });
  function endDrag(e){
    if (!drag) return;
    var moved = drag.active, dx = e.clientX - drag.x;
    try{ wrap.releasePointerCapture(drag.id); }catch(_){}
    drag = null;
    card.style.transition = 'transform .24s cubic-bezier(.2,.7,.3,1), opacity .24s';
    card.style.transform = '';
    card.style.opacity = '';
    if (moved && Math.abs(dx) > 58) step(dx < 0 ? 1 : -1);
  }
  wrap.addEventListener('pointerup', endDrag);
  wrap.addEventListener('pointercancel', endDrag);

  function pad(x){ return (x<10?'0':'') + x; }

  paint(0);
})();
