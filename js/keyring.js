import * as THREE from 'three';

// Keyring hardware for the pool island, modelled in millimetres from the ruler
// photos of the real parts (all stainless), then scaled into the world.
// From the block outwards: eye pin (9핀) → large jump ring Ø9 → figure-8 swivel
// → large jump ring Ø9 (carrying the small Ø6.6 ring with the engraved tag)
// → swivel snap hook. The chain lies on the deck behind the back (-Z) wall:
// flat parts and rings standing on edge alternate, each wire passing through
// the next part's opening, as a keychain does when it is put down on a table.

// Block size in mm (from the STL): 30 wide, 46.36 long; world scale matches the pool body.
const BLOCK_HALF_LENGTH = 23.18, BLOCK_HALF_HEIGHT = 4.775;

const steel = new THREE.MeshPhysicalMaterial({ color: 0xbec1c5, metalness: 1, roughness: 0.24, envMapIntensity: 0.25 });   // little room reflection; highlights come from the sun
const steelDark = new THREE.MeshPhysicalMaterial({ color: 0x7c8086, metalness: 1, roughness: 0.4 });
function mesh(g, m = steel){ const o = new THREE.Mesh(g, m); o.castShadow = true; return o; }
function ring(R, t, seg = 120){ return mesh(new THREE.TorusGeometry(R, t, 24, seg)); }
// centre of the upper link, given the lower link (wires resting on each other)
const link = (yL, RL, tL, RU, tU) => yL + RL + RU - tL - tU;

// 1. eye pin: Ø4.6 eye (1.0 wire), Ø1.5 screw shank 5.3 long
function eyePin(){
  const g = new THREE.Group();
  const R = 1.8, t = 0.5;
  const eye = mesh(new THREE.TorusGeometry(R, t, 20, 80, Math.PI * 1.86)); eye.rotation.z = -Math.PI / 2 + Math.PI * 0.07; eye.position.y = 2.3; g.add(eye);
  const neck = mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.9, 16)); neck.position.y = 0.15; g.add(neck);
  const core = mesh(new THREE.CylinderGeometry(0.5, 0.25, 5.3, 16)); core.position.y = -2.65; g.add(core);
  class Thread extends THREE.Curve { getPoint(u, o = new THREE.Vector3()){ const a = u * Math.PI * 2 * 7.5, r = 0.55 - u * 0.25; return o.set(r * Math.cos(a), -0.3 - u * 4.7, r * Math.sin(a)); } }
  g.add(mesh(new THREE.TubeGeometry(new Thread(), 300, 0.17, 8, false)));
  return { g, eyeY: 2.3, R, t };
}

// 3. figure-8 swivel: 20 long, 8 wide, two D-loops with Ø5 barrels
function dLoop(w, yRound, yFlat, t){
  // closed loop: semicircle around yRound, straight sides, flat bar at yFlat
  const r = w / 2, pts = [], dir = Math.sign(yRound - yFlat);
  for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; pts.push(new THREE.Vector3(r * Math.cos(a), yRound + dir * r * Math.sin(a), 0)); }
  pts.push(new THREE.Vector3(-r, yFlat + dir * 0.6, 0), new THREE.Vector3(-r + 0.6, yFlat, 0), new THREE.Vector3(r - 0.6, yFlat, 0), new THREE.Vector3(r, yFlat + dir * 0.6, 0));
  const m = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), 160, t, 14, true));
  m.scale.z = 0.85; return m;
}
function figure8(){
  const g = new THREE.Group(), t = 0.75, w = 8.0 - 2 * t;
  g.add(dLoop(w, t + w / 2, 8.6, t));                 // lower loop, round end down
  g.add(dLoop(w, 20 - t - w / 2, 10.9, t));           // upper loop, round end up
  const b1 = mesh(new THREE.CylinderGeometry(2.25, 2.25, 2.43, 32)); b1.position.y = 8.15; g.add(b1);
  const b2 = mesh(new THREE.CylinderGeometry(2.25, 2.25, 2.34, 32)); b2.position.y = 11.3; g.add(b2);
  const pin = mesh(new THREE.CylinderGeometry(1.25, 1.25, 1.2, 20)); pin.position.y = 9.7; g.add(pin);
  const head = mesh(new THREE.CylinderGeometry(1.55, 1.55, 1.3, 24)); head.position.y = 6.0; g.add(head);
  const headStem = mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.4, 16)); headStem.position.y = 6.9; g.add(headStem);
  const k = 0.9, ky = k * 0.9; g.scale.set(k, ky, k);   // 10% smaller overall, plus 10% shorter
  return { g, t: t * ky, len: 20 * ky };
}

