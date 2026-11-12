import * as THREE from 'three';
import { box, tube, roundedPad } from './geometry.js';
import { mergeGeometries } from '../product/vendor/utils/BufferGeometryUtils.js';
import { loadSwimmingPoolKeyring } from '../product/load-keyring.js';
import { createWaterMotion } from '../product/water-motion.js';
import { RoomEnvironment } from '../product/vendor/environments/RoomEnvironment.js';
import { createDogHouse, createFetchToy } from './house.js';
import { createSwimBear } from './bear.js';
import { createKeyringHardware } from './keyring.js';
import { replaceWithPlush } from './plush.js';
import { createDropletIsland } from './drops.js';

// Normalised keyring units (body width 1): footprint half-sizes and corner
// radius of the GLB outline, top of the tile floor, acrylic slab and dome rise.
const HX = .5, HZ = .7726628, CORNER = .06, FLOOR_TOP = .05167452, ACRYLIC = .045, DOME = .04;
// As on the keyring: the tile print is only a thin layer (PRINT of the old floor
// thickness, the rest is clear resin) and the back carries a clear resin dome.
// Clear resin under the print is as thin as on the keyring (0.35 mm of 30 mm).
const PRINT = .1, BACK_DOME = .03, UNDER = .0117;
const SLAB_TOP = FLOOR_TOP * (1 - PRINT) - .0008, SLAB_BOTTOM = SLAB_TOP - UNDER;
// World layout: the block sits on a white poolside deck. The puppy lives on the
// front deck, climbs the ladder over the front wall into the water and back out.
const DECK_Y = -1.6, WALL_X = HX * 11.2, WALL_Z = HZ * 11.2;
// The back deck runs on behind the block to hold the keyring hardware.
const DECK = { minX: -8.6, maxX: 8.6, minZ: -32.2, maxZ: 15.8 };
// The pool island has no puppy (see main.js); the bear swims alone.
const NO_DOG = true;

