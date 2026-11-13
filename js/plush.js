import * as THREE from 'three';

// The Alltäglich plush bears (bears/*.html) are their own little WebGL viewers.
// In the island scene each bear runs in a small hidden iframe in "drive" mode:
// the scene sets the bear's pose every frame (so it turns, swims, tumbles exactly
// like the object it stands in for, seen from the scene camera) and the iframe's
// picture is shown on a camera-facing sprite. Tapping a bear opens the same viewer
// large, where it can be turned, zoomed and poked like the stand-alone page.

export const PLUSH = {
  swim:          { src: 'bears/swim.html',         name: '수영곰' },
  climbBrown:    { src: 'bears/climb-brown.html',  name: '클라이밍곰 브라운' },
  climbOrange:   { src: 'bears/climb-orange.html', name: '클라이밍곰 오렌지' },
  tennis:        { src: 'bears/tennis.html',       name: '테니스곰' },
};

let sceneCamera = null;
export function setPlushCamera(camera) { sceneCamera = camera; }

// the viewers' own camera: 30° field of view, 9.8 away, looking slightly down
const FRAME = 2 * 9.8 * Math.tan(15 * Math.PI / 180);          // frame height in the viewer's units
const BEAR_SPAN = 2.51;                                         // the bear's height in the viewer's units (measured)
const TILT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.atan2(1.2, 9.8));
const all = [];

function host() {
  let el = document.getElementById('plush-host');
  if (!el) {
    el = document.createElement('div'); el.id = 'plush-host'; el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  return el;
}

/**
 * A plush bear in the scene.
 *  parent  – where the sprite lives
 *  kind    – key of PLUSH
 *  height  – the bear's height in world units
 * update(follow, opts) – follow: an Object3D whose world position/rotation the bear takes
 *   (the bear's centre), opts.swim: paddling limbs (and goggles down for the swim bear).
 */
export function createPlushBear(parent, kind, { height = 1.4 } = {}) {
  const info = PLUSH[kind];
  const iframe = document.createElement('iframe');
  // loaded lazily (first use, or a quiet moment after the page has settled)
  iframe.dataset.src = info.src + '?drive'; iframe.tabIndex = -1; iframe.title = info.name;
  iframe.className = 'plush-frame';
  host().appendChild(iframe);
  const TEX = 384, canvas = document.createElement('canvas'); canvas.width = canvas.height = TEX;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: .04, depthWrite: true }));
  const size = height / BEAR_SPAN * FRAME;
  sprite.scale.set(size, size, 1);
  // the bear's middle sits a little above the middle of the viewer's picture (measured: 12 of
  // 375 px); pin that point to the anchor so its feet stand exactly on the ground
  sprite.center.set(.5, .5 + 12 / 375);
  sprite.name = 'Plush:' + kind; sprite.renderOrder = 3; sprite.visible = false;
  parent.add(sprite);
  // an invisible box to tap / pick it up by
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(height * .72, height, height * .72), new THREE.MeshBasicMaterial({ visible: false }));
  parent.add(proxy);
  // soft contact shadow on whatever it stands on (the viewer's own floor shadow is off in the scene)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.5, 40), new THREE.MeshBasicMaterial({ color: 0x2c2a22, map: blobTexture(), transparent: true, opacity: .5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
  shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 2; shadow.visible = false; parent.add(shadow);

  const camPos = new THREE.Vector3(), qWorld = new THREE.Quaternion(), qCam = new THREE.Quaternion(), pos = new THREE.Vector3(), q = new THREE.Quaternion();
  const bear = { info, sprite, proxy, shadow, iframe, height, size, lastUsed: 0, ready: false, lastT: -1 };
  bear.load = () => { if (!iframe.src) iframe.src = iframe.dataset.src; };
  iframe.addEventListener('load', () => { bear.ready = true; });
  bear.update = (follow, { swim = false, goggles = swim, ground = null, limbs = null } = {}) => {
    bear.lastUsed = performance.now();
    bear.load();
    if (iframe.contentWindow) iframe.contentWindow.__paused = false;
    follow.updateWorldMatrix(true, false);
    follow.getWorldPosition(pos); follow.getWorldQuaternion(qWorld);
    parent.worldToLocal(proxy.position.copy(pos)); proxy.quaternion.copy(qWorld);
    // the picture is flat: stand it at the front of the bear (toward the camera), so it
    // never cuts into a wall or floor right behind or under the bear; scaled to keep its size
    if (sceneCamera) {
      sceneCamera.getWorldPosition(camPos); const d = camPos.distanceTo(pos), off = Math.min(height * .3, d * .3);
      pos.addScaledVector(camPos.sub(pos).normalize(), off); const k = (d - off) / d; sprite.scale.set(size * k, size * k, 1);
    }
    parent.worldToLocal(sprite.position.copy(pos));
    if (ground === null || ground === undefined) shadow.visible = false;
    else {
      const above = Math.max(0, proxy.position.y - height * .5 - ground), k = 1 / (1 + above * .7);
      shadow.visible = sprite.visible; shadow.position.set(proxy.position.x, ground + .012, proxy.position.z);
      shadow.scale.setScalar(height * (.8 + above * .2)); shadow.material.opacity = .5 * k;
    }
    const B = bear.ready && iframe.contentWindow?.__bear;
    if (!B || !sceneCamera) return;
    // the pose as the scene camera sees it, handed to the viewer (which adds its own slight tilt)
    sceneCamera.getWorldQuaternion(qCam);
    q.copy(qCam).invert().multiply(qWorld).premultiply(TILT);
    const S = B.S; S.q[0] = q.x; S.q[1] = q.y; S.q[2] = q.z; S.q[3] = q.w;
    S.wx = S.wy = 0; S.lastTouch = S.t; S.swimTarget = swim ? 1 : 0; S.goggleTarget = goggles ? 1 : 0; S.limbs = limbs;
    const src = iframe.contentDocument?.getElementById('gl');
    // only re-upload when the viewer has drawn a new frame
    if (src?.width && S.t !== bear.lastT) { bear.lastT = S.t; ctx.clearRect(0, 0, TEX, TEX); ctx.drawImage(src, 0, 0, TEX, TEX); texture.needsUpdate = true; sprite.visible = true; }
  };
  bear.poke = () => iframe.contentWindow?.__bear?.poke();
  bear.open = () => openPlushViewer(kind);
  all.push(bear);
  return bear;
}