// 7. swivel snap hook (31.8 overall): eye Ø11.5 → swivel pin + bell collar → plate 7.1 × 8.5 with rivet
// → flat stamped hook (J-profile, wider at the round end) closed by a straight spring gate on top
function snapHook(){
  const g = new THREE.Group();
  const eR = 4.85, eT = 0.95;
  const eye = ring(eR, eT); eye.scale.z = 0.7; g.add(eye);   // flat band, Ø11.5 outside
  const pinHead = mesh(new THREE.CylinderGeometry(1.9, 1.9, 1.5, 28)); pinHead.position.y = 1.35; pinHead.scale.z = 0.6; g.add(pinHead);
  const pinStem = mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.0, 20)); pinStem.position.y = 2.6; g.add(pinStem);
  // swivel collar: trapezoid in front view (narrow at the eye, wider at the plate), flatter than the plate
  const bell = mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 2.4), new THREE.Vector2(1.8, 2.4), new THREE.Vector2(2.1, 2.6), new THREE.Vector2(2.4, 3.4),
    new THREE.Vector2(2.7, 4.3), new THREE.Vector2(2.9, 4.9), new THREE.Vector2(2.8, 5.15), new THREE.Vector2(0, 5.15)
  ], 48)); bell.scale.z = 0.45; g.add(bell);
  // plate: trapezoid, 7.9 wide at the hook narrowing in a straight, even diagonal to 5.8 at the collar; corners softened
  const ps = new THREE.Shape();
  ps.moveTo(-2.4, 5.0); ps.lineTo(2.4, 5.0); ps.quadraticCurveTo(2.9, 5.0, 2.97, 5.45);
  ps.lineTo(3.9, 10.4); ps.quadraticCurveTo(3.97, 11.2, 3.15, 11.2); ps.lineTo(-3.15, 11.2);
  ps.quadraticCurveTo(-3.97, 11.2, -3.9, 10.4); ps.lineTo(-2.97, 5.45); ps.quadraticCurveTo(-2.9, 5.0, -2.4, 5.0);
  const plateG = new THREE.ExtrudeGeometry(ps, { depth: 2.8, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 4, curveSegments: 32 });
  plateG.translate(0, 0, -1.4);
  g.add(mesh(plateG));
  for (const z of [1.6, -1.6]) {
    const r = mesh(new THREE.SphereGeometry(1.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2));
    r.scale.y = 0.5; r.rotation.x = z > 0 ? Math.PI / 2 : -Math.PI / 2; r.position.set(-1.6, 8.3, z); g.add(r);   // rivet sits left of centre
  }
  // hook body: mirror-symmetric about the axis, sides flaring slightly to a round top (bar 1.5 wide);
  // the right-hand side is left open for the gate
  const hs = new THREE.Shape();
  hs.moveTo(-3.85, 10.6); hs.lineTo(-4.5, 18.6);
  hs.absarc(0, 18.6, 4.5, Math.PI, 0, true);
  hs.lineTo(4.48, 17.2); hs.lineTo(2.98, 18.0); hs.lineTo(3.0, 18.6);
  hs.absarc(0, 18.6, 3.0, 0, Math.PI, false);
  hs.lineTo(-2.35, 10.6); hs.lineTo(-3.85, 10.6);
  const hookG = new THREE.ExtrudeGeometry(hs, { depth: 1.8, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.2, bevelSegments: 4, curveSegments: 64 });
  hookG.translate(0, 0, -0.9);
  g.add(mesh(hookG));
  // spring gate: the right-hand side bar, from the plate up to the hook tip with a matching diagonal joint
  const gs = new THREE.Shape();
  gs.moveTo(2.35, 11.1); gs.lineTo(3.85, 11.1); gs.lineTo(4.46, 17.12); gs.lineTo(2.96, 17.92); gs.lineTo(2.35, 11.1);
  const gateG = new THREE.ExtrudeGeometry(gs, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 2 });
  gateG.translate(0, 0, -0.75); g.add(mesh(gateG));
  // spring coil visible at the gate root
  const spring = mesh(new THREE.TubeGeometry(new (class extends THREE.Curve { getPoint(u, o = new THREE.Vector3()){ const a = u * Math.PI * 9; return o.set(0.8 + u * 1.5, 11.65 + 0.32 * Math.cos(a), 0.32 * Math.sin(a)); } })(), 120, 0.1, 6, false), steelDark);
  g.add(spring);
  return { g, eR, eT, top: 23.1 };
}