export function createPoolIsland(scene, island) {
  const root = new THREE.Group(); root.name = 'island-pool'; scene.add(root);
  const obstacles = [{ type: 'rect', x: 0, z: 0, w: WALL_X * 2, d: WALL_Z * 2 }];
  let motion = null, swimmer = null, clock = 0, reduced = false, lastPaddle = -99;
  const splash = (x, z, strength) => { if (motion && !reduced) motion.addRipple(x / SCALE, z / SCALE, strength); };
  // No deck: the pool block and its keyring hardware stand on their own.
  // Water drops would sink straight into the sand, so the deck puddles are hidden.
  const droplets = createDroplets(root); droplets.visible = false;
  // Uniform scale keeps the keyring's real block proportions. The block (thin
  // print, clear resin, back doming) is positioned so the dome rests on the ground.
  const SCALE = 11.2, BASE = DECK_Y - (SLAB_BOTTOM - BACK_DOME) * SCALE;
  // Everything that is part of the keyring body moves together (it can be lifted).
  const poolGroup = new THREE.Group(); poolGroup.name = 'PoolKeyringBody'; root.add(poolGroup);
  const hardware = createKeyringHardware(root, { wallZ: WALL_Z, deckY: DECK_Y, wallX: WALL_X, blockTop: BASE + .2584 * SCALE, body: poolGroup });
  const surfaceHeight = (x, z) => motion ? motion.heightAt(x / SCALE, z / SCALE) * SCALE + BASE : .08;
  // Water thrown up when the bear plunges in; each drop rings the surface where it falls back.
  // A bear fresh out of the water drips: drops fall from it and leave wet spots on
  // the ground, and where it lands it leaves a puddle that slowly dries.
  const wetMarks = createWetMarks(poolGroup, DECK_Y);
  const spray = createSpray(poolGroup, (x, z, k) => splash(x, z, k), (x, z, r) => wetMarks.add(x, z, r), DECK_Y);
  let wet = 0, dripIn = 0, lastBearState = '';
  const house = createDogHouse(root, obstacles, { x: 4.6, z: 11.3, y: DECK_Y, color: 0x8cb9bc });
  const toy = createFetchToy(root, { x: -3, y: DECK_Y + .17, z: 12.8 }, island.spawn);
  // No puppy on this island: its house and ball stay in the data (the shared dog
  // code expects them) but are not shown.
  house.object.visible = false; toy.ball.visible = false;
  const bearPlane = new THREE.Plane(), bearHit = new THREE.Vector3();
  const inPool = (x, z) => Math.abs(x) <= WALL_X && Math.abs(z) <= WALL_Z;
  const ladder = new THREE.Group(); ladder.name = 'PuppyPoolLadder'; root.add(ladder);
  const bear = createSwimBear(poolGroup, { x: 0, z: -.15 }, {
    inPool: (x, z) => Math.abs(x) <= WALL_X - .3 && Math.abs(z) <= WALL_Z - .3, groundY: DECK_Y,
    laneZ: WALL_Z - 1.5, laneX: WALL_X - 1.4,   // lengths are swum along Z, end wall to end wall
    clampIn: (x, z) => [Math.max(-WALL_X + 1.2, Math.min(WALL_X - 1.2, x)), Math.max(-WALL_Z + 1.2, Math.min(WALL_Z - 1.2, z))],
  });
  // shown as the Alltäglich swim bear plush (bears/swim.html); the three.js bear drives it
  const plush = replaceWithPlush(poolGroup, bear.object, 'swim');
  // The water-drop scene sits beside the pool: a closed laptop where drops fall. It is
  // the same swim bear in both places — thrown (or sent by the Water Drop tab) onto the
  // laptop it dodges the drops; thrown off it (or sent back) it dives into the pool.
  // It stands where the pool stands: choosing Water Drop puts the pool away and brings
  // the laptop out in its place (and back again).
  const LAP = { x: 0, z: -.5 };
  const dropsScene = createDropletIsland(null, { id: 'drops', spawn: { x: 0, z: 6 } }, {
    parent: poolGroup, x: LAP.x, z: LAP.z, plush,
    onLeave(position, velocity) { bear.launch(poolGroup.worldToLocal(position), velocity); },
  });
  const [LAP_W, LAP_D] = dropsScene.size;
  const overLaptop = (x, z) => Math.abs(x - LAP.x) <= LAP_W / 2 && Math.abs(z - LAP.z) <= LAP_D / 2;
  const toLaptop = (velocity, flying) => { dropsScene.receive(poolGroup.localToWorld(bear.object.position.clone()), velocity, flying); bear.park(); };
  let focus = 'pool', grabbed = null, poolParts = null, pop = 1;
  dropsScene.root.visible = false;
  const POOL_VIEW = { center: { x: 0, z: -7.6 }, min: [-8.9, -1.75, -32.5], max: [8.9, 3.9, 16.1] };
  const DROPS_VIEW = { center: { x: LAP.x, z: LAP.z }, min: [LAP.x - LAP_W / 2 - .2, DECK_Y, LAP.z - LAP_D / 2 - .2], max: [LAP.x + LAP_W / 2 + .2, 2.6, LAP.z + LAP_D / 2 + .2] };
  const DROPS_DIR = new THREE.Vector3(29, 23, -15).normalize();
  bear.object.userData.noGrab = true;
  // Nothing is drawn under the block, but a shadow-only ground keeps things grounded.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 110), new THREE.ShadowMaterial({ opacity: .18 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, DECK_Y - .005, -8); ground.receiveShadow = true; root.add(ground);
  const wake = new THREE.Group(); wake.name = 'PuppyWaterWake'; root.add(wake);
  for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.45, .012, 4, 40), new THREE.MeshBasicMaterial({ color: 0xe4fbff, transparent: true, opacity: .3, depthWrite: false })); ring.rotation.x = -Math.PI / 2; wake.add(ring); }
  wake.visible = false;
  const world = {
    root, island, obstacles, house, fetchActivity: toy,
    // Only the front deck is walkable; the pool block itself is an obstacle.
    navigationOptions: { bounds: { minX: -7.9, maxX: 7.9, minZ: 8, maxZ: 15.2 }, clearance: .75, min: -12, size: 71 },
    // The puppy climbs the A-frame ladder up the outside of the front wall, over
    // the rim, down into the water, swims the lane corridor and loops around the
    // playing bear, then climbs back out onto the deck the same way.
    activity: { type: 'swim', entry: { x: 0, z: 10 }, ladderTop: { x: 0, z: WALL_Z - .15, y: 1 }, waterEntry: { x: 0, z: 7 }, corridorStart: { x: 0, z: 2.8 }, route: [{ x: 0, z: 2.8 }, { x: -1.65, z: 2.35 }, { x: -1.65, z: -2.6 }, { x: 1.6, z: -2.6 }, { x: 1.6, z: 2.35 }, { x: 0, z: 2.8 }] },
    bear, droplets, hardware, dropsScene,
    // 'lane' (lane-mark tiles) or 'photo' (Prussian blue tiles in a black grid); switched from the bottom tab.
    print: 'lane',
    setPrint(kind) { world.print = kind === 'photo' ? 'photo' : 'lane'; setPrintTexture(world.print); },
    // Things the visitor can pick up (see main.js): the bear, anywhere over the
    // island, and the keyring chain (physics, added by keyring.js).
    // which part of the island the camera shows: 'pool' or 'drops' (the laptop)
    get focus() { return focus; },
    setFocus(next) {
      const to = next === 'drops' ? 'drops' : 'pool';
      if (to === focus) { if (to === 'drops') dropsScene.onEnter(); return; }
      focus = to;
      // everything that belongs to the pool (block, water, chain, splashes, wet marks) goes
      // into one group the first time, so it can be put away in one go
      if (!poolParts) {
        poolParts = new THREE.Group(); poolParts.name = 'PoolParts';
        const keep = new Set([dropsScene.root, plush.sprite, plush.proxy, plush.shadow, bear.object]);
        for (const child of [...poolGroup.children]) if (!keep.has(child)) poolParts.add(child);
        poolGroup.add(poolParts);
      }
      const drops = focus === 'drops';
      poolParts.visible = !drops; dropsScene.root.visible = drops;
      for (const name of ['KeyringHardware', 'PuppyPoolLadder']) { const o = root.getObjectByName(name); if (o) o.visible = !drops; }
      pop = 0;
      if (bear.state === 'held') bear.release();
      if (drops) {
        dropsScene.onEnter();   // the drops start over
        // the bear drops onto the lid from where it was
        const at = bear.object.position;
        at.set(THREE.MathUtils.clamp(at.x, LAP.x - LAP_W / 2 + 2, LAP.x + LAP_W / 2 - 2), dropsScene.top + dropsScene.bearBottom + 2.2, THREE.MathUtils.clamp(at.z, LAP.z - LAP_D / 2 + 2, LAP.z + LAP_D / 2 - 2));
        toLaptop(new THREE.Vector3(0, 1.5, 0), false);
      } else {
        // and plunges back into the pool
        const at = plush.proxy.position.clone();
        at.set(THREE.MathUtils.clamp(at.x, -WALL_X + 1.6, WALL_X - 1.6), 4.2, THREE.MathUtils.clamp(at.z, -WALL_Z + 1.8, WALL_Z - 1.8));
        dropsScene.letGo(); bear.launch(at, { x: 0, y: 0, z: 0 });
      }
    },
    get view() { return focus === 'drops' ? DROPS_VIEW : POOL_VIEW; },
    get viewDirection() { return focus === 'drops' ? DROPS_DIR : undefined; },
    get grabTargets() { return focus === 'drops' ? world.grabTargets_ : [...world.grabTargets_, ...hardware.grabTargets]; },
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
    // Default view frames the block, the front deck and the hardware behind it.
    getSurfaceHeight: surfaceHeight,
    heightAt(x, z) {
      if (Math.abs(x - house.object.position.x) < 1.4 && Math.abs(z - house.object.position.z) < 1.3) return house.object.position.y + .02;
      return inPool(x, z) ? surfaceHeight(x, z) : DECK_Y;
    },
    setSwimmer(point) {
      if (NO_DOG) point = null;
      // Jumping in throws a big splash ring; climbing out leaves a smaller one.
      if (!swimmer && point) splash(point.x, point.z, 1.3);
      if (swimmer && !point) splash(swimmer.x, swimmer.z, .7);
      swimmer = point ? { x: point.x, z: point.z } : null;
      motion?.setSwimmer(point ? point.x / SCALE : 99, point ? point.z / SCALE : 99, !!point);
    },
    update(time, reducedMotion) {
      hardware.step(clock ? Math.min(.05, Math.max(0, time - clock)) : 0);
      clock = time; reduced = reducedMotion;
      motion?.update(time, reducedMotion); wake.visible = !!swimmer;
      // Little paddle splashes while the puppy swims.
      if (swimmer && time - lastPaddle > 1.05) { splash(swimmer.x, swimmer.z, .35); lastPaddle = time; }
      // The bear leaves a gentle wake as it bobs and paddles; each hop landing rings out.
      const b = bear.update(time, reducedMotion, surfaceHeight);
      // thrown onto the laptop: from here on the water-drop scene moves the bear
      if (!dropsScene.active && bear.state === 'falling') {
        const bp = bear.object.position, v = bear.velocity;
        if (focus === 'drops' && overLaptop(bp.x, bp.z) && v.y < 0 && bp.y <= dropsScene.top + dropsScene.bearBottom + .15) toLaptop(new THREE.Vector3(v.x * .5, v.y, v.z * .5), false);
      }
      if (focus === 'drops') dropsScene.update(time, reducedMotion);
      // whichever of the two just came out pops up into place
      if (pop < 1) { pop = Math.min(1, pop + 1 / 18); const k = 1 - Math.pow(1 - pop, 3), sc = .86 + .14 * k; (focus === 'drops' ? dropsScene.root : poolParts)?.scale.setScalar(sc); }
      if (!dropsScene.active) plush.update(plush.anchor, { swim: bear.state === 'swim', ground: inPool(bear.object.position.x, bear.object.position.z) ? null : DECK_Y });
      motion?.setMover(1, b.x / SCALE, b.z / SCALE, reducedMotion ? 0 : .55);
      if (b.landed) splash(b.x, b.z, .9);
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
      if (b.splash) { splash(b.x, b.z, b.splash); if (b.splash > .5) splash(b.x + .6, b.z - .4, b.splash * .5); }
      if (swimmer) { wake.position.set(swimmer.x, surfaceHeight(swimmer.x, swimmer.z) + .025, swimmer.z); wake.children.forEach((ring, i) => { const t = (time * .75 + i / 3) % 1; ring.scale.setScalar(.6 + t * 1.8); ring.material.opacity = (1 - t) * .35; }); }
    },
    // Dark room: studio reflections dim and the tiles glow softly from within,
    // like a pool with its underwater lights on at night. The tiles always carry
    // an emissive map (black in the lamp mood), so switching never recompiles.
    setMood(mood, { reflections }) {
      for (const m of [world.water?.material, world.acrylic?.material, droplets.material, ...hardware.materials]) if (m?.userData.envBase !== undefined) m.envMapIntensity = m.userData.envBase * reflections;
      world.floor?.traverse(object => { if (object.isMesh && object.material.emissiveMap) object.material.emissive.setHex(mood === 'dark' ? 0x5a7f99 : 0); });
    },
    // the laptop's drops are compiled up front too, though they stay hidden until first shown
    precompile(renderer, scene, camera) { const was = root.visible; root.visible = true; dropsScene.precompile(renderer, scene, camera); root.visible = was; },
    setupEnvironment(renderer) { dropsScene.setupEnvironment(renderer); const environment = new RoomEnvironment(); const pmrem = new THREE.PMREMGenerator(renderer); const texture = pmrem.fromScene(environment, .04).texture; environment.dispose(); pmrem.dispose(); for (const m of [world.water.material, world.acrylic.material, droplets.material, ...hardware.materials]) { m.envMap = texture; m.userData.envBase = m === world.water.material ? WATER_REFLECTION : hardware.materials.includes(m) ? (m.userData.envDefault ?? 1) : 1.15; m.envMapIntensity = m.userData.envBase; m.needsUpdate = true; } },
  };
  world.ready = loadSwimmingPoolKeyring().then(({ model, floor, water }) => {
    model.scale.setScalar(SCALE); model.position.y = BASE; poolGroup.add(model);
    paintSampleTiles(floor); domeFloor(floor); thinPrint(floor); world.floor = floor;
    world.acrylic = addAcrylicBase(model); addBackDome(model, world.acrylic.material);
    // The clear resin's wave surface faces the other way round on the keyring
    // (turned end for end, like the product viewer); tiles stay as they are.
    // Rotate before createWaterMotion so its height field follows the turned surface.
    water.geometry.rotateY(Math.PI); water.geometry.computeBoundingSphere();
    motion = createWaterMotion(water, floor); world.waterMotion = motion; world.water = water; world.product = model;
    clearResin(water); // after createWaterMotion, which sets its own optical defaults
    const rim = surfaceHeight(0, 8.15);
    world.activity.ladderTop.y = rim + .32;
    return world;
  });
  return world;
}

