import * as THREE from 'three';
import { box, tube } from './geometry.js';
import { loadSwimmingPoolKeyring } from '../product/load-keyring.js';
import { createWaterMotion } from '../product/water-motion.js';
import { RoomEnvironment } from '../product/vendor/environments/RoomEnvironment.js';
import { createDogHouse, createFetchToy } from './house.js';
import { createSwimBear } from './bear.js';

// Normalised keyring units (body width 1): footprint half-sizes and corner
// radius of the GLB outline, top of the tile floor, acrylic slab and dome rise.
const HX = .5, HZ = .7726628, CORNER = .06, FLOOR_TOP = .05167452, ACRYLIC = .045, DOME = .024;

export function createPoolIsland(scene, island) {
  const root = new THREE.Group(); root.name = 'island-pool'; scene.add(root);
  const obstacles = [{ type: 'rect', x: 0, z: 0, w: 7.2, d: 7.8 }];
  let motion = null, swimmer = null;
  // Uniform scale keeps the keyring's real block proportions (thick clear resin
  // over a thin tiled floor). A clear acrylic slab sits under the tiles, so the
  // whole block is lifted by its thickness and still rests on the ground.
  const SCALE = 11.2, BASE = -1.6 + ACRYLIC * SCALE;
  const surfaceHeight = (x, z) => motion ? motion.heightAt(x / SCALE, z / SCALE) * SCALE + BASE : .08;
  const house = createDogHouse(root, obstacles, { x: -4.4, z: -6.6, color: 0x8cb9bc });
  const toy = createFetchToy(root, { x: 2, y: .3, z: 5.15 }, island.spawn);
  const ladder = new THREE.Group(); ladder.name = 'PuppyPoolLadder'; root.add(ladder);
  const bear = createSwimBear(root, { x: 0, z: -.15 });
  const wake = new THREE.Group(); wake.name = 'PuppyWaterWake'; root.add(wake);
  for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.45, .012, 4, 40), new THREE.MeshBasicMaterial({ color: 0xe4fbff, transparent: true, opacity: .3, depthWrite: false })); ring.rotation.x = -Math.PI / 2; wake.add(ring); }
  wake.visible = false;
  const world = {
    root, island, obstacles, house, fetchActivity: toy,
    navigationOptions: { bounds: { minX: -5.6, maxX: 5.6, minZ: -8.6, maxZ: 8.6 }, clearance: .75 },
    // The ladder hangs on the front side wall; the puppy climbs down it, swims the
    // lane corridor to the middle and paddles a loop around the playing bear.
    activity: { type: 'swim', entry: { x: 0, z: 7.6 }, waterEntry: { x: 0, z: 7 }, corridorStart: { x: 0, z: 2.8 }, route: [{ x: 0, z: 2.8 }, { x: -1.65, z: 2.35 }, { x: -1.65, z: -2.6 }, { x: 1.6, z: -2.6 }, { x: 1.6, z: 2.35 }, { x: 0, z: 2.8 }] },
    bear,
    getSurfaceHeight: surfaceHeight,
    heightAt(x, z) { return Math.abs(x - house.object.position.x) < 1.4 && Math.abs(z - house.object.position.z) < 1.3 ? house.object.position.y + .02 : surfaceHeight(x, z); },
    setSwimmer(point) { swimmer = point ? { x: point.x, z: point.z } : null; motion?.setSwimmer(point ? point.x / 11.2 : 99, point ? point.z / 11.2 : 99, !!point); },
    update(time, reducedMotion) {
      motion?.update(time, reducedMotion); wake.visible = !!swimmer;
      bear.update(time, reducedMotion, surfaceHeight);
      if (swimmer) { wake.position.set(swimmer.x, surfaceHeight(swimmer.x, swimmer.z) + .025, swimmer.z); wake.children.forEach((ring, i) => { const t = (time * .75 + i / 3) % 1; ring.scale.setScalar(.6 + t * 1.8); ring.material.opacity = (1 - t) * .35; }); }
    },
    setupEnvironment(renderer) { const environment = new RoomEnvironment(); const pmrem = new THREE.PMREMGenerator(renderer); const texture = pmrem.fromScene(environment, .04).texture; environment.dispose(); pmrem.dispose(); for (const m of [world.water.material, world.acrylic.material]) { m.envMap = texture; m.envMapIntensity = 1.15; m.needsUpdate = true; } },
  };
  world.ready = loadSwimmingPoolKeyring().then(({ model, floor, water }) => {
    model.scale.setScalar(SCALE); model.position.y = BASE; root.add(model);
    paintSampleTiles(floor); domeFloor(floor); clearResin(water);
    world.acrylic = addAcrylicBase(model);
    motion = createWaterMotion(water, floor); world.waterMotion = motion; world.water = water; world.product = model;
    buildSideLadder(ladder, surfaceHeight(0, 8.15), BASE + FLOOR_TOP * SCALE);
    house.object.position.y = surfaceHeight(-4.4, -6.6); toy.ballHome.y = surfaceHeight(2, 5.15) + .18; toy.ball.position.y = toy.ballHome.y;
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

// Classic pool ladder on the front (+Z) side wall: handrails rise from the
// water, curve over the rim and hook down the outside face; the treads stay
// underwater against the wall, visible through the clear resin.
function buildSideLadder(ladder, rim, floor) {
  const wall = HZ * 11.2, inner = wall - .62, rail = 0xd9e2e3, tread = 0xe8ece4;
  for (const x of [-.5, .5]) {
    tube(ladder, [[x, floor + .12, inner], [x, rim - .2, inner], [x, rim + .6, inner + .06], [x, rim + .86, wall - .28], [x, rim + .72, wall + .14], [x, rim + .18, wall + .22], [x, rim - .45, wall + .22]], .05, rail);
    tube(ladder, [[x, rim - .45, wall + .22], [x, rim - .5, wall + .02]], .05, rail);
  }
  const steps = Math.max(2, Math.floor((rim - .3 - (floor + .35)) / .36) + 1);
  for (let i = 0; i < steps; i++) {
    const y = floor + .35 + i * .36;
    box(ladder, .96, .055, .26, 0, y, inner + .02, tread);
    for (const x of [-.5, .5]) box(ladder, .07, .07, .1, x, y, inner + .02, rail);
  }
}
