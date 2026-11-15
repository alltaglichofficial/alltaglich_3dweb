import * as THREE from 'three';
import { createSwimBear } from './bear.js';
import { replaceWithPlush, plushCamera } from './plush.js';
import { createPoolGear } from './gear.js';
import { createDropletIsland } from './drops.js';
import { createProductViewers } from './viewers.js';
import { createGripPlay } from './gripplay.js';
import { createMagnetPlay } from './magnetplay.js';

// Swim island. The products are drawn by their own viewers (see viewers.js), stacked
// with this scene; what lives here is everything that plays on them:
//   Aquable / Prussian Blue – the lane keyring lying on the table: its resin block is the
//       pool the swim bear swims in (thrown, splashing, with pool toys)
//   Water Drop – drawn here, not by a viewer: drops fall onto a closed laptop (drops.js)
//       and the bear dodges them
//   Grip Tok – the grip on the table; the bear swims on its top and is flung up when it opens
//   Magnet – the A stand with its magnets; the bear climbs it and writes its swim log on the memo
// The keyring's resin block is 30 × 46.4 mm; here it is WALL_X × WALL_Z (half sizes).
const DECK_Y = -1.6, WALL_X = 5.6, WALL_Z = 8.654, UNIT = WALL_X / 15;   // world units per millimetre