// Print under the resin, as on the keyring: powder-blue tiles in a 13 × 22 grid,
// dark grout, and the lane mark — a wide bar 4 rows from the ring end (back,
// v = 1), a stem down the middle to the front edge and a short cross line near
// the front. Canvas row 0 is the front (+Z) edge.
const TILE = [136, 176, 208], GROUT = '#222e3c', LANE = [30, 44, 64], COLS = 13, ROWS = 22;
const isLane = (c, r) => (c === 6 && r >= 3) || (r === 3 && c >= 4 && c <= 8) || (r === 17 && c >= 5 && c <= 7);
function paintSampleTiles(floor) {
  floor.traverse(object => {
    if (!object.isMesh || !object.material.map) return;
    const { width, height } = object.material.map.image;
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (width === 256) {
      // Repeating side tile.
      ctx.fillStyle = `rgb(${TILE})`; ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = GROUT; ctx.fillRect(0, 0, 256, 11); ctx.fillRect(0, 0, 11, 256);
    } else {
      const tw = width / COLS, th = height / ROWS, grout = Math.max(3, Math.min(tw, th) * .084);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        // r counts from the ring end (canvas bottom).
        const j = (Math.sin(c * 127.1 + r * 311.7) * 43758.5453 % 1) * 10, base = isLane(c, r) ? LANE : TILE;
        ctx.fillStyle = `rgb(${base.map(v => Math.round(v + j * (isLane(c, r) ? .4 : 1)))})`;
        ctx.fillRect(c * tw, height - (r + 1) * th, tw + 1, th + 1);
      }
      ctx.fillStyle = GROUT;
      for (let c = 0; c <= COLS; c++) ctx.fillRect(c * tw - grout / 2, 0, grout, height);
      for (let r = 0; r <= ROWS; r++) ctx.fillRect(0, r * th - grout / 2, width, grout);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false; texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = object.material.map.wrapS; texture.anisotropy = 8;
    object.material.map.dispose(); object.material.map = texture; object.material.emissiveMap = texture; object.material.emissive.setHex(0);
    object.material.roughness = .55; object.material.metalness = 0; object.material.needsUpdate = true;
    if (width !== 256) { printTop.mesh = object; printTop.lane = texture; }
  });
}
// The alternative print: solid Prussian blue tiles in a black grid (8 × 12, as on
// the photographed keyring), without the lane mark.
const printTop = { mesh: null, lane: null, photo: null };
const PRUSSIAN_BLUE = '#245e8a'; // Prussian blue, lightened so the black grid stays visible
function navyGridTexture(width, height) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'), cols = 8, rows = 12, tw = width / cols, th = height / rows, line = Math.max(4, tw * .07);
  ctx.fillStyle = PRUSSIAN_BLUE; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#121418';
  for (let c = 0; c <= cols; c++) ctx.fillRect(c * tw - line / 2, 0, line, height);
  for (let r = 0; r <= rows; r++) ctx.fillRect(0, r * th - line / 2, width, line);
  const tex = new THREE.CanvasTexture(canvas); tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}
