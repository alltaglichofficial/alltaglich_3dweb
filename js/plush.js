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
const BEAR_SPAN = 3.15;                                         // the bear's height in the viewer's units
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
  iframe.src = info.src + '?drive'; iframe.tabIndex = -1; iframe.title = info.name;
  iframe.className = 'plush-frame';
  host().appendChild(iframe);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: .04, depthWrite: true }));
  const size = height / BEAR_SPAN * FRAME;
  sprite.scale.set(size, size, 1);
  sprite.center.set(.5, .5 - .1 / FRAME);   // the viewer looks at (0, -.1, 0); the bear's centre is its origin
  sprite.name = 'Plush:' + kind; sprite.renderOrder = 3; sprite.visible = false;
  parent.add(sprite);
  // an invisible box to tap / pick it up by
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(height * .72, height, height * .72), new THREE.MeshBasicMaterial({ visible: false }));
  parent.add(proxy);

  const qWorld = new THREE.Quaternion(), qCam = new THREE.Quaternion(), pos = new THREE.Vector3(), q = new THREE.Quaternion();
  const bear = { info, sprite, proxy, iframe, lastUsed: 0, ready: false };
  iframe.addEventListener('load', () => { bear.ready = true; });
  bear.update = (follow, { swim = false, goggles = swim } = {}) => {
    bear.lastUsed = performance.now();
    if (iframe.style.display === 'none') iframe.style.display = '';
    follow.updateWorldMatrix(true, false);
    follow.getWorldPosition(pos); follow.getWorldQuaternion(qWorld);
    parent.worldToLocal(sprite.position.copy(pos)); proxy.position.copy(sprite.position); proxy.quaternion.copy(qWorld);
    const B = bear.ready && iframe.contentWindow?.__bear;
    if (!B || !sceneCamera) return;
    // the pose as the scene camera sees it, handed to the viewer (which adds its own slight tilt)
    sceneCamera.getWorldQuaternion(qCam);
    q.copy(qCam).invert().multiply(qWorld).premultiply(TILT);
    const S = B.S; S.q[0] = q.x; S.q[1] = q.y; S.q[2] = q.z; S.q[3] = q.w;
    S.wx = S.wy = 0; S.lastTouch = S.t; S.swimTarget = swim ? 1 : 0; S.goggleTarget = goggles ? 1 : 0;
    const src = iframe.contentDocument?.getElementById('gl');
    if (src?.width) { ctx.clearRect(0, 0, 512, 512); ctx.drawImage(src, 0, 0, 512, 512); texture.needsUpdate = true; sprite.visible = true; }
  };
  bear.poke = () => iframe.contentWindow?.__bear?.poke();
  bear.open = () => openPlushViewer(kind);
  all.push(bear);
  return bear;
}

// Bears on islands that aren't shown stop rendering (their iframe is hidden).
setInterval(() => {
  const now = performance.now();
  for (const b of all) if (now - b.lastUsed > 1500 && b.iframe.style.display !== 'none') { b.iframe.style.display = 'none'; b.sprite.visible = false; }
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

// A grab target (see main.js) that only reacts to a tap: opens the large viewer.
export function tapTarget(bear) {
  return { object: bear.proxy, grab() {}, drag() {}, release() {}, tap() { bear.open(); } };
}

// hide a three.js stand-in while keeping it pickable (raycasts ignore visibility)
export function hideMeshes(object, keep = []) {
  object.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && !keep.includes(o)) { o.material = Array.isArray(o.material) ? o.material : o.material; o.visible = false; } });
}

// Put a plush bear in place of a three.js bear object: hides its meshes (still pickable),
// adds an anchor at its middle and returns the plush, sized to match.
export function replaceWithPlush(parent, object, kind) {
  const saved = object.quaternion.clone(); object.quaternion.identity(); object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const anchor = new THREE.Object3D(); anchor.name = 'PlushAnchor'; object.add(anchor);
  anchor.position.copy(object.worldToLocal(mid));
  object.quaternion.copy(saved);
  hideMeshes(object);
  const plush = createPlushBear(parent, kind, { height: size.y });
  plush.anchor = anchor;
  return plush;
}
