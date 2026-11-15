import * as THREE from 'three';

// The products themselves are drawn by their own viewers (products/*.html, the brand's
// product pages), each in a frame stacked with the 3D scene:
//   keyring, waterdrop – 'drive': drawn behind the (see-through) scene with the scene's own
//                        camera, one frame at a time, so the swim bear plays on top of them
//   grip, magnets      – 'embed': shown over the scene and run themselves (turn, zoom, move parts)
const SOURCES = {
  keyring: ['products/keyring.html', 'drive', '수영장 레인 키링'],
  waterdrop: ['products/waterdrop.html', 'drive', 'Water Drop 물방울'],
  grip: ['products/griptok.html', 'embed', '수영장 그립톡 3D 보기'],
  magnets: ['products/magnets.html', 'embed', '수영장 마그넷 세트 3D 보기'],
};

export function createProductViewers() {
  const layer = document.querySelector('#viewers');
  const items = {}, background = new THREE.Color(0xefebe3);
  let shown = null, stamp = 0;
  // A browser only allows so many 3D canvases at once (about 8 on phones, 16 on desktops),
  // and the bears use several. Past the limit it drops the oldest one — which can be the
  // scene itself. So only the viewers in use are kept; the others are let go completely.
  const KEEP = matchMedia('(pointer: coarse)').matches ? 1 : 2;
  function unload(id) {
    const item = items[id]; if (!item) return;
    try { item.frame.contentDocument?.querySelector('canvas#gl')?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* already gone */ }
    item.frame.remove(); delete items[id];
  }
  function trim() {
    const others = Object.values(items).filter(item => item.id !== shown).sort((a, b) => b.used - a.used);
    for (const item of others.slice(Math.max(0, KEEP - (shown ? 1 : 0)))) unload(item.id);
  }
  // (getHexString gives the display colour, which is what the viewers work in)
  const paint = item => {
    if (!item.api) return;
    const hex = background.getHexString();
    if (item.id === 'keyring') item.api.setBG('#' + hex); else item.api.setBG([0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255));
  };
  const lift = item => { try { item.frame.contentDocument?.documentElement.style.setProperty('--site-bottom', `${bottom}px`); } catch { /* not loaded yet */ } };
  let bottom = 150;
  function load(id) {
    if (items[id] || !layer || !SOURCES[id]) return items[id] ?? {};
    const [src, mode, title] = SOURCES[id];
    const frame = document.createElement('iframe');
    frame.className = mode; frame.title = title; frame.src = `${src}?site=${mode}&bg=${background.getHexString()}`;
    if (mode === 'drive') { frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1; }
    layer.appendChild(frame);
    const item = items[id] = { id, frame, mode, api: null, used: ++stamp };
    const poll = () => {
      let site = null; try { site = frame.contentWindow?.__site; } catch { /* cross-origin never happens here */ }
      if (site?.ready) { item.api = site; frame.classList.add('ready'); paint(item); lift(item); } else setTimeout(poll, 150);
    };
    frame.addEventListener('load', poll);
    return item;
  }
  return {
    load,
    // which product is on screen (or none)
    show(id) {
      shown = id && SOURCES[id] ? id : null;
      if (shown) { load(shown).used = ++stamp; trim(); }
      for (const key in items) items[key].frame.classList.toggle('on', key === shown);
      document.body.classList.toggle('viewer-embed', !!shown && SOURCES[shown][1] === 'embed');
    },
    get shown() { return shown; },
    mode(id) { return SOURCES[id]?.[1]; },
    api(id) { return items[id]?.api ?? null; },
    // the scene's background colour (changes with the lighting mood)
    setBackground(color) { background.copy(color); document.documentElement.style.setProperty('--scene-bg', '#' + color.getHexString()); for (const key in items) paint(items[key]); },
    // keeps the viewers' own buttons clear of the site's tabs
    setBottom(px) { bottom = px; for (const key in items) lift(items[key]); },
  };
}