function setPrintTexture(kind) {
  const m = printTop.mesh?.material; if (!m) return;
  const apply = tex => { m.map = tex; m.emissiveMap = tex; m.needsUpdate = true; };
  if (kind !== 'photo') { apply(printTop.lane); return; }
  if (!printTop.photo) { const { width, height } = printTop.lane.image; printTop.photo = navyGridTexture(width, height); }
  apply(printTop.photo);
}

// Clear resin with a light blue cast, as on the keyring: barely-there micro
// roughness and modest reflections so it reads as cured resin, not acrylic.
const WATER_REFLECTION = .35;
function clearResin(water) {
  const m = water.material;
  m.color.set(0xd2eafa); m.attenuationColor.set(0x6fb2e6); m.attenuationDistance = 6.7;
  m.ior = 1.5; m.roughness = .06; m.transmission = 1;
  m.clearcoat = 0;
  m.specularIntensity = .85; m.specularColor?.set(0xffffff);
  m.envMapIntensity = WATER_REFLECTION; m.needsUpdate = true;
}

// Nearest point inside the rounded-rectangle footprint of the keyring body.
function clampToFootprint(x, z) {
  let qx = Math.max(-HX, Math.min(HX, x)), qz = Math.max(-HZ, Math.min(HZ, z));
  const ix = HX - CORNER, iz = HZ - CORNER;
  if (Math.abs(qx) > ix && Math.abs(qz) > iz) {
    const cx = Math.sign(qx) * ix, cz = Math.sign(qz) * iz, dx = qx - cx, dz = qz - cz, d = Math.hypot(dx, dz);
    if (d > CORNER) { qx = cx + dx / d * CORNER; qz = cz + dz / d * CORNER; }
  }
  return [qx, qz];
}

