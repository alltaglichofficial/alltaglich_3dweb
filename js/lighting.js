import * as THREE from 'three';

// Indoor lamp lighting instead of sunlight: a warm overhead key lamp with soft
// penumbra and shadows, a dim cool fill lamp and a low room bounce.
//
// Besides the two original moods ('lamp', 'dark') there are 34 photographic
// lighting set-ups (high-key, Rembrandt, golden hour, neon ...). Every set-up
// is one row of numbers for the same four lights, so switching never adds or
// removes a light and never recompiles a shader:
//   room  hemisphere bounce            [sky, ground, intensity]
//   key   shadow-casting spot lamp     { c, i, az, el, ang, pen, gobo }
//   fill  spot lamp without shadows    { c, i, az, el }
//   rim   back lamp without shadows    { c, i, az, el }
// az is the lamp's direction in degrees seen from the camera's home position:
// 0 = from the camera, + = camera right, - = camera left, 180 = behind the island.
// el is its height above the horizon in degrees.
//   ui      'lamp' | 'dark'  which page theme (text colours) goes with it
//   world   what the islands are told (pool tile glow); defaults to ui
//   gobo    pattern projected by the key lamp: blinds | dapple | bar
//   fx      fire (flicker) | pass (a headlight sweeping by) | haze (visible beams)
//   grade   optional CSS filter on the canvas
const BASE = {
  background: 0xefebe3, room: [0xfff6ea, 0x9a958a, 1.55],
  key: { c: 0xffe8cc, i: 2.6, az: 0, el: 45, dist: 36, ang: .85, pen: .5 },
  fill: { c: 0xdfe9ff, i: 0, az: 90, el: 30, dist: 31 },
  rim: { c: 0xffffff, i: 0, az: 180, el: 40, dist: 34 },
  exposure: .97, shadow: .14, reflections: 1, ui: 'lamp',
};
const PRESETS = {
  // The two original moods keep their exact lamp positions.
  lamp: { ko: '기본 조명', en: 'Studio lamp', key: { pos: [-9, 35.6, 14] }, fill: { i: .6, pos: [22, 19.6, -12] } },
  dark: { ko: '어두운 방', en: 'Dark room', ui: 'dark', background: 0x0f1013, room: [0xa4acbd, 0x2b2b31, .5], key: { i: 3.3, ang: .62, pen: 1, pos: [-9, 35.6, 14] }, fill: { i: .4, pos: [22, 19.6, -12] }, exposure: .9, shadow: .45, reflections: .38 },

  highkey: { no: 1, ko: '하이키', en: 'High-Key', background: 0xf6f4ef, room: [0xffffff, 0xdcdad4, 2.3], key: { c: 0xffffff, i: 1.5, az: -10, el: 55, ang: .9, pen: 1 }, fill: { c: 0xffffff, i: 1.1, az: 40, el: 35 }, exposure: 1.04, shadow: .05 },
  lowkey: { no: 2, ko: '로우키', en: 'Low-Key', ui: 'dark', background: 0x0b0b0d, room: [0x8a8f9c, 0x1a1a1e, .12], key: { c: 0xfff3e2, i: 3.4, az: -55, el: 42, ang: .27, pen: .9 }, exposure: .92, shadow: .5, reflections: .25 },
  rembrandt: { no: 3, ko: '렘브란트', en: 'Rembrandt', ui: 'dark', background: 0x17120e, room: [0xa08a70, 0x1e1814, .2], key: { c: 0xffd9a8, i: 3.6, az: -45, el: 48, ang: .3, pen: .7 }, fill: { c: 0xffe2c0, i: .12, az: 60, el: 20 }, exposure: .94, shadow: .5, reflections: .3 },
  butterfly: { no: 4, ko: '버터플라이', en: 'Butterfly', ui: 'dark', background: 0x1c1c1f, room: [0xb8bcc6, 0x202024, .22], key: { c: 0xffffff, i: 3.8, az: 0, el: 62, ang: .25, pen: .35 }, exposure: .95, shadow: .5, reflections: .35 },
  split: { no: 5, ko: '스플릿 라이트', en: 'Split', ui: 'dark', background: 0x060607, room: [0x777a84, 0x0c0c0e, .03], key: { c: 0xffffff, i: 4, az: -90, el: 17, ang: .34, pen: .15 }, exposure: .95, shadow: .6, reflections: .12 },
  loop: { no: 6, ko: '루프 라이트', en: 'Loop', background: 0xe9e4da, room: [0xfff4e6, 0x8f8a80, 1.1], key: { c: 0xfff1de, i: 2.6, az: -30, el: 38, ang: .7, pen: .9 }, fill: { i: .45, az: 50, el: 25 }, shadow: .16 },
  broad: { no: 7, ko: '브로드 라이트', en: 'Broad', background: 0xece4d6, room: [0xffefdc, 0x9c9282, 1.2], key: { c: 0xffe9cf, i: 2.6, az: 25, el: 35, ang: .8, pen: 1 }, fill: { c: 0xfff0e0, i: .25, az: -70, el: 25 }, shadow: .14 },
  short: { no: 8, ko: '숏 라이트', en: 'Short', ui: 'dark', background: 0x1d1b1a, room: [0xa9a39a, 0x1e1c1a, .28], key: { c: 0xfff0dc, i: 3.3, az: -130, el: 35, ang: .36, pen: .8 }, fill: { i: .08, az: 30, el: 25 }, exposure: .94, shadow: .45, reflections: .35 },
  chiaroscuro: { no: 9, ko: '키아로스쿠로', en: 'Chiaroscuro', ui: 'dark', background: 0x050403, room: [0x8a7458, 0x0c0a08, .04], key: { c: 0xffc98a, i: 4.2, az: -55, el: 52, ang: .23, pen: .5 }, exposure: .95, shadow: .6, reflections: .15 },
  silhouette: { no: 10, ko: '실루엣', en: 'Silhouette', background: 0xf4f4f2, room: [0xffffff, 0x8a8a8a, .05], key: { i: 0 }, rim: { c: 0xffffff, i: .9, az: 180, el: 28 }, exposure: 1, shadow: 0, reflections: .08 },
  rim: { no: 11, ko: '림 라이트', en: 'Rim Light', ui: 'dark', background: 0x0a0b0e, room: [0x8c94a6, 0x101114, .1], key: { c: 0xffffff, i: 4.5, az: 165, el: 50, ang: .4, pen: .6 }, fill: { i: .22, az: 0, el: 20 }, exposure: .95, shadow: .4, reflections: .3 },
  hard: { no: 12, ko: '하드 라이트', en: 'Hard Light', background: 0xe6e2d8, room: [0xffffff, 0x8c887e, .7], key: { c: 0xffffff, i: 3.6, az: 35, el: 40, ang: .6, pen: .05 }, exposure: .98, shadow: .5 },
  soft: { no: 13, ko: '소프트 라이트', en: 'Soft Light', background: 0xefece6, room: [0xfffaf2, 0xb5b0a6, 1.9], key: { c: 0xfff8ee, i: 1.5, az: -35, el: 40, ang: .9, pen: 1 }, fill: { c: 0xffffff, i: .9, az: 45, el: 30 }, shadow: .06 },
  bounce: { no: 14, ko: '바운스 라이트', en: 'Bounce', background: 0xefe6d8, room: [0xffe6c4, 0xc9a986, 2.0], key: { c: 0xffdcb0, i: .9, az: 70, el: 20, ang: .9, pen: 1 }, fill: { c: 0xffe9d0, i: .5, az: -40, el: 30 }, shadow: .05 },
  top: { no: 15, ko: '탑 라이트', en: 'Top Light', ui: 'dark', background: 0x08080a, room: [0x80848e, 0x0c0c0e, .05], key: { c: 0xffffff, i: 4.2, az: 0, el: 86, ang: .21, pen: .2 }, exposure: .95, shadow: .6, reflections: .2 },
  under: { no: 16, ko: '언더 라이트', en: 'Under Lighting', ui: 'dark', background: 0x070606, room: [0x86705c, 0x0b0a09, .04], key: { c: 0xffcf99, i: 3.6, az: 0, el: 5, ang: .34, pen: .6 }, exposure: .95, shadow: .5, reflections: .15 },
  golden: { no: 17, ko: '골든 아워', en: 'Golden Hour', background: 0xf3d9ae, room: [0xffd9a0, 0xa8744a, 1.0], key: { c: 0xffb45e, i: 3.4, az: -80, el: 14, ang: .8, pen: .8 }, fill: { c: 0xffcf9a, i: .25, az: 60, el: 25 }, exposure: 1, shadow: .28 },
  bluehour: { no: 18, ko: '블루 아워', en: 'Blue Hour', ui: 'dark', background: 0x34496b, room: [0x8fb0e8, 0x2a3550, 1.3], key: { c: 0xa9c4f0, i: .8, az: -70, el: 30, ang: .9, pen: 1 }, fill: { c: 0x9ab4e6, i: .3, az: 60, el: 30 }, exposure: .85, shadow: .12, reflections: .6 },
  dayfornight: { no: 19, ko: '데이 포 나이트', en: 'Day for Night', ui: 'dark', background: 0x0d1830, room: [0x5f86d8, 0x101a30, .9], key: { c: 0x86a8ff, i: 1.3, az: -50, el: 55, ang: .9, pen: 1 }, exposure: .62, shadow: .3, reflections: .4, grade: 'saturate(.75)' },
  moonlight: { no: 20, ko: '문라이트', en: 'Moonlight', ui: 'dark', background: 0x070b14, room: [0x5a6f96, 0x0a0d14, .22], key: { c: 0xb9cdf2, i: 2.0, az: -75, el: 35, ang: .5, pen: 1 }, exposure: .92, shadow: .4, reflections: .3 },
  window: { no: 21, ko: '윈도우 라이트', en: 'Window Light', background: 0xddd9d0, room: [0xf2f5fa, 0x8c8a84, .75], key: { c: 0xf4f8ff, i: 2.8, az: -80, el: 28, ang: .7, pen: 1 }, fill: { i: .1, az: 60, el: 25 }, shadow: .25 },
  practical: { no: 22, ko: '프랙티컬 라이트', en: 'Practical', ui: 'dark', background: 0x100c08, room: [0x9c7a54, 0x120d08, .08], key: { c: 0xffb766, i: 3.8, az: 80, el: 26, ang: .5, pen: 1 }, exposure: .95, shadow: .45, reflections: .25 },
  firelight: { no: 23, ko: '파이어 라이트', en: 'Firelight', ui: 'dark', background: 0x0a0604, room: [0xff8a3c, 0x140a05, .14], key: { c: 0xff8a3a, i: 4.6, az: 70, el: 14, ang: .45, pen: 1 }, exposure: .95, shadow: .5, reflections: .2, fx: 'fire' },
  blinds: { no: 24, ko: '베니션 블라인드', en: 'Venetian Blinds', ui: 'dark', background: 0x14110e, room: [0xa89880, 0x15120e, .15], key: { c: 0xffe2b8, i: 4.6, az: -70, el: 32, ang: .5, pen: .2, gobo: 'blinds' }, exposure: .95, shadow: .5, reflections: .3 },
  dappled: { no: 25, ko: '대플드 라이트', en: 'Dappled', background: 0xe9ecdf, room: [0xf4ffe6, 0x8a9a78, .55], key: { c: 0xfff2cf, i: 5.2, az: -40, el: 58, ang: .42, pen: .4, gobo: 'dapple' }, shadow: .2 },
  volumetric: { no: 26, ko: '볼류메트릭 라이트', en: 'Volumetric', ui: 'dark', background: 0x16140f, room: [0xb0a488, 0x17150f, .2], key: { c: 0xffe6b8, i: 4.8, az: -65, el: 40, ang: .45, pen: .2, gobo: 'blinds' }, exposure: .95, shadow: .45, reflections: .3, fx: 'haze' },
  flat: { no: 27, ko: '플랫 라이트', en: 'Overcast Flat', background: 0xcfd2d4, room: [0xe8ecf0, 0xb4b8bc, 2.4], key: { c: 0xe9eef2, i: .5, az: 0, el: 75, ang: .9, pen: 1 }, fill: { c: 0xe9eef2, i: .4, az: 90, el: 40 }, exposure: .95, shadow: .04, grade: 'saturate(.7)' },
  neon: { no: 28, ko: '네온 라이트', en: 'Neon', ui: 'dark', background: 0x0a0612, room: [0x3a2a5a, 0x0a0612, .25], key: { c: 0xff2fa8, i: 3.6, az: 65, el: 30, ang: .7, pen: 1 }, fill: { c: 0x2a6bff, i: 3.2, az: -65, el: 30 }, exposure: .95, shadow: .4, reflections: .3 },
  tealorange: { no: 29, ko: '틸 앤 오렌지', en: 'Teal and Orange', ui: 'dark', background: 0x0f2b30, room: [0x3fb0b0, 0x0c2a2e, .7], key: { c: 0xff9a4a, i: 3.0, az: 35, el: 35, ang: .6, pen: .9 }, fill: { c: 0x2fb5b0, i: .9, az: -110, el: 25 }, exposure: .95, shadow: .3, reflections: .4 },
  red: { no: 30, ko: '모노크롬 레드', en: 'Monochrome Red', ui: 'dark', world: 'lamp', background: 0x1a0000, room: [0xff0000, 0x300000, .8], key: { c: 0xff1a10, i: 3.2, az: -30, el: 45, ang: .85, pen: 1 }, fill: { c: 0xff0000, i: .6, az: 60, el: 30 }, exposure: .95, shadow: .4, reflections: .04 },
  screen: { no: 31, ko: '스크린 글로우', en: 'Screen Glow', ui: 'dark', background: 0x05070b, room: [0x6f86b0, 0x07090d, .03], key: { c: 0xbcd6ff, i: 3.2, az: 0, el: 14, ang: .32, pen: 1 }, exposure: .95, shadow: .45, reflections: .15 },
  passing: { no: 32, ko: '패싱 라이트', en: 'Passing Light', ui: 'dark', background: 0x060a14, room: [0x4a64a0, 0x060a14, .25], key: { c: 0xfff0d0, i: 4.5, az: -75, el: 22, ang: .42, pen: .3, gobo: 'bar' }, exposure: .95, shadow: .45, reflections: .25, fx: 'pass' },
  strobe: { no: 33, ko: '스트로브 라이트', en: 'Strobe', ui: 'dark', background: 0x050506, room: [0x8088a0, 0x08080a, .05], key: { c: 0xeaf2ff, i: 6, az: 0, el: 12, ang: .42, pen: .25 }, exposure: 1.15, shadow: .7, reflections: .2 },
  theatrical: { no: 34, ko: '시어트리컬 라이트', en: 'Theatrical Spotlight', ui: 'dark', background: 0x030303, room: [0x70747e, 0x060606, .03], key: { c: 0xffffff, i: 4.4, az: 0, el: 60, ang: .26, pen: .03 }, exposure: .95, shadow: .6, reflections: .15 },
};
for (const [id, p] of Object.entries(PRESETS)) {
  PRESETS[id] = { ...BASE, ...p, id, key: { ...BASE.key, ...p.key }, fill: { ...BASE.fill, ...p.fill }, rim: { ...BASE.rim, ...p.rim } };
}
export const MOOD_NAMES = Object.keys(PRESETS);
// For the picker: [{ id, no, ko, en, ui }]
export const LIGHTS = MOOD_NAMES.map(id => { const { no, ko, en, ui } = PRESETS[id]; return { id, no, ko, en, ui }; });

