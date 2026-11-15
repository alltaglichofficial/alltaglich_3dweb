import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWorld } from './world.js';
import { ISLANDS } from './islands.js';
import { setPlushCamera } from './plush.js';
import { createLighting, LAMP_HOME } from './lighting.js';

const loading = document.querySelector('#load-state');
const errorPanel = document.querySelector('#error-state');
document.querySelector('#reload').addEventListener('click', () => location.reload());
function fail(message) {
  loading.hidden = true;
  errorPanel.hidden = false;
  document.querySelector('#error-message').textContent = message;
}

try { await start(); } catch (error) {
  console.error(error);
  fail('3D 화면을 열지 못했어요. 최신 Chrome, Edge 또는 Safari에서 하드웨어 가속을 켜고 다시 열어 주세요.');
}

async function start() {
  const mount = document.querySelector('#scene');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference.matches;
  motionPreference.addEventListener('change', event => { reducedMotion = event.matches; });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, .1, 250);
  // see-through where nothing is drawn: on the Swim island the product viewers show from behind (viewers.js)
  const renderer = new THREE.WebGLRenderer({ antialias: !coarse, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.localClippingEnabled = true;   // the swim bear is cut at the water line (waterline.js)
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 1.8));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .98;
  renderer.domElement.setAttribute('aria-label', '회전과 확대가 가능한 3D 스포츠 섬');
  mount.appendChild(renderer.domElement);

  setPlushCamera(camera);
  const lighting = createLighting(scene, renderer, { coarse });
  const sceneBackground = scene.background;   // (taken off while a product viewer shows through, see render)

  const worlds = ISLANDS.map(island => {
    const world = createWorld(scene, island);
    world.root.visible = false;
    return world;
  });
  await Promise.all(worlds.map(world => world.ready));
  worlds.forEach(world => world.setupEnvironment?.(renderer));
  worlds.forEach(world => world.precompile?.(renderer, scene, camera));
  // compile every island's shaders up front (all roots briefly visible), so the first
  // visit to an island doesn't stall on shader compiles
  {
    const shown = worlds.map(w => w.root.visible); worlds.forEach(w => { w.root.visible = true; });
    try { renderer.compileAsync(scene, camera).catch(() => {}); } catch {}
    worlds.forEach((w, i) => { w.root.visible = shown[i]; });
  }
  // Lighting: the lamp-lit studio or a dark room (the moon button), and the key lamp can
  // be moved round the island from the light button. ?mood=dark opens straight in it.
  const moodButton = document.querySelector('#moodToggle');
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: not remembered */ } } };
  function setMood(name) {
    scene.background = sceneBackground;
    lighting.setMood(name, worlds);
    worlds.forEach(w => w.viewers?.setBackground(sceneBackground));
    const dark = lighting.ui === 'dark';
    moodButton.setAttribute('aria-pressed', String(dark));
    moodButton.setAttribute('aria-label', dark ? '밝은 조명으로 바꾸기' : '어두운 방 분위기로 바꾸기');
    moodButton.title = moodButton.getAttribute('aria-label');
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0f1013' : '#f3f0e8');
    return lighting.mood;
  }
  const askedMood = new URLSearchParams(location.search).get('mood') || store.get('alltaglich-mood');
  setMood(askedMood === 'dark' ? 'dark' : 'lamp');
  moodButton.addEventListener('click', () => {
    const mood = setMood(lighting.ui === 'dark' ? 'lamp' : 'dark');
    store.set('alltaglich-mood', mood);
    document.querySelector('#status').textContent = mood === 'dark' ? '어두운 방에서 조명 하나만 켠 분위기예요.' : '부드러운 실내 조명으로 밝혔어요.';
  });
  // The lamp pad: a top view of the island. The dot is the lamp — round the rim it is low,
  // in the middle straight overhead; the bottom of the pad is the camera's side.
  const lightPanel = document.querySelector('#light-panel'), pad = document.querySelector('#lamp-pad'), dot = document.querySelector('#lamp-dot');
  const heightInput = document.querySelector('#lamp-height');
  const LOW = 12, SPAN = 90 - LOW;
  function setLamp(az, el, save = true) {
    const lamp = lighting.setLamp(az, el);
    const r = (90 - lamp.el) / SPAN, a = THREE.MathUtils.degToRad(lamp.az);
    dot.style.left = `${50 + Math.sin(a) * r * 50}%`; dot.style.top = `${50 + Math.cos(a) * r * 50}%`;
    heightInput.value = String(Math.round(lamp.el));
    const side = Math.abs(lamp.az) < 25 ? '앞' : Math.abs(lamp.az) > 155 ? '뒤' : lamp.az > 0 ? '오른쪽' : '왼쪽';
    document.querySelector('#lamp-where').textContent = `${side} · 높이 ${Math.round(lamp.el)}°`;
    pad.setAttribute('aria-valuetext', `${side}, 높이 ${Math.round(lamp.el)}도`);
    worlds.forEach(w => w.viewers?.setLight(lamp.az, lamp.el));
    if (save) store.set('alltaglich-lamp', JSON.stringify(lamp));
  }
  {
    let saved = null; try { saved = JSON.parse(store.get('alltaglich-lamp')); } catch { /* none yet */ }
    setLamp(Number.isFinite(saved?.az) ? saved.az : LAMP_HOME.az, Number.isFinite(saved?.el) ? saved.el : LAMP_HOME.el, false);
  }
  const padPoint = event => {
    const r = pad.getBoundingClientRect(), dx = (event.clientX - r.left) / r.width * 2 - 1, dy = (event.clientY - r.top) / r.height * 2 - 1;
    setLamp(THREE.MathUtils.radToDeg(Math.atan2(dx, dy)), 90 - Math.min(1, Math.hypot(dx, dy)) * SPAN);
  };
  pad.addEventListener('pointerdown', event => { pad.setPointerCapture(event.pointerId); padPoint(event); event.preventDefault(); });
  pad.addEventListener('pointermove', event => { if (pad.hasPointerCapture(event.pointerId)) padPoint(event); });
  pad.addEventListener('keydown', event => {
    const step = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[event.key];
    if (!step) return;
    event.preventDefault(); const lamp = lighting.lamp; setLamp(lamp.az + step[0], lamp.el + step[1]);
  });
  heightInput.addEventListener('input', () => setLamp(lighting.lamp.az, Number(heightInput.value)));
  document.querySelector('#lampReset').addEventListener('click', () => { setLamp(LAMP_HOME.az, LAMP_HOME.el); document.querySelector('#status').textContent = '조명을 처음 자리로 옮겼어요.'; });
  lightPanel.addEventListener('toggle', () => {
    document.querySelector('#lightMenu').setAttribute('aria-expanded', String(lightPanel.matches(':popover-open')));
  });
  let islandIndex = 0, world = worlds[0];
  world.root.visible = true;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .065;
  controls.enablePan = false;
  controls.minPolarAngle = .22; controls.maxPolarAngle = Math.PI / 2 - .16;
  controls.minDistance = 12; controls.maxDistance = 125;
  controls.rotateSpeed = .6; controls.zoomSpeed = .8;
  controls.target.set(0, .2, 0);
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

  let transition = false, islandTransition = null;
  const goalCamera = new THREE.Vector3(), goalTarget = new THREE.Vector3();
  const direction = new THREE.Vector3(15, 23, 29).normalize();

  function viewOffset() {
    const portrait = innerWidth <= 650 && innerHeight > innerWidth;
    const wide = innerWidth > 1100;
    const vertical = portrait ? (innerHeight < 700 ? .025 : -.07) : innerHeight < 550 ? .10 : .005;
    camera.setViewOffset(innerWidth, innerHeight, wide ? -innerWidth * .09 : 0, innerHeight * vertical, innerWidth, innerHeight);
  }
  function fitDistance() {
    const testCamera = camera.clone(); testCamera.clearViewOffset();
    const target = viewCenter();
    const corners = [];
    if (world.view) {
      // Islands with their own framing box (the pool block with its deck and keyring hardware).
      const { min, max } = world.view;
      for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) corners.push(new THREE.Vector3(x, y, z));
    } else {
      for (let i = 0; i < 64; i++) for (const y of [-1.55, 2.8]) {
        const angle = i / 64 * Math.PI * 2;
        corners.push(new THREE.Vector3(Math.cos(angle) * 8.65, y, Math.sin(angle) * 7.6));
      }
      for (const x of [-3.6, 0, 3.6]) corners.push(new THREE.Vector3(x, 4.8, -1.95));
    }
    const portrait = innerWidth <= 650 && innerHeight > innerWidth;
    const width = innerWidth > 1100 ? 1.30 : portrait ? 1.65 : 1.7;
    const height = portrait ? (innerHeight < 700 ? .60 : .76) : innerHeight < 550 ? 1.05 : 1.30;
    let low = 12, high = 125;
    for (let i = 0; i < 16; i++) {
      const distance = (low + high) / 2;
      testCamera.position.copy(target).addScaledVector(world.viewDirection ?? direction, distance);
      testCamera.lookAt(target); testCamera.updateMatrixWorld();
      const projected = corners.map(p => p.clone().project(testCamera));
      const w = Math.max(...projected.map(p => p.x)) - Math.min(...projected.map(p => p.x));
      const h = Math.max(...projected.map(p => p.y)) - Math.min(...projected.map(p => p.y));
      if (w > width || h > height) low = distance; else high = distance;
    }
    return high;
  }
  function viewCenter() { const c = world.view?.center; return new THREE.Vector3(c?.x || 0, c?.y ?? .3, c?.z || 0); }
  function resetCamera(immediate = false) {
    goalTarget.copy(viewCenter());
    goalCamera.copy(goalTarget).addScaledVector(world.viewDirection ?? direction, fitDistance());
    lighting.aim(goalTarget.x, goalTarget.z, world.viewDirection ?? direction);
    if (immediate || motionPreference.matches) {
      camera.position.copy(goalCamera); controls.target.copy(goalTarget); controls.update(); transition = false;
    } else transition = true;
  }
  // an embedded product viewer keeps its own buttons just above the island tabs
  function placeViewerButtons() { const nav = document.querySelector('.zone-nav'); if (nav) worlds.forEach(w => w.viewers?.setBottom(Math.round(innerHeight - nav.getBoundingClientRect().top + 58))); }
  function updateIslandUI() {
    const island = ISLANDS[islandIndex];
    // the droplet island is part of the swimming island: reached from its own tab there
    const main = island.partOf ?? island.id;
    document.querySelectorAll('[data-island]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.island === main)));
    // swimming island sub-tabs: Aquable (lane print) · Prussian Blue · Water Drop
    const poolWorld = worlds.find(w => w.setPrint);
    const sub = poolWorld && poolWorld.focus !== 'pool' ? poolWorld.focus : poolWorld?.print === 'photo' ? 'prussian' : 'aquable';
    document.querySelectorAll('.pool-sub').forEach(el => { el.hidden = main !== 'pool'; if (el.dataset.sub) el.setAttribute('aria-pressed', String(main === 'pool' && el.dataset.sub === sub)); });
    const toysTab = document.querySelector('#toys-tab');
    // Grip Tok: fold / open buttons
    const gripBox = document.querySelector('#grip-controls'), gripHere = main === 'pool' && poolWorld?.focus === 'grip';
    if (gripBox) { gripBox.hidden = !gripHere; if (gripHere) showGripState(); }
    const tray = document.querySelector('#toy-tray'), toysHere = main === 'pool' && poolWorld?.focus === 'pool';
    if (toysTab) { toysTab.hidden = !toysHere; if (!toysHere && tray) tray.hidden = true; toysTab.setAttribute('aria-pressed', String(!!tray && !tray.hidden)); }
    const worn = poolWorld?.toys ?? {};
    document.querySelectorAll('[data-toy]').forEach(el => el.setAttribute('aria-pressed', String(!!worn[el.dataset.toy])));
    document.querySelector('#island-title').innerHTML = island.title;
    document.querySelector('#island-description').innerHTML = island.description;
    // The print tab only belongs to the pool island; it shows that island's current print.
    const here = worlds[islandIndex];
    document.querySelector('#island-eyebrow').textContent = island.english;
    document.querySelector('#island-name').textContent = island.label;
    document.querySelector('#island-number').textContent = island.number;
    const mains = ISLANDS.filter(i => !i.partOf), at = mains.findIndex(i => i.id === main);
    document.querySelector('#prevIsland').setAttribute('aria-label', `${mains[(at + 2) % 3].label} 섬으로 이동`);
    document.querySelector('#nextIsland').setAttribute('aria-label', `${mains[(at + 1) % 3].label} 섬으로 이동`);
    document.documentElement.style.setProperty('--island-accent', island.accent);
    document.querySelector('#status').textContent = `${island.label}에 도착했어요.`;
    placeViewerButtons();
  }
  function selectIsland(id, immediate = false, step = 1) {
    const index = ISLANDS.findIndex(island => island.id === id);
    if (index < 0) return;
    if (index === islandIndex) { world.onEnter?.(); return; }   // tapping the open island replays it
    const outgoing = world; outgoing.onLeave?.();
    // Rapid clicks replace the current transition without leaving stray islands.
    for (const item of worlds) { item.root.visible = false; item.root.position.set(0, 0, 0); }
    islandIndex = index; world = worlds[index];
    world.root.visible = true;
    world.onEnter?.();
    if (immediate || motionPreference.matches) islandTransition = null;
    else {
      outgoing.root.visible = true;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      islandTransition = { outgoing, incoming: world, right, step, time: 0 };
      world.root.position.copy(right).multiplyScalar(step * 25);
    }
    resetCamera(immediate); updateIslandUI(); applyResolution();
  }
  // Moving between islands or products: a calm three-second loading screen covers the
  // change (and stays a little longer if the product has not finished loading).
  const travelEl = document.querySelector('#travel');
  let travelling = false;
  function travel(label, run) {
    if (travelling) return;
    if (!travelEl) { run(); return; }
    travelling = true;
    travelEl.querySelector('.travel-name').textContent = label;
    travelEl.hidden = false; travelEl.classList.remove('out'); void travelEl.offsetWidth; travelEl.classList.add('go');
    const started = performance.now();
    setTimeout(run, 350);   // once the screen is covered
    const finish = () => {
      const waited = performance.now() - started;
      if (waited < 3000 || (world.loading && waited < 12000)) { setTimeout(finish, 120); return; }
      travelEl.classList.add('out');
      setTimeout(() => { travelEl.hidden = true; travelEl.classList.remove('go', 'out'); travelling = false; }, 420);
    };
    setTimeout(finish, 3000);
  }
  function goIsland(id) {
    const index = ISLANDS.findIndex(island => island.id === id);
    if (index < 0) return;
    if (index === islandIndex) { selectIsland(id); return; }
    travel(ISLANDS[index].label, () => selectIsland(id, true));
  }
  function nextIsland(step) {
    // prev / next walk the main islands only (the droplet island counts as the pool)
    const mains = ISLANDS.filter(i => !i.partOf), here = ISLANDS[islandIndex], at = mains.findIndex(i => i.id === (here.partOf ?? here.id));
    goIsland(mains[(at + step + mains.length) % mains.length].id);
  }
  viewOffset(); resetCamera(true); updateIslandUI();
  controls.addEventListener('start', () => { transition = false; });

  // 물놀이: the button opens a small inventory above it. Toys are dragged from there onto
  // the bear (it puts them on); dragging a worn toy away, or tapping it, takes it off.
  function showGripState() {
    const g = worlds.find(w => w.gripFold)?.gripState;
    document.querySelectorAll('[data-grip]').forEach(b => {
      const k = b.dataset.grip;
      if (k === 'phone') { b.setAttribute('aria-pressed', String(!!g?.phone)); b.textContent = g?.phone ? '폰에서 떼기' : '폰에 부착'; }
      else { b.setAttribute('aria-pressed', String(g ? g.fold === Number(k) : k === '0')); b.disabled = !g; }
    });
  }
  {
    const poolW = worlds.find(w => w.gripFold);
    if (poolW) poolW.onGrip = showGripState;
    document.querySelectorAll('[data-grip]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.grip, g = poolW?.gripState; if (!g) return;
      if (k === 'phone') { poolW.gripPhone(!g.phone); resetCamera(); }
      else {
        const n = Number(k); poolW.gripFold(n);
        document.querySelector('#status').textContent = n === 0 ? (g.fold === 2 ? '끝까지 접었다 펴서 수영곰이 멀리 날아갔어요!' : g.fold === 1 ? '한 단 접었다 펴서 수영곰이 살짝 튀어 올랐어요.' : '그립톡이 이미 펴져 있어요.') : n === 1 ? '그립을 한 단 접었어요. 펴면 수영곰이 살짝 튀어 올라요.' : '그립을 끝까지 접었어요. 펴면 수영곰이 멀리 날아가요!';
      }
      showGripState();
    }));
  }
  document.querySelector('#toys-tab')?.addEventListener('click', () => {
    const tray = document.querySelector('#toy-tray'); tray.hidden = !tray.hidden; updateIslandUI();
    document.querySelector('#status').textContent = tray.hidden ? '물놀이 용품을 넣어 두었어요.' : '튜브, 오리발, 킥판이에요. 끌어서 수영곰에게 주세요.';
  });
  {
    const NAMES = { tube: '튜브를', fins: '오리발을', board: '킥판을' }, point = new THREE.Vector3();
    // is the pointer on (or near) the bear on screen?
    const overBear = (pool, x, y) => {
      pool.bearPoint(point); const reach = camera.position.distanceTo(point); point.project(camera);
      const bx = (point.x + 1) / 2 * innerWidth, by = (1 - point.y) / 2 * innerHeight;
      const radius = Math.max(46, innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * reach) * 1.5);
      return Math.hypot(x - bx, y - by) < radius;
    };
    document.querySelectorAll('[data-toy]').forEach(slot => {
      let drag = null;
      slot.addEventListener('pointerdown', event => {
        const pool = worlds.find(w => w.giveToy); if (!pool) return;
        slot.setPointerCapture(event.pointerId);
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, ghost: null, pool };
      });
      slot.addEventListener('pointermove', event => {
        if (!drag || event.pointerId !== drag.id) return;
        if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) {
          drag.ghost = slot.querySelector('svg').cloneNode(true); drag.ghost.setAttribute('class', 'toy-ghost'); document.body.appendChild(drag.ghost); slot.classList.add('dragging');
        }
        if (drag.ghost) { drag.ghost.style.left = `${event.clientX}px`; drag.ghost.style.top = `${event.clientY}px`; drag.ghost.classList.toggle('over', overBear(drag.pool, event.clientX, event.clientY)); }
      });
      const end = event => {
        if (!drag || event.pointerId !== drag.id) return;
        const { pool, ghost } = drag, key = slot.dataset.toy, had = !!pool.toys[key]; drag = null;
        slot.classList.remove('dragging'); ghost?.remove();
        if (event.type !== 'pointerup') return;
        let status;
        if (!ghost) status = had ? (pool.giveToy(key, false), `${NAMES[key]} 벗겼어요.`) : `${NAMES[key]} 끌어서 수영곰에게 주세요.`;   // a tap takes a worn toy off
        else if (overBear(pool, event.clientX, event.clientY)) { pool.giveToy(key, true); status = `수영곰이 ${NAMES[key]} 받았어요!`; }
        else if (had) { pool.giveToy(key, false); status = `${NAMES[key]} 벗겼어요.`; }
        else status = '수영곰 위에 놓아 주세요.';
        updateIslandUI(); document.querySelector('#status').textContent = status;
      };
      slot.addEventListener('pointerup', end); slot.addEventListener('pointercancel', end);
    });
  }
  document.querySelectorAll('[data-sub]').forEach(button => button.addEventListener('click', () => {
    const pool = worlds.find(w => w.setPrint), sub = button.dataset.sub;
    if (!pool) return;
    // a different product (or coming from another island) gets the loading screen; Aquable ↔ Prussian Blue only repaints
    const target = sub === 'drops' || sub === 'grip' || sub === 'magnet' ? sub : 'pool';
    if (ISLANDS[islandIndex].id !== 'pool' || pool.focus !== target) travel(button.textContent.trim(), () => showSub(pool, sub)); else showSub(pool, sub);
  }));
  function showSub(pool, sub) {
    if (ISLANDS[islandIndex].id !== 'pool') selectIsland('pool', true);
    // Water Drop puts the laptop where the keyring was (same island, same bear)
    if (sub === 'drops') { pool.setFocus('drops'); resetCamera(); updateIslandUI(); document.querySelector('#status').textContent = '노트북 위로 물방울이 떨어져요. 수영곰이 건너가서 피해 다녀요.'; return; }
    if (sub === 'grip' || sub === 'magnet') { pool.setFocus(sub); resetCamera(); updateIslandUI(); document.querySelector('#status').textContent = sub === 'grip' ? '그립톡 위에서 수영곰이 헤엄쳐요. 그립을 접었다가 펴 보세요.' : '수영곰이 스탠드를 올라가 오늘의 수영 기록을 적어요. 자석은 끌어서 옮길 수 있어요.'; return; }
    const print = sub === 'prussian' ? 'photo' : 'lane';
    if (pool.print !== print) pool.setPrint(print);
    if (pool.focus !== 'pool') { pool.setFocus('pool'); resetCamera(); }
    updateIslandUI();
    document.querySelector('#status').textContent = print === 'photo' ? '수영장 바닥을 Prussian Blue 타일로 바꿨어요.' : 'Aquable 레인 수영장이에요.';
  }

  document.querySelectorAll('[data-island]').forEach(button => button.addEventListener('click', () => goIsland(button.dataset.island)));
  document.querySelector('#prevIsland').addEventListener('click', () => nextIsland(-1));
  document.querySelector('#nextIsland').addEventListener('click', () => nextIsland(1));
  document.querySelector('#resetView').addEventListener('click', () => { resetCamera(); world.resetView?.(); });
  addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]') || event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); nextIsland(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const canvas = renderer.domElement;
  // Pick up things on the current island (the pool's bear, the keyring chain):
  // each target in world.grabTargets gets grab(point, camera) / drag(ray, camera) /
  // release(). Runs before the orbit handlers.
  let carry = null;
  const carryRay = event => {
    const r = canvas.getBoundingClientRect();
    pointer.set((event.clientX - r.left) / r.width * 2 - 1, -(event.clientY - r.top) / r.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  };
  canvas.addEventListener('pointerdown', event => {
    const targets = world.grabTargets;
    if ((!targets?.length && !world.grabFallback) || event.button !== 0 || carry) return;
    carryRay(event);
    let best = null;
    for (const t of targets ?? []) {
      const hit = raycaster.intersectObjects(t.meshes || [t.object], true)[0];
      if (hit && (!best || hit.distance < best.hit.distance)) best = { t, hit };
    }
    // nothing of the scene's: the island may hand the pointer on (the keyring's chain)
    if (!best) { const t = world.grabFallback?.(pointer, raycaster.ray); if (!t) return; best = { t, hit: { object: null, point: null } }; }
    best.t.hitObject = best.hit.object;
    if (best.t.grab(best.hit.point, camera) === false) return;
    event.stopImmediatePropagation(); event.preventDefault();
    carry = { id: event.pointerId, target: best.t, x: event.clientX, y: event.clientY, t: performance.now() }; controls.enabled = false; transition = false;
    canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing';
    best.t.drag(raycaster.ray, camera, pointer);
  }, { capture: true });
  canvas.addEventListener('pointermove', event => {
    if (carry?.id !== event.pointerId) return;
    event.stopImmediatePropagation(); carryRay(event); carry.target.drag(raycaster.ray, camera, pointer);
  }, { capture: true });
  const drop = event => {
    if (carry?.id !== event.pointerId) return;
    event.stopImmediatePropagation();
    const t = carry.target, tap = event.type === 'pointerup' && Math.hypot(event.clientX - carry.x, event.clientY - carry.y) < 7 && performance.now() - carry.t < 350;
    carry = null; controls.enabled = true; canvas.style.cursor = '';
    t.release();
    if (tap) t.tap?.();   // a quick tap on a plush bear opens it large
  };
  canvas.addEventListener('pointerup', drop, { capture: true });
  canvas.addEventListener('pointercancel', drop, { capture: true });
  // Keeps things smooth on slower graphics: each island remembers how sharp it can be
  // drawn. If frames stay slow there (the swimming island's refracting water is the
  // heavy one), the picture is rendered a step less sharp until it runs smoothly.
  const maxRatio = () => Math.min(devicePixelRatio, coarse ? 1.5 : 1.8);
  const sharpness = new Map();   // island id -> scale of maxRatio
  let slowFrames = 0, settle = 0;
  const applyResolution = () => {
    const want = Math.max(.6, maxRatio() * (sharpness.get(world.island.id) ?? 1));
    if (Math.abs(renderer.getPixelRatio() - want) > .01) { renderer.setPixelRatio(want); renderer.setSize(innerWidth, innerHeight); }
    slowFrames = 0; settle = 45;   // ignore the frames right after a change or an island switch
  };
  function tuneResolution(rawDt) {
    if (settle > 0) { settle--; return; }
    if (rawDt > 1 || document.hidden) return;   // a tab switch, not a slow frame
    slowFrames = rawDt > 1 / 42 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
    if (slowFrames < 24) return;
    const now = sharpness.get(world.island.id) ?? 1;
    if (maxRatio() * now <= .62) { slowFrames = 0; return; }
    sharpness.set(world.island.id, now * .82); applyResolution();
  }
  let frame = 0, previous = null, elapsed = 0, paused = false;
  const sunDirection = new THREE.Vector3();
  function render(now) {
    if (paused) return;
    const rawDt = previous === null ? 0 : (now - previous) / 1000;
    const dt = Math.min(rawDt, .05);
    previous = now; elapsed += dt;
    tuneResolution(rawDt);
    world.update(elapsed, reducedMotion); lighting.update(elapsed, reducedMotion, camera);
    if (islandTransition) {
      const slide = islandTransition;
      slide.time += dt;
      const t = Math.min(1, slide.time / .65), eased = t * t * (3 - 2 * t);
      slide.incoming.root.position.copy(slide.right).multiplyScalar(slide.step * 25 * (1 - eased));
      slide.outgoing.root.position.copy(slide.right).multiplyScalar(-slide.step * 25 * eased);
      if (t === 1) { slide.outgoing.root.visible = false; slide.outgoing.root.position.set(0, 0, 0); slide.incoming.root.position.set(0, 0, 0); islandTransition = null; }
    }
    if (transition) {
      const blend = 1 - Math.exp(-dt * 5);
      camera.position.lerp(goalCamera, blend); controls.target.lerp(goalTarget, blend);
      if (camera.position.distanceTo(goalCamera) < .025 && controls.target.distanceTo(goalTarget) < .025) transition = false;
    }
    controls.update();
    // Swim island: the product's own viewer is drawn behind the scene with this camera
    // (then the scene is drawn see-through over it), or shown instead of it.
    const layered = !islandTransition && world.renderLayer?.(camera, dt, renderer.getPixelRatio(), lighting.keyDirection(sunDirection));
    scene.background = layered ? null : sceneBackground;
    document.body.classList.toggle('layer-live', !!layered);
    if (!world.embedded) renderer.render(scene, camera);
    if (!loading.hidden) loading.hidden = true;
    frame = requestAnimationFrame(render);
  }
  function resume() { if (document.hidden) return; previous = null; paused = false; cancelAnimationFrame(frame); frame = requestAnimationFrame(render); }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { paused = true; cancelAnimationFrame(frame); previous = null; } else resume();
  });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); paused = true; cancelAnimationFrame(frame); fail('그래픽 연결이 잠시 끊겼어요. 다시 열기를 눌러 주세요.'); });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.max(.6, maxRatio() * (sharpness.get(world.island.id) ?? 1)));
    renderer.setSize(innerWidth, innerHeight); viewOffset(); resetCamera(true); placeViewerButtons();
  });
  resume();

  // Explicit opt-in diagnostics for local smoke checks; no extra production UI.
  if (new URLSearchParams(location.search).has('debug')) {
    window.__park = {
      ready: true, scene, camera, renderer, controls, worlds, lighting, setMood,
      get world() { return world; },
      selectIsland, resetCamera, snapshot: () => ({ island: world.island.id, switching: Boolean(islandTransition), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, cameraY: camera.position.y }),
    };
  }
}