// 5. engraved tag: 21 × 8 × 1.5, hole near one end, frosted laser text on polished steel
function engravedTag(){
  const L = 21, W = 8, r = 3.2, hy = L / 2 - 2.0, hr = 0.8;
  const s = new THREE.Shape(), w = W / 2, h = L / 2;
  s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r);
  s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h); s.lineTo(-w + r, h);
  s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
  const hole = new THREE.Path(); hole.absarc(0, hy, hr, 0, Math.PI * 2, true); s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2, curveSegments: 24 });
  geo.translate(0, 0, -0.65);
  const PX = 60, cw = W * PX, ch = L * PX;
  const draw = (bg, fg) => {
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, cw, ch);
    x.save(); x.translate(cw / 2, 11.0 * PX); x.rotate(Math.PI / 2);   // logo runs vertically, centred on the tag
    x.font = '300 100px "Avenir Next", "Century Gothic", "Helvetica Neue", Arial, sans-serif';
    const k = (13.3 * PX) / x.measureText('Alltäglich').width; x.scale(k, k);
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Alltäglich', 0, 0); x.restore();
    const t = new THREE.CanvasTexture(c); t.repeat.set(1 / W, 1 / L); t.offset.set(0.5, 0.5); t.anisotropy = 8; return t;
  };
  const map = draw('#c4c6c9', '#eceef0'); map.colorSpace = THREE.SRGBColorSpace;
  const rough = draw('#454545', '#e0e0e0');
  // body: plain brushed steel everywhere (edges and back carry no lettering)
  const body = new THREE.MeshPhysicalMaterial({ color: 0xbcbfc2, metalness: 1, roughness: 0.3, anisotropy: 0.6, anisotropyRotation: Math.PI / 2, envMapIntensity: 0.3 });
  const tag = mesh(geo, [body, steel]);
  // laser marking: a thin decal on the front face only, running vertically along the tag
  const mark = new THREE.Mesh(new THREE.ShapeGeometry(s, 24), new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map, roughnessMap: rough, roughness: 1, metalness: 1, anisotropy: 0.6, anisotropyRotation: Math.PI / 2,
    envMapIntensity: 0.3, polygonOffset: true, polygonOffsetFactor: -2 }));
  mark.position.z = 0.751; tag.add(mark);
  const k = 0.9; tag.scale.set(k, k, 1.2 / 1.5);   // 10% smaller outline, 1.2 mm thick
  return { tag, holeY: hy * k, holeR: hr * k };
}