let blob = null;
function blobTexture() {
  if (blob) return blob;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.4, 'rgba(255,255,255,.85)'); grad.addColorStop(.7, 'rgba(255,255,255,.3)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return (blob = new THREE.CanvasTexture(c));
}

// Warm the other bears up one at a time once the page is quiet, so visiting an island
// later doesn't stall while its viewer starts (each viewer builds its fur and shaders
// on its first frames, then goes back to sleep).
const whenLoaded = f => document.readyState === 'complete' ? f() : addEventListener('load', f);
let lastInput = 0;
addEventListener('pointerdown', () => { lastInput = performance.now(); }, true);
addEventListener('wheel', () => { lastInput = performance.now(); }, { capture: true, passive: true });
const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 4000 }) : setTimeout(f, 200));
whenLoaded(() => setTimeout(function warm() {
  const next = all.find(b => !b.iframe.src);
  if (!next) return;
  // never while someone is dragging or zooming: try again a little later
  if (performance.now() - lastInput < 1500) { setTimeout(warm, 1000); return; }
  next.warming = true; idle(() => next.load());
  const check = setInterval(() => {
    const S = next.iframe.contentWindow?.__bear?.S;
    if (S && S.t > .2) { clearInterval(check); next.warming = false; if (performance.now() - next.lastUsed > 5000) next.iframe.contentWindow.__paused = true; setTimeout(warm, 250); }
  }, 200);
}, 1200));

// Bears on islands that aren't shown stop rendering (their iframe is hidden).
setInterval(() => {
  const now = performance.now();
  for (const b of all) if (!b.warming && now - b.lastUsed > 5000 && b.iframe.contentWindow && !b.iframe.contentWindow.__paused) { b.iframe.contentWindow.__paused = true; b.sprite.visible = false; b.shadow.visible = false; }
}, 300);

// Large viewer: the stand-alone bear page over a soft backdrop.
let viewer = null;
export function openPlushViewer(kind) {
  const info = PLUSH[kind];
  if (!viewer) {
    viewer = document.createElement('div'); viewer.className = 'plush-viewer'; viewer.hidden = true;
    viewer.setAttribute('role', 'dialog'); viewer.setAttribute('aria-modal', 'true');
    viewer.innerHTML = '<div class="plush-card"><p class="plush-name"></p><iframe class="plush-big" title=""></iframe><p class="plush-hint">드래그해서 돌리고, 휠이나 두 손가락으로 확대해요. 톡 누르면 폴짝 뛰어요.</p><button type="button" class="plush-close" aria-label="닫기">×</button></div>';
    document.body.appendChild(viewer);
    const close = () => { viewer.hidden = true; viewer.querySelector('iframe').src = 'about:blank'; };
    viewer.querySelector('.plush-close').addEventListener('click', close);
    viewer.addEventListener('click', e => { if (e.target === viewer) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !viewer.hidden) close(); });
  }
  viewer.querySelector('.plush-name').textContent = info.name;
  const frame = viewer.querySelector('iframe'); frame.title = info.name + ' 3D'; frame.src = info.src;
  viewer.hidden = false;
  frame.addEventListener('load', () => frame.contentDocument?.getElementById('gl')?.focus(), { once: true });
}