// Swap the flat 86-vertex tile top for a dense grid that rises gently towards
// the middle and returns to the wall height at every edge. UVs match the GLB
// (u = 0.5 - x, v runs north to south), so tiles and the T lane line up.
function domeFloor(floor) {
  floor.traverse(object => {
    if (!object.isMesh || object.material.map?.image.width === 256 || !object.material.map) return;
    const nx = 44, nz = 68, positions = [], uvs = [], indices = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const [x, z] = clampToFootprint(-HX - .01 + (2 * HX + .02) * i / nx, -HZ - .01 + (2 * HZ + .02) * j / nz);
      const rise = Math.max(0, 1 - (x / HX) ** 2) * Math.max(0, 1 - (z / HZ) ** 2);
      positions.push(x, FLOOR_TOP + DOME * rise, z); uvs.push(.5 - x, (HZ - z) / (2 * HZ));
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices); geo.computeVertexNormals();
    // Grid points clamped onto the outline only touch zero-area triangles.
    const n = geo.attributes.normal;
    for (let i = 0; i < n.count; i++) if (!(Math.abs(n.getY(i)) > .01)) n.setXYZ(i, 0, 1, 0);
    object.geometry.dispose(); object.geometry = geo;
  });
}

// Clear resin doming on the back, under the tile layer, same rounded footprint.
function addAcrylicBase(model) {
  const shape = new THREE.Shape(), ix = HX - CORNER, iz = HZ - CORNER;
  shape.moveTo(-ix, -HZ); shape.lineTo(ix, -HZ); shape.absarc(ix, -iz, CORNER, -Math.PI / 2, 0);
  shape.lineTo(HX, iz); shape.absarc(ix, iz, CORNER, 0, Math.PI / 2);
  shape.lineTo(-ix, HZ); shape.absarc(-ix, iz, CORNER, Math.PI / 2, Math.PI);
  shape.lineTo(-HX, -iz); shape.absarc(-ix, -iz, CORNER, Math.PI, Math.PI * 1.5);
  // A thin layer of clear resin just under the print (the block below it is the back dome).
  const geo = new THREE.ExtrudeGeometry(shape, { depth: UNDER, bevelEnabled: false, curveSegments: 10 });
  geo.rotateX(Math.PI / 2); geo.translate(0, SLAB_TOP, 0);
  const material = new THREE.MeshPhysicalMaterial({ color: 0xd2eafa, transmission: 1, roughness: .06, ior: 1.5, thickness: UNDER + BACK_DOME, attenuationColor: 0x6fb2e6, attenuationDistance: 6.7, specularIntensity: .85 });
  const slab = new THREE.Mesh(geo, material); slab.name = 'Body_ClearAcrylicBase';
  slab.receiveShadow = true; model.add(slab);
  return slab;
}

