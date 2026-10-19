(function () {
  'use strict';

  /* NAV */
  var nav = document.getElementById('navbar');
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  function setMenu(open) {
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }
  toggle.addEventListener('click', function () { setMenu(!links.classList.contains('open')); });
  links.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* Link ativo */
  var navAnchors = links.querySelectorAll('a');
  var spy = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) navAnchors.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id);
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach(function (s) { spy.observe(s); });

  /* Circuito animado + partículas (canvas)
     Desenho baseado em img/circuit.svg (viewBox 1920x1080, modo "cover"). */
  (function () {
    var hero = document.getElementById('hero');
    var cv = document.getElementById('circuitCanvas');
    if (!hero || !cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var layer = document.createElement('canvas'), lctx = layer.getContext('2d');
    var VW = 1920, VH = 1080, TAU = Math.PI * 2;
    var C = { g: '35,248,178', b: '0,132,245', w: '255,255,255' };
    var swap = { g: 'b', b: 'g' };

    /* Trilhas do lado esquerdo (o lado direito é espelhado) */
    var left = [
      { p: [[0, 200], [250, 200], [350, 300], [550, 300], [630, 220], [850, 220]], c: 'g' },
      { p: [[0, 450], [180, 450], [280, 350], [500, 350], [580, 430], [760, 430]], c: 'b' },
      { p: [[0, 700], [220, 700], [320, 600], [580, 600], [650, 680], [820, 680]] },
      { p: [[0, 900], [300, 900], [420, 780], [640, 780], [720, 860], [900, 860]] },
      { p: [[400, 0], [400, 150], [480, 230], [480, 380]] },
      { p: [[750, 0], [750, 120], [830, 200], [830, 320]] },
      { p: [[450, 1080], [450, 920], [530, 840], [530, 720]] }
    ];
    var chips = [
      { x: 300, y: 160, w: 80, h: 70, c: 'b', l: 'g', t: 'EDUMAKER' },
      { x: 1540, y: 160, w: 80, h: 70, c: 'g', l: 'b', t: 'IFBA' }
    ];

    var traces = [], nodes = [], nodeMap = {};
    function node(x, y, c, end) {
      var k = x + ',' + y;
      if (!nodeMap[k]) { nodeMap[k] = { x: x, y: y, c: c || 'b', on: !!c, end: end, f: 0, fc: 'w', ph: Math.random() * TAU }; nodes.push(nodeMap[k]); }
      return nodeMap[k];
    }
    function addTrace(p, c) {
      var seg = [], len = 0;
      for (var i = 1; i < p.length; i++) { var s = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); seg.push(s); len += s; }
      var t = { p: p, c: c || null, seg: seg, len: len };
      t.n = p.map(function (q, i) { return i ? node(q[0], q[1], c, i === p.length - 1) : null; });
      traces.push(t);
    }
    left.forEach(function (o) {
      addTrace(o.p, o.c);
      addTrace(o.p.map(function (q) { return [VW - q[0], q[1]]; }), o.c && swap[o.c]);
    });

    function at(t, d) {
      d = Math.max(0, Math.min(t.len, d));
      for (var i = 0; i < t.seg.length; i++) {
        if (d <= t.seg[i] || i === t.seg.length - 1) {
          var a = t.p[i], b = t.p[i + 1], k = Math.min(1, t.seg[i] ? d / t.seg[i] : 0);
          return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, i: i };
        }
        d -= t.seg[i];
      }
    }

    /* Sprites de brilho (mais leves que shadowBlur a cada quadro) */
    var spr = {};
    Object.keys(C).forEach(function (k) {
      var s = document.createElement('canvas'); s.width = s.height = 64;
      var g = s.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(' + C[k] + ',1)');
      gr.addColorStop(0.25, 'rgba(' + C[k] + ',.5)');
      gr.addColorStop(1, 'rgba(' + C[k] + ',0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); spr[k] = s;
    });
    function glow(c, k, x, y, r, a) {
      if (a <= 0) return;
      c.globalAlpha = Math.min(1, a); c.drawImage(spr[k], x - r, y - r, r * 2, r * 2);
    }

    var W = 0, H = 0, dpr = 1, sc = 1, ox = 0, oy = 0;
    function toView(c) { c.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy); }
    function toScreen(c) { c.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function path(c, p) { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); }
    function rrect(c, x, y, w, h, r) {
      c.beginPath(); c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }

    /* Camada estática: trilhas, chips e cantos HUD (redesenhada só no resize) */
    function drawLayer() {
      var c = lctx;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, layer.width, layer.height);
      toView(c);
      var g = c.createRadialGradient(960, 540, 0, 960, 540, 600);
      g.addColorStop(0, 'rgba(0,132,245,.16)'); g.addColorStop(0.6, 'rgba(35,248,178,.04)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, VW, VH);
      c.lineCap = 'round'; c.lineJoin = 'round';
      traces.forEach(function (t) { path(c, t.p); c.strokeStyle = 'rgba(0,132,245,.24)'; c.lineWidth = 1.5; c.stroke(); });
      traces.forEach(function (t) {
        if (!t.c) return;
        path(c, t.p); c.strokeStyle = 'rgba(' + C[t.c] + ',.7)'; c.lineWidth = 2.2;
        c.shadowColor = 'rgba(' + C[t.c] + ',.9)'; c.shadowBlur = 12 * dpr; c.stroke(); c.shadowBlur = 0;
      });
      nodes.forEach(function (n) {
        if (!n.end) return;
        c.beginPath(); c.arc(n.x, n.y, 7, 0, TAU);
        c.strokeStyle = 'rgba(' + C[n.c] + ',.45)'; c.lineWidth = 1.2; c.stroke();
      });
      chips.forEach(function (ch) {
        var col = C[ch.c];
        c.strokeStyle = 'rgba(' + col + ',.5)'; c.lineWidth = 2; c.beginPath();
        for (var i = 1; i <= 4; i++) {
          var px = ch.x + ch.w * i / 5, py = ch.y + ch.h * i / 5;
          c.moveTo(px, ch.y); c.lineTo(px, ch.y - 8);
          c.moveTo(px, ch.y + ch.h); c.lineTo(px, ch.y + ch.h + 8);
          c.moveTo(ch.x, py); c.lineTo(ch.x - 8, py);
          c.moveTo(ch.x + ch.w, py); c.lineTo(ch.x + ch.w + 8, py);
        }
        c.stroke();
        var gr = c.createLinearGradient(ch.x, ch.y, ch.x + ch.w, ch.y + ch.h);
        gr.addColorStop(0, '#071a45'); gr.addColorStop(1, '#010042');
        rrect(c, ch.x, ch.y, ch.w, ch.h, 5); c.fillStyle = gr;
        c.shadowColor = 'rgba(' + col + ',.8)'; c.shadowBlur = 14 * dpr; c.fill(); c.shadowBlur = 0;
        c.strokeStyle = 'rgba(' + col + ',.9)'; c.lineWidth = 1.5; c.stroke();
        rrect(c, ch.x + 7, ch.y + 7, ch.w - 14, ch.h - 14, 3);
        c.strokeStyle = 'rgba(' + C[ch.l] + ',.3)'; c.lineWidth = 1; c.stroke();
        c.fillStyle = 'rgba(' + C[ch.l] + ',.95)'; c.font = '600 10px monospace';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(ch.t, ch.x + ch.w / 2, ch.y + ch.h / 2 + 10);
      });
      c.strokeStyle = 'rgba(0,132,245,.3)'; c.lineWidth = 1; c.beginPath();
      [[50, 50, -1, 1], [1870, 50, 1, 1], [50, 1030, -1, -1], [1870, 1030, 1, -1]].forEach(function (h) {
        c.moveTo(h[0], h[1]); c.lineTo(h[0] + 20 * h[2], h[1]); c.lineTo(h[0] + 20 * h[2], h[1] + 20 * h[3]);
      });
      c.stroke();
    }

    /* Pulsos de luz que percorrem as trilhas (poucos e lentos) */
    var STEP = 6, TN = 10, TRAIL = STEP * TN, PULSES = 5;
    var pulses = [], parts = [];
    function spawn(p, wait) {
      var t = traces[(Math.random() * traces.length) | 0];
      p.t = t; p.dir = 1; p.d = 0; p.seg = 0;
      p.v = 90 + Math.random() * 60; p.hit = false; p.wait = wait || 0;
      p.c = t.c || (Math.random() < 0.5 ? 'g' : 'b');
      return p;
    }
    for (var pi = 0; pi < PULSES; pi++) pulses.push(spawn({}, Math.random() * 4));

    /* Partículas flutuantes (discretas) */
    function newPart(anyY) {
      return { x: Math.random() * W, y: anyY ? Math.random() * H : H + 10, vy: 6 + Math.random() * 14,
        sw: Math.random() * TAU, r: 0.8 + Math.random() * 1.6, k: ['g', 'b', 'w'][(Math.random() * 3) | 0], ph: Math.random() * TAU };
    }
    function seedParticles() {
      var n = Math.round(Math.min(40, Math.max(15, W * H / 40000)));
      parts = []; for (var i = 0; i < n; i++) parts.push(newPart(true));
    }

    function resize() {
      var r = hero.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = layer.width = Math.max(1, Math.round(W * dpr));
      cv.height = layer.height = Math.max(1, Math.round(H * dpr));
      sc = Math.max(W / VW, H / VH); ox = (W - VW * sc) / 2; oy = (H - VH * sc) / 2;
      drawLayer(); seedParticles();
    }

    var time = 0, last = 0, raf = 0, running = false;
    function frame(ts) {
      raf = 0;
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts; time += dt;
      var c = ctx, i, k;

      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, cv.width, cv.height);
      c.drawImage(layer, 0, 0);
      c.globalCompositeOperation = 'lighter';

      /* --- espaço do circuito --- */
      toView(c);
      chips.forEach(function (ch, j) {
        var a = 0.6 + 0.25 * Math.sin(time * 1.2 + j * 1.7);
        glow(c, ch.l, ch.x + ch.w / 2, ch.y + ch.h / 2 - 8, 10, a * 0.6);
      });

      for (i = 0; i < pulses.length; i++) {
        var p = pulses[i];
        if (p.wait > 0) { p.wait -= dt; continue; }
        p.d += p.v * dt;
        var h = at(p.t, p.d);
        if (h.i !== p.seg) {
          var nn = p.t.n[h.i];
          if (nn) { nn.f = 1; nn.fc = p.c; }
          p.seg = h.i;
        }
        var over = p.d - p.t.len;
        if (over >= 0 && !p.hit) {
          p.hit = true;
          var e = p.t.n[p.t.p.length - 1]; e.f = 1; e.fc = p.c;
        }
        for (k = TN - 1; k >= 0; k--) {
          var dd = p.d - k * STEP;
          if (dd < 0 || dd > p.t.len) continue;
          var q = at(p.t, dd), f = 1 - k / TN;
          c.globalAlpha = f * f * 0.7; c.fillStyle = 'rgb(' + C[p.c] + ')';
          c.beginPath(); c.arc(q.x, q.y, 0.6 + 1.8 * f, 0, TAU); c.fill();
        }
        if (over < 0) glow(c, p.c, h.x, h.y, 14, 0.8);
        if (over > TRAIL) spawn(p, 1 + Math.random() * 3);
      }

      for (i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.f = Math.max(0, n.f - dt * 1.2);
        var base = n.on ? 0.55 : 0.3;
        c.globalAlpha = Math.min(1, base + n.f * 0.5); c.fillStyle = 'rgb(' + C[n.c] + ')';
        c.beginPath(); c.arc(n.x, n.y, n.end ? 3.5 : 3, 0, TAU); c.fill();
        if (n.f > 0) glow(c, n.fc, n.x, n.y, 8 + 10 * n.f, n.f * 0.6);
      }

      /* --- espaço da tela --- */
      toScreen(c);
      for (i = 0; i < parts.length; i++) {
        var o = parts[i];
        o.y -= o.vy * dt; o.x += Math.sin(time * 0.4 + o.sw) * 6 * dt;
        if (o.y < -10) { parts[i] = newPart(false); continue; }
        var edge = Math.max(0, Math.min(1, o.y / 80, (H - o.y) / 80));
        var a2 = (0.4 + 0.2 * Math.sin(time * 1.2 + o.ph)) * edge;
        c.globalAlpha = a2; c.fillStyle = 'rgb(' + C[o.k] + ')';
        c.beginPath(); c.arc(o.x, o.y, o.r, 0, TAU); c.fill();
      }

      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      if (running) raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }

    resize();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
    /* Pausa quando o hero sai da tela (economia de CPU/bateria) */
    running = true; start();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { running = es[0].isIntersecting; if (running) start(); }).observe(hero);
    }
  })();

  /* Reveal + contadores */
  var rev = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); rev.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { rev.observe(el); });

  var cnt = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target, alvo = +el.dataset.target, ini = performance.now();
      cnt.unobserve(el);
      (function step(t) {
        var k = Math.min(Math.max(0, (t - ini) / 1600), 1);
        el.textContent = Math.round(alvo * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      })(ini);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-target]').forEach(function (el) { cnt.observe(el); });

  /* Equipamentos */
  var equip = {
    gtmax3dh5: { n: 'GTMax3DH5', s: 'Impressão 3D FDM', i: 'img/gtmax3dh5.jpg',
      d: 'Impressora 3D FDM de alto desempenho, usada para transformar modelos digitais em peças físicas com precisão e agilidade: prototipagem, peças de reposição, componentes de robótica, estruturas e engrenagens.' },
    gtmax3d: { n: 'GTMax3D', s: 'Impressão 3D FDM', i: 'img/gtmax3d.jpg',
      d: 'Impressora 3D FDM que transforma modelos digitais em peças físicas com precisão e praticidade. Fabrica protótipos, peças de reposição, suportes e modelos personalizados para projetos acadêmicos e tecnológicos.' },
    ender2: { n: 'Creality Ender 2', s: 'Impressão 3D FDM', i: 'img/ender2.jpg',
      d: 'Impressora 3D FDM compacta e prática, indicada para criar protótipos, componentes, peças de reposição e modelos personalizados em projetos acadêmicos e tecnológicos.' },
    ender3: { n: 'Creality Ender 3', s: 'Impressão 3D FDM', i: 'img/ender3.jpg',
      d: 'Impressora 3D FDM versátil, com boa precisão e qualidade, usada para fabricar protótipos, peças de reposição, componentes de robótica, suportes e estruturas.' },
    cr200: { n: 'Creality CR-200', s: 'Impressão 3D FDM', i: 'img/cr200.jpg',
      d: 'Impressora 3D FDM compacta e eficiente para prototipagem e fabricação digital de peças e modelos dos projetos do laboratório.' },
    laser: { n: 'Laser CO₂', s: 'Corte e gravação', i: 'img/laser.jpg',
      d: 'Máquina de corte e gravação a laser CO₂ para protótipos personalizados em materiais como MDF, acrílico e papelão, com alta precisão.' }
  };
  var dlg = document.getElementById('equipDialog');
  document.querySelectorAll('[data-equip]').forEach(function (b) {
    b.addEventListener('click', function () {
      var e = equip[b.dataset.equip];
      document.getElementById('dlgTitle').textContent = e.n;
      document.getElementById('dlgSub').textContent = e.s;
      document.getElementById('dlgDesc').textContent = e.d;
      var im = document.getElementById('dlgImg'); im.src = e.i; im.alt = e.n;
      dlg.showModal();
    });
  });
  document.getElementById('dlgClose').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

  /* Agendamento: somente dias úteis, a partir de amanhã */
  var d = document.getElementById('vData');
  if (d) {
    var t = new Date(); t.setDate(t.getDate() + 1);
    d.min = t.toISOString().slice(0, 10);
    d.addEventListener('change', function () {
      var w = new Date(d.value + 'T12:00:00').getDay();
      d.setCustomValidity(w === 0 || w === 6 ? 'Escolha um dia de segunda a sexta.' : '');
    });
  }

  /* Demandas: exige telefone OU e-mail */
  (function () {
    var tel = document.getElementById('dTel'), em = document.getElementById('dEmail');
    if (!tel || !em) return;
    function check() {
      var vazio = !tel.value.trim() && !em.value.trim();
      tel.setCustomValidity(vazio ? 'Informe um telefone ou um e-mail.' : '');
      var digs = tel.value.replace(/\D/g, '').length;
      if (!vazio && tel.value.trim() && (digs < 10 || digs > 13)) tel.setCustomValidity('Informe um telefone com DDD.');
    }
    tel.addEventListener('input', check); em.addEventListener('input', check); check();
  })();

  /* Notificação por ?status= */
  var msgs = {
    msg_ok: ['Mensagem enviada com sucesso!', 0], demanda_ok: ['Demanda enviada! Nossa equipe entrará em contato.', 0], visita_ok: ['Pedido de visita enviado! Aguarde a confirmação por e-mail.', 0],
    limite: ['Muitas tentativas. Tente novamente em alguns minutos.', 1], erro: ['Não foi possível enviar. Tente novamente.', 1]
  };
  var st = new URLSearchParams(location.search).get('status');
  if (st && msgs[st]) {
    var n = document.getElementById('notification');
    document.getElementById('notificationText').textContent = msgs[st][0];
    n.classList.toggle('error', !!msgs[st][1]);
    document.getElementById('notificationIcon').textContent = msgs[st][1] ? '!' : '✓';
    n.hidden = false; requestAnimationFrame(function () { n.classList.add('show'); });
    setTimeout(function () { n.classList.remove('show'); }, 6500);
    history.replaceState(null, '', location.pathname + location.hash);
  }
})();
