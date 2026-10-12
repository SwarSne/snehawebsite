/* Chip-grid decoration: die cells that "compute" and glow near the cursor, plus
   animated signal pulses on the background circuit traces. No dependencies. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const grids = [...document.querySelectorAll('.chip-grid')];
  grids.forEach(g => {
    const cols = +g.dataset.cols || 10, rows = +g.dataset.rows || 6;
    g.style.setProperty('--cols', cols); g.style.setProperty('--rows', rows);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < cols * rows; i++) {
      const c = document.createElement('span'); c.className = 'core';
      if (Math.random() < .12) c.classList.add('mem');
      frag.appendChild(c);
    }
    // pins
    const pkg = g.closest('.chip-pkg');
    pkg.querySelectorAll('.pins').forEach(p => {
      const n = p.classList.contains('pins-t') || p.classList.contains('pins-b') ? cols + 2 : rows + 1;
      for (let i = 0; i < n; i++) p.appendChild(document.createElement('i'));
    });
    g.appendChild(frag);
    const cells = [...g.children];
    if (!reduced) {
      // random "compute" bursts
      setInterval(() => {
        for (let k = 0; k < 3; k++) {
          const c = cells[Math.floor(Math.random() * cells.length)];
          c.classList.add('hot'); setTimeout(() => c.classList.remove('hot'), 900 + Math.random() * 600);
        }
      }, 420);
      // glow near the pointer
      addEventListener('pointermove', e => {
        const r = g.getBoundingClientRect();
        if (e.clientX < r.left - 80 || e.clientX > r.right + 80 || e.clientY < r.top - 80 || e.clientY > r.bottom + 80) return;
        cells.forEach(c => {
          const b = c.getBoundingClientRect();
          const d = Math.hypot(b.left + b.width / 2 - e.clientX, b.top + b.height / 2 - e.clientY);
          c.style.setProperty('--near', Math.max(0, 1 - d / 110).toFixed(2));
        });
      }, { passive: true });
      g.addEventListener('pointerleave', () => cells.forEach(c => c.style.setProperty('--near', 0)));
    }
  });
})();
