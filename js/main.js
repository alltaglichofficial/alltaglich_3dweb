import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWorld } from './world.js';
import { ISLANDS } from './islands.js';
import { Navigation } from './navigation.js';
import { createDog } from './dog.js';
import { createBondInteractions } from './bond.js';
import { createLighting, LIGHTS } from './lighting.js';

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
  const renderer = new THREE.WebGLRenderer({ antialias: !coarse, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 1.8));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .98;
  renderer.domElement.setAttribute('aria-label', '회전과 확대가 가능한 3D 스포츠 섬');
  mount.appendChild(renderer.domElement);

  const lighting = createLighting(scene, renderer, { coarse });

  const worlds = ISLANDS.map(island => {
    const world = createWorld(scene, island);
    world.navigation = new Navigation(world.obstacles, world.navigationOptions);
    world.root.visible = false;
    return world;
  });
  await Promise.all(worlds.map(world => world.ready));
  worlds.forEach(world => world.setupEnvironment?.(renderer));
  worlds.forEach(world => world.precompile?.(renderer, scene, camera));
  // Lighting: the lamp-lit studio, a dark room, or one of 34 photographic
  // set-ups from the picker. ?mood=dark (or ?mood=rembrandt ...) opens straight in it.
  const moodButton = document.querySelector('#moodToggle');
  const lightPanel = document.querySelector('#light-panel'), lightName = document.querySelector('#light-name');
  const storedMood = () => { try { return localStorage.getItem('alltaglich-mood'); } catch { return null; } };
  for (const light of LIGHTS) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.light = light.id; button.title = light.en;
    button.innerHTML = `<b>${light.no ? String(light.no).padStart(2, '0') : '·'}</b><span>${light.ko}</span>`;
    document.querySelector('#light-list').appendChild(button);
  }
  function setMood(name) {
    const mood = lighting.setMood(name, worlds);
    const dark = lighting.ui === 'dark';
    moodButton.setAttribute('aria-pressed', String(dark));
    moodButton.setAttribute('aria-label', dark ? '밝은 조명으로 바꾸기' : '어두운 방 분위기로 바꾸기');
    moodButton.title = moodButton.getAttribute('aria-label');
    document.querySelectorAll('[data-light]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.light === mood)));
    lightName.textContent = lighting.label;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0f1013' : '#f3f0e8');
    return mood;
  }
  function chooseMood(name, message) {
    const mood = setMood(name);
    try { localStorage.setItem('alltaglich-mood', mood); } catch { /* private mode: mood just isn't remembered */ }
    document.querySelector('#status').textContent = message || `조명을 ${lighting.label}(으)로 바꿨어요.`;
    return mood;
  }
  setMood(new URLSearchParams(location.search).get('mood') || storedMood() || 'lamp');
  moodButton.addEventListener('click', () => {
    const mood = lighting.ui === 'dark' ? 'lamp' : 'dark';
    chooseMood(mood, mood === 'dark' ? '어두운 방에서 조명 하나만 켠 분위기예요.' : '부드러운 실내 조명으로 밝혔어요.');
  });
  document.querySelector('#light-list').addEventListener('click', event => {
    const button = event.target.closest('[data-light]'); if (button) chooseMood(button.dataset.light);
  });
  // Step through the set-ups without opening the list.
  document.querySelectorAll('[data-light-step]').forEach(button => button.addEventListener('click', () => {
    const index = LIGHTS.findIndex(light => light.id === lighting.mood);
    chooseMood(LIGHTS[(index + Number(button.dataset.lightStep) + LIGHTS.length) % LIGHTS.length].id);
    document.querySelector(`[data-light="${lighting.mood}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }));
  lightPanel.addEventListener('toggle', () => {
    const open = lightPanel.matches(':popover-open');
    document.querySelector('#lightMenu').setAttribute('aria-expanded', String(open));
    if (open) document.querySelector('[data-light][aria-pressed=true]')?.scrollIntoView({ block: 'center' });
  });
  let islandIndex = 0, world = worlds[0], navigation = world.navigation;
  world.root.visible = true;
  const puppy = createDog(world, navigation);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .065;
  controls.enablePan = false;
  controls.minPolarAngle = .22; controls.maxPolarAngle = Math.PI / 2 - .16;
  controls.minDistance = 12; controls.maxDistance = 125;
  controls.rotateSpeed = .6; controls.zoomSpeed = .8;
  controls.target.set(0, .2, 0);
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

  let transition = false, islandTransition = null, bond = null, dogView = false;
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
  function viewCenter() { const c = world.view?.center; return new THREE.Vector3(c?.x || 0, .3, c?.z || 0); }
  function resetCamera(immediate = false) {
    dogView = false; controls.minDistance = 12;
    goalTarget.copy(viewCenter());
    goalCamera.copy(goalTarget).addScaledVector(world.viewDirection ?? direction, fitDistance());
    lighting.aim(goalTarget.x, goalTarget.z, world.viewDirection ?? direction);
    if (immediate || motionPreference.matches) {
      camera.position.copy(goalCamera); controls.target.copy(goalTarget); controls.update(); transition = false;
    } else transition = true;
  }
  function focusDog(point) {
    dogView = true; controls.minDistance = 6;
    const p = point || puppy.root.position;
    goalTarget.set(p.x, (point ? world.heightAt(p.x, p.z) : p.y) + .65, p.z);
    goalCamera.copy(goalTarget).addScaledVector(direction, innerWidth <= 650 ? 10 : 7.5);
    if (motionPreference.matches) { camera.position.copy(goalCamera); controls.target.copy(goalTarget); controls.update(); transition = false; }
    else transition = true;
  }
  function updateIslandUI() {
    const island = ISLANDS[islandIndex];
    document.querySelectorAll('[data-island]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.island === island.id)));
    document.querySelector('#island-title').innerHTML = island.title;
    document.querySelector('#island-description').innerHTML = island.description;
    // The print tab only belongs to the pool island; it shows that island's current print.
    const printTab = document.querySelector('#print-tab');
    const here = worlds[islandIndex];
    document.querySelectorAll('.print-tab').forEach(el => { el.hidden = !here?.setPrint; });
    if (printTab && here?.setPrint) printTab.setAttribute('aria-pressed', String(here.print === 'photo'));
    document.querySelector('#island-eyebrow').textContent = island.english;
    document.querySelector('#island-name').textContent = island.label;
    document.querySelector('#island-number').textContent = island.number;
    document.querySelector('[data-command=play]').textContent = island.playLabel;
    document.querySelector('#prevIsland').setAttribute('aria-label', `${ISLANDS[(islandIndex + 2) % 3].label}으로 이동`);
    document.querySelector('#nextIsland').setAttribute('aria-label', `${ISLANDS[(islandIndex + 1) % 3].label}으로 이동`);
    document.documentElement.style.setProperty('--island-accent', island.accent);
    // Islands without the puppy (the pool): hide the dog and its care/command UI.
    const noDog = !!island.noDog;
    document.documentElement.classList.toggle('no-dog', noDog);
    puppy.root.traverse(o => { if (noDog) o.layers.disableAll(); else o.layers.set(0); });
    document.querySelector('#status').textContent = noDog ? `${island.label}에 도착했어요.` : `${island.label}에 도착했어요. 스피츠에게 명령해 보세요.`;
    bond?.onIslandChange();
  }
  function selectIsland(id, immediate = false, step = 1) {
    const index = ISLANDS.findIndex(island => island.id === id);
    if (index < 0) return;
    if (index === islandIndex) { world.onEnter?.(); return; }   // tapping the open island replays it
    bond?.endPetting();
    const outgoing = world;
    // Rapid clicks replace the current transition without leaving stray islands.
    for (const item of worlds) { item.root.visible = false; item.root.position.set(0, 0, 0); }
    islandIndex = index; world = worlds[index]; navigation = world.navigation;
    world.root.visible = true; puppy.setEnvironment(world, navigation);
    world.onEnter?.();
    if (immediate || motionPreference.matches) islandTransition = null;
    else {
      outgoing.root.visible = true;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      islandTransition = { outgoing, incoming: world, right, step, time: 0 };
      world.root.position.copy(right).multiplyScalar(step * 25);
    }
    resetCamera(immediate); updateIslandUI();
  }
  function nextIsland(step) { selectIsland(ISLANDS[(islandIndex + step + ISLANDS.length) % ISLANDS.length].id, false, step); }
  viewOffset(); resetCamera(true); updateIslandUI();
  controls.addEventListener('start', () => { transition = false; });
  document.querySelector('#print-tab')?.addEventListener('click', event => {
    const pool = worlds.find(w => w.setPrint); if (!pool) return;
    const next = pool.print === 'photo' ? 'lane' : 'photo';
    pool.setPrint(next); event.currentTarget.setAttribute('aria-pressed', String(next === 'photo'));
    document.querySelector('#status').textContent = next === 'photo' ? '수영장 바닥을 Prussian Blue 타일로 바꿨어요.' : '수영장 바닥을 레인 타일로 되돌렸어요.';
  });
  document.querySelectorAll('[data-island]').forEach(button => button.addEventListener('click', () => selectIsland(button.dataset.island, false, ISLANDS.findIndex(i => i.id === button.dataset.island) > islandIndex ? 1 : -1)));
  document.querySelector('#prevIsland').addEventListener('click', () => nextIsland(-1));
  document.querySelector('#nextIsland').addEventListener('click', () => nextIsland(1));
  document.querySelector('#resetView').addEventListener('click', () => { bond?.endPetting(); resetCamera(); });
  addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]') || event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); nextIsland(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  const commandLabels = { come: '이리 와! 스피츠가 섬 입구로 달려와요.', sit: '앉아! 다음 명령까지 앉아 있어요.', stay: '기다려! 다음 명령까지 그 자리에 있어요.', walk: '산책하며 이 섬에 어울리는 놀이를 즐겨요.', play: '좋아요! 이 섬에서 신나게 놀아 보아요.', feed: '밥그릇으로 가고 있어요. 다 먹으면 호감도 +15!', pet: '강아지 위에서 누른 채 좌우로 쓰다듬어 주세요.' };
  document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => {
    document.querySelector('.trick-menu').open = false;
    const accepted = puppy.execute(button.dataset.command);
    if (accepted && ['home', 'fetch', 'play'].includes(button.dataset.command)) resetCamera();
    const message = accepted ? commandLabels[button.dataset.command] : '안전한 길을 찾지 못했어요. 산책 후 다시 불러 주세요.';
    document.querySelector('#dog-message').textContent = message;
    document.querySelector('#status').textContent = message;
  }));

  Object.assign(commandLabels, { paw: '손! 앉아서 작은 앞발을 내밀어요.', highfive: '하이파이브! 앞발을 높이 들어 인사해요.', bang: '빵! 발라당 누워 배를 보여줘요. 다른 명령으로 일어나요.', fetch: '가져와! 공을 찾아 입에 물고 돌아와요.', home: '집으로 들어가요. 이리 와!를 누르면 다시 나와요.', greet: '안녕하세요! 고개를 끄덕이며 인사해요.' });
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const activePointers = new Set();
  let press = null, gesture = false;
  const canvas = renderer.domElement;
  // Pick up things on the current island (the pool's bear, the keyring chain):
  // each target in world.grabTargets gets grab(point, camera) / drag(ray, camera) /
  // release(). Runs before the orbit and petting handlers.
  let carry = null;
  const carryRay = event => {
    const r = canvas.getBoundingClientRect();
    pointer.set((event.clientX - r.left) / r.width * 2 - 1, -(event.clientY - r.top) / r.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  };
  canvas.addEventListener('pointerdown', event => {
    const targets = world.grabTargets;
    if (!targets?.length || event.button !== 0 || carry) return;
    carryRay(event);
    let best = null;
    for (const t of targets) {
      const hit = raycaster.intersectObjects(t.meshes || [t.object], true)[0];
      if (hit && (!best || hit.distance < best.hit.distance)) best = { t, hit };
    }
    if (!best) return;
    best.t.hitObject = best.hit.object;
    if (best.t.grab(best.hit.point, camera) === false) return;
    event.stopImmediatePropagation(); event.preventDefault();
    carry = { id: event.pointerId, target: best.t }; controls.enabled = false; transition = false;
    canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing';
    best.t.drag(raycaster.ray, camera);
  }, { capture: true });
  canvas.addEventListener('pointermove', event => {
    if (carry?.id !== event.pointerId) return;
    event.stopImmediatePropagation(); carryRay(event); carry.target.drag(raycaster.ray, camera);
  }, { capture: true });
  const drop = event => {
    if (carry?.id !== event.pointerId) return;
    event.stopImmediatePropagation();
    const t = carry.target; carry = null; controls.enabled = true; canvas.style.cursor = '';
    t.release();
  };
  canvas.addEventListener('pointerup', drop, { capture: true });
  canvas.addEventListener('pointercancel', drop, { capture: true });
  canvas.addEventListener('pointerdown', event => {
    activePointers.add(event.pointerId);
    if (activePointers.size > 1) { gesture = true; press = null; return; }
    gesture = false;
    press = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false };
  });
  canvas.addEventListener('pointermove', event => {
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 7) press.moved = true;
  });
  function release(event) {
    activePointers.delete(event.pointerId);
    if (!press || press.id !== event.pointerId || press.moved || gesture || event.type === 'pointercancel') { if (!activePointers.size) press = null; return; }
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = islandTransition || !puppy.root.visible ? null : raycaster.intersectObject(world.root, true)[0];
    let object = hit?.object;
    while (object && object !== puppy.root) object = object.parent;
    if (object === puppy.root) {
      puppy.greet(); document.querySelector('#status').textContent = '반가워요! 강아지가 꼬리를 흔들어요.';
    }
    press = null;
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', event => { activePointers.delete(event.pointerId); if (!activePointers.size) press = null; });
  bond = createBondInteractions({ puppy, canvas, camera, controls, getWorld: () => world, focusDog, resetView: () => resetCamera(), stopCamera: () => { transition = false; press = null; activePointers.clear(); }, notify: message => { document.querySelector('#dog-message').textContent = message; document.querySelector('#status').textContent = message; } });
  bond.onIslandChange();

  let frame = 0, previous = null, elapsed = 0, paused = false, lastCommand = '', lastMessage = '', lastTrick = null;
  function render(now) {
    if (paused) return;
    const dt = previous === null ? 0 : Math.min((now - previous) / 1000, .05);
    previous = now; elapsed += dt;
    puppy.update(dt, elapsed, reducedMotion); world.update(elapsed, reducedMotion); lighting.update(elapsed, reducedMotion, camera);
    const dog = puppy.snapshot();
    if (dog.trick.kind && dog.trick.kind !== lastTrick) focusDog();
    lastTrick = dog.trick.kind;
    bond.update(dog);
    const command = dog.activity.active && !dog.pendingCommand ? 'play' : dog.command;
    if (command !== lastCommand) {
      document.querySelectorAll('[data-command]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.command === command)));
      lastCommand = command;
    }
    const message = dog.activity.active ? dog.activity.label : dog.care.phase === 'eating' ? '냠냠! 맛있게 먹고 있어요.' : commandLabels[dog.command];
    if (message !== lastMessage) { document.querySelector('#dog-message').textContent = message; lastMessage = message; }
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
    controls.update(); renderer.render(scene, camera);
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
    renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 1.8));
    renderer.setSize(innerWidth, innerHeight); viewOffset(); if (dogView) focusDog(); else resetCamera(true);
  });
  resume();

  // Explicit opt-in diagnostics for local smoke checks; no extra production UI.
  if (new URLSearchParams(location.search).has('debug')) {
    window.__park = {
      ready: true, scene, camera, renderer, controls, puppy, worlds, lighting, setMood, affinity: bond.affinity, focusDog,
      get navigation() { return navigation; }, get world() { return world; },
      selectIsland, resetCamera, snapshot: () => ({ dog: puppy.snapshot(), island: world.island.id, switching: Boolean(islandTransition), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, cameraY: camera.position.y }),
      dogScreen: () => {
        const p = puppy.root.localToWorld(new THREE.Vector3(0, .7, 0)).project(camera);
        return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight };
      },
    };
  }
}
