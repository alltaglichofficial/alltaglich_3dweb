import * as THREE from 'three';
import { box, tube, roundedPad } from './geometry.js';
import { mergeGeometries } from '../product/vendor/utils/BufferGeometryUtils.js';
import { loadSwimmingPoolKeyring } from '../product/load-keyring.js';
import { createWaterMotion } from '../product/water-motion.js';
import { RoomEnvironment } from '../product/vendor/environments/RoomEnvironment.js';
import { createDogHouse, createFetchToy } from './house.js';
import { createSwimBear } from './bear.js';

// Normalised keyring units (body width 1): footprint half-sizes and corner
// radius of the GLB outline, top of the tile floor, acrylic slab and dome rise.
const HX = .5, HZ = .7726628, CORNER = .06, FLOOR_TOP = .05167452, ACRYLIC = .045, DOME = .024;
// World layout: the block sits on a white poolside deck. The puppy lives on the
// front deck, climbs the ladder over the front wall into the water and back out.
const DECK_Y = -1.6, WALL_X = HX * 11.2, WALL_Z = HZ * 11.2;
const DECK = { minX: -8.6, maxX: 8.6, minZ: -9.8, maxZ: 15.8 };

export function createPoolIsland(scene, island) {
  const root = new THREE.Group(); root.name = 'island-pool'; scene.add(root);
  const obstacles = [{ type: 'rect', x: 0, z: 0, w: WALL_X * 2, d: WALL_Z * 2 }];
  let motion = null, swimmer = null;
  createDeck(root);
  const droplets = createDroplets(root);
  // Uniform scale keeps the keyring's real block proportions (thick clear resin
  // over a thin tiled floor). A clear acrylic slab sits under the tiles, so the
  // whole block is lifted by its thickness and still rests on the ground.
  const SCALE = 11.2, BASE = -1.6 + ACRYLIC * SCALE;
  const surfaceHeight = (x, z) => motion ? motion.heightAt(x / SCALE, z / SCALE) * SCALE + BASE : .08;
  const house = createDogHouse(root, obstacles, { x: 4.6, z: 11.3, y: DECK_Y, color: 0x8cb9bc });
  const toy = createFetchToy(root, { x: -3, y: DECK_Y + .17, z: 12.8 }, island.spawn);
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
    bear, droplets,
    getSurfaceHeight: surfaceHeight,
    heightAt(x, z) {
      if (Math.abs(x - house.object.position.x) < 1.4 && Math.abs(z - house.object.position.z) < 1.3) return house.object.position.y + .02;
      return inPool(x, z) ? surfaceHeight(x, z) : DECK_Y;
    },
    setSwimmer(point) { swimmer = point ? { x: point.x, z: point.z } : null; motion?.setSwimmer(point ? point.x / 11.2 : 99, point ? point.z / 11.2 : 99, !!point); },
    update(time, reducedMotion) {
      motion?.update(time, reducedMotion); wake.visible = !!swimmer;
      bear.update(time, reducedMotion, surfaceHeight);
      if (swimmer) { wake.position.set(swimmer.x, surfaceHeight(swimmer.x, swimmer.z) + .025, swimmer.z); wake.children.forEach((ring, i) => { const t = (time * .75 + i / 3) % 1; ring.scale.setScalar(.6 + t * 1.8); ring.material.opacity = (1 - t) * .35; }); }
    },
    setupEnvironment(renderer) { const environment = new RoomEnvironment(); const pmrem = new THREE.PMREMGenerator(renderer); const texture = pmrem.fromScene(environment, .04).texture; environment.dispose(); pmrem.dispose(); for (const m of [world.water.material, world.acrylic.material, droplets.material]) { m.envMap = texture; m.envMapIntensity = 1.15; m.needsUpdate = true; } },
  };
  world.ready = loadSwimmingPoolKeyring().then(({ model, floor, water }) => {
    model.scale.setScalar(SCALE); model.position.y = BASE; root.add(model);
    paintSampleTiles(floor); domeFloor(floor); clearResin(water);
    world.acrylic = addAcrylicBase(model);
    motion = createWaterMotion(water, floor); world.waterMotion = motion; world.water = water; world.product = model;
    const rim = surfaceHeight(0, 8.15);
    buildSideLadder(ladder, rim, BASE + FLOOR_TOP * SCALE);
    world.activity.ladderTop.y = rim + .32;
    return world;
  });
  return world;
}

// Colours sampled from the product photos: powder-blue ceramic tiles, thin
// near-black grout and an ink-navy T lane. Same layout and UVs as the baked PNG.
const TILE = '#6c9cc2', TILE_SHADES = ['#6898bf', '#72a2c7', '#6a9ac0', '#76a5c9'], GROUT = '#16212b', LANE = '#0a1017';
function paintSampleTiles(floor) {
  floor.traverse(object => {
    if (!object.isMesh || !object.material.map) return;
    const { width, height } = object.material.map.image;
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (width === 256) {
      // Repeating side tile.
      ctx.fillStyle = TILE; ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = GROUT; ctx.fillRect(0, 0, 256, 14); ctx.fillRect(0, 0, 14, 256);
    } else {
      const cols = 24, tile = width / cols, rows = Math.round(height / tile), grout = Math.max(4, tile * .085);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        ctx.fillStyle = TILE_SHADES[(r * 7 + c * 3 + ((r * c) % 5)) % TILE_SHADES.length];
        ctx.fillRect(c * tile, r * tile, tile, tile);
      }
      ctx.fillStyle = GROUT;
      for (let c = 0; c <= cols; c++) ctx.fillRect(c * tile - grout / 2, 0, grout, height);
      for (let r = 0; r <= rows; r++) ctx.fillRect(0, r * tile - grout / 2, width, grout);
      // T lane: bar centred 4.6 tiles from the edge, stem runs off the far edge.
      ctx.fillStyle = LANE;
      const stem = tile * 1.7, bar = tile * 10.2, top = tile * 4.6, stroke = tile * 1.45;
      ctx.fillRect(width / 2 - bar / 2, top, bar, stroke);
      ctx.fillRect(width / 2 - stem / 2, top, stem, height - top);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false; texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = object.material.map.wrapS; texture.anisotropy = 8;
    object.material.map.dispose(); object.material.map = texture;
    object.material.roughness = .5; object.material.metalness = 0; object.material.needsUpdate = true;
  });
}