// Squash the opaque tile body into a thin print layer just under the water;
// the dome top (at or above FLOOR_TOP) is kept as it is.
function thinPrint(floor) {
  floor.traverse(object => {
    if (!object.isMesh) return;
    const p = object.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < FLOOR_TOP - 1e-5) p.setY(i, FLOOR_TOP - (FLOOR_TOP - y) * PRINT); }
    p.needsUpdate = true; object.geometry.computeBoundingBox(); object.geometry.computeBoundingSphere();
  });
}

// Clear resin doming on the back: highest (lowest point of the block) in the
// middle, easing out to nothing at the rounded edge, as on the keyring.
function addBackDome(model, material) {
  const nx = 40, nz = 62, positions = [], indices = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const [x, z] = clampToFootprint(-HX + 2 * HX * i / nx, -HZ + 2 * HZ * j / nz);
    const e = Math.pow(Math.pow(Math.abs(x) / HX, 10) + Math.pow(Math.abs(z) / HZ, 10), .1);
    positions.push(x, SLAB_BOTTOM - BACK_DOME * Math.pow(Math.max(0, 1 - Math.pow(Math.min(e, 1), 2.5)), .55), z);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; indices.push(a, b, c, b, d, c); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setIndex(indices); geo.computeVertexNormals();
  const dome = new THREE.Mesh(geo, material); dome.name = 'Body_BackDoming'; dome.receiveShadow = true; model.add(dome);
  return dome;
}