// Pick-up-and-throw for a bear object (its origin `bottom` above its feet).
// grab / drag / release follow main.js's grab protocol; update(dt) runs the flight.
export function createThrowable(object, { bottom, groundAt, limit = (x, z) => [x, z] }) {
  const plane = new THREE.Plane(), hit = new THREE.Vector3(), offset = new THREE.Vector3(), normal = new THREE.Vector3();
  const v = new THREE.Vector3(), w = new THREE.Vector3(), track = [];
  const T = { state: null, spin: new THREE.Vector3(), settle: 0, upright: new THREE.Quaternion(), from: new THREE.Quaternion() };
  const local = p => object.parent.worldToLocal(p);
  T.busy = () => T.state !== null;
  T.velocity = v;
  // sent flying by code (a jump between the pool and the laptop)
  T.launch = (vel, spin = 4) => { v.copy(vel); T.spin.set(spin, 0, 0); T.state = 'fall'; };
  T.cancel = () => { T.state = null; };
  T.grab = (point, camera) => {
    if (T.locked) return;   // stuck in a water drop
    camera.getWorldDirection(normal); plane.setFromNormalAndCoplanarPoint(normal, point);
    object.getWorldPosition(offset).sub(point); track.length = 0; T.state = 'held'; v.set(0, 0, 0);
  };
  T.drag = ray => {
    if (T.locked || T.state !== 'held' || !ray.intersectPlane(plane, hit)) return;
    w.copy(hit).add(offset); local(w);
    const [x, z] = limit(w.x, w.z); w.x = x; w.z = z;
    w.y = Math.max(w.y, groundAt(w.x, w.z) + bottom + .05);
    const now = performance.now() / 1000;
    // a lifted bear swings a little toward where it is being pulled
    const dx = w.x - object.position.x;
    object.position.copy(w); object.rotation.set(0, object.rotation.y, THREE.MathUtils.clamp(-dx * 2, -.5, .5), 'YXZ');
    track.push({ t: now, p: w.clone() }); while (track.length > 2 && now - track[0].t > .12) track.shift();
  };
  T.release = () => {
    if (T.state !== 'held') return;
    if (track.length >= 2) { const a = track[0], b = track[track.length - 1], dt = Math.max(.016, b.t - a.t); v.copy(b.p).sub(a.p).divideScalar(dt); }
    if (v.length() > 24) v.setLength(24);
    T.spin.set((Math.random() - .5) * 2, (Math.random() - .5) * 3, (Math.random() - .5) * 2).multiplyScalar(.6 + v.length() * .35);
    T.state = 'fall';
  };
  T.update = dt => {
    if (T.state === 'fall') {
      v.y -= 30 * dt; object.position.addScaledVector(v, dt);
      const [x, z] = limit(object.position.x, object.position.z);
      if (x !== object.position.x) v.x *= -.4; if (z !== object.position.z) v.z *= -.4;
      object.position.x = x; object.position.z = z;
      object.rotation.x += T.spin.x * dt; object.rotation.y += T.spin.y * dt; object.rotation.z += T.spin.z * dt;
      const floor = groundAt(x, z) + bottom;
      if (object.position.y <= floor && v.y < 0) {
        object.position.y = floor;
        if (v.y < -4) { v.y *= -.38; v.x *= .6; v.z *= .6; T.spin.multiplyScalar(.5); return 'bounce'; }
        T.state = 'settle'; T.settle = 0; T.from.copy(object.quaternion);
        T.upright.setFromAxisAngle(new THREE.Vector3(0, 1, 0), object.rotation.y);
      }
      return 'fall';
    }
    if (T.state === 'settle') {
      // rolls back onto its feet
      T.settle = Math.min(1, T.settle + dt / .45);
      object.quaternion.slerpQuaternions(T.from, T.upright, 1 - Math.pow(1 - T.settle, 3));
      object.position.y = groundAt(object.position.x, object.position.z) + bottom + Math.sin(T.settle * Math.PI) * .25;
      if (T.settle >= 1) { T.state = null; object.rotation.set(0, object.rotation.y, 0, 'YXZ'); return 'landed'; }
      return 'settle';
    }
    return T.state;
  };
  return T;
}

// A grab target (see main.js): drag to carry and throw, quick tap to open large.
export function bearTarget(bear, throwable) {
  return {
    object: bear.proxy,
    grab: (point, camera) => throwable.grab(point, camera),
    drag: (ray) => throwable.drag(ray),
    release: () => throwable.release(),
    tap: () => { bear.open(); },
  };
}

// hide a three.js stand-in while keeping it pickable (raycasts ignore visibility)
export function hideMeshes(object, keep = []) {
  object.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && !keep.includes(o)) { o.material = Array.isArray(o.material) ? o.material : o.material; o.visible = false; } });
}

// Put a plush bear in place of a three.js bear object: hides its meshes (still pickable),
// adds an anchor at its middle and returns the plush, sized to match.
// An anchor at the middle of a three.js bear object (whose meshes are hidden), for a plush to follow.
export function plushAnchor(object) {
  const saved = object.quaternion.clone(); object.quaternion.identity(); object.updateWorldMatrix(true, true);   // parents too, or an offset parent skews the middle
  const box = new THREE.Box3().setFromObject(object), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const anchor = new THREE.Object3D(); anchor.name = 'PlushAnchor'; object.add(anchor);
  anchor.position.copy(object.worldToLocal(mid));
  object.quaternion.copy(saved);
  hideMeshes(object);
  return { anchor, height: size.y };
}
export function replaceWithPlush(parent, object, kind) {
  const { anchor, height } = plushAnchor(object), size = { y: height };
  const plush = createPlushBear(parent, kind, { height: size.y });
  plush.anchor = anchor;
  return plush;
}
