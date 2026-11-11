import * as THREE from 'three';
import { fluffGeometry } from './geometry.js';

// The Alltäglich swim bear: sky-blue plush, black swim goggles pushed up on the
// forehead, a black swimsuit with white trim and a small sewn-on brand tag.
// It swims lengths of the pool, picking a random stroke (freestyle, backstroke,
// breaststroke, butterfly) at each end wall.
// `pool` (optional): { inPool(x, z), groundY, clampIn(x, z) } lets the bear be thrown
// out of the water, land on the ground and hop back in.
export function createSwimBear(root, home, pool = null) {
  const bear = new THREE.Group(); bear.name = 'AlltaglichSwimBear'; bear.scale.setScalar(1.32); root.add(bear);
  const fur = plushMaterial(0x8ccbea, 0xe6f8ff, .05);
  const muzzleFur = plushMaterial(0xa9daee, 0xf2fbff, .03);
  const suit = new THREE.MeshStandardMaterial({ color: 0x14171b, roughness: .42 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xf3f2ec, roughness: .6 });
  const ink = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: .25 });
  const lens = new THREE.MeshStandardMaterial({ color: 0xdfeaee, roughness: .05, metalness: .2, transparent: true, opacity: .42 });
  const ball = new THREE.SphereGeometry(1, 22, 16);
  const part = (geo, mat, parent, [x, y, z], [sx, sy, sz] = [1, 1, 1]) => {
    const object = new THREE.Mesh(geo, mat); object.position.set(x, y, z); object.scale.set(sx, sy, sz);
    object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
  };
  // Plush parts are instanced shells: one draw per part, FUR_SHELLS layers.
  const plush = (geo, mat, parent, [x, y, z], [sx, sy, sz]) => {
    const object = new THREE.InstancedMesh(geo, mat, FUR_SHELLS); object.position.set(x, y, z); object.scale.set(sx, sy, sz);
    object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
  };
  const tuft = (parent, r, at, scale, seed, amp = .07, mat = fur) => plush(fluffGeometry(seed, amp), mat, parent, at, scale.map(v => v * r));

  // Chubby body in its swimsuit; fur shows above the neckline.
  tuft(bear, .4, [0, 0, 0], [1.05, 1, .95], 31, .06);
  part(ball, suit, bear, [0, -.06, 0], [.5, .44, .48]);
  const neckline = part(new THREE.TorusGeometry(1, .1, 8, 40), trim, bear, [0, .25, 0], [.36, .345, .3]);
  neckline.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    const armhole = part(new THREE.TorusGeometry(1, .14, 6, 28), trim, bear, [side * .45, .1, .01], [.14, .16, .14]);
    armhole.rotation.y = Math.PI / 2; armhole.rotation.x = side * .3;
  }
  // Big plush head with round ears, a soft muzzle, tiny eyes and nose.
  const head = new THREE.Group(); head.position.set(0, .55, .02); bear.add(head);
  tuft(head, .34, [0, 0, 0], [1.12, .95, 1], 32, .05);
  for (const side of [-1, 1]) tuft(head, .1, [side * .26, .29, -.04], [1, .9, .7], 33 + side, .08);
  plush(ball, muzzleFur, head, [0, -.08, .3], [.13, .09, .07]);
  part(ball, ink, head, [0, -.05, .345], [.035, .025, .02]);
  const smile = part(new THREE.TorusGeometry(.025, .005, 4, 12, Math.PI), ink, head, [0, -.105, .34]);
  smile.rotation.z = Math.PI;
  for (const side of [-1, 1]) part(ball, ink, head, [side * .12, .03, .31], [.026, .03, .014]);
  // Swim goggles on the forehead: two framed lenses, a bridge and a head strap.
  const goggles = new THREE.Group(); goggles.position.set(0, .17, 0); goggles.rotation.x = -.18; head.add(goggles);
  const frame = new THREE.TorusGeometry(.075, .022, 8, 26), glass = new THREE.CylinderGeometry(.07, .07, .016, 22);
  for (const side of [-1, 1]) {
    part(frame, ink, goggles, [side * .115, 0, .285]);
    part(glass, lens, goggles, [side * .115, 0, .29]).rotation.x = Math.PI / 2;
  }
  part(new THREE.BoxGeometry(1, 1, 1), ink, goggles, [0, 0, .3], [.065, .022, .02]);
  const strap = part(new THREE.TorusGeometry(1, .05, 6, 48), ink, goggles, [0, -.01, 0], [.37, .33, .35]);
  strap.rotation.x = Math.PI / 2;
  // Sewn-on brand tag on the swimsuit.
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 96;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#121418'; ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = '#f2f2ee'; ctx.font = '600 40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Alltäglich', 128, 50);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(.17, .065), new THREE.MeshBasicMaterial({ map: texture }));
  tag.position.set(.3, -.06, .392); tag.rotation.y = .66; bear.add(tag);
  // Stubby paddling arms and kicking legs.
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * .37, .16, .02); bear.add(arm); arms.push(arm);
    tuft(arm, .14, [side * .06, -.13, .05], [1, 1.35, 1], 35 + side, .07);
  }
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * .18, -.3, .05); bear.add(leg); legs.push(leg);
    tuft(leg, .15, [0, -.1, .07], [1, .9, 1.2], 37 + side, .07);
  }
  // Ripples around the bear, separate from the puppy's wake.
  const rings = [];
  for (let i = 0; i < 2; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.62, .014, 4, 44), new THREE.MeshBasicMaterial({ color: 0xeefcff, transparent: true, opacity: .3, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; root.add(ring); rings.push(ring);
  }

  // States: 'swim' (paddling around home), 'held' (picked up by the visitor),
  // 'falling' (let go / thrown), 'sink' (plunged under, bobbing back up), 'ground'
  // (landed outside the pool) and 'hop' (jumping back into the water).
  let lastLift = 0, state = 'swim', last = null, vy = 0, sinkT = 0, heldAt = new THREE.Vector3(), swing = 0;
  const vel = new THREE.Vector3(), track = [], hopFrom = new THREE.Vector3(), hopTo = new THREE.Vector3();
  let groundT = 0, hopT = 0;
  const lap = { x: home.x, dir: 1, turn: 0, stroke: 'free', phase: 0, entry: 0 };
  const qYaw = new THREE.Quaternion(), qPitch = new THREE.Quaternion(), qRoll = new THREE.Quaternion();
  const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
  const pose = (t, flail) => {
    arms.forEach((arm, i) => {
      const side = i ? 1 : -1, stroke = Math.sin(t * (flail ? 9 : 4.2) + i * Math.PI);
      arm.rotation.x = flail ? -2.4 + stroke * .5 : -.5 + stroke * .8;
      arm.rotation.z = side * (flail ? .6 + Math.max(0, stroke) * .3 : .35 + Math.max(0, stroke) * .35);
    });
    legs.forEach((leg, i) => { leg.rotation.x = Math.sin(t * (flail ? 11 : 5) + i * Math.PI) * (flail ? .8 : .5); });
  };
  return {
    object: bear,
    get state() { return state; },
    grab() { state = 'held'; heldAt.copy(bear.position); swing = 0; track.length = 0; rings.forEach(r => { r.visible = false; }); },
    drag(point) { heldAt.copy(point); track.push({ t: performance.now() / 1000, p: point.clone() }); while (track.length > 6) track.shift(); },
    release() {
      if (state !== 'held') return;
      // throw with the pointer's recent velocity (gentle cap so it stays on screen)
      vel.set(0, 0, 0);
      if (track.length > 1) { const a = track[0], b = track[track.length - 1], dt = Math.max(.016, b.t - a.t); vel.subVectors(b.p, a.p).divideScalar(dt).multiplyScalar(.7); }
      if (vel.length() > 24) vel.setLength(24);
      state = 'falling'; vy = vel.y + (Math.hypot(vel.x, vel.z) > 2 ? 3 : 0); vel.y = 0;
    },
    update(time, reducedMotion, surfaceHeight) {
      const dt = last === null ? 0 : Math.min(.05, Math.max(0, time - last)); last = time;
      const t = reducedMotion ? 0 : time;
      if (state === 'held') {
        // follow the pointer with a little lag and a dangling swing
        const prev = bear.position.clone();
        bear.position.lerp(heldAt, 1 - Math.exp(-dt * 14));
        swing += ((bear.position.x - prev.x) * -1.6 - swing) * Math.min(1, dt * 6);
        bear.rotation.set(Math.sin(time * 3) * .06, .35, swing + Math.sin(time * 2.4) * .08);
        pose(time, true); head.rotation.z = Math.sin(time * 6) * .12;
        return { x: bear.position.x, z: bear.position.z, landed: false, splash: 0 };
      }
      if (state === 'ground') {
        // sat on the ground for a moment, then hop back into the pool
        groundT += dt; pose(time, false);
        bear.rotation.x *= Math.max(0, 1 - dt * 6); bear.rotation.z *= Math.max(0, 1 - dt * 6);
        if (groundT > 1.3) { state = 'hop'; hopT = 0; hopFrom.copy(bear.position); const [hx, hz] = pool.clampIn(bear.position.x, bear.position.z); hopTo.set(hx, surfaceHeight(hx, hz), hz); bear.rotation.y = Math.atan2(hx - bear.position.x, hz - bear.position.z); }
        return { x: bear.position.x, z: bear.position.z, landed: false, splash: 0 };
      }
      if (state === 'hop') {
        hopT += dt / 1.0; const k = Math.min(1, hopT);
        bear.position.lerpVectors(hopFrom, hopTo, k); bear.position.y += Math.sin(k * Math.PI) * 3.2;
        pose(time, true);
        if (k >= 1) { state = 'sink'; sinkT = 0; home.x = hopTo.x; home.z = hopTo.z; rings.forEach(r => { r.visible = true; }); return { x: hopTo.x, z: hopTo.z, landed: false, splash: 1.3 }; }
        return { x: bear.position.x, z: bear.position.z, landed: false, splash: 0 };
      }
      if (state === 'falling') {
        vy -= 26 * dt; bear.position.y += vy * dt;
        bear.position.x += vel.x * dt; bear.position.z += vel.z * dt; vel.multiplyScalar(Math.max(0, 1 - dt * .4));
        bear.rotation.x += dt * 1.2; pose(time, true);
        const inside = !pool || pool.inPool(bear.position.x, bear.position.z);
        if (!inside && bear.position.y <= pool.groundY + .62) {
          bear.position.y = pool.groundY + .62; state = 'ground'; groundT = 0; vel.set(0, 0, 0);
          return { x: bear.position.x, z: bear.position.z, landed: false, splash: 0 };
        }
        const surface = surfaceHeight(bear.position.x, bear.position.z);
        if (inside && bear.position.y <= surface - .02) {
          home.x = bear.position.x; home.z = bear.position.z;
          const strength = Math.min(2.4, .8 + Math.abs(vy) * .09);
          state = 'sink'; sinkT = 0; vy = Math.min(-2, vy * .25);
          rings.forEach(r => { r.visible = true; });
          return { x: bear.position.x, z: bear.position.z, landed: false, splash: strength };
        }
        return { x: bear.position.x, z: bear.position.z, landed: false, splash: 0 };
      }
      const surface0 = surfaceHeight(bear.position.x, bear.position.z);
      if (state === 'sink') {
        // plunge under, then bob back up over ~1.4 s, then start swimming lengths
        sinkT += dt; const k = Math.min(1, sinkT / 1.4);
        bear.position.y = surface0 - .02 - Math.sin(k * Math.PI) * 1.1 * (1 - k * .5);
        bear.rotation.x *= Math.max(0, 1 - dt * 4); pose(t, false);
        if (k >= 1) { state = 'swim'; lap.x = clampLaneX(bear.position.x); lap.dir = bear.position.z > 0 ? -1 : 1; lap.turn = 0; pickStroke(); }
        updateRings(t, reducedMotion, surface0);
        return { x: bear.position.x, z: bear.position.z, landed: false, splash: 0 };
      }
      // Swimming lengths of the pool: each length in one stroke, a random new
      // stroke after every turn at the end wall.
      let splash = 0;
      if (!reducedMotion) {
        const end = (pool?.laneZ ?? 6);
        if (lap.turn > 0) {
          lap.turn -= dt;
          if (lap.turn <= 0) { lap.dir *= -1; pickStroke(); }
        } else {
          const st = STROKES[lap.stroke];
          lap.phase += dt * st.rate;
          const surge = st.pulse ? .35 + 1.1 * Math.max(0, Math.sin(lap.phase * Math.PI * 2)) : 1;
          bear.position.z += lap.dir * st.speed * surge * dt;
          bear.position.x += (lap.x - bear.position.x) * Math.min(1, dt * 2);
          if (lap.dir * bear.position.z >= end) { bear.position.z = lap.dir * end; lap.turn = .9; splash = .6; }
          const entry = Math.floor(lap.phase * 2); if (entry !== lap.entry) { lap.entry = entry; splash = Math.max(splash, .28); }
        }
      }
      const surface = surfaceHeight(bear.position.x, bear.position.z);
      swimPose(time, reducedMotion, surface);
      updateRings(t, reducedMotion, surface);
      return { x: bear.position.x, z: bear.position.z, landed: false, splash, stroke: lap.turn > 0 ? 'turn' : lap.stroke };
    },
    get stroke() { return lap.stroke; },
  };

  function clampLaneX(x) { const m = pool?.laneX ?? 3; return Math.max(-m, Math.min(m, x)); }
  function pickStroke() {
    const names = Object.keys(STROKES).filter(n => n !== lap.stroke);
    lap.stroke = names[Math.floor(Math.random() * names.length)]; lap.phase = 0; lap.entry = 0;
  }
  function updateRings(t, reducedMotion, surface) {
    rings.forEach((ring, i) => {
      const p = (t * .6 + i / 2) % 1;
      ring.position.set(bear.position.x, surface + .03, bear.position.z); ring.scale.setScalar(.8 + p * 1.4);
      ring.material.opacity = reducedMotion ? .18 : (1 - p) * .35;
    });
  }
  // Body orientation: yaw to the swimming direction, pitch forward to lie on the
  // water (head leading), roll onto the back for backstroke.
  function swimPose(time, reducedMotion, surface) {
    const st = STROKES[lap.stroke], ph = lap.phase * Math.PI * 2, turning = lap.turn > 0;
    const k = turning ? Math.sin(Math.min(1, (0.9 - lap.turn) / .9) * Math.PI) : 0; // 0→1→0 through the turn
    const yaw = (lap.dir > 0 ? 0 : Math.PI) + (turning ? (lap.dir > 0 ? 1 : -1) * Math.PI * (1 - lap.turn / .9) : 0);
    let pitch = 1.25 * (1 - k), roll = 0, bob = 0;
    if (!turning) {
      if (lap.stroke === 'free') roll = Math.sin(ph) * .4;
      if (lap.stroke === 'back') roll = Math.PI + Math.sin(ph) * .35;
      if (lap.stroke === 'breast') { pitch = 1.05 + Math.sin(ph) * .2; bob = Math.max(0, Math.sin(ph)) * .14; }
      if (lap.stroke === 'fly') { pitch = 1.2 + Math.sin(ph) * .28; bob = Math.max(0, Math.sin(ph)) * .2; }
    }
    qYaw.setFromAxisAngle(AY, yaw); qPitch.setFromAxisAngle(AX, pitch); qRoll.setFromAxisAngle(AY, roll);
    bear.quaternion.copy(qYaw).multiply(qPitch).multiply(qRoll);
    bear.position.y = surface - .04 + bob + (reducedMotion ? 0 : Math.sin(time * 2.1) * .02);
    head.rotation.z = 0;
    if (turning || reducedMotion) { pose(time, false); return; }
    arms.forEach((arm, i) => {
      const side = i ? 1 : -1;
      if (st.arms === 'alt') { arm.rotation.x = -(ph + i * Math.PI) * (lap.stroke === 'back' ? -1 : 1); arm.rotation.z = side * .25; }
      else if (st.arms === 'both') { arm.rotation.x = -ph; arm.rotation.z = side * .35; }
      else { const sw = (Math.sin(ph) + 1) / 2; arm.rotation.x = -2.5 + sw * 1.1; arm.rotation.z = side * (.3 + sw * 1.0); }
    });
    legs.forEach((leg, i) => {
      const side = i ? 1 : -1;
      if (st.legs === 'flutter') { leg.rotation.x = Math.sin(ph * 3 + i * Math.PI) * .55; leg.rotation.z = 0; }
      else if (st.legs === 'dolphin') { leg.rotation.x = Math.sin(ph * 2) * .6; leg.rotation.z = 0; }
      else { const kick = Math.max(0, Math.sin(ph - .8)); leg.rotation.x = .9 * kick; leg.rotation.z = side * .9 * kick; }
    });
  }
}