// Cast resin, not milky glass: high clarity, resin IOR for the photo's strong
// refraction of the grid, and a faint aqua body colour through the thick block.
function clearResin(water) {
  const m = water.material;
  m.color.set(0xffffff); m.attenuationColor.set(0xd9f0fb); m.attenuationDistance = 6;
  m.specularIntensity = 1; m.specularColor?.set(0xffffff);
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

// Clear cast-acrylic slab under the tile layer, same rounded footprint.
function addAcrylicBase(model) {
  const shape = new THREE.Shape(), ix = HX - CORNER, iz = HZ - CORNER;
  shape.moveTo(-ix, -HZ); shape.lineTo(ix, -HZ); shape.absarc(ix, -iz, CORNER, -Math.PI / 2, 0);
  shape.lineTo(HX, iz); shape.absarc(ix, iz, CORNER, 0, Math.PI / 2);
  shape.lineTo(-ix, HZ); shape.absarc(-ix, iz, CORNER, Math.PI / 2, Math.PI);
  shape.lineTo(-HX, -iz); shape.absarc(-ix, -iz, CORNER, Math.PI, Math.PI * 1.5);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: ACRYLIC - .0008, bevelEnabled: false, curveSegments: 10 });
  geo.rotateX(Math.PI / 2); geo.translate(0, -.0008, 0);
  const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: .015, ior: 1.49, thickness: ACRYLIC, attenuationColor: 0xeaf7fc, attenuationDistance: 4, clearcoat: 1, clearcoatRoughness: .02, specularIntensity: 1 });
  const slab = new THREE.Mesh(geo, material); slab.name = 'Body_ClearAcrylicBase';
  slab.receiveShadow = true; model.add(slab);
  return slab;
}

// A-frame pool ladder over the front (+Z) wall. Inside, treads stand underwater
// against the wall (seen through the clear resin); outside, a slanted flight
// climbs from the deck to the rim so the puppy can get in and out.
function buildSideLadder(ladder, rim, floor) {
  const wall = WALL_Z, inner = wall - .62, rail = 0xd9e2e3, tread = 0xe8ece4;
  const footZ = wall + 1.25, topZ = wall + .12, topY = rim + .55;
  const outsideZ = y => topZ + (topY - y) / (topY - DECK_Y) * (footZ - topZ);
  for (const x of [-.5, .5]) {
    tube(ladder, [[x, floor + .12, inner], [x, rim - .2, inner], [x, rim + .6, inner + .06], [x, rim + .86, wall - .28], [x, rim + .78, wall + .1], [x, topY - .1, topZ + .12], [x, (topY + DECK_Y) / 2, outsideZ((topY + DECK_Y) / 2) + .02], [x, DECK_Y + .04, footZ]], .05, rail);
    box(ladder, .14, .05, .22, x, DECK_Y + .025, footZ, rail);
  }
  const steps = Math.max(2, Math.floor((rim - .3 - (floor + .35)) / .36) + 1);
  for (let i = 0; i < steps; i++) {
    const y = floor + .35 + i * .36;
    box(ladder, .96, .055, .26, 0, y, inner + .02, tread);
    for (const x of [-.5, .5]) box(ladder, .07, .07, .1, x, y, inner + .02, rail);
  }
  // Outside flight: evenly spaced treads following the slanted rails.
  const flight = Math.max(3, Math.round((topY - .35 - DECK_Y) / .38));
  for (let i = 1; i <= flight; i++) {
    const y = DECK_Y + i * (topY - .2 - DECK_Y) / (flight + .3);
    const step = box(ladder, .96, .055, .3, 0, y, outsideZ(y), tread);
    step.rotation.x = -.06;
  }
  box(ladder, 1.06, .07, .5, 0, rim + .06, wall - .05, tread);
}

// White poolside deck, like the clean studio surface in the droplet photo.
function createDeck(root) {
  const deck = new THREE.Group(); deck.name = 'PoolsideDeck'; root.add(deck);
  const w = DECK.maxX - DECK.minX, d = DECK.maxZ - DECK.minZ, cx = (DECK.maxX + DECK.minX) / 2, cz = (DECK.maxZ + DECK.minZ) / 2;
  roundedPad(deck, w + .5, d + .5, .26, cx, DECK_Y - .4, cz, 0xe2e3df, 1.05);
  roundedPad(deck, w, d, .3, cx, DECK_Y - .3, cz, 0xf6f6f3, .9);
  deck.traverse(object => { if (object.isMesh) { object.castShadow = false; object.receiveShadow = true; } });
  return deck;
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
    [7.45, -2.2, .28, 'oval'], [6.9, -5.6, .62, 'splat'], [7.3, -8.4, .12, 'round'], [3.4, -9.25, .3, 'blob'], [.2, -9.3, .1, 'round'],
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
