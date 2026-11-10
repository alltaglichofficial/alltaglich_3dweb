import * as THREE from 'three';
import { box, tube, roundedPad } from './geometry.js';
import { mergeGeometries } from '../product/vendor/utils/BufferGeometryUtils.js';
import { loadSwimmingPoolKeyring } from '../product/load-keyring.js';
import { createWaterMotion } from '../product/water-motion.js';
import { RoomEnvironment } from '../product/vendor/environments/RoomEnvironment.js';
import { createDogHouse, createFetchToy } from './house.js';
import { createSwimBear } from './bear.js';
import { createKeyringHardware } from './keyring.js';

// Normalised keyring units (body width 1): footprint half-sizes and corner
// radius of the GLB outline, top of the tile floor, acrylic slab and dome rise.
const HX = .5, HZ = .7726628, CORNER = .06, FLOOR_TOP = .05167452, ACRYLIC = .045, DOME = .04;
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
  const hardware = createKeyringHardware(root, { wallZ: WALL_Z, deckY: DECK_Y });
  // Uniform scale keeps the keyring's real block proportions (thick clear resin
  // over a thin tiled floor). A clear acrylic slab sits under the tiles, so the
  // whole block is lifted by its thickness and still rests on the ground.
  const SCALE = 11.2, BASE = -1.6 + ACRYLIC * SCALE;
  const surfaceHeight = (x, z) => motion ? motion.heightAt(x / SCALE, z / SCALE) * SCALE + BASE : .08;
  const house = createDogHouse(root, obstacles, { x: 4.6, z: 11.3, y: DECK_Y, color: 0x8cb9bc });
  const toy = createFetchToy(root, { x: -3, y: DECK_Y + .17, z: 12.8 }, island.spawn);
  // No puppy on this island: its house and ball stay in the data (the shared dog
  // code expects them) but are not shown.
  house.object.visible = false; toy.ball.visible = false;
  const inPool = (x, z) => Math.abs(x) <= WALL_X && Math.abs(z) <= WALL_Z;
  const ladder = new THREE.Group(); ladder.name = 'PuppyPoolLadder'; root.add(ladder);
  const bear = createSwimBear(root, { x: 0, z: -.15 });
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
    bear, droplets, hardware,
    // The bear can be picked up and dropped back into the pool (see main.js).
    grabbable: {
      object: bear.object,
      holdHeight: () => surfaceHeight(0, 0) + 4.5,
      clamp: (x, z) => [Math.max(-WALL_X + .9, Math.min(WALL_X - .9, x)), Math.max(-WALL_Z + .9, Math.min(WALL_Z - .9, z))],
      grab: () => bear.grab(), drag: p => bear.drag(p), release: () => bear.release(),
    },
    // Default view frames the block, the front deck and the hardware behind it.
    view: { center: { x: 0, z: -7.6 }, min: [-8.9, -1.75, -32.5], max: [8.9, 3.9, 16.1] },
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
      clock = time; reduced = reducedMotion;
      motion?.update(time, reducedMotion); wake.visible = !!swimmer;
      // Little paddle splashes while the puppy swims.
      if (swimmer && time - lastPaddle > 1.05) { splash(swimmer.x, swimmer.z, .35); lastPaddle = time; }
      // The bear leaves a gentle wake as it bobs and paddles; each hop landing rings out.
      const b = bear.update(time, reducedMotion, surfaceHeight);
      motion?.setMover(1, b.x / SCALE, b.z / SCALE, reducedMotion ? 0 : .55);
      if (b.landed) splash(b.x, b.z, .9);
      if (b.splash) { splash(b.x, b.z, b.splash); splash(b.x + .6, b.z - .4, b.splash * .5); }
      if (swimmer) { wake.position.set(swimmer.x, surfaceHeight(swimmer.x, swimmer.z) + .025, swimmer.z); wake.children.forEach((ring, i) => { const t = (time * .75 + i / 3) % 1; ring.scale.setScalar(.6 + t * 1.8); ring.material.opacity = (1 - t) * .35; }); }
    },
    // Dark room: studio reflections dim and the tiles glow softly from within,
    // like a pool with its underwater lights on at night. The tiles always carry
    // an emissive map (black in the lamp mood), so switching never recompiles.
    setMood(mood, { reflections }) {
      for (const m of [world.water?.material, world.acrylic?.material, droplets.material, ...hardware.materials]) if (m?.userData.envBase !== undefined) m.envMapIntensity = m.userData.envBase * reflections;
      world.floor?.traverse(object => { if (object.isMesh && object.material.emissiveMap) object.material.emissive.setHex(mood === 'dark' ? 0x5a7f99 : 0); });
    },
    setupEnvironment(renderer) { const environment = new RoomEnvironment(); const pmrem = new THREE.PMREMGenerator(renderer); const texture = pmrem.fromScene(environment, .04).texture; environment.dispose(); pmrem.dispose(); for (const m of [world.water.material, world.acrylic.material, droplets.material, ...hardware.materials]) { m.envMap = texture; m.userData.envBase = m === world.water.material ? WATER_REFLECTION : hardware.materials.includes(m) ? (m.userData.envDefault ?? 1) : 1.15; m.envMapIntensity = m.userData.envBase; m.needsUpdate = true; } },
  };
  world.ready = loadSwimmingPoolKeyring().then(({ model, floor, water }) => {
    model.scale.setScalar(SCALE); model.position.y = BASE; root.add(model);
    paintSampleTiles(floor); domeFloor(floor); world.floor = floor;
    world.acrylic = addAcrylicBase(model);
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
  });
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
  const geo = new THREE.ExtrudeGeometry(shape, { depth: ACRYLIC - .0008, bevelEnabled: false, curveSegments: 10 });
  geo.rotateX(Math.PI / 2); geo.translate(0, -.0008, 0);
  const material = new THREE.MeshPhysicalMaterial({ color: 0xd2eafa, transmission: 1, roughness: .06, ior: 1.5, thickness: ACRYLIC, attenuationColor: 0x6fb2e6, attenuationDistance: 6.7, specularIntensity: .85 });
  const slab = new THREE.Mesh(geo, material); slab.name = 'Body_ClearAcrylicBase';
  slab.receiveShadow = true; model.add(slab);
  return slab;
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