// The four strokes: forward speed (world units/s), stroke cycles per second,
// arm pattern and kick. Breaststroke surges with each stroke.
const STROKES = {
  free:   { label: '자유영', speed: 2.3, rate: 1.1, arms: 'alt',  legs: 'flutter' },
  back:   { label: '배영',   speed: 1.9, rate: 1.0, arms: 'alt',  legs: 'flutter' },
  breast: { label: '평영',   speed: 1.4, rate: .8,  arms: 'sweep', legs: 'frog', pulse: true },
  fly:    { label: '접영',   speed: 2.0, rate: .9,  arms: 'both', legs: 'dolphin' },
};


const FUR_SHELLS = 16;
const FUR_VERTEX = /* glsl */`
  vec4 mvPosition = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
  #endif
  mvPosition = modelViewMatrix * mvPosition;
  vFurLayer = float(gl_InstanceID) / ${(FUR_SHELLS - 1).toFixed(1)};
  vec3 furDir = normalize(transformedNormal) + (viewMatrix * vec4(0.0, -0.3, 0.0, 0.0)).xyz * vFurLayer;
  mvPosition.xyz += furDir * vFurLayer * uFurLength;
  gl_Position = projectionMatrix * mvPosition;
  vFurPos = position * vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
`;
const FUR_DISCARD = /* glsl */`
  #include <clipping_planes_fragment>
  vec3 furP = vFurPos * uFurDensity, furCell = floor(furP);
  float furH = .6 + .4 * furHash(furCell);
  vec3 furJitter = vec3(furHash(furCell + 1.7), furHash(furCell + 4.3), furHash(furCell + 8.9)) - .5;
  float furD = length(fract(furP) - .5 - furJitter * .35), furTaper = 1.0 - vFurLayer / furH;
  if (vFurLayer > 0.0 && (furTaper <= 0.0 || furD > .78 * sqrt(furTaper))) discard;
`;
const FUR_SHADE = /* glsl */`
  #include <color_fragment>
  diffuseColor.rgb *= mix(.58, 1.08, vFurLayer) * (.9 + .2 * furHash(furCell + 2.0));
`;
function plushMaterial(color, sheenColor, length) {
  const material = new THREE.MeshPhysicalMaterial({ color, roughness: .95, sheen: 1, sheenRoughness: .55, sheenColor });
  material.onBeforeCompile = shader => {
    shader.uniforms.uFurLength = { value: length };
    shader.uniforms.uFurDensity = { value: 72 };
    shader.vertexShader = 'uniform float uFurLength;\nvarying float vFurLayer;\nvarying vec3 vFurPos;\n'
      + shader.vertexShader.replace('#include <project_vertex>', FUR_VERTEX);
    shader.fragmentShader = 'uniform float uFurDensity;\nvarying float vFurLayer;\nvarying vec3 vFurPos;\n'
      + 'float furHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }\n'
      + shader.fragmentShader.replace('#include <clipping_planes_fragment>', FUR_DISCARD).replace('#include <color_fragment>', FUR_SHADE);
  };
  material.customProgramCacheKey = () => 'alltaglich-plush-fur-v1';
  return material;
}

