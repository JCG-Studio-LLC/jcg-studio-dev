// Live grid tiles (2026-11-24). A card with data-tile="<id>"
// gets the layers from work/<id>/tile.js over its cover picture. The layers are the cover itself taken apart, so the swap is
// invisible; then the tile stays alive (Ethos: the site's own flowers sway and spin; Aspera: the site's
// 3D model turns, and a mouse moves its window into the core, as on its homepage).
// No parallax or lift (JC 2026-11-25): only the client's own motion. The Ethos flowers spin all the time (JC 2026-11-25).
// Reduced motion: everything stays still.
const ROOT = new URL('../', import.meta.url).href;
const css = `
[data-tile] { overflow: hidden; container-type: inline-size; }
[data-tile] .tl { position: absolute; inset: 0; display: block; overflow: hidden; border-radius: inherit; opacity: 0; transition: opacity .45s ease; pointer-events: none; }
[data-tile].tl-ready .tl { opacity: 1; } .js .card--art:not(.is-built) .tl { opacity: 0; }
[data-tile] .tl > * { position: absolute; display: block; }
[data-tile] .tl .tl-bg { inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 0; }
[data-tile] .tl .tl-fg img, [data-tile] .tl .tl-fg svg { display: block; width: 100%; height: auto; object-fit: fill; border-radius: 0; }
.tl-scr { overflow: clip; } .tl-scr .garden { position: absolute; pointer-events: auto; } .tl-scr .garden.g-clip { overflow: hidden; }
.tl .garden svg { display: block; width: 100%; height: 100%; overflow: visible; }
.tl .garden .g-bloom, .tl .garden .g-sway, .tl .garden .g-spin { transform-origin: 0 0; }
@media (prefers-reduced-motion: no-preference) {
  .tl .garden .g-sway { animation: tl-sway var(--t, 8s) ease-in-out infinite alternate; }
  /* JC 2026-11-25: the tile's flower heads always spin, bigger, so the motion reads at grid size; the leafy sprigs only sway */
  .tl .garden .g-flower .g-spin { animation: tl-spin var(--sp, 9s) linear infinite; }
  .tl .garden .g-flower:nth-child(even) .g-spin { --sp: 12s; animation-direction: reverse; }
  .tl .garden .g-flower:nth-child(3n) .g-spin { --sp: 7.5s; }
  @keyframes tl-spin { from { transform: rotate(0deg) scale(1.45); } to { transform: rotate(360deg) scale(1.45); } }
  .tl .garden .g-lean { transition: transform .6s cubic-bezier(.2, .7, .2, 1); }
  @keyframes tl-sway { from { transform: rotate(calc(var(--a, 4deg) * -1)) scale(.95); } to { transform: rotate(var(--a, 4deg)) scale(1.05); } }
}`;
const cards = [...document.querySelectorAll('[data-tile]')];
if (cards.length) {
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
  let garden = false, world = false;
  const ready = await Promise.all(cards.map(async (card) => {
    try {
      const t = await import(`./${card.dataset.tile}/tile.js?v=20261125m`);
      const box = document.createElement('div'); box.className = 'tl'; box.setAttribute('aria-hidden', 'true');
      box.innerHTML = t.html.replaceAll('@R@', ROOT); card.appendChild(box); garden ||= !!t.garden; world ||= !!t.world;
      if (t.css) document.head.insertAdjacentHTML('beforeend', `<style>${t.css}</style>`);
      await Promise.all([...box.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
      return card;
    } catch (e) { return null; }
  }));
  if (garden) await import('./ethos-therapy/garden.js?v=20261124a');
  if (world) await import('./aspera/world.js?v=20261125i');          // Aspera: the site's own 3D model, live in its tile (the still stays under it)
  // garden.js would bloom the flowers in; on a tile they are already open (the swap from the cover must not show)
  document.querySelectorAll('.tl .garden').forEach((g) => g.classList.add('in'));
  const live = ready.filter(Boolean); live.forEach((c) => c.classList.add('tl-ready'));
}
