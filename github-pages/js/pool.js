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
  const surfaceHeight = (x, z) => motion ? motion.heightAt(x / 11.2, z / 11.2) * 4 - .9 : .08;
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
    setupEnvironment(renderer) { const environment = new RoomEnvironment(); const pmrem = new THREE.PMREMGenerator(renderer); const texture = pmrem.fromScene(environment, .04).texture; environment.dispose(); pmrem.dispose(); world.water.material.envMap = texture; world.water.material.envMapIntensity = .7; world.water.material.needsUpdate = true; },
  };
  world.ready = loadSwimmingPoolKeyring().then(({ model, floor, water }) => {
    model.scale.set(11.2, 4, 11.2); model.position.y = -.9; root.add(model);
    motion = createWaterMotion(water, floor); world.waterMotion = motion; world.water = water; world.product = model;
    house.object.position.y = surfaceHeight(-4.4, -6.6); toy.ballHome.y = surfaceHeight(2, 5.15) + .18; toy.ball.position.y = toy.ballHome.y;
    return world;
  });
  return world;
}