function assemble(product, blockTop, FLOOR_Z){
  // Laid flat on the table (local z = height; FLOOR_Z = table under the back doming).
  // Links alternate: flat part → ring standing on edge → flat part, each wire passing through the next one's opening.
  const zR = (R, t) => FLOOR_Z + R + t;                       // centre height of a ring standing on the table
  const across = (R, dz) => Math.sqrt(Math.max(0, R * R - dz * dz)); // half-chord of a standing ring at height dz

  // 1. eye pin screwed into the top edge; its eye lies flat at mid-thickness
  const pin = eyePin(); pin.g.position.y = blockTop; product.add(pin.g);
  const eyeC = blockTop + pin.eyeY, eyeZ = 0;

  // 2. large jump ring Ø9, standing on edge, its near wire through the pin's eye
  const BR = 4.0, BT = 0.48, rz = zR(BR, BT);
  const r2c = eyeC + pin.R - pin.t - BT + across(BR, eyeZ - rz);
  const r2 = ring(BR, BT); r2.rotation.y = Math.PI / 2; r2.position.set(0, r2c, rz); product.add(r2);

  // 3. figure-8 swivel lying flat; ring 2's far wire sits inside its lower loop
  const f8 = figure8(), z8 = FLOOR_Z + 2.25 * 0.9;
  const loopEnd = r2c + across(BR, z8 - rz) - (BT + f8.t);
  f8.g.position.set(0, loopEnd - f8.t, z8); product.add(f8.g);

  // 4. large jump ring Ø9, standing on edge, its near wire inside the upper loop
  const loopTop = f8.g.position.y + f8.len - f8.t;
  const r4c = loopTop - (f8.t + BT) + across(BR, z8 - rz);
  const r4 = ring(BR, BT); r4.rotation.y = Math.PI / 2; r4.position.set(0, r4c, rz); product.add(r4);

  // 6. small jump ring Ø6.6 lying flat, ring 4's bottom arc dipping through it
  const SR = 2.75, ST = 0.55;
  const r6c = new THREE.Vector3(1.2, r4c, FLOOR_Z + ST + 0.05);
  const r6 = ring(SR, ST); r6.position.copy(r6c); product.add(r6);

  // 5. tag lying flat beside the chain, its hole threaded on ring 6
  const tg = engravedTag();
  const pivot = new THREE.Group();
  pivot.position.set(r6c.x + SR, r6c.y, FLOOR_Z + 0.6);
  pivot.rotation.set(0, 0, 1.35);
  tg.tag.position.y = -tg.holeY; pivot.add(tg.tag); product.add(pivot);

  // 7. snap hook lying flat (resting on its rivet); its eye catches ring 4's far wire
  const sh = snapHook(), zh = FLOOR_Z + 2.2;
  const wire4 = r4c + across(BR, zh - rz);
  const eyeY = wire4 - (BT + sh.eT) + sh.eR;
  sh.g.position.set(0, eyeY, zh); product.add(sh.g);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  return {
    tagHoleY: tg.holeY, pin: pin.g,
    parts: { r2, f8: f8.g, r4, r6, tag: pivot, hook: sh.g },
    joints: [
      ['block', 'r2', V(0, eyeC + pin.R - pin.t, eyeZ)],
      ['r2', 'f8', V(0, loopEnd, z8)],
      ['f8', 'r4', V(0, loopTop, z8)],
      ['r4', 'hook', V(0, wire4, zh)],
      ['r4', 'r6', V(0, r4c, FLOOR_Z + BT)],
      ['r6', 'tag', V(r6c.x + SR, r6c.y, FLOOR_Z + 0.6)],
    ],
  };
}


