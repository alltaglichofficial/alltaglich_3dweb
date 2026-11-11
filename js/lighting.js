import * as THREE from 'three';
import { RoomEnvironment } from '../product/vendor/environments/RoomEnvironment.js';

// Indoor lamp lighting instead of sunlight: a warm overhead key lamp with soft
// penumbra and shadows, a dim cool fill lamp and a low room bounce. Two moods:
//  - 'lamp': a softly lit studio room (default).
//  - 'dark': the same lamp in a dark room, as if photographed at night; only
//    a pool of light reaches the island and the background falls to near black.
const MOODS = {
  lamp: { background: 0xf7f7f5, room: [0xffffff, 0xa7a6a1, 1.45], key: 2.7, keyAngle: .85, keyPenumbra: .6, fill: .6, exposure: .95, shadow: .2, reflections: 1, env: .45 },
  dark: { background: 0x0f1013, room: [0xa4acbd, 0x2b2b31, .5], key: 3.3, keyAngle: .62, keyPenumbra: 1, fill: .4, exposure: .9, shadow: .45, reflections: .38, env: .12 },
};
export const MOOD_NAMES = Object.keys(MOODS);

export function createLighting(scene, renderer, { coarse = false } = {}) {
  const room = new THREE.HemisphereLight(0xffffff, 0x888888, 1); scene.add(room);
  // Overhead key lamp. decay 0 keeps the brightness independent of distance, so
  // the whole island is lit evenly inside the cone and fades only at its edge.
  // Near-daylight white so the white studio reads as white, with a hint of warmth.
  const key = new THREE.SpotLight(0xfff2e2, 2, 0, .6, .85, 0);
  key.position.set(-9, 34, 14); key.castShadow = true;
  key.shadow.mapSize.set(coarse ? 1024 : 4096, coarse ? 1024 : 4096);
  key.shadow.camera.near = 8; key.shadow.camera.far = 90;
  key.shadow.normalBias = .035; key.shadow.bias = -.00012; key.shadow.radius = 5;
  key.target.position.set(0, -1.6, -3); scene.add(key, key.target);
  // Cool fill lamp from the opposite side, no shadows.
  const fill = new THREE.SpotLight(0xdfe9ff, .5, 0, .75, 1, 0);
  fill.position.set(22, 18, -12); fill.target.position.set(0, -1.6, -3); scene.add(fill, fill.target);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.ShadowMaterial({ color: 0x2b2a26, opacity: .14 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.64; floor.receiveShadow = true; scene.add(floor);
  scene.background = new THREE.Color();
  // Soft studio reflections on every surface (painted wood, plush, metal), not only
  // on the pool's own materials: a blurred room environment at low strength.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
  let mood = 'lamp';
  const lighting = {
    toneMappedBackground: false,
    get mood() { return mood; },
    setMood(name, worlds = []) {
      mood = MOODS[name] ? name : 'lamp';
      const m = MOODS[mood];
      scene.background.set(m.background);
      // With post-processing the background goes through tone mapping too; pre-compensate
      // it so the page still shows the exact studio white (or night black).
      if (lighting.toneMappedBackground) scene.background.copy(untonemap(new THREE.Color(m.background), m.exposure));
      room.color.set(m.room[0]); room.groundColor.set(m.room[1]); room.intensity = m.room[2];
      key.intensity = m.key; key.angle = m.keyAngle; key.penumbra = m.keyPenumbra;
      fill.intensity = m.fill; renderer.toneMappingExposure = m.exposure; floor.material.opacity = m.shadow;
      scene.environmentIntensity = m.env;
      worlds.forEach(world => world.setMood?.(mood, m));
      document.documentElement.dataset.mood = mood;
      return mood;
    },
    // Aim the lamp a little in front of the island's centre, where the puppy plays.
    aim(x, z) { z += 4; key.target.position.set(x, -1.6, z); fill.target.position.set(x, -1.6, z); key.position.set(x - 9, 34, z + 14); fill.position.set(x + 22, 18, z - 12); },
  };
  lighting.setMood('lamp');
  return lighting;
}

// Inverse of renderer exposure + Khronos PBR Neutral tone mapping, per channel
// (good for the near-grey studio backgrounds): finds the linear input that maps
// to the wanted displayed colour.
function neutral(v) {
  const start = .76, d = 1 - start, off = v < .08 ? v - 6.25 * v * v : .04, x = v - off;
  if (x < start) return x;
  const peak = 1 - d * d / (x + d - start), g = 1 - 1 / (.15 * (x - peak) + 1);
  return peak + (peak - peak) * g;
}
function untonemap(color, exposure) {
  const out = new THREE.Color();
  for (const k of ['r', 'g', 'b']) {
    const want = color[k]; let lo = 0, hi = 8; // color is linear (Color stores linear)
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (neutral(mid * exposure) < want) lo = mid; else hi = mid; }
    out[k] = (lo + hi) / 2;
  }
  return out;
}
