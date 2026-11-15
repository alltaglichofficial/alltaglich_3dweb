import * as THREE from 'three';

// Indoor lamp lighting: a warm key lamp with a soft penumbra that casts the shadows,
// a dim cool fill lamp from the other side and a low room bounce. The key lamp can be moved anywhere
// round the island (setLamp):
//   az  degrees round the island, seen from the camera's home position:
//       0 = from the camera, + = camera right, - = camera left, 180 = behind the island
//   el  height above the table in degrees (90 = straight overhead)
const ROOMS = {
  lamp: { ui: 'lamp', background: 0xfafafa, room: [0xfff6ea, 0x9a958a, 1.55], key: { c: 0xffe8cc, i: 2.6, ang: .85, pen: .5 }, fill: .6, exposure: .97, shadow: .14, reflections: 1 },
};
export const MOOD_NAMES = Object.keys(ROOMS);
// where the key lamp starts: up and to the left of the camera
export const LAMP_HOME = { az: -60, el: 65 };
const KEY_DIST = 39;

export function createLighting(scene, renderer, { coarse = false } = {}) {
  const room = new THREE.HemisphereLight(0xffffff, 0x888888, 1); scene.add(room);
  // Key lamp. decay 0 keeps the brightness independent of distance, so the
  // whole island is lit evenly inside the cone and fades only at its edge.
  const key = new THREE.SpotLight(0xffe8cc, 2, 0, .6, .85, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  key.shadow.camera.near = 8; key.shadow.camera.far = 90;
  key.shadow.normalBias = .035; key.shadow.bias = -.00012; key.shadow.radius = 5;
  scene.add(key, key.target);
  // Fill lamp from the other side; no shadows.
  const fill = new THREE.SpotLight(0xdfe9ff, .5, 0, .75, 1, 0); scene.add(fill, fill.target);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.ShadowMaterial({ color: 0x000000, opacity: .12 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.64; floor.receiveShadow = true; scene.add(floor);
  scene.background = new THREE.Color();

  const centre = new THREE.Vector3(0, -1.6, 4);
  let home = Math.atan2(15, 29);   // camera's home azimuth; the lamp's direction is relative to it
  let mood = 'lamp', preset = ROOMS.lamp;
  const lamp = { ...LAMP_HOME };
  function arrange() {
    const a = home + THREE.MathUtils.degToRad(lamp.az), e = THREE.MathUtils.degToRad(lamp.el);
    key.position.set(centre.x + Math.sin(a) * Math.cos(e) * KEY_DIST, centre.y + Math.sin(e) * KEY_DIST, centre.z + Math.cos(a) * Math.cos(e) * KEY_DIST);
    key.target.position.copy(centre);
    fill.position.set(centre.x + 22, centre.y + 19.6, centre.z - 12); fill.target.position.copy(centre);
  }
  const lighting = {
    get mood() { return mood; },
    get ui() { return preset.ui; },
    get lamp() { return { ...lamp }; },
    setMood(name, worlds = []) {
      mood = ROOMS[name] ? name : 'lamp';
      const m = preset = ROOMS[mood];
      scene.background.set(m.background);
      room.color.set(m.room[0]); room.groundColor.set(m.room[1]); room.intensity = m.room[2];
      key.color.set(m.key.c); key.intensity = m.key.i; key.angle = m.key.ang; key.penumbra = m.key.pen;
      fill.intensity = m.fill;
      renderer.toneMappingExposure = m.exposure; floor.material.opacity = m.shadow;
      arrange();
      worlds.forEach(world => world.setMood?.(m.ui, m));
      document.documentElement.dataset.mood = m.ui;
      return mood;
    },
    // Moves the key lamp (and so the shadows) round the island.
    setLamp(az, el) {
      lamp.az = ((az + 540) % 360) - 180;
      lamp.el = THREE.MathUtils.clamp(el, 12, 89);
      arrange();
      return { ...lamp };
    },
    // Unit vector from the island's centre toward the key lamp (world space).
    keyDirection(out = new THREE.Vector3()) { return out.copy(key.position).sub(centre).normalize(); },
    // Aim the lamps a little in front of the island's centre, where the bears play.
    // direction (optional) is the island's camera home direction.
    aim(x, z, direction) {
      centre.set(x, -1.6, z + 4);
      if (direction) home = Math.atan2(direction.x, direction.z);
      arrange();
    },
    update() {},
  };
  lighting.setMood('lamp');
  return lighting;
}
