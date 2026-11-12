import { createPlushBear, createThrowable, bearTarget } from './plush.js';
import * as THREE from 'three';
import { box, sphere, ico, cylinder, tube, flatPath, roundedPad, mesh, batchStatic } from './geometry.js';
import { createDropletIsland } from './drops.js';
import { createPoolIsland } from './pool.js';
import { createDogHouse, createFetchToy } from './house.js';

export function createWorld(scene, island) {
  if (island.id === 'pool') return createPoolIsland(scene, island);
  if (island.id === 'drops') return createDropletIsland(scene, island);
  const root = new THREE.Group(); root.name = `island-${island.id}`;
  const staticRoot = new THREE.Group(); root.add(staticRoot); scene.add(root);
  let group = staticRoot;
  let activity = null;
  const obstacles = [];
  const rect = (x, z, w, d) => obstacles.push({ type: 'rect', x: x + group.position.x, z: z + group.position.z, w, d });
  const circle = (x, z, r) => obstacles.push({ type: 'circle', x: x + group.position.x, z: z + group.position.z, r });
  const cream = 0xf4e8cf, green = island.id === 'pool' ? 0xa4bd91 : 0x98b27c, dark = 0x4d6a48;
  function sportsGroup(x, z) { group = new THREE.Group(); group.position.set(x, 0, z); staticRoot.add(group); }

  // Rounded, bevelled island: a soft grassy cap over a biscuit-coloured plinth.
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 8.25, 7.15, 0, Math.PI * 2, false, 0);
  const earth = new THREE.ExtrudeGeometry(shape, { depth: .85, bevelEnabled: true, bevelSize: .3, bevelThickness: .28, bevelSegments: 3, curveSegments: 40 });
  earth.rotateX(-Math.PI / 2);
  mesh(earth, 0xdac9a9, [0, -1.12, 0], group);
  const lawn = cylinder(group, 8.33, 8.42, .22, 0, -.08, 0, green, 80);
  lawn.scale.z = .865;
  cylinder(group, 8.1, 7.8, .13, 0, -1.28, 0, 0xc4b493, 64).scale.z = .865;

  // Each sport now lives on its own island, surrounded by a little walking loop.
  const loop = Array.from({ length: 25 }, (_, i) => { const a = i / 24 * Math.PI * 2; return [Math.cos(a) * 6.5, .085, Math.sin(a) * 5.85]; });
  flatPath(group, loop, .95, cream);
  roundedPad(group, 1.35, 2.5, .035, 0, .05, 5.45, cream, .5);

  // Tennis. White doubles, singles and service lines, an open mesh net and a ball.
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
  rect(-5.6, -.6, 6.95, .14);
  const ball = new THREE.Group(); ball.position.set(-1.5, .31, 2.7); root.add(ball);
  sphere(ball, .16, 0, 0, 0, 0xdce785);
  tube(ball, [[-.13, .015, -.08], [0, .16, -.01], [.13, .015, .08]], .009, line);
  activity = { type: 'fetch', ball, ballHome: { x: -1.5, y: .32, z: 2.7 }, returnTo: { x: 1.6, z: 3.2 } };
  bench(-8.1, 5.05, 0);
  // Small court sign, kept in-world instead of floating UI labels.
  sign('01  /  TENNIS', -5.9, -6.22, .9);
  }

  // Bouldering wall, with faceted panels and individually shaped pastel holds.
  if (island.id === 'climb') {
  sportsGroup(-5.1, -4.6);
  roundedPad(group, 7.9, 5.15, .08, 5.1, .04, 4.6, 0xd5c3a0, .5);
  for (let i = 0; i < 3; i++) roundedPad(group, 2.3, 2.8, .13, 2.65 + i * 2.45, .12, 5.1, [0xb4c4a1, 0xa6b797, 0xc2ceae][i], .14);
  const steps = [-2, 0, 2].map((x, i) => {
    const height = .25 + i * .25;
    roundedPad(group, 1.15, 1.05, height, x + 5.1, .25, 5, [0x8fa79d, 0xa8b5ce, 0xdcb19a][i], .15);
    rect(x + 5.1, 5, 1.15, 1.05);
    return { x, z: .4, y: .25 + height };
  });
  activity = { type: 'climb', entry: { x: -3.6, z: 2.6 }, steps, landing: { x: 3.4, z: 2.6 } };
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
  rect(5.1, 2.65, 7.45, .9);
  rect(2.2, 1.9, .35, 1.4);
  rect(8, 1.9, .35, 1.4);
  sign('03  /  CLIMB', 4.65, 7.4, .75);
  }

  // Small landscape touches, all deterministic for predictable navigation/tests.
  group = staticRoot;
  for (const [x, z, size] of [[-6, -3.5, .95], [-4.5, -5.4, .9], [2.8, -5.7, .85], [6.4, -4, 1], [6.7, 1.7, .8], [-6.3, 2, .85], [-4.8, 4.8, .85], [4.8, 4.8, .85]]) tree(x, z, size);
  for (const [x, z] of [[-7, -1.8], [6.3, 3.3], [-3.4, -6.1]]) {
    for (let i = 0; i < 3; i++) ico(group, .36, x + i * .27, .29 + (i % 2) * .1, z, [0x899e68, 0x9eaf77, 0xa9b984][i]);
    circle(x + .27, z, .65);
  }
  for (let i = 0; i < 22; i++) {
    const x = Math.sin(i * 12.98) * 7.5, z = Math.cos(i * 4.17) * 6.4;
    if ((Math.abs(x) > 6.5 || z > 5.6) && (x / 7.9) ** 2 + (z / 6.8) ** 2 < 1) {
      for (let j = 0; j < 3; j++) {
        cylinder(group, .012, .018, .18, x + j * .1, .13, z + j * .07, 0x718b58, 5);
        sphere(group, .055, x + j * .1, .23, z + j * .07, [0xf4dfae, 0xf9edcd, 0xeac5ab][j]);
      }
    }
  }
  // Stepping stones at the entrance and a tiny branded pennant.
  for (let i = 0; i < 3; i++) roundedPad(group, .75, .32, .045, 0, .06, 5.9 + i * .36, 0xede1c9, .12);
  cylinder(group, .04, .055, 2.2, -1.3, 1.14, 6.1, 0x73845d);
  box(group, .8, .47, .035, -.9, 2, 6.1, island.id === 'pool' ? 0xa7d2d6 : island.id === 'climb' ? 0xe6bea1 : 0xefe9c7);
  circle(-1.3, 6.1, .15);
  batchStatic(staticRoot);

  const house = createDogHouse(root, obstacles, island.id === 'tennis' ? { x: 5.3, z: -2, color: 0x8fa980 } : { x: -5.05, z: -.5, color: 0xd0a285 });
  const fetchActivity = activity.type === 'fetch' ? activity : createFetchToy(root, { x: 1.4, y: .3, z: 3 }, island.spawn);

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
    return { bear, anchor, toss, play, i, mode: 'idle', t: 0, wait: 1 + i * 1.3, target: new THREE.Vector2(x, z), phase: 0, last: 0, limbs: null };
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
    const swing = p.restArms ? 0 : sw * .55;
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
      // paws reach forward to the wall and a little up — not straight overhead
      const high = .8, low = .35;
      const up = side < 0 ? 'armL' : 'armR', down = side < 0 ? 'armR' : 'armL';
      p.limbs = {};
      p.limbs[up] = arm(side, low + (high - low) * reach - .2 * ease, 1.05);
      p.limbs[down] = arm(-side, high - (high - low) * ease * .8, 1.05);
      p.limbs[side < 0 ? 'legR' : 'legL'] = leg(-side, .9 * Math.sin(Math.min(1, f * 1.3) * Math.PI), .5);
      p.limbs[side < 0 ? 'legL' : 'legR'] = leg(side, .25, .5);
      if (m >= p.moves) { p.mode = 'hang'; p.t = 0; }
    } else if (p.mode === 'hang') {
      // at the top: both paws on the holds, a happy swing of the legs, a look back at us
      a.rotation.z = Math.sin(p.t * 3) * .08;
      a.rotation.y = Math.PI + Math.sin(Math.min(1, p.t / 1.2) * Math.PI) * .7;
      const kick = Math.sin(p.t * 6) * .4;
      p.limbs = { armL: arm(-1, .8, 1.05), armR: arm(1, .8, 1.05), legL: leg(-1, Math.max(0, kick)), legR: leg(1, Math.max(0, -kick)) };
      if (p.t > 1.4) { p.mode = 'jump'; p.t = 0; p.vy = 3.6; p.vz = 2.6; }
    } else if (p.mode === 'jump') {
      // push off, tuck into a back flip, land on the mat
      p.vy -= 26 * dt; a.position.y += p.vy * dt; a.position.z += p.vz * dt;
      const fall = Math.min(1, p.t / .9); a.rotation.x = -fall * Math.PI * 2; a.rotation.z = 0;
      const tuck = Math.sin(fall * Math.PI);
      p.limbs = { armL: arm(-1, .6 + tuck * .4, 1.2 * tuck), armR: arm(1, .6 + tuck * .4, 1.2 * tuck), legL: leg(-1, tuck * 1.1, .45), legR: leg(1, tuck * 1.1, .45) };
      const floor = groundAt(a.position.x, a.position.z) + HALF;
      if (a.position.y <= floor && p.vy < 0) { a.position.y = floor; a.rotation.set(0, Math.PI, 0, 'YXZ'); p.mode = 'cheer'; p.t = 0; }
    } else if (p.mode === 'cheer') {
      // pleased with itself: paws forward and a little up, a small clap
      const clap = Math.abs(Math.sin(p.t * 9)) * .25;
      stand(p); p.limbs = { armL: arm(-1, .55, .95 + clap), armR: arm(1, .55, .95 + clap), legL: leg(-1), legR: leg(1) };
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
      p.limbs = { armL: arm(-1, .6 + s * .15, .9), armR: arm(1, .6 - s * .15, .9), legL: leg(-1), legR: leg(1) }; a.rotation.z = s * .1;
      if (p.t > p.wait) { p.mode = 'toStep'; p.step = 0; p.target.set(STEPS[0][0] - 1.1, STEPS[0][1] + .9); }
    } else if (p.mode === 'toStep') { if (walkTo(p, dt)) { p.mode = 'hop'; p.t = 0; p.from = a.position.clone(); } }
    else if (p.mode === 'hop') {
      // hop from step to step, getting higher, arms swinging up on each jump
      const [sx, sz, top] = STEPS[p.step], k = Math.min(1, p.t / .5), to = new THREE.Vector3(sx, top + HALF, sz);
      a.position.lerpVectors(p.from, to, k); a.position.y += Math.sin(k * Math.PI) * .7;
      face(p, Math.atan2(to.x - p.from.x, to.z - p.from.z), dt * 2); a.rotation.x = Math.sin(k * Math.PI) * -.2; a.rotation.z = 0;
      const air = Math.sin(k * Math.PI);
      p.limbs = { armL: arm(-1, .2 + air * .5, .4 + air * .6), armR: arm(1, .2 + air * .5, .4 + air * .6), legL: leg(-1, air * .6), legR: leg(1, air * .6) };
      if (k >= 1) { p.step++; p.t = 0; p.from = a.position.clone(); if (p.step >= STEPS.length) { p.mode = 'leap'; p.vy = 6; p.vx = 1.6; p.vz = 1.4; } }
    } else if (p.mode === 'leap') {
      // star jump with a spin off the top step
      p.vy -= 26 * dt; a.position.x += p.vx * dt; a.position.z += p.vz * dt; a.position.y += p.vy * dt; a.rotation.y += dt * 9; a.rotation.x = 0;
      p.limbs = { armL: arm(-1, .7, .9), armR: arm(1, .7, .9), legL: leg(-1, 0, 1), legR: leg(1, 0, 1) };
      const floor = groundAt(a.position.x, a.position.z) + HALF;
      if (a.position.y <= floor && p.vy < 0) { a.position.y = floor; p.mode = 'idle'; p.t = 0; p.wait = 1 + Math.random() * 1.5; }
    }
  }
  const PLAY = { tennis: playTennis, wall: playWall, steps: playSteps };

  return {
    root, island, obstacles, activity, house, fetchActivity,
    navigationOptions: { radiusX: 8.2, radiusZ: 7.05, clearance: .75 },
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
      if (island.id === 'tennis' && Math.abs(x) < 3.95 && Math.abs(z) < 5.05) return .16;
      if (island.id === 'pool' && Math.abs(x) < 4.05 && Math.abs(z) < 3.25) return .14;
      if (island.id === 'climb' && Math.abs(x) < 3.95 && Math.abs(z) < 2.575) return z > -.9 && z < 1.9 && Math.abs(x) < 3.7 ? .25 : .12;
      return .08;
  }

  function tree(x, z, s) {
    cylinder(group, .1 * s, .15 * s, 1.15 * s, x, .61 * s, z, 0x9d8760, 7);
    ico(group, .82 * s, x, 1.72 * s, z, 0x7f9a67, [.95, 1.15, .95]);
    ico(group, .67 * s, x + .29 * s, 2.05 * s, z - .1, 0x97ad79, [1, 1.1, 1]);
    circle(x, z, .5 * s);
  }
  function bench(x, z, angle) {
    const b = new THREE.Group();
    b.position.set(x, 0, z); b.rotation.y = angle;
    for (const zz of [-.22, 0, .22]) box(b, 1.9, .09, .16, 0, .53, zz, 0xc5a579);
    for (const yy of [.86, 1.1]) box(b, 1.9, .16, .09, 0, yy, -.28, 0xc5a579);
    for (const xx of [-.7, .7]) {
      box(b, .075, .55, .07, xx, .28, .19, dark);
      box(b, .075, 1.05, .07, xx, .55, -.24, dark);
    }
    group.add(b); rect(x, z, 2, .75);
  }
  function lounge(x, z) {
    box(group, .75, .12, 1.6, x, .39, z, 0xe8d7b0);
    const back = box(group, .75, .1, .7, x, .58, z - .65, 0xf3e7ca); back.rotation.x = .55;
    for (const zz of [-.6, .6]) box(group, .65, .28, .07, x, .21, z + zz, 0xa7ac8a);
    rect(x, z, 1, 2.2);
  }
  function umbrella(x, z) {
    cylinder(group, .035, .035, 2.3, x, 1.2, z, 0xb79d73);
    const canopy = cylinder(group, .06, 1.05, .48, x, 2.43, z, 0xf1d5ae, 10);
    canopy.castShadow = true;
    sphere(group, .07, x, 2.72, z, cream);
    circle(x, z, .25);
  }
  function sign(text, x, z, width) {
    rect(x, z, width * 1.5, .2);
    cylinder(group, .035, .035, .8, x, .44, z, dark);
    box(group, width * 1.5, .45, .12, x, .85, z, cream);
    // Locally drawn text adds no network font or image dependency.
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f4e8cf'; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#536647'; ctx.font = '500 41px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 66);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.45, .36), new THREE.MeshBasicMaterial({ map: texture }));
    label.position.set(x, .85, z + .065); group.add(label);
  }
}