// Patterns the key lamp projects, like a cut-out held in front of it.
function gobo(kind) {
  const size = 256, canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  g.fillStyle = kind === 'plain' ? '#fff' : '#000'; g.fillRect(0, 0, size, size);
  if (kind === 'blinds') {
    g.translate(size / 2, size / 2); g.rotate(-.12); g.translate(-size / 2, -size / 2);
    g.fillStyle = '#fff'; g.filter = 'blur(1.2px)';
    for (let y = -20; y < size + 20; y += 22) g.fillRect(-40, y, size + 80, 11);
  } else if (kind === 'dapple') {
    g.fillStyle = '#161616'; g.fillRect(0, 0, size, size);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.filter = 'blur(5px)'; g.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) { g.beginPath(); g.ellipse(rnd() * size, rnd() * size, 8 + rnd() * 18, 5 + rnd() * 12, rnd() * Math.PI, 0, Math.PI * 2); g.fill(); }
  } else if (kind === 'bar') {
    g.translate(size / 2, size / 2); g.rotate(.5); g.filter = 'blur(7px)';
    g.fillStyle = '#fff'; g.fillRect(-34, -size, 68, size * 2);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createLighting(scene, renderer, { coarse = false } = {}) {
  const room = new THREE.HemisphereLight(0xffffff, 0x888888, 1); scene.add(room);
  // Key lamp. decay 0 keeps the brightness independent of distance, so the
  // whole island is lit evenly inside the cone and fades only at its edge.
  const key = new THREE.SpotLight(0xffe8cc, 2, 0, .6, .85, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  key.shadow.camera.near = 8; key.shadow.camera.far = 90;
  key.shadow.normalBias = .035; key.shadow.bias = -.00012; key.shadow.radius = 5;
  // The key always carries a projected pattern (plain white by default) so
  // presets with blinds or leaf shadows only swap a texture.
  const gobos = { plain: gobo('plain'), blinds: gobo('blinds'), dapple: gobo('dapple'), bar: gobo('bar') };
  key.map = gobos.plain;
  scene.add(key, key.target);
  // Fill lamp from the other side and a back lamp for edges; no shadows.
  const fill = new THREE.SpotLight(0xdfe9ff, .5, 0, .75, 1, 0); scene.add(fill, fill.target);
  const rim = new THREE.SpotLight(0xffffff, 0, 0, .75, 1, 0); scene.add(rim, rim.target);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.ShadowMaterial({ color: 0x2b2a26, opacity: .14 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.64; floor.receiveShadow = true; scene.add(floor);
  scene.background = new THREE.Color();
  // Haze for the volumetric preset. The fog is always present with density 0,
  // so turning it on does not rebuild any material.
  scene.fog = new THREE.FogExp2(0x16140f, 0);
  const shafts = new THREE.Group(); shafts.visible = false; scene.add(shafts);
  {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 128;
    const g = canvas.getContext('2d');
    const across = g.createLinearGradient(0, 0, 64, 0);
    across.addColorStop(0, '#000'); across.addColorStop(.5, '#fff'); across.addColorStop(1, '#000');
    g.fillStyle = across; g.fillRect(0, 0, 64, 128);
    const along = g.createLinearGradient(0, 0, 0, 128);
    along.addColorStop(0, 'rgba(0,0,0,.25)'); along.addColorStop(.75, 'rgba(0,0,0,.45)'); along.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = along; g.fillRect(0, 0, 64, 128);
    const material = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), color: 0xffe2b0, transparent: true, opacity: .15, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false });
    const geometry = new THREE.PlaneGeometry(1, 1);
    for (const [offset, width] of [[-7.2, 1.5], [-4.4, 1.1], [-1.8, 1.7], [.9, 1.2], [3.5, 1.6], [6.3, 1.1]]) {
      const beam = new THREE.Mesh(geometry, material); beam.position.x = offset; beam.scale.set(width, 46, 1); beam.renderOrder = 5;
      shafts.add(beam);
    }
  }

  const centre = new THREE.Vector3(0, -1.6, 4);
  let home = Math.atan2(15, 29);   // camera's home azimuth; lamp directions are relative to it
  let mood = 'lamp', preset = PRESETS.lamp;
  const scratch = new THREE.Vector3(), axis = new THREE.Vector3(), side = new THREE.Vector3(), face = new THREE.Vector3(), basis = new THREE.Matrix4();
  function place(light, spec) {
    if (spec.pos) light.position.set(centre.x + spec.pos[0], centre.y + spec.pos[1], centre.z + spec.pos[2]);
    else {
      const a = home + THREE.MathUtils.degToRad(spec.az), e = THREE.MathUtils.degToRad(spec.el);
      light.position.set(centre.x + Math.sin(a) * Math.cos(e) * spec.dist, centre.y + Math.sin(e) * spec.dist, centre.z + Math.cos(a) * Math.cos(e) * spec.dist);
    }
    light.target.position.copy(centre);
  }
  function arrange() { place(key, preset.key); place(fill, preset.fill); place(rim, preset.rim); }
  const lighting = {
    get mood() { return mood; },
    get ui() { return preset.ui; },
    get label() { return (preset.no ? String(preset.no).padStart(2, '0') + ' ' : '') + preset.ko; },
    setMood(name, worlds = []) {
      mood = PRESETS[name] ? name : 'lamp';
      const m = preset = PRESETS[mood];
      scene.background.set(m.background);
      room.color.set(m.room[0]); room.groundColor.set(m.room[1]); room.intensity = m.room[2];
      key.color.set(m.key.c); key.intensity = m.key.i; key.angle = m.key.ang; key.penumbra = m.key.pen;
      key.map = gobos[m.key.gobo] || gobos.plain;
      fill.color.set(m.fill.c); fill.intensity = m.fill.i;
      rim.color.set(m.rim.c); rim.intensity = m.rim.i;
      renderer.toneMappingExposure = m.exposure; floor.material.opacity = m.shadow;
      scene.fog.density = m.fx === 'haze' ? .011 : 0; scene.fog.color.set(m.background);
      shafts.visible = m.fx === 'haze';
      renderer.domElement.style.filter = m.grade || '';
      arrange();
      worlds.forEach(world => world.setMood?.(m.world || m.ui, m));
      document.documentElement.dataset.mood = m.ui;
      document.documentElement.dataset.light = mood;
      return mood;
    },
    // Aim the lamps a little in front of the island's centre, where the puppy plays.
    // direction (optional) is the island's camera home direction.
    aim(x, z, direction) {
      centre.set(x, -1.6, z + 4);
      if (direction) home = Math.atan2(direction.x, direction.z);
      arrange();
    },
    // Moving light: fire flicker, a headlight passing by, and the haze beams.
    update(time, reducedMotion, camera) {
      const m = preset;
      if (m.fx === 'fire') {
        const flicker = reducedMotion ? 1 : .8 + .12 * Math.sin(time * 11.3) + .08 * Math.sin(time * 23.7 + 1.3) + .05 * Math.sin(time * 5.1 + .4);
        key.intensity = m.key.i * flicker;
      } else if (m.fx === 'pass') {
        // every four seconds a bar of light crosses the island
        const t = reducedMotion ? .5 : (time % 4) / 2.4;
        key.intensity = t > 1 ? 0 : m.key.i * Math.sin(Math.PI * t) ** .5;
        const sweep = (Math.min(t, 1) - .5) * 26;
        key.target.position.set(centre.x + Math.cos(home) * sweep, centre.y, centre.z - Math.sin(home) * sweep);
      } else if (m.fx === 'haze' && camera) {
        // lay the beams along the key lamp's direction, turned to face the camera
        axis.copy(key.position).sub(centre).normalize();
        face.copy(camera.position).sub(centre); face.addScaledVector(axis, -face.dot(axis)).normalize();
        side.crossVectors(axis, face).normalize();
        basis.makeBasis(side, axis, face);
        shafts.quaternion.setFromRotationMatrix(basis);
        shafts.position.copy(centre).addScaledVector(axis, 21).add(scratch.set(0, .4, 0));
      }
    },
  };
  lighting.setMood('lamp');
  return lighting;
}
