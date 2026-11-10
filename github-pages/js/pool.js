import * as THREE from 'three';
import { box, tube } from './geometry.js';
import { loadSwimmingPoolKeyring } from '../product/load-keyring.js';
import { createWaterMotion } from '../product/water-motion.js';
import { RoomEnvironment } from '../product/vendor/environments/RoomEnvironment.js';
import { createDogHouse, createFetchToy } from './house.js';

export function createPoolIsland(scene, island) {
  const root = new THREE.Group(); root.name = 'island-pool'; scene.add(root);
  const obstacles = [{ type: 'rect', x: 0, z: 0, w: 7.2, d: 7.8 }];
  let motion = null, swimmer = null;
  // Uniform scale keeps the keyring's real block proportions (thick clear resin
  // over a thin tiled floor) instead of squashing it into a flat tray.
  const SCALE = 11.2, BASE = -1.6;
  const surfaceHeight = (x, z) => motion ? motion.heightAt(x / SCALE, z / SCALE) * SCALE + BASE : .08;
  const house = createDogHouse(root, obstacles, { x: -4.4, z: -6.6, color: 0x8cb9bc });
  const toy = createFetchToy(root, { x: 2, y: .3, z: 5.15 }, island.spawn);
  const ladder = new THREE.Group(); ladder.name = 'PuppyPoolLadder'; root.add(ladder);
  for (const x of [-.55, .55]) tube(ladder, [[x, -.38, 2.8], [x, .15, 4.3], [x, .75, 4.8], [x, .77, 5.15], [x, .1, 5.3]], .045, 0xc8dbd9);
  for (let i = 0; i < 7; i++) { const t = i / 6; const rung = box(ladder, 1.05, .065, .24, 0, -.39 + t * .48, 2.8 + t * 2.15, 0xd8dfc9); rung.rotation.x = -.22; }
  const wake = new THREE.Group(); wake.name = 'PuppyWaterWake'; root.add(wake);
  for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.45, .012, 4, 40), new THREE.MeshBasicMaterial({ color: 0xe4fbff, transparent: true, opacity: .3, depthWrite: false })); ring.rotation.x = -Math.PI / 2; wake.add(ring); }
  wake.visible = false;
  const world = {
    root, island, obstacles, house, fetchActivity: toy,
    navigationOptions: { bounds: { minX: -5.6, maxX: 5.6, minZ: -8.6, maxZ: 8.6 }, clearance: .75 },
    activity: { type: 'swim', entry: { x: 0, z: 4.95 }, waterEntry: { x: 0, z: 2.8 }, route: [{ x: -1.65, z: 2.35 }, { x: -1.65, z: -2.6 }, { x: 1.6, z: -2.6 }, { x: 1.6, z: 2.35 }, { x: 0, z: 2.8 }] },
    getSurfaceHeight: surfaceHeight,
    heightAt(x, z) { return Math.abs(x - house.object.position.x) < 1.4 && Math.abs(z - house.object.position.z) < 1.3 ? house.object.position.y + .02 : surfaceHeight(x, z); },
    setSwimmer(point) { swimmer = point ? { x: point.x, z: point.z } : null; motion?.setSwimmer(point ? point.x / 11.2 : 99, point ? point.z / 11.2 : 99, !!point); },
    update(time, reducedMotion) {
      motion?.update(time, reducedMotion); wake.visible = !!swimmer;
      if (swimmer) { wake.position.set(swimmer.x, surfaceHeight(swimmer.x, swimmer.z) + .025, swimmer.z); wake.children.forEach((ring, i) => { const t = (time * .75 + i / 3) % 1; ring.scale.setScalar(.6 + t * 1.8); ring.material.opacity = (1 - t) * .35; }); }
    },
    setupEnvironment(renderer) { const environment = new RoomEnvironment(); const pmrem = new THREE.PMREMGenerator(renderer); const texture = pmrem.fromScene(environment, .04).texture; environment.dispose(); pmrem.dispose(); world.water.material.envMap = texture; world.water.material.envMapIntensity = 1.15; world.water.material.needsUpdate = true; },
  };
  world.ready = loadSwimmingPoolKeyring().then(({ model, floor, water }) => {
    model.scale.setScalar(SCALE); model.position.y = BASE; root.add(model);
    paintSampleTiles(floor); clearResin(water);
    motion = createWaterMotion(water, floor); world.waterMotion = motion; world.water = water; world.product = model;
    // The ladder was authored against the old flat surface; lift it onto the new one.
    const h = motion.heightAt(0, 4.3 / SCALE); ladder.position.y = (h * SCALE + BASE) - (h * 4 - .9);
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
