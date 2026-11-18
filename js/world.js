import { createPlushBear, createThrowable, bearTarget, openLargeViewer } from './plush.js';
import { createHoldModel } from './hold.js';
import * as THREE from 'three';
import { box, sphere, ico, cylinder, tube, flatPath, roundedPad, mesh, batchStatic } from './geometry.js';
import { createPoolIsland } from './pool.js';

export function createWorld(scene, island) {
  if (island.id === 'pool') return createPoolIsland(scene, island);
  // `outer` is what main.js shows, hides and slides between islands (it resets its position
  // to the origin); everything is built in `root`, lowered onto the studio floor.
  const outer = new THREE.Group(); outer.name = `island-${island.id}`;
  const root = new THREE.Group(); root.position.y = -1.64 - .04; outer.add(root);   // floor height (lighting.js); base pads start .04 up
  const staticRoot = new THREE.Group(); root.add(staticRoot); scene.add(outer);
  let group = staticRoot;
  const FLOOR = -1.64;   // the studio floor (lighting.js): the court and the wall stand on it
  const cream = 0xf4e8cf, green = island.id === 'pool' ? 0xa4bd91 : 0x98b27c, dark = 0x4d6a48;
  function sportsGroup(x, z) { group = new THREE.Group(); group.position.set(x, 0, z); staticRoot.add(group); }

  // Each sport stands on its own on the studio floor (no island, trees or paths around it).

  // Tennis. White doubles, singles and service lines and an open mesh net.
  if (island.id === 'tennis') {
  sportsGroup(5.6, .6);
  roundedPad(group, 7.9, 10.1, .10, -5.6, .04, -.6, 0xd3ad8a, .5);
  roundedPad(group, 7.1, 9.3, .02, -5.6, .14, -.6, 0x7c9f87, .12);
  const line = 0xf8f3db;
  for (const x of [-8.8, -8.05, -3.15, -2.4]) box(group, .045, .014, 8.5, x, .169, -.6, line);
  for (const z of [-4.85, 3.65]) box(group, 6.45, .014, .05, -5.6, .169, z, line);
  for (const z of [-2.55, 1.35]) box(group, 4.95, .014, .045, -5.6, .17, z, line);
  box(group, .045, .014, 3.9, -5.6, .17, -.6, line);
  for (const z of [-4.93, 3.73]) box(group, .045, .014, .18, -5.6, .17, z, line);
  for (const x of [-9.02, -2.18]) cylinder(group, .065, .065, 1.08, x, .68, -.6, dark);
  box(group, 6.9, .06, .055, -5.6, 1.17, -.6, line);
  for (let x = -8.95; x < -2.2; x += .23) box(group, .014, .84, .014, x, .72, -.6, 0x63765e);
  for (let y = .32; y < 1.14; y += .17) box(group, 6.85, .014, .014, -5.6, y, -.6, 0x63765e);
  
  }

  // Bouldering wall, with faceted panels and individually shaped pastel holds.
  if (island.id === 'climb') {
  sportsGroup(-5.1, -4.6);
  roundedPad(group, 7.9, 5.15, .08, 5.1, .04, 4.6, 0xd5c3a0, .5);
  for (let i = 0; i < 3; i++) roundedPad(group, 2.3, 2.8, .13, 2.65 + i * 2.45, .12, 5.1, [0xb4c4a1, 0xa6b797, 0xc2ceae][i], .14);
  const steps = [-2, 0, 2].map((x, i) => {
    const height = .25 + i * .25;
    roundedPad(group, 1.15, 1.05, height, x + 5.1, .25, 5, [0x8fa79d, 0xa8b5ce, 0xdcb19a][i], .15);
    
    return { x, z: .4, y: .25 + height };
  });
  const wall = new THREE.Group();
  wall.position.set(5.1, .15, 2.65);
  for (let i = 0; i < 3; i++) {
    const panel = box(wall, 2.35, 3.7 + (i === 1 ? .65 : 0), .42, (i - 1) * 2.25, 1.85 + (i === 1 ? .325 : 0), 0, [0xdbb28e, 0xe6c5a0, 0xcfa987][i]);
    panel.rotation.z = (i - 1) * -.065;
  }
  const volume = mesh(new THREE.ConeGeometry(.78, .5, 3), 0xbe9373, [-1.6, 1.7, .4], wall);
  volume.rotation.x = Math.PI / 2;
  const colors = [0x789696, 0xe29b82, 0xf5dea0, 0x8da27b, 0xa698b4];
  for (let i = 0; i < 33; i++) {
    const x = -3 + (i * 1.379) % 5.9;
    const y = .45 + (i * .719) % 2.95;
    const hold = ico(wall, .13 + (i % 3) * .025, x, y, .29, colors[i % colors.length], [1.3, .8, .85]);
    hold.rotation.z = i * 2.3;
  }
  group.add(wall);
  for (const x of [2.2, 8]) {
    tube(group, [[x, .12, 1.5], [x, 2.9, 2.5]], .065, dark);
    cylinder(group, .12, .15, .18, x, .16, 1.5, dark);
  }
  
  
  
  }

  batchStatic(staticRoot);

  // Climbing island, second product: the Alltäglich climbing hold (a foam volume with three
  // small holds), shown big on the floor in place of the bouldering wall. HOLD_S world units
  // per millimetre (60 mm across, so about eight units, the bear about 11 mm tall beside it).
  const HOLD_S = .13, HX = .3, HZ = .2, HYAW = 2.05;   // turned so we see the slope from the side (its triangular left wall toward us)
  let holdModel = null, focus = 'wall';
  if (island.id === 'climb') {
    holdModel = createHoldModel();
    holdModel.group.scale.setScalar(HOLD_S); holdModel.group.position.set(HX, 0, HZ); holdModel.group.rotation.y = HYAW;
    holdModel.group.visible = false; root.add(holdModel.group);
  }
  const hc = Math.cos(HYAW), hs = Math.sin(HYAW);
  const toMM = (x, z) => { const dx = (x - HX) / HOLD_S, dz = (z - HZ) / HOLD_S; return [dx * hc - dz * hs, dx * hs + dz * hc]; };
  const fromMM = (x, z) => new THREE.Vector2(HX + (x * hc + z * hs) * HOLD_S, HZ + (-x * hs + z * hc) * HOLD_S);
  const UPHILL = HYAW + Math.PI;   // facing up the slope (toward the hold's back edge)

  // The island's Alltäglich plush bears. They play on their own and can be picked up
  // and thrown. Tennis bear: holds a racket and rallies — balls come over the net, it
  // runs to them and swings (forehand or backhand), and sometimes misses. Climbing
  // bears: one climbs the wall hold by hold, hand over hand, and jumps off with a back
  // flip; the other hops up the steps and leaps off. Arms and legs are posed through
  // the viewer (S.limbs: directions of the limb lobes in the bear's own frame).
  const PLUSH_SPOTS = { tennis: [['tennis', -.9, 3.7, 'tennis'], ['tennis', .9, -3.7, 'tennis']], climb: [['climbBrown', -1.4, 1.1, 'wall'], ['climbOrange', 1.6, 1.2, 'steps']] }[island.id] || [];
  const BEAR_H = 1.5, HALF = BEAR_H / 2, K = BEAR_H / 2.51;   // world units per viewer unit
  const groundAt = (x, z) => worldHeight(x, z);
  const limit = (x, z) => { const k = Math.hypot(x / 7.4, z / 6.3); return k > 1 ? [x / k, z / k] : [x, z]; };
  // a limb direction from elevation (up from the side) and forward swing, like the viewer's own
  const arm = (side, elev, fwd) => [side * Math.cos(elev) * Math.cos(fwd), Math.sin(elev), Math.cos(elev) * Math.sin(fwd)];
  const leg = (side, lift = 0, out = .6) => [side * out, -.8 + lift * .45, .06 + lift * .7];
  const plushBears = PLUSH_SPOTS.map(([kind, x, z, play], i) => {
    const anchor = new THREE.Object3D(); anchor.rotation.order = 'YXZ'; anchor.position.set(x, groundAt(x, z) + HALF, z); root.add(anchor);
    const bear = createPlushBear(root, kind, { height: BEAR_H });
    const toss = createThrowable(anchor, { bottom: HALF, groundAt, limit });
    return { bear, anchor, toss, play, home: play, kind, i, mode: 'idle', t: 0, wait: 1 + i * 1.3, target: new THREE.Vector2(x, z), phase: 0, last: 0, limbs: null };
  });
  function walkTo(p, dt, speed = 1.7) {
    const a = p.anchor, dx = p.target.x - a.position.x, dz = p.target.y - a.position.z, d = Math.hypot(dx, dz);
    if (d < .08) return true;
    const step = Math.min(d, speed * dt); a.position.x += dx / d * step; a.position.z += dz / d * step;
    [a.position.x, a.position.z] = limit(a.position.x, a.position.z);
    let dy = Math.atan2(dx, dz) - a.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); a.rotation.y += dy * Math.min(1, dt * 8);
    // a bouncy plush waddle, arms swinging against the legs
    p.phase += dt * (6 + speed * 2.2);
    a.position.y = groundAt(a.position.x, a.position.z) + HALF + Math.abs(Math.sin(p.phase)) * (p.hop ?? .14);
    a.rotation.z = Math.sin(p.phase) * .1; a.rotation.x = .1 + speed * .03;
    const sw = Math.sin(p.phase);
    const swing = p.restArms ? 0 : -sw * .55;   // arms swing opposite the legs
    p.limbs = { armL: arm(-1, .12, swing), armR: arm(1, .12, -swing), legL: leg(-1, Math.max(0, sw)), legR: leg(1, Math.max(0, -sw)) };
    return false;
  }
  const stand = p => { const a = p.anchor; a.position.y = groundAt(a.position.x, a.position.z) + HALF; a.rotation.x = 0; a.rotation.z = 0; };
  const face = (p, yaw, dt) => { let dy = yaw - p.anchor.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); p.anchor.rotation.y += dy * Math.min(1, dt * 6); };

  // ---- tennis: two tennis bears, each with a racket in the right paw, rallying ----
  // The ball flies on exact parabolas, so where and when it can be hit is known as soon
  // as it is struck: the receiver runs to the spot where its racket head will be at the
  // contact point of its swing, and starts the swing so the contact frame lands on time.
  const tennisBears = plushBears.filter(p => p.play === 'tennis');
  const COURT_Y = .17, G = 13, BALL_R = .11, BOUNCE_Y = COURT_Y + BALL_R;
  const SWING = .8, KC = .5;                       // swing length, and the contact point in it
  const HEAD = .63 * 1.15, HAND = .95 * K, UP = new THREE.Vector3(0, 1, 0);
  function makeRacket() {
    const racket = new THREE.Group(); racket.name = 'BearRacket'; root.add(racket);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xf4f1e6, roughness: .35, metalness: .1 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x3d5036, roughness: .8 });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(.032, .036, .3, 12), gripMat); handle.position.y = .1; racket.add(handle);
    for (const s of [-1, 1]) { const th = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .2, 8), frameMat); th.position.set(s * .05, .33, 0); th.rotation.z = -s * .32; racket.add(th); }
    const head = new THREE.Mesh(new THREE.TorusGeometry(.2, .022, 10, 40), frameMat); head.scale.set(1, 1.28, 1); head.position.y = .63; racket.add(head);
    const sc = document.createElement('canvas'); sc.width = sc.height = 64; const sg = sc.getContext('2d'); sg.strokeStyle = 'rgba(255,255,255,.95)'; sg.lineWidth = 1.4;
    for (let i = 4; i < 64; i += 7) { sg.beginPath(); sg.moveTo(i, 0); sg.lineTo(i, 64); sg.moveTo(0, i); sg.lineTo(64, i); sg.stroke(); }
    const strings = new THREE.Mesh(new THREE.CircleGeometry(.195, 32), new THREE.MeshBasicMaterial({ color: 0xf2f0e4, alphaMap: new THREE.CanvasTexture(sc), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    strings.scale.set(1, 1.28, 1); strings.position.y = .63; racket.add(strings);
    racket.traverse(o => { if (o.isMesh) o.castShadow = true; });
    racket.scale.setScalar(1.15);
    return racket;
  }
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // forehand: shoulders turn back, racket back low, forward through the ball beside the
  // body (contact at KC), then across and up to a high finish
  function swingPose(k) {
    const turn = .75 * smooth(0, .3, k) - .75 * smooth(.3, KC, k) - .9 * smooth(KC, 1, k);
    const fwd = -1.25 * smooth(0, .3, k) + 1.25 * smooth(.3, KC, k) + 1.6 * smooth(KC, .95, k);
    const elev = .3 + .1 * smooth(0, .3, k) - .32 * smooth(.3, KC, k) + .95 * smooth(KC, 1, k);
    return {
      turn, lift: .02 * Math.sin(Math.PI * k), tilt: -.1 * Math.sin(Math.PI * k),
      limbs: { armL: arm(-1, .35 + .25 * k, .7 - .5 * k), armR: arm(1, elev, fwd), legL: leg(-1), legR: leg(1) },
    };
  }
  // racket geometry in the bear's own frame, from its right-arm direction
  function racketLocal(armR) {
    const d = new THREE.Vector3(...armR).normalize(), axis = d.clone().lerp(UP, .35).normalize();
    return { hand: d.multiplyScalar(HAND), axis, head: d.clone().addScaledVector(axis, HEAD) };
  }
  const euler = new THREE.Euler(0, 0, 0, 'YXZ'), qTmp = new THREE.Quaternion();
  // where the racket head is (relative to the bear's middle, world axes) at contact, facing `yaw`
  function contactOffset(yaw) {
    const pose = swingPose(KC), r = racketLocal(pose.limbs.armR);
    euler.set(.06, yaw + pose.turn, pose.tilt);
    return r.head.clone().applyEuler(euler).add(new THREE.Vector3(0, pose.lift, 0));
  }
  function placeRacket(p) {
    const a = p.anchor, r = racketLocal(p.limbs?.armR ?? arm(1, .3, .4));
    a.updateMatrixWorld();
    p.racket.position.copy(a.localToWorld(r.hand.clone())); root.worldToLocal(p.racket.position);
    a.getWorldQuaternion(qTmp);
    p.racket.quaternion.copy(qTmp).multiply(new THREE.Quaternion().setFromUnitVectors(UP, r.axis));
    p.racket.visible = true;
  }
  tennisBears.forEach((p, i) => { p.hop = .05; p.side = i === 0 ? 1 : -1; p.yawNet = p.side > 0 ? Math.PI : 0; p.racket = makeRacket(); p.home = new THREE.Vector2(-.9 * p.side, 3.7 * p.side); });

  let rally = null;
  if (tennisBears.length) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 20, 14), new THREE.MeshStandardMaterial({ color: 0xd8ef4f, roughness: .9 }));
    ball.castShadow = true; ball.visible = false; root.add(ball);
    rally = { ball, clock: 0, seg: null, bounces: 0, state: 'dead', wait: 1.2, server: 0, receiver: null };
  }
  // ball flight: one parabola per bounce, evaluated exactly at any time
  const at = (seg, t, out = new THREE.Vector3()) => { const s = t - seg.t0; return out.set(seg.p.x + seg.v.x * s, seg.p.y + seg.v.y * s - .5 * G * s * s, seg.p.z + seg.v.z * s); };
  const landsAfter = seg => (seg.v.y + Math.sqrt(seg.v.y * seg.v.y + 2 * G * Math.max(0, seg.p.y - BOUNCE_Y))) / G;
  function strike(from, x, z, T) {
    const R = rally; R.seg = { t0: R.clock, p: from.clone(), v: new THREE.Vector3((x - from.x) / T, (BOUNCE_Y - from.y + .5 * G * T * T) / T, (z - from.z) / T) };
    R.bounces = 0; R.state = 'flying'; R.ball.visible = true;
  }
  // after a strike: plan the receiver's shot at the top part of the bounce
  function plan(receiver) {
    const R = rally, s1 = landsAfter(R.seg), b = at(R.seg, R.seg.t0 + s1);
    const vy = (R.seg.v.y - G * s1) * -.6, vx = R.seg.v.x * .8, vz = R.seg.v.z * .8;
    const off = contactOffset(receiver.yawNet), yHit = groundAt(0, 0) + HALF + off.y;
    // ball height after the bounce: y = BOUNCE_Y + vy s - G s²/2 = yHit
    const disc = vy * vy - 2 * G * (yHit - BOUNCE_Y);
    let s2 = disc >= 0 ? (vy + Math.sqrt(disc)) / G : vy / G;            // coming down through racket height
    if (Math.abs(b.z + vz * s2) > 4.9 && disc >= 0) s2 = (vy - Math.sqrt(disc)) / G;   // too deep: take it on the rise
    const hit = new THREE.Vector3(b.x + vx * s2, BOUNCE_Y + vy * s2 - .5 * G * s2 * s2, b.z + vz * s2);
    R.receiver = receiver; R.tHit = R.seg.t0 + s1 + s2; R.hit = hit;
    receiver.stand = new THREE.Vector2(hit.x - off.x, hit.z - off.z);
    receiver.mode = 'chase'; receiver.t = 0;
  }
  function serve() {
    // the server swings from its baseline; the ball is struck from its racket head at contact
    const p = tennisBears[rally.server % tennisBears.length]; rally.server++;
    if (p.toss.busy()) return;
    p.mode = 'serve'; p.t = 0; rally.state = 'serving'; rally.serverBear = p;
  }
  function rallyUpdate(dt) {
    const R = rally; if (!R) return;
    R.clock += dt;
    if (R.state === 'dead') { R.ball.visible = false; R.wait -= dt; if (R.wait <= 0 && tennisBears.every(p => !p.toss.busy())) serve(); return; }
    if (R.state === 'serving') return;
    // bounces
    let guard = 0;
    while (R.seg && R.clock >= R.seg.t0 + landsAfter(R.seg) && guard++ < 4) {
      const s1 = landsAfter(R.seg), b = at(R.seg, R.seg.t0 + s1), vy = (R.seg.v.y - G * s1) * -.6;
      R.bounces++;
      if (vy < .8 || R.bounces > 4) { R.state = 'dead'; R.wait = 1.1; return; }
      R.seg = { t0: R.seg.t0 + s1, p: b.setY(BOUNCE_Y), v: new THREE.Vector3(R.seg.v.x * .8, vy, R.seg.v.z * .8) };
    }
    at(R.seg, R.clock, R.ball.position); R.ball.rotation.x += dt * 12;
    if (Math.abs(R.ball.position.x) > 6.8 || Math.abs(R.ball.position.z) > 6.6) { R.state = 'dead'; R.wait = 1; }
  }
  function returnShot(p) {
    // aim deep-ish into the other half, over the net
    const R = rally, from = R.hit.clone(), other = tennisBears.find(o => o !== p);
    strike(from, -2.1 + Math.random() * 4.2, -p.side * (1.3 + Math.random() * 1.6), .95 + Math.random() * .2);
    if (other && !other.toss.busy()) plan(other); else R.receiver = null;
  }
  function playTennis(p, dt) {
    const a = p.anchor, R = rally; p.t += dt;
    if (p.mode === 'chase') {
      // run to the spot, then wait in a crouch; the swing starts so contact meets the ball
      p.target.copy(p.stand);
      const startAt = R.tHit - KC * SWING;
      if (walkTo(p, dt, 3.6)) { stand(p); face(p, p.yawNet, dt * 2); const c = Math.sin(p.t * 6) * .03; p.limbs = { armL: arm(-1, .35, .7), armR: arm(1, .3 + c, .5), legL: leg(-1), legR: leg(1) }; }
      if (R.receiver !== p || R.state !== 'flying') { p.mode = 'recover'; return placeRacket(p); }
      if (R.clock >= startAt) { p.mode = 'swing'; p.t = R.clock - startAt; p.swingFrom = a.position.clone(); p.reach = Math.hypot(a.position.x - p.stand.x, a.position.z - p.stand.y) < .45; }
    }
    if (p.mode === 'swing' || p.mode === 'serve') {
      const k = Math.min(1, p.t / SWING), pose = swingPose(k);
      if (p.mode === 'swing' && p.reach) {
        // slide the last bit onto the exact spot so racket and ball meet
        const f = smooth(0, KC, k); a.position.x = THREE.MathUtils.lerp(p.swingFrom.x, p.stand.x, f); a.position.z = THREE.MathUtils.lerp(p.swingFrom.z, p.stand.y, f);
      }
      a.rotation.set(.06, p.yawNet + pose.turn, pose.tilt, 'YXZ');
      a.position.y = groundAt(a.position.x, a.position.z) + HALF + pose.lift;
      p.limbs = pose.limbs;
      const contact = p.mode === 'swing' ? R.clock >= R.tHit && !p.struck : k >= KC && !p.struck;
      if (contact) {
        p.struck = true;
        if (p.mode === 'serve') {
          placeRacket(p); const r = racketLocal(p.limbs.armR); a.updateMatrixWorld();
          R.hit = root.worldToLocal(a.localToWorld(r.head.clone()));
          returnShot(p);
        } else if (p.reach && R.receiver === p && R.state === 'flying') returnShot(p);
        else if (R.receiver === p) R.receiver = null;   // missed it — the ball runs on
      }
      if (k >= 1) { p.struck = false; p.mode = 'recover'; p.t = 0; }
    } else if (p.mode === 'recover') {
      p.target.copy(p.home);
      if (walkTo(p, dt, 2.4)) { p.mode = 'ready'; p.t = 0; }
    } else if (p.mode === 'ready' || p.mode === 'idle') {
      // split-step ready position facing the net, light on its feet
      stand(p); face(p, p.yawNet, dt);
      const c = Math.sin(p.t * 4) * .04;
      p.limbs = { armL: arm(-1, .35, .65), armR: arm(1, .4 + c, .55), legL: leg(-1), legR: leg(1) };
    }
    placeRacket(p);
  }
  // ---- climbing ----
  const WALL_Z = -1.2;    // the bear's middle when its front touches the bouldering wall (face at z -1.74)
  function playWall(p, dt) {
    const a = p.anchor; p.t += dt;
    if (p.mode === 'idle') {
      stand(p); face(p, .3, dt);
      // paws (already chalked) stay down by its sides until it is on the wall
      p.restArms = true; p.limbs = { armL: arm(-1, .12, .04), armR: arm(1, .12, .04), legL: leg(-1), legR: leg(1) };
      if (p.t > p.wait) { p.mode = 'go'; p.target.set(-2.6 + Math.random() * 5.2, WALL_Z + .3); }
    } else if (p.mode === 'go') { p.restArms = true; if (walkTo(p, dt)) { p.restArms = false; p.mode = 'climb'; p.t = 0; p.moves = 3 + Math.floor(Math.random() * 3); p.base = a.position.y; p.move = 0; } }
    else if (p.mode === 'climb') {
      // facing the wall. Each move: reach up with one paw (and step up the opposite foot),
      // then pull the body up to it.
      face(p, Math.PI, dt * 3);
      const MOVE = .75, m = Math.floor(p.t / MOVE), f = (p.t % MOVE) / MOVE, side = m % 2 ? 1 : -1;
      const reach = Math.min(1, f / .45), pull = Math.max(0, (f - .45) / .55), ease = pull * pull * (3 - 2 * pull);
      const rise = .42;
      a.position.set(a.position.x + side * Math.sin(f * Math.PI) * .004, p.base + (Math.min(m, p.moves) + (m < p.moves ? ease : 0)) * rise, WALL_Z);
      a.rotation.z = side * .12 * Math.sin(f * Math.PI); a.rotation.x = -.18;
      // paws reach up and out to the side (diagonally), not straight out in front, where they
      // would cross the face and the goggles
      const high = .6, low = .3, FWD = .15;
      const up = side < 0 ? 'armL' : 'armR', down = side < 0 ? 'armR' : 'armL';
      p.limbs = {};
      p.limbs[up] = arm(side, low + (high - low) * reach - .2 * ease, FWD);
      p.limbs[down] = arm(-side, high - (high - low) * ease * .8, FWD);
      p.limbs[side < 0 ? 'legR' : 'legL'] = leg(-side, .9 * Math.sin(Math.min(1, f * 1.3) * Math.PI), .5);
      p.limbs[side < 0 ? 'legL' : 'legR'] = leg(side, .25, .5);
      if (m >= p.moves) { p.mode = 'hang'; p.t = 0; }
    } else if (p.mode === 'hang') {
      // at the top: both paws on the holds, a happy swing of the legs, a look back at us
      a.rotation.z = Math.sin(p.t * 3) * .08;
      a.rotation.y = Math.PI + Math.sin(Math.min(1, p.t / 1.2) * Math.PI) * .7;
      const kick = Math.sin(p.t * 6) * .4;
      p.limbs = { armL: arm(-1, .65, .15), armR: arm(1, .65, .15), legL: leg(-1, Math.max(0, kick)), legR: leg(1, Math.max(0, -kick)) };
      if (p.t > 1.4) { p.mode = 'jump'; p.t = 0; p.vy = 3.6; p.vz = 2.6; }
    } else if (p.mode === 'jump') {
      // push off, tuck into a back flip, land on the mat
      p.vy -= 26 * dt; a.position.y += p.vy * dt; a.position.z += p.vz * dt;
      const fall = Math.min(1, p.t / .9); a.rotation.x = -fall * Math.PI * 2; a.rotation.z = 0;
      const tuck = Math.sin(fall * Math.PI);
      p.limbs = { armL: arm(-1, .4 + tuck * .25, .2 * tuck), armR: arm(1, .4 + tuck * .25, .2 * tuck), legL: leg(-1, tuck * 1.1, .45), legR: leg(1, tuck * 1.1, .45) };
      const floor = groundAt(a.position.x, a.position.z) + HALF;
      if (a.position.y <= floor && p.vy < 0) { a.position.y = floor; a.rotation.set(0, Math.PI, 0, 'YXZ'); p.mode = 'cheer'; p.t = 0; }
    } else if (p.mode === 'cheer') {
      // pleased with itself: paws forward and a little up, a small clap
      const clap = Math.abs(Math.sin(p.t * 9)) * .25;
      stand(p); p.limbs = { armL: arm(-1, .45 + clap, .15), armR: arm(1, .45 + clap, .15), legL: leg(-1), legR: leg(1) };
      face(p, 0, dt * 2);
      if (p.t > .9) { p.mode = 'idle'; p.t = 0; p.wait = 1 + Math.random() * 1.5; }
    }
  }
  const STEPS = [[-2, .4, .5], [0, .4, .75], [2, .4, 1]];
  function playSteps(p, dt) {
    const a = p.anchor; p.t += dt;
    if (p.mode === 'idle') {
      stand(p); face(p, -.3, dt);
      // stretching: arms up, side to side
      const s = Math.sin(p.t * 2.4);
      p.limbs = { armL: arm(-1, .5 + s * .12, .15), armR: arm(1, .5 - s * .12, .15), legL: leg(-1), legR: leg(1) }; a.rotation.z = s * .1;
      if (p.t > p.wait) { p.mode = 'toStep'; p.step = 0; p.target.set(STEPS[0][0] - 1.1, STEPS[0][1] + .9); }
    } else if (p.mode === 'toStep') { if (walkTo(p, dt)) { p.mode = 'hop'; p.t = 0; p.from = a.position.clone(); } }
    else if (p.mode === 'hop') {
      // hop from step to step, getting higher, arms swinging up on each jump
      const [sx, sz, top] = STEPS[p.step], k = Math.min(1, p.t / .5), to = new THREE.Vector3(sx, top + HALF, sz);
      a.position.lerpVectors(p.from, to, k); a.position.y += Math.sin(k * Math.PI) * .7;
      face(p, Math.atan2(to.x - p.from.x, to.z - p.from.z), dt * 2); a.rotation.x = Math.sin(k * Math.PI) * -.2; a.rotation.z = 0;
      const air = Math.sin(k * Math.PI);
      p.limbs = { armL: arm(-1, .2 + air * .4, .15), armR: arm(1, .2 + air * .4, .15), legL: leg(-1, air * .6), legR: leg(1, air * .6) };
      if (k >= 1) { p.step++; p.t = 0; p.from = a.position.clone(); if (p.step >= STEPS.length) { p.mode = 'leap'; p.vy = 6; p.vx = 1.6; p.vz = 1.4; } }
    } else if (p.mode === 'leap') {
      // star jump with a spin off the top step
      p.vy -= 26 * dt; a.position.x += p.vx * dt; a.position.z += p.vz * dt; a.position.y += p.vy * dt; a.rotation.y += dt * 9; a.rotation.x = 0;
      p.limbs = { armL: arm(-1, .55, .15), armR: arm(1, .55, .15), legL: leg(-1, 0, 1), legR: leg(1, 0, 1) };
      const floor = groundAt(a.position.x, a.position.z) + HALF;
      if (a.position.y <= floor && p.vy < 0) { a.position.y = floor; p.mode = 'idle'; p.t = 0; p.wait = 1 + Math.random() * 1.5; }
    }
  }
  // ---- the climbing hold: the brown bear walks up to the low front point, climbs the sloping
  // face between the white and the green holds (paws reaching for them by turns), cheers at
  // the top, then sits down and slides back down. The orange bear watches and claps.
  const HOLD_PATH = [[-1.2, 24.5], [-2.2, 17.5], [-4.6, -9.5]].map(([x, z]) => fromMM(x, z));   // floor, foot of the face, the top
  const lerp2 = (a, b, k) => new THREE.Vector2(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
  const pathAt = k => k < .2 ? lerp2(HOLD_PATH[0], HOLD_PATH[1], k / .2) : lerp2(HOLD_PATH[1], HOLD_PATH[2], (k - .2) / .8);
  const FAN_HOME = fromMM(-30, 30);
  function playHold(p, dt) {
    const a = p.anchor; p.t += dt;
    if (p.mode === 'idle') {
      stand(p); face(p, UPHILL, dt);
      // shakes out its paws, looking up at the hold
      const s = Math.sin(p.t * 7) * .1;
      p.limbs = { armL: arm(-1, .15 + s, .1), armR: arm(1, .15 - s, .1), legL: leg(-1), legR: leg(1) };
      if (p.t > p.wait) { p.mode = 'go'; p.target.copy(HOLD_PATH[0]); }
    } else if (p.mode === 'go') { if (walkTo(p, dt)) { p.mode = 'climb'; p.t = 0; } }
    else if (p.mode === 'climb') {
      // move by move: reach up with one paw (the other foot steps up), then pull up to it
      const MOVE = .62, N = 8, m = Math.floor(p.t / MOVE), f = (p.t % MOVE) / MOVE, side = m % 2 ? 1 : -1;
      const pull = Math.max(0, (f - .4) / .6), ease = pull * pull * (3 - 2 * pull), reach = Math.min(1, f / .4);
      const k = Math.min(1, (Math.min(m, N) + (m < N ? ease : 0)) / N), at = pathAt(k);
      a.position.x = at.x; a.position.z = at.y;
      a.position.y = groundAt(at.x, at.y) + HALF * .92 + Math.sin(f * Math.PI) * .03;
      face(p, UPHILL, dt * 4);
      const lean = Math.min(1, k / .2);   // flat on the floor, then leaning into the slope
      a.rotation.x = .1 + .38 * lean; a.rotation.z = side * .08 * Math.sin(f * Math.PI);
      const up = side < 0 ? 'armL' : 'armR', down = side < 0 ? 'armR' : 'armL';
      p.limbs = {};
      p.limbs[up] = arm(side, .25 + .45 * reach - .25 * ease, .75);
      p.limbs[down] = arm(-side, .7 - .45 * ease, .75);
      p.limbs[side < 0 ? 'legR' : 'legL'] = leg(-side, .8 * Math.sin(Math.min(1, f * 1.3) * Math.PI), .5);
      p.limbs[side < 0 ? 'legL' : 'legR'] = leg(side, .15, .5);
      if (m >= N) { p.mode = 'top'; p.t = 0; }
    } else if (p.mode === 'top') {
      // made it: turns round to us and throws its paws up, bouncing on its toes
      const top = HOLD_PATH[2], b = Math.abs(Math.sin(p.t * 6)) * .1;
      a.position.set(top.x, groundAt(top.x, top.y) + HALF + b, top.y);
      face(p, .45, dt * 3); a.rotation.x = 0; a.rotation.z = Math.sin(p.t * 6) * .06;
      const up = .62 + Math.sin(p.t * 6) * .12;
      p.limbs = { armL: arm(-1, up, .15), armR: arm(1, up, .15), legL: leg(-1), legR: leg(1) };
      if (p.t > 1.8) { p.mode = 'sit'; p.t = 0; }
    } else if (p.mode === 'sit') {
      // sits down facing down the slope...
      const top = HOLD_PATH[2], k = Math.min(1, p.t / .45);
      face(p, HYAW, dt * 6); a.rotation.x = -.3 * k; a.rotation.z = 0;
      a.position.set(top.x, groundAt(top.x, top.y) + HALF * (1 - .22 * k), top.y);
      p.limbs = { armL: arm(-1, .3, .2), armR: arm(1, .3, .2), legL: leg(-1, k, .5), legR: leg(1, k, .5) };
      if (p.t > .6) { p.mode = 'slide'; p.t = 0; }
    } else if (p.mode === 'slide') {
      // ...and slides down on its bottom, faster and faster, paws up
      const T = 1.15, k = Math.min(1, p.t / T), at = pathAt(1 - k * k);
      a.position.x = at.x; a.position.z = at.y;
      a.position.y = groundAt(at.x, at.y) + HALF * .78;
      a.rotation.y = HYAW; a.rotation.x = -.3 - .1 * k; a.rotation.z = Math.sin(p.t * 14) * .04;
      p.limbs = { armL: arm(-1, .55 + .2 * k, .3), armR: arm(1, .55 + .2 * k, .3), legL: leg(-1, 1, .5), legR: leg(1, 1, .5) };
      if (k >= 1) { p.mode = 'land'; p.t = 0; }
    } else if (p.mode === 'land') {
      // pops up onto its feet with a little hop
      const k = Math.min(1, p.t / .35), at = HOLD_PATH[0];
      a.position.set(at.x, groundAt(at.x, at.y) + HALF * (.78 + .22 * k) + Math.sin(k * Math.PI) * .3, at.y);
      a.rotation.x = -.4 * (1 - k); a.rotation.z = 0;
      p.limbs = { armL: arm(-1, .5, .2), armR: arm(1, .5, .2), legL: leg(-1, 1 - k, .5), legR: leg(1, 1 - k, .5) };
      if (k >= 1) { p.mode = 'cheer'; p.t = 0; }
    } else if (p.mode === 'cheer') {
      const clap = Math.abs(Math.sin(p.t * 9)) * .25;
      stand(p); face(p, .4, dt * 3);
      p.limbs = { armL: arm(-1, .45 + clap, .15), armR: arm(1, .45 + clap, .15), legL: leg(-1), legR: leg(1) };
      if (p.t > 1) { p.mode = 'idle'; p.t = 0; p.wait = 1.2 + Math.random() * 1.5; }
    } else { p.mode = 'idle'; p.t = 0; }
  }
  function playFan(p, dt) {
    const a = p.anchor; p.t += dt;
    if (p.mode !== 'watch') { p.target.copy(FAN_HOME); if (walkTo(p, dt)) { p.mode = 'watch'; p.t = 0; } return; }
    stand(p);
    const climber = plushBears.find(o => o.play === 'hold'), c = climber?.anchor.position;
    if (c) face(p, Math.atan2(c.x - a.position.x, c.z - a.position.z), dt * 3);
    if (climber && !climber.toss.busy() && (climber.mode === 'top' || climber.mode === 'slide')) {
      // the climber is up there: jump and clap
      const j = Math.abs(Math.sin(p.t * 7)); a.position.y += j * .22;
      const clap = Math.abs(Math.sin(p.t * 14)) * .3;
      p.limbs = { armL: arm(-1, .55 + clap, .35 - clap), armR: arm(1, .55 + clap, .35 - clap), legL: leg(-1, j * .4), legR: leg(1, j * .4) };
    } else {
      // cheering it on: paws by the mouth, rocking
      const s = Math.sin(p.t * 3);
      a.rotation.z = s * .06;
      p.limbs = { armL: arm(-1, .4 + s * .06, .6), armR: arm(1, .4 - s * .06, .6), legL: leg(-1), legR: leg(1) };
    }
  }
  function setFocus(f) {
    if (!holdModel || f === focus) return;
    focus = f;
    staticRoot.visible = f === 'wall'; holdModel.group.visible = f === 'hold';
    for (const p of plushBears) {
      p.play = f === 'hold' ? (p.kind === 'climbBrown' ? 'hold' : 'fan') : p.home;
      p.mode = 'idle'; p.t = 0; p.wait = .8; p.restArms = false;
      const [x, z] = f === 'hold' ? (p.play === 'hold' ? [HOLD_PATH[0].x - .9, HOLD_PATH[0].y + .6] : [FAN_HOME.x, FAN_HOME.y]) : PLUSH_SPOTS[p.i].slice(1, 3);
      p.anchor.position.set(x, 0, z); p.anchor.rotation.set(0, 0, 0, 'YXZ'); stand(p);
    }
  }
  // framing: the hold's footprint and the two bears beside it
  let holdView = null; const HOLD_DIR = new THREE.Vector3(.8, .5, .62).normalize();
  if (holdModel) {
    const pts = [[-29.7, -12], [29.2, -15.8], [30.3, -2.8], [1.4, 21.4], [-22.8, 12.2], [-1.2, 27], [-30, 30]].map(([x, z]) => fromMM(x, z));
    const xs = pts.map(v => v.x), zs = pts.map(v => v.y);
    const min = [Math.min(...xs) - .5, FLOOR, Math.min(...zs) - .5], max = [Math.max(...xs) + .5, FLOOR + 3.3, Math.max(...zs) + .5];
    holdView = { screen: [.0015, .035], center: { x: (min[0] + max[0]) / 2, y: FLOOR + 1.2, z: (min[2] + max[2]) / 2 }, min, max };
  }
  const PLAY = { tennis: playTennis, wall: playWall, steps: playSteps, hold: playHold, fan: playFan };

  return {
    root: outer, island,
    // framing: the court, or the wall with its mats (screen: where it lands unshifted, measured)
    get view() {
      return island.id === 'tennis'
        ? { screen: [-.0215, .086], center: { x: 0, y: FLOOR + .6, z: 0 }, min: [-4.1, FLOOR, -5.2], max: [4.1, FLOOR + 1.6, 5.2] }
        : focus === 'hold'
          ? holdView
          : { screen: [.0015, .035], center: { x: 0, y: FLOOR + 2, z: 0 }, min: [-4.1, FLOOR, -2.7], max: [4.1, FLOOR + 4.6, 2.7] };
    },
    // the hold is seen lower, from beside its sloping face, so its wedge shape reads
    get viewDirection() { return focus === 'hold' ? HOLD_DIR : undefined; },
    get focus() { return focus; },
    get bears() { return plushBears; },
    setFocus: holdModel ? setFocus : undefined,
    // a tap on the climbing hold opens it large
    tap: holdModel ? (ndc, ray) => {
      if (focus !== 'hold') return;
      const hit = new THREE.Raycaster(ray.origin, ray.direction).intersectObject(holdModel.group, true)[0];
      if (hit) openLargeViewer({ name: 'Climbing Hold', src: 'products/hold.html?site=big&bg=fafafa', hint: '드래그해서 돌리고, 휠이나 두 손가락으로 확대해요.' });
    } : undefined,
    grabTargets: plushBears.map(p => bearTarget(p.bear, p.toss)),
    get tennis() { return { rally, bears: tennisBears }; },
    update(time = 0, reducedMotion = false) {
      const fdt = Math.min(.05, Math.max(0, time - (rally?.last ?? time))); if (rally) rally.last = time;
      if (!reducedMotion) rallyUpdate(fdt);
      for (const p of plushBears) {
        const dt = Math.min(.05, Math.max(0, time - p.last)); p.last = time;
        if (p.toss.busy()) {
          // thrown: arms and legs flung out; after landing it picks up its game again
          const st = p.toss.update(dt);
          p.limbs = st === 'held' || st === 'fall' ? { armL: arm(-1, 1.2, .2), armR: arm(1, 1.2, .2), legL: leg(-1, .3, .9), legR: leg(1, .3, .9) } : null;
          if (st === 'landed') { p.mode = 'idle'; p.t = 0; p.wait = .6; }
          if (p.play === 'tennis') { placeRacket(p); p.struck = false; if (st === 'landed') p.mode = 'recover'; if (rally && rally.state !== 'dead') { rally.state = 'dead'; rally.wait = 1.6; } }
        } else if (!reducedMotion) PLAY[p.play](p, dt);
        p.bear.update(p.anchor, { ground: groundAt(p.anchor.position.x, p.anchor.position.z), limbs: p.limbs });
      }
    },
    heightAt: worldHeight,
  };
  function worldHeight(x, z) {
      if (focus === 'hold') { const [mx, mz] = toMM(x, z), h = holdModel.surface(mx, mz); return h == null ? 0 : h * HOLD_S; }
      if (island.id === 'tennis' && Math.abs(x) < 3.95 && Math.abs(z) < 5.05) return .16;
      if (island.id === 'pool' && Math.abs(x) < 4.05 && Math.abs(z) < 3.25) return .14;
      if (island.id === 'climb' && Math.abs(x) < 3.95 && Math.abs(z) < 2.575) return z > -.9 && z < 1.9 && Math.abs(x) < 3.7 ? .25 : .12;
      return 0;   // the floor
  }

}
