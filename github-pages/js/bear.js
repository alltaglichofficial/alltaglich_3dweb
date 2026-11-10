import * as THREE from 'three';
import { fluffGeometry } from './geometry.js';

// The Alltäglich swim bear: sky-blue plush, black swim goggles pushed up on the
// forehead, a black swimsuit with white trim and a small sewn-on brand tag.
// It bobs, paddles and spins slowly in the middle of the pool.
export function createSwimBear(root, home) {
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

  return {
    object: bear,
    update(time, reducedMotion, surfaceHeight) {
      const t = reducedMotion ? 0 : time;
      const x = home.x + Math.sin(t * .32) * .28, z = home.z + Math.cos(t * .32) * .22;
      // Every few seconds a happy little hop out of the water.
      const hop = Math.pow(Math.max(0, Math.sin(t * .9)), 10) * .22;
      const surface = surfaceHeight(x, z);
      bear.position.set(x, surface - .02 + Math.sin(t * 1.7) * .045 + hop, z);
      bear.rotation.set(Math.sin(t * 1.3) * .05, .35 + Math.sin(t * .4) * 1.1, Math.sin(t * 1.7) * .07);
      arms.forEach((arm, i) => {
        const side = i ? 1 : -1, stroke = Math.sin(t * 4.2 + i * Math.PI);
        arm.rotation.x = -.5 + stroke * .8; arm.rotation.z = side * (.35 + Math.max(0, stroke) * .35);
      });
      legs.forEach((leg, i) => { leg.rotation.x = Math.sin(t * 5 + i * Math.PI) * .5; });
      head.rotation.z = Math.sin(t * 1.1) * .08;
      rings.forEach((ring, i) => {
        const p = (t * .6 + i / 2) % 1;
        ring.position.set(x, surface + .03, z); ring.scale.setScalar(.8 + p * 1.4);
        ring.material.opacity = reducedMotion ? .18 : (1 - p) * .35;
      });
    },
  };
}

// Shell-textured plush: each instance is one layer pushed out along the view-space
// normal. Fibres are 3D cells that thin out towards the tips and droop a little;
// roots are shaded darker, which is what makes the pile read as soft toy fur.
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

