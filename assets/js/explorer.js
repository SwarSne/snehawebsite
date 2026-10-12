/* Chiplet Explorer: interactive diagram of a chiplet AI package. No dependencies. */
(() => {
  const root = document.querySelector('[data-explorer]');
  if (!root) return;
  const svg = root.querySelector('.ex-svg'), status = root.querySelector('.ex-status');
  const info = { type: root.querySelector('.ex-type'), title: root.querySelector('.ex-title'), desc: root.querySelector('.ex-desc'), link: root.querySelector('.ex-more') };
  const base = (document.querySelector('.logo')?.getAttribute('href') || '/').replace(/\/$/, '');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent = svg) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };

  const TYPES = {
    compute: { label: 'AI compute chiplet', short: 'AI', desc: 'Accelerator chiplets that share the work of LLM inference. ATLAS proposes a scalable chiplet-based LLM accelerator on Silicon Interconnect Fabric with a hierarchical communication protocol.', link: '/research/#accelerators' },
    hbm: { label: 'HBM memory stack', short: 'HBM', desc: 'High-bandwidth memory, a common building block in AI packages, that feeds data to the compute chiplets.', link: '/research/#accelerators' },
    io: { label: 'I/O die', short: 'I/O', desc: 'Connects the package to the host, network and other packages. Prompts come in here and tokens go out.', link: '/research/#accelerators' },
    sec: { label: 'Security helper chiplet', short: 'SEC', desc: 'A security helper chiplet for distributed hardware monitoring across a chiplet system, the architecture explored in the ISQED 2026 paper on scalable security monitoring.', link: '/research/#chiplet-security' },
  };
  // 5 x 3 package layout
  const LAYOUT = [
    ['hbm', 'compute', 'compute', 'compute', 'hbm'],
    ['io', 'compute', 'sec', 'compute', 'io'],
    ['hbm', 'compute', 'compute', 'compute', 'hbm'],
  ];
  const W = 84, H = 84, GX = 16, GY = 18, OX = 26, OY = 30;
  const nodes = [], links = [];

  // interposer
  el('rect', { x: 8, y: 10, width: 504, height: 310, rx: 22, class: 'ex-interposer' });
  for (let i = 0; i < 26; i++) el('circle', { cx: 20 + i * 19, cy: 318, r: 2.2, class: 'ex-bump' });
  const linkLayer = el('g'), nodeLayer = el('g'), fxLayer = el('g');

  LAYOUT.forEach((row, r) => row.forEach((t, c) => {
    const x = OX + c * (W + GX), y = OY + r * (H + GY);
    const g = el('g', { class: `ex-node t-${t}`, tabindex: 0, role: 'button', 'aria-label': TYPES[t].label }, nodeLayer);
    el('rect', { x, y, width: W, height: H, rx: 12, class: 'ex-tile' }, g);
    if (t === 'compute') for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) el('rect', { x: x + 16 + i * 19, y: y + 22 + j * 15, width: 13, height: 9, rx: 2, class: 'ex-pe' }, g);
    if (t === 'hbm') for (let i = 0; i < 4; i++) el('rect', { x: x + 14, y: y + 16 + i * 13, width: W - 28, height: 9, rx: 2, class: 'ex-pe' }, g);
    el('text', { x: x + W / 2, y: y + H - 8, class: 'ex-label', 'text-anchor': 'middle' }, g).textContent = TYPES[t].short;
    const n = { r, c, t, x, y, cx: x + W / 2, cy: y + H / 2, g };
    nodes.push(n);
    g.addEventListener('mouseenter', () => show(n));
    g.addEventListener('focus', () => show(n));
    g.addEventListener('click', () => show(n, true));
  }));
  const at = (r, c) => nodes.find(n => n.r === r && n.c === c);
  nodes.forEach(n => {
    [[0, 1], [1, 0]].forEach(([dr, dc]) => {
      const m = at(n.r + dr, n.c + dc); if (!m) return;
      const line = el('line', { x1: n.cx, y1: n.cy, x2: m.cx, y2: m.cy, class: 'ex-wire' }, linkLayer);
      links.push({ a: n, b: m, line });
    });
  });
  const linkBetween = (a, b) => links.find(l => (l.a === a && l.b === b) || (l.a === b && l.b === a));

  function show(n, pin) {
    const T = TYPES[n.t];
    let title = T.label, desc = T.desc, link = T.link, type = 'Chiplet';
    if (n === attacker && mode !== 'idle' && mode !== 'inference') {
      type = isolated ? 'Flagged by detector' : 'Malicious chiplet';
      title = isolated ? 'Covert channel flagged' : 'Leaking chiplet';
      desc = isolated ? 'A substrate-level detector flags the suspicious channel. HERA (MWSCAS 2026) proposes this kind of covert-channel detection for heterogeneous chiplet systems. The greyed-out tile is only illustrative.'
        : 'Shared interconnect between chiplets can leak information to a malicious neighbour. NoWLeak (ICCAD 2026) investigates side-channel leakage at the network-on-wafer interconnect level.';
      link = '/publications/#' + (isolated ? 'hera' : 'nowleak');
    }
    info.type.textContent = type; info.title.textContent = title; info.desc.textContent = desc;
    info.link.href = base + link; info.link.hidden = false;
    nodes.forEach(m => m.g.classList.toggle('sel', m === n));
  }

  /* ---------- simulation ---------- */
  let mode = 'idle', attacker = null, victim = null, isolated = false, packets = [], rings = [], last = 0, spawnT = 0;
  const computes = nodes.filter(n => n.t === 'compute'), sec = nodes.find(n => n.t === 'sec');
  const neighbours = n => links.filter(l => l.a === n || l.b === n).map(l => (l.a === n ? l.b : l.a));

  function spawn(path, cls, speed = 140) {
    const dot = el('circle', { r: cls === 'leak' ? 4 : 3.4, class: 'ex-packet ' + cls }, fxLayer);
    packets.push({ path, i: 0, t: 0, dot, speed });
  }
  function route(a, b) { // simple XY routing across the mesh
    const p = [a]; let cur = a;
    while (cur !== b) {
      const nr = cur.r + Math.sign(b.r - cur.r) * (cur.c === b.c ? 1 : 0), nc = cur.c + Math.sign(b.c - cur.c);
      cur = at(cur.c !== b.c ? cur.r : nr, cur.c !== b.c ? nc : cur.c); p.push(cur);
    }
    return p;
  }
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function setStatus(t) { status.textContent = t; }

  function setMode(m) {
    if (m === 'reset') { mode = 'idle'; attacker = victim = null; isolated = false; clearFx(); paint(); setStatus('Idle · hover a chiplet'); return; }
    if (m === 'detect' && !attacker) setMode('attack');
    if (m === 'attack' && !attacker) { attacker = at(0, 3); victim = at(1, 3); isolated = false; }
    if (m === 'detect') { rings.push({ r: 0 }); setStatus('Detector monitoring the substrate…'); }
    if (m === 'inference') setStatus('Running LLM inference · tokens streaming');
    if (m === 'attack') setStatus('⚠ Leakage on the network-on-wafer link');
    mode = m; paint();
    if (attacker && (m === 'attack' || m === 'detect')) show(attacker);
    root.querySelectorAll('.ex-btn').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    if (reduced) staticFrame();
  }
  let leakArc = null;
  function clearFx() { packets.forEach(p => p.dot.remove()); packets = []; rings = []; fxLayer.innerHTML = ''; leakArc = null; }
  function paint() {
    nodes.forEach(n => {
      n.g.classList.toggle('attacker', n === attacker && !isolated);
      n.g.classList.toggle('isolated', n === attacker && isolated);
      n.g.classList.toggle('victim', n === victim && !isolated);
      n.g.classList.toggle('scanning', n === sec && mode === 'detect' && !isolated);
    });
    const leaking = !!attacker && !isolated;
    if (leaking && !leakArc) {
      const a = attacker, v = victim, mx = Math.max(a.cx, v.cx) + 62, my = (a.cy + v.cy) / 2;
      leakArc = el('path', { d: `M ${a.cx + 30} ${a.cy} Q ${mx} ${my} ${v.cx + 30} ${v.cy}`, class: 'ex-leak-arc' }, fxLayer);
    }
    if (leakArc) leakArc.classList.toggle('off', !leaking);
    links.forEach(l => l.line.classList.toggle('leaky', !!attacker && !isolated && ((l.a === attacker && l.b === victim) || (l.b === attacker && l.a === victim))));
  }
  function staticFrame() { /* reduced motion: show end state without animation */ if (mode === 'detect') { isolated = true; paint(); setStatus('✓ Suspicious channel flagged'); show(attacker); } }

  function tick(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    if (mode !== 'idle') {
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = 0.28;
        const io = pick(nodes.filter(n => n.t === 'io')), hbm = pick(nodes.filter(n => n.t === 'hbm'));
        const c = pick(computes.filter(n => n !== attacker || isolated));
        spawn(Math.random() < .5 ? route(io, c) : route(hbm, c), 'data');
        if (attacker && !isolated) spawn([victim, attacker], 'leak', 90);
      }
    }
    packets = packets.filter(p => {
      const a = p.path[p.i], b = p.path[p.i + 1];
      if (!b) { p.dot.remove(); return false; }
      const len = Math.hypot(b.cx - a.cx, b.cy - a.cy);
      p.t += (p.speed * dt) / len;
      if (p.t >= 1) { p.t = 0; p.i++; if (!p.path[p.i + 1]) { p.dot.remove(); return false; } }
      const A = p.path[p.i], B = p.path[p.i + 1];
      p.dot.setAttribute('cx', A.cx + (B.cx - A.cx) * p.t); p.dot.setAttribute('cy', A.cy + (B.cy - A.cy) * p.t);
      return true;
    });
    rings = rings.filter(rg => {
      if (!rg.el) rg.el = el('circle', { cx: sec.cx, cy: sec.cy, r: 0, class: 'ex-ring' }, fxLayer);
      rg.r += 170 * dt; rg.el.setAttribute('r', rg.r); rg.el.style.opacity = Math.max(0, 1 - rg.r / 300);
      if (attacker && !isolated && rg.r >= Math.hypot(attacker.cx - sec.cx, attacker.cy - sec.cy)) {
        isolated = true; paint(); setStatus('✓ Suspicious channel flagged'); show(attacker);
      }
      if (rg.r > 300) { rg.el.remove(); if (mode === 'detect' && !isolated) rings.push({ r: 0 }); return false; }
      return true;
    });
    requestAnimationFrame(tick);
  }
  root.querySelectorAll('.ex-btn').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  if (!reduced) requestAnimationFrame(tick);
})();
