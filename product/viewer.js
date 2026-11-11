import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { RoomEnvironment } from './vendor/environments/RoomEnvironment.js';
import { createWaterMotion } from './water-motion.js';

const stage = document.querySelector('#stage');
document.querySelector('#retry').addEventListener('click', () => location.reload());
function fail(error) {
  console.error(error); document.querySelector('#loading').hidden = true;
  const panel = document.querySelector('#viewer-error'); panel.hidden = false;
  panel.querySelector('p').textContent = '제품 모델을 열지 못했습니다. 로컬 HTTP 서버와 브라우저의 하드웨어 가속을 확인해 주세요.';
}
try { await start(); } catch (error) { fail(error); }

async function start() {
  const coarse = matchMedia('(pointer:coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: !coarse, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .85;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf2f1ec);
  const camera = new THREE.PerspectiveCamera(31, 1, .005, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .07; controls.enablePan = false;
  controls.minPolarAngle = .003; controls.maxPolarAngle = Math.PI - .003; controls.minDistance = .55; controls.maxDistance = 18;
  controls.touches.ONE = THREE.TOUCH.ROTATE; controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(environment, .035).texture; environment.dispose(); pmrem.dispose();
  scene.environmentIntensity = .85;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd6d6cd, .65));
  const key = new THREE.DirectionalLight(0xfffcf5, 2.4); key.position.set(-2, 5, 3); key.castShadow = true;
  key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048); key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
  key.shadow.camera.near = .1; key.shadow.camera.far = 12; key.shadow.normalBias = .001; key.shadow.bias = -.00005; key.shadow.radius = 4; scene.add(key);
  const fill = new THREE.DirectionalLight(0xe6f4ff, .8); fill.position.set(3, 2, -3); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0xf3f2ee, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.018; floor.receiveShadow = true; scene.add(floor);
  const metrics = await fetch('./validation/model-metrics.json').then(r => { if (!r.ok) throw new Error('Metrics file missing'); return r.json(); });
  const gltf = await new GLTFLoader().loadAsync('./assets/swimming-pool-body.glb', progress => { if (progress.total) document.querySelector('#load-progress').textContent = ` ${Math.round(progress.loaded / progress.total * 100)}%`; });
  const asset = gltf.scene; scene.add(asset);
  const parts = [];
  asset.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = !object.material.transmission; object.receiveShadow = true;
    if (object.material.map) object.material.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    parts.push(object);
  });
  const water = asset.getObjectByName('Body_ClearWater_80pct_STL_Waves'), bodyFloor = asset.getObjectByName('Body_Floor_20pct');
  if (!water || !bodyFloor) throw new Error('Missing separate body layers');
  const waterMotion = createWaterMotion(water, bodyFloor);
  const motionPreference = matchMedia('(prefers-reduced-motion:reduce)');
  const box = new THREE.Box3().setFromObject(asset), centre = box.getCenter(new THREE.Vector3());
  const bodyBox = new THREE.Box3(new THREE.Vector3(-.5, 0, -metrics.layers.floor.size[1] / 2), new THREE.Vector3(.5, metrics.thickness.water_fraction * metrics.thickness.thickness_ratio * metrics.source.size[2] / metrics.source.size[0] + metrics.layers.floor.size[2], metrics.layers.floor.size[1] / 2));
  const originalHeight = metrics.source.size[2] / metrics.source.size[0];
  const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, originalHeight, metrics.layers.floor.size[1])), new THREE.LineDashedMaterial({ color: 0xb58c62, dashSize: .025, gapSize: .015, transparent: true, opacity: .8 }));
  ghost.position.set(0, originalHeight / 2, 0); ghost.computeLineDistances(); ghost.visible = false; scene.add(ghost);
  let activeView = 'oblique', paused = false, frame = 0;
  const directions = { oblique: new THREE.Vector3(1.4, 3, 3.3).normalize(), front: new THREE.Vector3(0, 1, .003).normalize(), side: new THREE.Vector3(1, .11, .02).normalize(), body: new THREE.Vector3(.8, 1.9, 2.0).normalize() };
  function selectView(name, bodyOnly = name === 'body') {
    const damping = controls.enableDamping; controls.enableDamping = false; controls.update();
    activeView = name;
    const bounds = bodyOnly ? bodyBox.clone() : box.clone();
    if (document.querySelector('#explode').checked) bounds.max.y += .48;
    const target = bounds.getCenter(new THREE.Vector3());
    const points = [];
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) points.push(new THREE.Vector3(x, y, z));
    let low = .6, high = 18;
    for (let i = 0; i < 18; i++) {
      const d = (low + high) / 2; camera.position.copy(target).addScaledVector(directions[name], d); camera.lookAt(target); camera.updateMatrixWorld();
      const projected = points.map(p => p.clone().project(camera));
      const width = Math.max(...projected.map(p => p.x)) - Math.min(...projected.map(p => p.x));
      const height = Math.max(...projected.map(p => p.y)) - Math.min(...projected.map(p => p.y));
      if (width > 1.58 || height > 1.48) low = d; else high = d;
    }
    controls.target.copy(target); camera.position.copy(target).addScaledVector(directions[name], high);
    controls.update(); controls.enableDamping = damping;
    document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === name)));
    document.querySelector('#viewer-status').textContent = `${({ oblique: '사선', front: '정면', side: '측면', body: '본체 확대' })[name]} 보기`;
  }
  function resize() { const bounds = stage.getBoundingClientRect(); camera.aspect = bounds.width / bounds.height; camera.updateProjectionMatrix(); renderer.setSize(bounds.width, bounds.height); selectView(activeView); }
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => selectView(button.dataset.view)));
  document.querySelector('#show-water').addEventListener('change', event => { water.visible = event.target.checked; });
  document.querySelector('#explode').addEventListener('change', event => { water.position.y = event.target.checked ? .48 : 0; selectView('body'); });
  document.querySelector('#compare-thickness').addEventListener('change', event => { ghost.visible = event.target.checked; if (ghost.visible) selectView('side'); });
  document.querySelector('#asset-info').textContent = `${parts.length}개 오브젝트 · 텍스처 GLB 내장 · 원본 STL 높이 ${originalHeight.toFixed(5)} → ${(originalHeight / 2).toFixed(5)} (폭=1 기준)`;
  addEventListener('resize', resize); resize();
  let previous = null, elapsed = 0;
  function render(now = performance.now()) {
    if (paused) return;
    elapsed += previous === null ? 0 : Math.min((now - previous) / 1000, .05); previous = now;
    waterMotion.update(elapsed, motionPreference.matches);
    controls.update(); renderer.render(scene, camera);
    document.querySelector('#loading').hidden = true; frame = requestAnimationFrame(render);
  }
  document.addEventListener('visibilitychange', () => { paused = document.hidden; previous = null; cancelAnimationFrame(frame); if (!paused) render(); });
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); paused = true; cancelAnimationFrame(frame); fail(new Error('WebGL context lost')); });
  render();
  if (new URLSearchParams(location.search).has('debug')) window.__productViewer = { ready: true, asset, scene, camera, renderer, controls, parts, metrics, water, waterMotion, bodyFloor, selectView, bounds: { min: box.min.toArray(), max: box.max.toArray(), size: box.getSize(new THREE.Vector3()).toArray(), centre: centre.toArray() } };
}