export function createPoolIsland(scene, island) {
  const root = new THREE.Group(); root.name = 'island-pool'; scene.add(root);
  const viewers = createProductViewers();
  const poolGroup = new THREE.Group(); poolGroup.name = 'PoolIsland'; root.add(poolGroup);
  // ---- the keyring viewer: where its block is (viewer millimetres) and how high its waves stand
  let ring = null;   // { api, cx, cz, scale, grid }
  const keyring = () => {
    const api = viewers.api('keyring'); if (!api) { ring = null; return null; }
    if (ring?.api === api) return ring;   // (a viewer that was let go and loaded again is a new one)
    const b = api.box, scale = WALL_X * 2 / (b.maxX - b.minX);
    ring = { api, cx: (b.minX + b.maxX) / 2, cz: (b.minZ + b.maxZ) / 2, scale, grid: api.grid, top: b.top };
    api.setPrint(world.print === 'photo' ? 'prussian' : 'lane');
    return ring;
  };
  // the resin's wavy top under (x, z): the bear floats on it
  const surfaceHeight = (x, z) => {
    const k = keyring(); if (!k) return DECK_Y + 3.05;
    const { nx, nz, data } = k.grid;
    const u = THREE.MathUtils.clamp((x / WALL_X * .5 + .5) * nx - .5, 0, nx - 1.001), v = THREE.MathUtils.clamp((z / WALL_Z * .5 + .5) * nz - .5, 0, nz - 1.001);
    const i = u | 0, j = v | 0, fu = u - i, fv = v - j, p = j * nx + i;
    return DECK_Y + ((data[p] * (1 - fu) + data[p + 1] * fu) * (1 - fv) + (data[p + nx] * (1 - fu) + data[p + nx + 1] * fu) * fv) * k.scale;
  };
  // (the block is solid resin: the bear rides a little higher than it would in water, so it sits on the waves)
  const bearSurface = (x, z) => surfaceHeight(x, z) + .5;
  // Water thrown up when the bear plunges in. A bear fresh out of the water drips: drops
  // fall from it and leave wet spots on the table, and where it lands it leaves a puddle
  // that slowly dries.
  const wetMarks = createWetMarks(poolGroup, DECK_Y);
  const spray = createSpray(poolGroup, () => {}, (x, z, r) => wetMarks.add(x, z, r), DECK_Y);
  let wet = 0, dripIn = 0, lastBearState = '';
  const bearPlane = new THREE.Plane(), bearHit = new THREE.Vector3();
  const inPool = (x, z) => Math.abs(x) <= WALL_X && Math.abs(z) <= WALL_Z;
  const bear = createSwimBear(poolGroup, { x: 0, z: -.15 }, {
    inPool: (x, z) => Math.abs(x) <= WALL_X - .3 && Math.abs(z) <= WALL_Z - .3, groundY: DECK_Y,
    laneZ: WALL_Z - 1.5, laneX: WALL_X - 1.4,   // lengths are swum along Z, end wall to end wall
    clampIn: (x, z) => [Math.max(-WALL_X + 1.2, Math.min(WALL_X - 1.2, x)), Math.max(-WALL_Z + 1.2, Math.min(WALL_Z - 1.2, z))],
  });
  // shown as the Alltäglich swim bear plush (bears/swim.html); the three.js bear drives it
  const plush = replaceWithPlush(poolGroup, bear.object, 'swim');
  // Water Drop stands where the pool stands: choosing it puts the keyring away and brings
  // the laptop out in its place (and back again). It is the same swim bear in both.
  const LAP = { x: 0, z: -.5 };
  const dropsScene = createDropletIsland(null, { id: 'drops' }, {
    parent: poolGroup, x: LAP.x, z: LAP.z, plush,
    onLeave(position, velocity) { bear.launch(poolGroup.worldToLocal(position), velocity); },
  });
  const [LAP_W, LAP_D] = dropsScene.size;
  const overSheet = (x, z) => Math.abs(x - LAP.x) <= LAP_W / 2 && Math.abs(z - LAP.z) <= LAP_D / 2;
  const toSheet = (velocity, flying) => { dropsScene.receive(poolGroup.localToWorld(bear.object.position.clone()), velocity, flying); bear.park(); };
  // Pool toys (the 물놀이 button): a swim ring, fins and a kickboard the bear can be given.
  const anchorPos = new THREE.Vector3(), anchorQuat = new THREE.Quaternion();
  const toys = createPoolGear(poolGroup, {
    bearCentre: () => poolGroup.worldToLocal(plush.anchor.getWorldPosition(anchorPos)),
    bearQuat: () => plush.anchor.getWorldQuaternion(anchorQuat),
    bearHeight: plush.height, surfaceAt: (x, z) => surfaceHeight(x, z),
    onChange: g => { Object.assign(bear.gear, g); },
  });
  // Grip Tok: the grip stands where the pool stands, GRIP_K world units per millimetre
  const GRIP_K = .17;
  const grip = () => viewers.api('grip');
  const gripPlay = createGripPlay(poolGroup, { plush, groundY: DECK_Y, K: GRIP_K, site: grip, onReady: () => world.onGrip?.() });
  // open the grip: the bear on top goes flying, the further the more it was folded
  function gripFold(n) {
    const api = grip(); if (!api) return;
    const was = api.fold;
    if (n === 0 && was > 0) gripPlay.launch(was);
    api.setFold(n); world.onGrip?.();
  }
  const gripTarget = { object: gripPlay.gripProxy, grab() {}, drag() {}, release() {}, tap() { const api = grip(); if (api) gripFold(api.fold ? 0 : 1); } };
  // Magnet: the stand at the island's centre, MAG_K world units per millimetre (the bear is about 40 mm tall)
  const MAG_K = plush.height / 40;
  const magnets = () => viewers.api('magnets');
  const magnetPlay = createMagnetPlay(poolGroup, { plush, groundY: DECK_Y, K: MAG_K, site: magnets });
  // the magnets can be slid about the stand: the pointer is handed on to its viewer
  const toMM = (ray, out) => { offset.set(0, DECK_Y, 0); poolGroup.localToWorld(offset); return { o: ray.origin.clone().sub(offset).divideScalar(MAG_K).toArray(), d: ray.direction.toArray() }; };
  const magnetDrag = { grab() {}, drag(ray) { const r = toMM(ray); magnets()?.pointer.move(r.o, r.d); }, release() { magnets()?.pointer.up(); } };
  const LAYER = { pool: 'keyring', drops: null, grip: 'grip', magnet: 'magnets' };
  let focus = 'pool', grabbed = null, poolParts = null, toyLast = null, entered = false;
  dropsScene.root.visible = false;
  const POOL_VIEW = { center: { x: 0, z: -7.6 }, min: [-8.9, -1.75, -32.5], max: [8.9, 3.9, 16.1] };
  const DROPS_VIEW = { center: { x: LAP.x, z: LAP.z }, min: [LAP.x - LAP_W / 2 - .2, DECK_Y, LAP.z - LAP_D / 2 - .2], max: [LAP.x + LAP_W / 2 + .2, 2.6, LAP.z + LAP_D / 2 + .2] };
  const DROPS_DIR = new THREE.Vector3(29, 23, -15).normalize();
  const GRIP_DIR = new THREE.Vector3(16, 19, 24).normalize();
  const MAGNET_DIR = new THREE.Vector3(14, 12, 30).normalize();
  const MAGNET_VIEW = { center: { x: 0, y: DECK_Y + 80 * MAG_K, z: 15 * MAG_K }, min: [-75 * MAG_K, DECK_Y, -45 * MAG_K], max: [75 * MAG_K, DECK_Y + 175 * MAG_K, 100 * MAG_K] };
  const gripView = () => grip()?.phone
    ? { center: { x: 0, y: DECK_Y + 3, z: -10 * GRIP_K }, min: [-40 * GRIP_K, DECK_Y, -86 * GRIP_K], max: [40 * GRIP_K, DECK_Y + 32 * GRIP_K, 66 * GRIP_K] }
    : { center: { x: 0, y: DECK_Y + 26 * GRIP_K, z: 0 }, min: [-34 * GRIP_K, DECK_Y, -34 * GRIP_K], max: [34 * GRIP_K, DECK_Y + 62 * GRIP_K, 34 * GRIP_K] };
  bear.object.userData.noGrab = true;
  // Nothing of the table is drawn here, but a shadow-only ground keeps the bear grounded.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 110), new THREE.ShadowMaterial({ opacity: .18 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, DECK_Y - .005, -8); ground.receiveShadow = true; root.add(ground);
  const embedded = () => viewers.mode(LAYER[focus]) === 'embed';
  // the chain of the keyring can be picked up: the pointer is handed on to its viewer
  const chain = { grab() {}, drag(ray, camera, ndc) { keyring()?.api.pick()?.move(ndc.x, ndc.y); }, release() { keyring()?.api.pick()?.up(); } };
  const camPos = new THREE.Vector3(), camQuat = new THREE.Quaternion(), vp = new THREE.Matrix4(), place = new THREE.Matrix4(), offset = new THREE.Vector3();
  const world = {
    root, island, bear, dropsScene, viewers,
    // 'lane' (lane-mark tiles) or 'photo' (Prussian blue tiles in a black grid); switched from the bottom tab.
    print: 'lane',
    setPrint(kind) { world.print = kind === 'photo' ? 'photo' : 'lane'; keyring()?.api.setPrint(world.print === 'photo' ? 'prussian' : 'lane'); },
    // which product is on screen: 'pool' (the keyring), 'drops', 'grip' or 'magnet'
    get focus() { return focus; },
    get embedded() { return entered && embedded(); },
    setFocus(next) {
      const to = next in LAYER ? next : 'pool';
      if (to === focus) { if (to === 'drops') dropsScene.onEnter(); return; }
      focus = to;
      // everything that belongs to the pool (splashes, wet marks, toys) goes into one group
      // the first time, so it can be put away in one go
      if (!poolParts) {
        poolParts = new THREE.Group(); poolParts.name = 'PoolParts';
        const keep = new Set([dropsScene.root, plush.sprite, plush.proxy, plush.shadow, bear.object]);
        for (const child of [...poolGroup.children]) if (!keep.has(child)) poolParts.add(child);
        poolGroup.add(poolParts);
      }
      const drops = focus === 'drops', pool = focus === 'pool';
      poolParts.visible = pool; dropsScene.root.visible = drops;
      if (entered) viewers.show(LAYER[focus]);
      if (bear.state === 'held') bear.release();
      if (focus !== 'magnet') magnetPlay.leave();
      if (focus === 'magnet') {
        // the bear goes to write its swim log
        dropsScene.letGo(); bear.park(); gripPlay.leave(); magnetPlay.enter();
      } else if (focus === 'grip') {
        // the bear moves over to the grip
        dropsScene.letGo(); bear.park(); gripPlay.enter();
      } else if (!pool && !drops) {
        // product screens: the bear waits out of sight
        dropsScene.letGo(); bear.park(); gripPlay.leave(); plush.sprite.visible = false; plush.shadow.visible = false;
      } else if (drops) {
        gripPlay.leave();
        dropsScene.onEnter();   // the drops start over
        // the bear drops onto the sheet from where it was
        const at = bear.object.position;
        at.set(THREE.MathUtils.clamp(at.x, LAP.x - LAP_W / 2 + 2, LAP.x + LAP_W / 2 - 2), dropsScene.top + dropsScene.bearBottom + 2.2, THREE.MathUtils.clamp(at.z, LAP.z - LAP_D / 2 + 2, LAP.z + LAP_D / 2 - 2));
        toSheet(new THREE.Vector3(0, 1.5, 0), false);
      } else {
        // and plunges back into the pool
        gripPlay.leave();
        const at = plush.proxy.position.clone();
        at.set(THREE.MathUtils.clamp(at.x, -WALL_X + 1.6, WALL_X - 1.6), 4.2, THREE.MathUtils.clamp(at.z, -WALL_Z + 1.8, WALL_Z - 1.8));
        dropsScene.letGo(); bear.launch(at, { x: 0, y: 0, z: 0 });
      }
    },
    // still waiting for the product on screen to load
    get loading() { return !!LAYER[focus] && !viewers.api(LAYER[focus]); },
    setupEnvironment(renderer) { dropsScene.setupEnvironment?.(renderer); },
    onEnter() { entered = true; viewers.show(LAYER[focus]); if (focus === 'drops') dropsScene.onEnter(); },
    onLeave() { entered = false; viewers.show(null); },
    // ↺ in an embedded viewer puts its own camera back
    resetView() { if (embedded()) viewers.api(LAYER[focus])?.reset?.(); },
    // Draws the product behind the scene with the scene's camera. True if it did (the
    // scene is then drawn see-through on top of it).
    renderLayer(camera, dt, ratio, sun) {
      if (!entered || root.position.lengthSq() > 1e-6) return false;
      camera.updateMatrixWorld();
      if (focus === 'pool') {
        const k = keyring(); if (!k) return false;
        // scene → viewer millimetres: the block's centre sits at the island's centre, on the table
        camera.getWorldPosition(camPos); camera.getWorldQuaternion(camQuat);
        const view = camera.view?.enabled ? [camera.view.fullWidth, camera.view.fullHeight, camera.view.offsetX, camera.view.offsetY, camera.view.width, camera.view.height] : null;
        k.api.frame({ pos: [camPos.x / k.scale + k.cx, (camPos.y - DECK_Y) / k.scale, camPos.z / k.scale + k.cz], quat: camQuat.toArray(), fov: camera.fov, aspect: camera.aspect, near: camera.near / k.scale, far: camera.far / k.scale, offset: view, dt, ratio, sun: sun?.toArray() });
        return true;
      }
      if (focus === 'magnet') {
        const api = magnets(); if (!api) return false;
        offset.set(0, DECK_Y, 0); poolGroup.localToWorld(offset);
        place.makeScale(MAG_K, MAG_K, MAG_K).setPosition(offset);
        vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(place);
        camera.getWorldPosition(camPos).sub(offset).divideScalar(MAG_K);
        api.frame({ vp: vp.elements, cam: [camPos.x, camPos.y, camPos.z], ratio, sun: sun?.toArray() });
        return true;
      }
      if (focus === 'grip') {
        const api = grip(); if (!api) return false;
        // scene → grip millimetres: the grip's centre at the island's centre, standing on the table
        offset.set(0, DECK_Y, 0); poolGroup.localToWorld(offset);
        place.makeScale(GRIP_K, GRIP_K, GRIP_K).setPosition(offset);
        vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(place);
        camera.getWorldPosition(camPos).sub(offset).divideScalar(GRIP_K);
        api.frame({ vp: vp.elements, cam: [camPos.x, camPos.y, camPos.z], dt, ratio, sun: sun?.toArray() });
        return true;
      }
      return false;
    },
    // Grip Tok: fold (1 = one stage, 2 = all the way) or open (0), and the phone
    gripFold, get gripState() { const api = grip(); return api ? { fold: api.fold, phone: api.phone } : null; },
    gripPhone(on) { const api = grip(); if (!api) return; api.setPhone(on); world.onGrip?.(); },
    get view() { return focus === 'drops' ? DROPS_VIEW : focus === 'grip' ? gripView() : focus === 'magnet' ? MAGNET_VIEW : POOL_VIEW; },
    get viewDirection() { return focus === 'drops' ? DROPS_DIR : focus === 'grip' ? GRIP_DIR : focus === 'magnet' ? MAGNET_DIR : undefined; },
    get grabTargets() { return focus === 'pool' || focus === 'drops' ? world.grabTargets_ : focus === 'grip' ? [gripPlay.bearTarget, gripTarget] : focus === 'magnet' ? [magnetPlay.target] : []; },
    // nothing of ours under the pointer: maybe a part of the keyring's chain
    grabFallback(ndc, ray) {
      if (focus === 'magnet' && ray) { const r = toMM(ray); return magnets()?.pointer.down(r.o, r.d) ? magnetDrag : null; }
      return focus === 'pool' && keyring()?.api.pick()?.down(ndc.x, ndc.y) ? chain : null;
    },
    // the 물놀이 tray: which toys the bear has on, giving / taking one, and where the bear is
    get toys() { return { ...toys.gear }; },
    giveToy(key, on) { toys.set(key, on); },
    bearPoint(out = new THREE.Vector3()) { return plush.proxy.getWorldPosition(out); },
    grabTargets_: [{
      object: plush.proxy,
      // Carry on a camera-facing plane: anywhere on screen, and up as high as you like.
      grab(point, camera) {
        if (dropsScene.active) { grabbed = dropsScene.bearTarget; grabbed.grab(point, camera); return; }
        grabbed = null;
        bear.grab();
        const start = bear.object.getWorldPosition(new THREE.Vector3());
        bearPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), start);
      },
      drag(ray, camera) {
        if (grabbed) return grabbed.drag(ray, camera);
        if (!ray.intersectPlane(bearPlane, bearHit)) return;
        const p = poolGroup.worldToLocal(bearHit.clone());
        p.y = Math.max(DECK_Y + .7, Math.min(60, p.y));
        bear.drag(p);
      },
      release() { if (grabbed) { grabbed.release(); grabbed = null; } else bear.release(); },
      tap() { plush.open(); },
    }],
    getSurfaceHeight: surfaceHeight,
    heightAt(x, z) { return inPool(x, z) ? surfaceHeight(x, z) : DECK_Y; },
    update(time, reducedMotion) {
      if (embedded()) return;
      if (focus === 'magnet') { const mdt = Math.min(.05, Math.max(0, time - (toyLast ?? time))); toyLast = time; magnetPlay.update(time, mdt, reducedMotion); return; }
      if (focus === 'grip') { const gdt = Math.min(.05, Math.max(0, time - (toyLast ?? time))); toyLast = time; gripPlay.update(time, gdt, reducedMotion); return; }
      const b = bear.update(time, reducedMotion, bearSurface);
      // thrown onto the sheet: from here on the water-drop scene moves the bear
      if (!dropsScene.active && bear.state === 'falling') {
        const bp = bear.object.position, v = bear.velocity;
        if (focus === 'drops' && overSheet(bp.x, bp.z) && v.y < 0 && bp.y <= dropsScene.top + dropsScene.bearBottom + .15) toSheet(new THREE.Vector3(v.x * .5, v.y, v.z * .5), false);
      }
      if (focus === 'drops') dropsScene.update(time, reducedMotion);
      { const tdt = Math.min(.05, Math.max(0, time - (toyLast ?? time))); toyLast = time; toys.update(time, tdt, plushCamera(), bear.state === 'swim'); }
      if (!dropsScene.active) plush.update(plush.anchor, { swim: bear.state === 'swim' && !bear.gear.tube, goggles: bear.state === 'swim', ground: inPool(bear.object.position.x, bear.object.position.z) ? null : DECK_Y });
      if (b.splash >= .8 && !reducedMotion) spray.burst(b.x, surfaceHeight(b.x, b.z), b.z, b.splash);
      const sdt = Math.min(.05, Math.max(0, time - (spray.last ?? time))); spray.last = time;
      spray.update(sdt, surfaceHeight, inPool); wetMarks.update(sdt);
      {
        const st = bear.state, bp = bear.object.position, inWater = st === 'sink' || st === 'swim';
        if (inWater) wet = 1; else wet = Math.max(0, wet - sdt / 30);
        if (wet > .04 && !inWater && !reducedMotion && !dropsScene.active) {
          // drips, quicker while it is still soaked
          dripIn -= sdt;
          if (dripIn <= 0) { spray.drip(bp.x + (Math.random() - .5) * .7, bp.y - .2 - Math.random() * .3, bp.z + (Math.random() - .5) * .7, st === 'ground' ? .5 : 1); dripIn = (.05 + Math.random() * .2) / (.15 + wet); }
          // landing on the ground: a splat of water under and around the bear
          if (st === 'ground' && lastBearState !== 'ground') {
            wetMarks.add(bp.x, bp.z, .75 + wet * .55, true);
            for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2, d = .6 + Math.random() * .9; wetMarks.add(bp.x + Math.cos(a) * d, bp.z + Math.sin(a) * d, .12 + Math.random() * .2); }
            spray.burst(bp.x, DECK_Y, bp.z, .55 * wet);
          }
          // sitting on the ground the puddle under it keeps spreading a little
          if (st === 'ground' && Math.random() < sdt * .7) wetMarks.add(bp.x + (Math.random() - .5) * .8, bp.z + (Math.random() - .5) * .8, .25 + Math.random() * .25 * wet);
        }
        lastBearState = st;
      }
    },
    // the falling drops are compiled up front, though they stay hidden until first shown
    precompile(renderer, scene, camera) { const was = root.visible; root.visible = true; dropsScene.precompile(renderer, scene, camera); root.visible = was; },
    ready: Promise.resolve(),
  };
  // fetch the keyring viewer once the page has settled, so the Swim island opens ready
  setTimeout(() => viewers.load('keyring'), 2500);
  return world;
}

