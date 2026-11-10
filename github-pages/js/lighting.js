import * as THREE from 'three';

// Indoor lamp lighting instead of sunlight: a warm overhead key lamp with soft
// penumbra and shadows, a dim cool fill lamp and a low room bounce. Two moods:
//  - 'lamp': a softly lit studio room (default).
//  - 'dark': the same lamp in a dark room, as if photographed at night; only
//    a pool of light reaches the island and the background falls to near black.
const MOODS = {
  lamp: { background: 0xefebe3, room: [0xfff6ea, 0x9a958a, 1.55], key: 2.6, keyAngle: .85, keyPenumbra: .5, fill: .6, exposure: .97, shadow: .14, reflections: 1 },
  dark: { background: 0x0f1013, room: [0xa4acbd, 0x2b2b31, .5], key: 3.3, keyAngle: .62, keyPenumbra: 1, fill: .4, exposure: .9, shadow: .45, reflections: .38 },
};
export const MOOD_NAMES = Object.keys(MOODS);

export function createLighting(scene, renderer, { coarse = false } = {}) {
  const room = new THREE.HemisphereLight(0xffffff, 0x888888, 1); scene.add(room);
  // Overhead key lamp. decay 0 keeps the brightness independent of distance, so
  // the whole island is lit evenly inside the cone and fades only at its edge.
  const key = new THREE.SpotLight(0xffe8cc, 2, 0, .6, .85, 0);
  key.position.set(-9, 34, 14); key.castShadow = true;
  key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  key.shadow.camera.near = 8; key.shadow.camera.far = 90;
  key.shadow.normalBias = .035; key.shadow.bias = -.00012; key.shadow.radius = 5;
  key.target.position.set(0, -1.6, -3); scene.add(key, key.target);
  // Cool fill lamp from the opposite side, no shadows.
  const fill = new THREE.SpotLight(0xdfe9ff, .5, 0, .75, 1, 0);
  fill.position.set(22, 18, -12); fill.target.position.set(0, -1.6, -3); scene.add(fill, fill.target);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.ShadowMaterial({ color: 0x2b2a26, opacity: .14 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.64; floor.receiveShadow = true; scene.add(floor);
  scene.background = new THREE.Color();
  let mood = 'lamp';
  const lighting = {
    get mood() { return mood; },
    setMood(name, worlds = []) {
      mood = MOODS[name] ? name : 'lamp';
      const m = MOODS[mood];
      scene.background.set(m.background);
      room.color.set(m.room[0]); room.groundColor.set(m.room[1]); room.intensity = m.room[2];
      key.intensity = m.key; key.angle = m.keyAngle; key.penumbra = m.keyPenumbra;
      fill.intensity = m.fill; renderer.toneMappingExposure = m.exposure; floor.material.opacity = m.shadow;
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