// Clear water droplets and puddles on the deck, after the reference sheet: round
// beads, ovals, lobed splats and curving drips. Each is a domed polar mesh (flat
// top, steep meniscus edge); all are merged into one clear refractive mesh.
// A wet trail gathers at the foot of the ladder where the puppy climbs out.
function createDroplets(root) {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const kinds = [
    // [x, z, size, kind]
    [.3, 10.35, .42, 'blob'], [-.55, 10.9, .2, 'round'], [.75, 11.2, .14, 'round'], [-.2, 11.65, .55, 'splat'], [.95, 10.05, .1, 'round'],
    [-1.1, 10.25, .12, 'round'], [1.35, 11.8, .3, 'oval'], [-1.35, 12.3, .18, 'round'], [.45, 12.45, .09, 'round'], [-.8, 13.1, .34, 'drip'],
    [-4.9, 9.85, .26, 'oval'], [-6.6, 11.2, .7, 'splat'], [-5.4, 12.6, .13, 'round'], [-6.9, 13.9, .2, 'round'], [-3.9, 14.3, .42, 'blob'],
    [-2.2, 14.75, .1, 'round'], [-4.6, 15.05, .16, 'round'], [1.8, 14.6, .55, 'blob'], [3.2, 14.9, .12, 'round'], [6.7, 15, .3, 'oval'],
    [7.4, 13.6, .1, 'round'], [7.2, 10.3, .45, 'drip'], [6.9, 6.2, .22, 'round'], [7.3, 3.4, .5, 'blob'], [6.75, .4, .13, 'round'],
    [7.45, -2.2, .28, 'oval'], [6.9, -5.6, .62, 'splat'], [7.3, -8.4, .12, 'round'], [3.4, -9.25, .3, 'blob'], [-1.6, -9.5, .1, 'round'],
    [-2.6, -9.2, .4, 'drip'], [-6.1, -9.15, .16, 'round'], [-7.3, -6.8, .48, 'blob'], [-6.85, -3.1, .1, 'round'], [-7.4, -.6, .3, 'oval'],
    [-6.9, 2.9, .9, 'splat'], [-7.35, 6.4, .14, 'round'], [-6.4, 7.7, .24, 'round'], [5.9, 8.6, .11, 'round'], [-3.1, 9.6, .09, 'round'],
  ];
  const geos = kinds.map(([x, z, size, kind]) => {
    const geo = dropletGeometry(rand, size, kind);
    geo.rotateY(rand() * Math.PI * 2); geo.translate(x, DECK_Y + .004, z);
    return geo;
  });
  const merged = mergeGeometries(geos); geos.forEach(geo => geo.dispose());
  const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: .02, ior: 1.33, thickness: .14, attenuationColor: 0xc4e2e8, attenuationDistance: .4, clearcoat: 1, clearcoatRoughness: .02, specularIntensity: 1 });
  const droplets = new THREE.Mesh(merged, material); droplets.name = 'PoolsideDroplets';
  droplets.receiveShadow = true; root.add(droplets);
  return droplets;
}
function dropletGeometry(rand, size, kind) {
  const rings = 9, segments = 44;
  const lobes = kind === 'splat' ? [[3 + Math.floor(rand() * 3), .3], [7, .08]] : kind === 'blob' ? [[2, .16], [3, .1], [5, .04]] : kind === 'oval' ? [[2, .08]] : [[3, .03]];
  const phases = lobes.map(() => rand() * Math.PI * 2);
  const stretch = kind === 'oval' ? 1.45 : kind === 'drip' ? 2.6 : 1, bend = kind === 'drip' ? (rand() - .5) * .5 : 0;
  const height = Math.min(.11, size * (kind === 'splat' ? .14 : kind === 'round' ? .55 : .3));
  const radius = a => size * Math.max(.35, 1 + lobes.reduce((sum, [k, amp], i) => sum + amp * Math.cos(k * a + phases[i]), 0));
  const positions = [0, height, 0], indices = [];
  for (let r = 1; r <= rings; r++) for (let s = 0; s < segments; s++) {
    const a = s / segments * Math.PI * 2, t = r / rings, rad = radius(a) * t;
    let x = Math.cos(a) * rad, z = Math.sin(a) * rad * stretch;
    if (kind === 'drip') { x *= .7 + .3 * (z / (size * stretch) + 1); x += bend * z * z / size; }
    positions.push(x, height * Math.sqrt(Math.max(0, 1 - t ** 6)), z);
  }
  for (let s = 0; s < segments; s++) indices.push(0, 1 + (s + 1) % segments, 1 + s);
  for (let r = 1; r < rings; r++) for (let s = 0; s < segments; s++) {
    const a = 1 + (r - 1) * segments + s, b = 1 + (r - 1) * segments + (s + 1) % segments;
    indices.push(a, b, a + segments, b, b + segments, a + segments);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices); geo.computeVertexNormals();
  return geo.toNonIndexed();
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