// Splash spray: a crown of clear drops flung out and up from where the bear hits the
// water, plus a few tall ones from the centre. One instanced mesh, so it costs a
// single draw call however many drops are in the air.
function createSpray(parent, ripple, onGround = () => {}, groundY = -1.6) {
  const COUNT = 140;
  const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, depthWrite: false, roughness: .03, ior: 1.33, clearcoat: 1, clearcoatRoughness: .02, specularIntensity: 1 });
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
      float rim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 1.8);
      float glint = saturate((max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b) - 1.0) * 1.2);
      gl_FragColor.rgb = mix(vec3(.66, .84, .90), vec3(1.), glint) * mix(1.0, .78, rim);
      gl_FragColor.a = saturate(.16 + rim * .6 + glint * .8);`);
  };
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), material, COUNT);
  mesh.name = 'BearSplashSpray'; mesh.frustumCulled = false; mesh.renderOrder = 4; mesh.castShadow = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); parent.add(mesh);
  const drops = Array.from({ length: COUNT }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: 0 }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  let next = 0;
  const hideAll = () => { m.makeScale(0, 0, 0); for (let i = 0; i < COUNT; i++) mesh.setMatrixAt(i, m); mesh.instanceMatrix.needsUpdate = true; };
  hideAll();
  return {
    burst(x, y, z, strength) {
      const k = Math.min(1.6, strength / 1.3), n = Math.round(34 + 30 * k);
      for (let i = 0; i < n; i++) {
        const d = drops[next++ % COUNT], a = Math.random() * Math.PI * 2, crown = i < n * .8;
        // crown drops leave the rim of the hole at a steep angle; the rest shoot up the middle
        const ring = crown ? .35 + Math.random() * .25 : Math.random() * .15;
        d.p.set(x + Math.cos(a) * ring, y + .05, z + Math.sin(a) * ring);
        const out = crown ? (1.6 + Math.random() * 2.6) * k : Math.random() * .6, rise = crown ? (3.2 + Math.random() * 3.4) * k : (6 + Math.random() * 4) * k;
        d.v.set(Math.cos(a) * out, rise, Math.sin(a) * out);
        d.r = crown ? .035 + Math.random() * .07 : .05 + Math.random() * .08; d.life = 3;
      }
    },
    drip(x, y, z, k = 1) {
      const d = drops[next++ % COUNT], a = Math.random() * Math.PI * 2, sp = Math.random() * .4 * k;
      d.p.set(x, y, z); d.v.set(Math.cos(a) * sp, -.5 - Math.random() * .5, Math.sin(a) * sp);
      d.r = .03 + Math.random() * .035; d.life = 3;
    },
    update(dt, surfaceHeight, inPool) {
      if (!dt) return;
      let any = false;
      for (let i = 0; i < COUNT; i++) {
        const d = drops[i]; if (d.life <= 0) continue;
        any = true; d.life -= dt; d.v.y -= 26 * dt; d.v.multiplyScalar(1 - dt * .25); d.p.addScaledVector(d.v, dt);
        const water = inPool(d.p.x, d.p.z), floor = water ? surfaceHeight(d.p.x, d.p.z) : groundY;
        if ((d.v.y < 0 && d.p.y <= floor) || d.life <= 0) {
          if (d.life > 0 && water && d.r > .06) ripple(d.p.x, d.p.z, .12);
          // outside the pool every drop leaves a little wet spot where it lands
          if (d.life > 0 && !water) onGround(d.p.x, d.p.z, d.r * (2.2 + Math.random() * 1.6));
          d.life = 0; m.makeScale(0, 0, 0); mesh.setMatrixAt(i, m); continue;
        }
        // stretched along the direction of travel, like a real flying drop
        const speed = d.v.length(); dir.copy(d.v).divideScalar(speed || 1); q.setFromUnitVectors(up, dir);
        const stretch = 1 + Math.min(1.4, speed * .08);
        sc.set(d.r / Math.sqrt(stretch), d.r * stretch, d.r / Math.sqrt(stretch));
        m.compose(d.p, q, sc); mesh.setMatrixAt(i, m);
      }
      if (any) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// Wet spots on the ground: soft-edged, slightly darker patches that dry out (fade)
// over half a minute or so. A fixed pool of decals, recycled oldest first.
function createWetMarks(parent, groundY) {
  const COUNT = 90, LIFE = 38;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  // an irregular blob: a few overlapping soft circles
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, r = i ? 22 + Math.random() * 10 : 40, x = 64 + (i ? Math.cos(a) * 22 : 0), y = 64 + (i ? Math.sin(a) * 22 : 0);
    const grad = g.createRadialGradient(x, y, r * .3, x, y, r); grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.75, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(2, 2); geo.rotateX(-Math.PI / 2);
  const marks = Array.from({ length: COUNT }, (_, i) => {
    const material = new THREE.MeshBasicMaterial({ color: 0x7a6f5c, alphaMap: tex, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const mesh = new THREE.Mesh(geo, material); mesh.visible = false; mesh.renderOrder = 1; parent.add(mesh);
    // a faint wet sheen on the bigger puddles
    return { mesh, age: LIFE, peak: 0, grow: 0, size: 1 };
  });
  let next = 0;
  return {
    add(x, z, r, big = false) {
      // merge into an existing fresh spot that it lands on, so puddles grow instead of stacking
      for (const m of marks) if (m.age < LIFE * .5 && Math.hypot(m.mesh.position.x - x, m.mesh.position.z - z) < m.size * .35 && m.size > r) { m.age = Math.min(m.age, 2); m.peak = Math.min(.42, m.peak + .03); return; }
      const m = marks[next++ % COUNT];
      m.mesh.position.set(x, groundY + .005 + (next % 7) * .0006, z); m.mesh.rotation.y = Math.random() * Math.PI * 2;
      m.size = r; m.grow = big ? .35 : .08; m.age = 0; m.peak = big ? .34 : .24; m.mesh.visible = true;
    },
    update(dt) {
      if (!dt) return;
      for (const m of marks) {
        if (!m.mesh.visible) continue;
        m.age += dt;
        if (m.age >= LIFE) { m.mesh.visible = false; continue; }
        const spread = Math.min(1, m.age / m.grow), s = m.size * (.55 + .45 * (1 - Math.pow(1 - spread, 3)));
        m.mesh.scale.set(s, 1, s * .86);
        // stays dark while fresh, then dries from the edges in
        const dry = Math.max(0, (m.age - LIFE * .35) / (LIFE * .65));
        m.mesh.material.opacity = m.peak * (1 - dry * dry);
        if (dry > 0) m.mesh.scale.multiplyScalar(1 - dry * .35);
      }
    },
  };
}