// `body`: the pool block group (resin, print, water). It becomes a physics body too,
// so the whole keyring can be lifted by its chain or by the block itself.
export function createKeyringHardware(root, { wallZ, deckY, wallX = 5.6, blockTop = 1.8, body = null }) {
  const group = new THREE.Group(); group.name = 'KeyringHardware'; root.add(group);
  // once the physics is running, each part moves freely in here (so the whole chain can be hidden together)
  const loose = new THREE.Group(); loose.name = 'KeyringLoose'; root.add(loose);
  // mm → world: the back wall (23.18 mm from the block centre) lands on wallZ.
  const s = wallZ / BLOCK_HALF_LENGTH;
  // Local frame: x across, y away from the block along the chain, z up from the deck.
  group.rotation.x = -Math.PI / 2; group.scale.setScalar(s);
  group.position.set(0, deckY + BLOCK_HALF_HEIGHT * s, 0);
  const layout = assemble(group, BLOCK_HALF_LENGTH, -BLOCK_HALF_HEIGHT);
  group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const materials = new Set();
  group.traverse(o => { if (o.material) for (const m of [].concat(o.material)) { m.userData.envDefault = m.envMapIntensity; materials.add(m); } });

  // ---- physics: the chain hangs from the eye pin in the (fixed) block and can be
  // picked up, lifted and dropped. Loaded lazily; until then the chain just lies still.
  group.updateMatrixWorld(true);
  // the eye pin is screwed into the block, so it moves with it
  if (body) body.attach(layout.pin);
  const jointPoints = layout.joints.map(([a, b, p]) => [a, b, group.localToWorld(p.clone())]);
  let world = null, CANNON = null, grab = null, blockLink = null;
  const reach = {}, anchor = new THREE.Vector3(); let bodiesByName = {};
  const pairs = [], meshes = [];
  for (const obj of Object.values(layout.parts)) obj.traverse(o => { if (o.isMesh) meshes.push(o); });
  const pickRoot = new THREE.Group(); // grab target object: raycast over all chain meshes
  const ready = import('https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js').then(mod => {
    CANNON = mod;
    world = new CANNON.World({ gravity: new CANNON.Vec3(0, -90, 0) });
    world.solver.iterations = 60; world.solver.tolerance = 1e-5; world.allowSleep = true;
    world.defaultContactMaterial.friction = .5; world.defaultContactMaterial.restitution = .05;
    const GROUND = 1, BLOCK = 2, PART = 4;
    const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), collisionFilterGroup: GROUND, collisionFilterMask: PART | BLOCK });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0); ground.position.set(0, deckY, 0); world.addBody(ground);
    const blockH = (blockTop - deckY) / 2;
    // The block stays put; the chain hangs from its eye pin.
    const block = new CANNON.Body({ mass: 0, linearDamping: .3, angularDamping: .6, sleepSpeedLimit: .05,
      shape: new CANNON.Box(new CANNON.Vec3(wallX, blockH, wallZ)), collisionFilterGroup: BLOCK, collisionFilterMask: GROUND | PART });
    block.position.set(0, deckY + blockH, 0); world.addBody(block);
    if (body) { blockLink = { obj: body, b: block, offset: new THREE.Vector3(0, -(deckY + blockH), 0) }; body.userData.body = block; }
    const bodies = { block }; bodiesByName = bodies;
    const v = (x, y, z) => new CANNON.Vec3(x * s, y * s, z * s);
    const ringShapes = (b, R, t) => { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; b.addShape(new CANNON.Sphere(Math.max(t, .5) * s), v(R * Math.cos(a), R * Math.sin(a), 0)); } };
    const make = (name, obj, mass, add) => {
      obj.updateMatrixWorld(true);
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
      obj.matrixWorld.decompose(p, q, sc); loose.attach(obj);
      const b = new CANNON.Body({ mass, linearDamping: .25, angularDamping: .5, sleepSpeedLimit: .05, collisionFilterGroup: PART, collisionFilterMask: GROUND | BLOCK });
      add(b); b.position.set(p.x, p.y, p.z); b.quaternion.set(q.x, q.y, q.z, q.w);
      world.addBody(b); bodies[name] = b; pairs.push({ obj, b }); obj.userData.body = b;
    };
    const P = layout.parts;
    make('r2', P.r2, 1, b => ringShapes(b, 4.0, .48));
    make('f8', P.f8, 1.2, b => b.addShape(new CANNON.Box(v(3.6, 8.1, 2.03)), v(0, 8.1, 0)));
    make('r4', P.r4, 1, b => ringShapes(b, 4.0, .48));
    make('r6', P.r6, .8, b => ringShapes(b, 2.75, .55));
    make('tag', P.tag, 1.2, b => b.addShape(new CANNON.Box(v(3.6, 9.45, .6)), v(0, -layout.tagHoleY, 0)));
    make('hook', P.hook, 2, b => { ringShapes(b, 4.85, .95); b.addShape(new CANNON.Box(v(4.5, 9, 2.2)), v(0, 14, 0)); });
    for (const [a, c, w] of jointPoints) {
      const W = new CANNON.Vec3(w.x, w.y, w.z), A = bodies[a], B = bodies[c];
      world.addConstraint(new CANNON.PointToPointConstraint(A, A.pointToLocalFrame(W), B, B.pointToLocalFrame(W), 1e6));
      // chain length from the eye pin to where each part is held by its parent
      const parent = reach[a] ?? { len: 0, at: W };
      reach[c] = { len: parent.len + parent.at.distanceTo(W), at: W, entry: B.pointToLocalFrame(W) };
    }
    anchor.set(jointPoints[0][2].x, jointPoints[0][2].y, jointPoints[0][2].z);
  }).catch(err => console.warn('Keyring physics unavailable; the chain stays still.', err));

  const plane = new THREE.Plane(), hit = new THREE.Vector3();
  const target = {
    object: pickRoot,
    // chain parts plus the block (resin, print, water, eye pin) — not the bear
    meshes,
    grab(point, camera) {
      if (!world) return false;
      const local = point.clone().sub(root.position);
      let o = target.hitObject; while (o && !o.userData.body) o = o.parent;
      if (!o) return false;
      const b = o.userData.body, W = new CANNON.Vec3(local.x, local.y, local.z);
      const mouse = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC }); mouse.position.copy(W); world.addBody(mouse);
      const joint = new CANNON.PointToPointConstraint(b, b.pointToLocalFrame(W), mouse, new CANNON.Vec3(), 900); world.addConstraint(joint);
      plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), point);
      world.allowSleep = false; for (const { b: x } of pairs) x.wakeUp();
      // the held point can't be pulled further from the eye pin than the chain allows
      const name = Object.keys(reach).find(k => bodiesByName[k] === b);
      const r = reach[name], pivot = b.pointToLocalFrame(W);
      const max = r ? r.len + r.entry.distanceTo(pivot) : 99;
      grab = { mouse, joint, max: max * .98 }; return true;
    },
    drag(ray) {
      if (!grab || !ray.intersectPlane(plane, hit)) return;
      const l = hit.clone().sub(root.position); l.y = Math.max(l.y, deckY + .3);
      const d = l.distanceTo(anchor); if (d > grab.max) l.sub(anchor).multiplyScalar(grab.max / d).add(anchor);
      grab.mouse.position.set(l.x, l.y, l.z);
    },
    release() { if (!grab) return; world.removeConstraint(grab.joint); world.removeBody(grab.mouse); grab = null; world.allowSleep = true; },
  };
  return {
    object: group, materials: [...materials], ready, grabTargets: [target],
    step(dt) {
      if (!world || dt <= 0) return;
      world.step(1 / 120, dt, 8);
      for (const { obj, b } of pairs) { obj.position.set(b.position.x, b.position.y, b.position.z); obj.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w); }
      if (blockLink) {
        const { obj, b, offset } = blockLink;
        obj.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
        obj.position.copy(offset).applyQuaternion(obj.quaternion).add(new THREE.Vector3(b.position.x, b.position.y, b.position.z));
      }
    },
  };
}
