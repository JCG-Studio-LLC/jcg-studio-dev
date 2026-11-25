// Live grid tiles (2026-11-24). A card with data-tile="<id>"
// gets the layers from work/<id>/tile.js over its cover picture. The layers are the cover itself taken apart, so the swap is
// invisible; then the tile stays alive (Ethos: the site's own flowers sway and twirl, as they do on her site).
// With a mouse the layers shift with the pointer for depth and the tile wakes up (screen or logo lifts, flowers twirl);
// on a phone each tile wakes up once as it scrolls into view. Reduced motion: the layers stay still.
const ROOT = new URL('../', import.meta.url).href;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches, mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
const css = `
[data-tile] { overflow: hidden; container-type: inline-size; }
[data-tile] .tl { position: absolute; inset: 0; display: block; overflow: hidden; border-radius: inherit; opacity: 0; transition: opacity .45s ease; pointer-events: none; }
[data-tile].tl-ready .tl { opacity: 1; } .js .card--art:not(.is-built) .tl { opacity: 0; }
[data-tile] .tl > * { position: absolute; display: block; }
[data-tile] .tl .tl-bg { inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 0; }
[data-tile] .tl .tl-fg img, [data-tile] .tl .tl-fg svg { display: block; width: 100%; height: auto; object-fit: fill; border-radius: 0; }
[data-tile] .tl .tl-bg, [data-tile] .tl .tl-fg { --k: 0; transform: translate3d(calc(var(--px, 0) * var(--k) * 1cqw), calc(var(--py, 0) * var(--k) * 1cqw), 0); }
[data-tile] .tl .tl-bg { --k: -1; } [data-tile] .tl .tl-fg { --k: 1.4; }
.tl-scr { overflow: clip; } .tl-scr .garden { position: absolute; pointer-events: auto; } .tl-scr .garden.g-clip { overflow: hidden; }
.tl .garden svg { display: block; width: 100%; height: 100%; overflow: visible; }
.tl .garden .g-bloom, .tl .garden .g-sway, .tl .garden .g-spin { transform-origin: 0 0; }
@media (prefers-reduced-motion: no-preference) {
  [data-tile] .tl .tl-bg, [data-tile] .tl .tl-fg { transition: transform .9s cubic-bezier(.16, 1, .3, 1); }
  [data-tile].tl-wake .tl .tl-bg { transform: translate3d(calc(var(--px, 0) * var(--k) * 1cqw), calc(var(--py, 0) * var(--k) * 1cqw), 0) scale(1.04); }
  [data-tile].tl-wake .tl .tl-fg { transform: translate3d(calc(var(--px, 0) * var(--k) * 1cqw), calc(var(--py, 0) * var(--k) * 1cqw - 1.6cqw), 0) scale(1.03); }
  .tl .garden .g-sway { animation: tl-sway var(--t, 8s) ease-in-out infinite alternate; }
  .tl .garden .g-spin { transition: transform .9s cubic-bezier(.34, 1.4, .64, 1); }
  .tl .garden .g-flower.twirl .g-spin { transform: rotate(72deg) scale(1.14); }
  .tl .garden .g-lean { transition: transform .6s cubic-bezier(.2, .7, .2, 1); }
  @keyframes tl-sway { from { transform: rotate(calc(var(--a, 4deg) * -1)) scale(.95); } to { transform: rotate(var(--a, 4deg)) scale(1.05); } }
}`;
const cards = [...document.querySelectorAll('[data-tile]')];
if (cards.length) {
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
  let garden = false;
  const ready = await Promise.all(cards.map(async (card) => {
    try {
      const t = await import(`./${card.dataset.tile}/tile.js?v=20261124a`);
      const box = document.createElement('div'); box.className = 'tl'; box.setAttribute('aria-hidden', 'true');
      box.innerHTML = t.html.replaceAll('@R@', ROOT); card.appendChild(box); garden ||= !!t.garden;
      await Promise.all([...box.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
      return card;
    } catch (e) { return null; }
  }));
  if (garden) await import('./ethos-therapy/garden.js?v=20261124a');
  // garden.js would bloom the flowers in; on a tile they are already open (the swap from the cover must not show)
  document.querySelectorAll('.tl .garden').forEach((g) => g.classList.add('in'));
  const live = ready.filter(Boolean); live.forEach((c) => c.classList.add('tl-ready'));
  const twirl = (f) => { f.classList.add('twirl'); setTimeout(() => f.classList.remove('twirl'), 900); };
  const wake = (c, on) => { c.classList.toggle('tl-wake', on); if (on) c.querySelectorAll('.g-flower').forEach((f, i) => setTimeout(() => twirl(f), i * 90)); };
  if (!calm) {
    const seen = new Set();
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target);
      if (!mouse && e.isIntersecting && !e.target.dataset.woke) {          // a phone has no hover: wake each tile once in view
        e.target.dataset.woke = 1; setTimeout(() => { wake(e.target, true); setTimeout(() => wake(e.target, false), 1700); }, 350);
      }
    }), { threshold: .6 });
    live.forEach((c) => io.observe(c));
    setInterval(() => seen.forEach((c) => { const fl = c.querySelectorAll('.g-flower'); if (fl.length) twirl(fl[Math.floor(Math.random() * fl.length)]); }), 2600);
    if (mouse) live.forEach((c) => {
      c.addEventListener('pointerenter', () => wake(c, true));
      c.addEventListener('pointerleave', () => { wake(c, false); c.style.removeProperty('--px'); c.style.removeProperty('--py'); });
      c.addEventListener('pointermove', (e) => {
        const b = c.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
        c.style.setProperty('--px', (x * 2 - 1).toFixed(3)); c.style.setProperty('--py', (y * 2 - 1).toFixed(3));
      }, { passive: true });
    });
  }
}
