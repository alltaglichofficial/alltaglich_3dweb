import * as THREE from 'three';
import { createThrowable } from './plush.js';

// The swim bear and the magnet stand. The stand and its magnets are drawn by their viewer
// (products/magnets.html) behind the scene; this moves the bear over them:
// it walks up to the stand, climbs the steel front panel to the lined memo, writes today's
// swim log on it line by line (the viewer shows the writing as it goes), looks round at us,
// back-flips down onto the table, cheers, and then pootles about in front of the stand.
// Sizes come from the viewer in millimetres; K is world units per millimetre and the
// stand's middle stands at (0, groundY, 0).
//   site() – the magnet viewer's interface (or null while it loads)
const WRITE_SPEED = 9;   // characters a second

export function createMagnetPlay(parent, { plush, groundY, K, site }) {
  const anchor = new THREE.Object3D(); anchor.name = 'MagnetBear'; anchor.rotation.order = 'YXZ'; parent.add(anchor);
  const H = plush.height, HALF = H * .5, HMM = H / K;   // bear height in world units and in millimetres
  const arm = (side, elev, fwd) => [side * Math.cos(elev) * Math.cos(fwd), Math.sin(elev), Math.cos(elev) * Math.sin(fwd)];
  const leg = (side, lift = 0, out = .6) => [side * out, -.8 + lift * .45, .06 + lift * .7];
  const v3 = new THREE.Vector3(), w3 = new THREE.Vector3();
  // a point on the stand's front panel (panel x across, z down the panel, mm) lifted `out` mm off it → world
  function onPanel(px, pz, out, target = v3) {
    const p = site().panel, M = p.M, O = p.O;
    return target.set(
      (O[0] + M[0] * px + M[3] * out + M[6] * pz) * K,
      groundY + (O[1] + M[1] * px + M[4] * out + M[7] * pz) * K,
      (O[2] + M[2] * px + M[5] * out + M[8] * pz) * K);
  }
  // where a point of the memo (in % of the paper, 0–100) is on the panel
  function memoPoint(xp, yp) {
    const m = site().memo(), lx = (xp / 100 - .5) * m.half * 2, lz = (yp / 100 - .5) * m.half * 2;
    return [m.x + Math.cos(m.rot) * lx + Math.sin(m.rot) * lz, m.z - Math.sin(m.rot) * lx + Math.cos(m.rot) * lz];
  }
  // the pencil in the right paw while it writes: tip on the memo, the rest running back up
  // through the paw; only while writing. The bear covers whatever of it is behind the bear.
  const pencil = new THREE.Group(); pencil.name = 'MagnetPencil'; pencil.visible = false; parent.add(pencil);
  {
    const L = H * .34, r = H * .026, mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .6 });   // ordinary depth: the bear's sprite, nearer the camera, covers it
    const part = (geo, c, y) => { const m = new THREE.Mesh(geo, mat(c)); m.position.y = y; pencil.add(m); };
    const tip = L * .07, wood = L * .13, body = L * .64, band = L * .06, rub = L * .1;   // along the pencil from the point (y = 0) up
    part(new THREE.ConeGeometry(r * .32, tip, 6), 0x3a3a3c, tip / 2);   // graphite point
    pencil.children[0].rotation.x = Math.PI;
    part(new THREE.CylinderGeometry(r, r * .32, wood, 6), 0xe9cfa1, tip + wood / 2);        // sharpened wood
    part(new THREE.CylinderGeometry(r, r, body, 6), 0xf2c230, tip + wood + body / 2);      // yellow hexagonal body
    part(new THREE.CylinderGeometry(r * 1.04, r * 1.04, band, 12), 0xb9bcc0, tip + wood + body + band / 2);   // metal band
    part(new THREE.CylinderGeometry(r * .98, r * .98, rub, 12), 0xe58f9b, tip + wood + body + band + rub / 2); // eraser
  }
  const up3 = new THREE.Vector3(0, 1, 0), tipW = new THREE.Vector3();
  // Held like a pencil: the paw grips it in the middle, the point is below the paw and a
  // little outside it on the paper (clear of the bear, so it shows), the eraser end leans back
  // up toward the shoulder, away from the panel.
  // (px, pz) is the bear's middle on the panel in mm; the paw is PAW_X to its right.
  const PAW_X = HMM * .4, GRIP = HMM * .12;   // paw offset; the point is GRIP below the paw
  function holdPencil(px, pz, jx, jz) {
    const x = px + PAW_X + GRIP * .7 + jx, z = pz + GRIP + jz;
    onPanel(x, z, .6, tipW); onPanel(x - GRIP * 1.4, z - GRIP * 2, HMM * .14, w3);
    pencil.position.copy(tipW);
    pencil.quaternion.setFromUnitVectors(up3, w3.sub(tipW).normalize());
    pencil.visible = site().front?.() !== false;   // not through the stand from behind
  }
  const P = { mode: 'wait', t: 0, phase: 0, written: 0, target: new THREE.Vector2(), px: 0, pz: 0, vy: 0, vz: 0, wait: 1, limbs: null, done: false };
  const stand = () => { anchor.position.y = groundY + HALF; anchor.rotation.x = 0; anchor.rotation.z = 0; };
  const face = (yaw, dt) => { let d = yaw - anchor.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); anchor.rotation.y += d * Math.min(1, dt * 6); };
  function walkTo(dt, speed = 1.6) {
    const dx = P.target.x - anchor.position.x, dz = P.target.y - anchor.position.z, d = Math.hypot(dx, dz);
    if (d < .06) return true;
    const step = Math.min(d, speed * dt); anchor.position.x += dx / d * step; anchor.position.z += dz / d * step;
    face(Math.atan2(dx, dz), dt * 1.4);
    P.phase += dt * (6 + speed * 2.2);
    anchor.position.y = groundY + HALF + Math.abs(Math.sin(P.phase)) * .12;
    anchor.rotation.z = Math.sin(P.phase) * .1; anchor.rotation.x = .12;
    const sw = Math.sin(P.phase);   // left leg steps with the right arm, and the other way round
    P.limbs = { armL: arm(-1, .12, -sw * .55), armR: arm(1, .12, sw * .55), legL: leg(-1, Math.max(0, sw)), legR: leg(1, Math.max(0, -sw)) };
    return false;
  }
  // the memo's lines: which one the pen is on and how far along, for `n` characters written
  function pen(n) {
    const lines = site().lines; let left = n;
    for (let i = 0; i < lines.length; i++) {
      if (left <= lines[i].n || i === lines.length - 1) { const f = Math.min(1, left / lines[i].n); return { i, f, line: lines[i] }; }
      left -= lines[i].n;
    }
    return null;
  }
  const total = () => site().lines.reduce((a, l) => a + l.n, 0);
  const OUT = () => HMM * .3;   // how far the bear's middle is off the panel while it climbs
  // where the bear's middle goes for the pen at memo point (xp, yp): its right paw reaches diagonally up and right to the pen
  const penSpot = (xp, yp) => { const [x, z] = memoPoint(xp, yp); return [x - (PAW_X + GRIP * .7), z - GRIP]; };   // (so the pencil point, just below the right paw, lands on the spot)

  // picked up and dropped: lands on the table in front of the stand
  let pick = null;
  const toss = createThrowable(anchor, { bottom: HALF, groundAt: () => groundY, limit: (x, z) => {
    const front = (site()?.panel ? onPanel(0, site().panel.half[1], 0, v3).z : 0) + HALF * 1.1, R = 170 * K;
    z = Math.max(front, z); const d = Math.hypot(x, z); return d > R ? [x * R / d, z * R / d] : [x, z]; } });
  // seen from the other side of the stand, the stand is in the way (it is drawn behind the scene)
  function behindStand(api) {
    const p = anchor.position;
    if (api.hidden?.([p.x / K, (p.y - groundY) / K, p.z / K])) { plush.sprite.visible = false; plush.shadow.visible = false; pencil.visible = false; }
  }
  const play = {
    anchor, pencil,
    enter() {
      P.mode = 'wait'; P.t = 0; P.wait = .8; P.written = 0; P.done = false; pencil.visible = false; toss.cancel(); pick = null;
      anchor.visible = true;
      // arrives from the front right, on the table
      anchor.position.set(70 * K, groundY + HALF, 90 * K); anchor.rotation.set(0, -2.4, 0, 'YXZ');
    },
    leave() { toss.cancel(); pick = null; pencil.visible = false; anchor.visible = false; plush.sprite.visible = false; plush.shadow.visible = false; },
    // drag the bear: picked up (writing stops); let go and it comes back and carries on.
    // A quick tap opens it large. It is only lifted once the pointer has really moved.
    target: {
      object: plush.proxy,
      grab(point, camera) { pick = { point: point.clone(), camera, n: 0 }; },
      drag(ray) {
        if (pick) { if (++pick.n < 3) return; toss.grab(pick.point, pick.camera); pick = null; pencil.visible = false; P.mode = 'held'; }
        toss.drag(ray);
      },
      release() { pick = null; toss.release(); },
      tap() { plush.open(); },
    },
    update(time, dt, reducedMotion) {
      if (!anchor.visible) return;
      const api = site(); if (!api) return;
      P.t += dt;
      const top = api.panel.half[1];   // panel z of the bottom edge (PL2)
      if (toss.busy()) {
        // in the hand, or dropped: when it is back on its feet it goes back to the memo
        const s = toss.update(dt);
        // held up: it struggles, arms and legs paddling in turn
        const wr = Math.sin(time * 17), kick = Math.sin(time * 21 + 1);
        P.limbs = toss.state === 'held'
          ? { armL: arm(-1, .15 + wr * .3, .25 + wr * .25), armR: arm(1, .15 - wr * .3, .25 - wr * .25), legL: leg(-1, Math.max(0, kick) * .9, .7), legR: leg(1, Math.max(0, -kick) * .9, .7) }
          : { armL: arm(-1, .3, .2), armR: arm(1, .3, .2), legL: leg(-1, .3, .9), legR: leg(1, .3, .9) };
        if (toss.state === 'held') anchor.rotation.z = Math.sin(time * 13) * .18;
        if (s === 'landed') {
          P.t = 0;
          if (P.done || P.written >= total()) { P.done = true; P.mode = 'wait'; P.wait = 1; }
          else { const [x] = penSpot(28, 17); onPanel(x, top, 0, w3); P.target.set(w3.x, w3.z + HALF * .9); P.mode = 'walk'; }   // written so far is kept
        }
        plush.update(anchor, { ground: groundY, limbs: P.limbs }); behindStand(api);
        return;
      }
      if (P.mode === 'wait') {
        stand(); face(-.4, dt); P.limbs = { armL: arm(-1, .12, .04), armR: arm(1, .12, .04), legL: leg(-1), legR: leg(1) };
        if (P.t > P.wait) {
          if (!P.done) {
            // walk to the foot of the stand, under the memo
            api.setWritten(0); P.written = 0;
            const [x] = penSpot(28, 17); onPanel(x, top, 0, w3);
            P.target.set(w3.x, w3.z + HALF * .9); P.mode = 'walk'; P.t = 0;
          } else { P.mode = 'roam'; P.t = 0; P.target.set((Math.random() - .5) * 110 * K, (60 + Math.random() * 40) * K); }
        }
      } else if (P.mode === 'walk') {
        if (walkTo(dt) || reducedMotion) {
          P.mode = 'climb'; P.t = 0;
          const [x] = penSpot(28, 17); P.px = x; P.pz = top - HMM * .5; P.startZ = P.pz;
        }
      } else if (P.mode === 'climb') {
        // up the panel to the first line: reach up with one paw, pull up to it, the other paw, ...
        const at = pen(P.written), [tx, tz] = penSpot(at.line.x0 + (at.line.x1 - at.line.x0) * .78 * at.f, at.line.y);   // where the writing left off
        const MOVE = .7, m = Math.floor(P.t / MOVE), f = (P.t % MOVE) / MOVE, side = m % 2 ? 1 : -1;
        const reach = Math.min(1, f / .45), pull = Math.max(0, (f - .45) / .55), ease = pull * pull * (3 - 2 * pull);
        const rise = HMM * .26, climbed = (m + ease) * rise;
        P.pz = Math.max(tz, P.startZ - climbed); P.px += (tx - P.px) * Math.min(1, dt * 1.2);
        onPanel(P.px, P.pz, OUT(), anchor.position);
        anchor.rotation.set(-api.panel.tilt, Math.PI, side * .1 * Math.sin(f * Math.PI), 'YXZ');
        const up = side < 0 ? 'armL' : 'armR', down = side < 0 ? 'armR' : 'armL';
        P.limbs = {};
        // paws reach up and out diagonally (not straight in front, where they would hit the goggles)
        P.limbs[up] = arm(side, .3 + .3 * reach - .15 * ease, .15);
        P.limbs[down] = arm(-side, .6 - .3 * ease * .8, .15);
        P.limbs[side < 0 ? 'legR' : 'legL'] = leg(-side, .9 * Math.sin(Math.min(1, f * 1.3) * Math.PI), .5);
        P.limbs[side < 0 ? 'legL' : 'legR'] = leg(side, .25, .5);
        if (P.pz <= tz + .01 || reducedMotion) { P.mode = 'write'; P.t = 0; }
      } else if (P.mode === 'write') {
        // the pen runs along each line; the bear's middle follows it, its right paw scribbling
        P.written = reducedMotion ? total() : Math.min(total(), P.written + WRITE_SPEED * dt);
        api.setWritten(P.written);
        const p = pen(P.written), xp = p.line.x0 + (p.line.x1 - p.line.x0) * .78 * p.f;
        const [tx, tz] = penSpot(xp, p.line.y);
        P.px += (tx - P.px) * Math.min(1, dt * 5); P.pz += (tz - P.pz) * Math.min(1, dt * 5);
        onPanel(P.px, P.pz, OUT(), anchor.position);
        const scrib = Math.sin(time * 22) * .08, wob = Math.sin(time * 9) * .05;
        anchor.rotation.set(-api.panel.tilt, Math.PI + wob * .4, wob, 'YXZ');
        // right paw forward onto the memo with the pencil; the left one holds on lower down
        const eR = .42 + scrib, fR = .62 + scrib * .4;
        P.limbs = { armL: arm(-1, .18, .32), armR: arm(1, eR, fR), legL: leg(-1, .3, .5), legR: leg(1, .2, .5) };
        holdPencil(P.px, P.pz, Math.sin(time * 22) * HMM * .012, Math.cos(time * 31) * HMM * .01);
        if (P.written >= total()) { P.mode = 'look'; P.t = 0; pencil.visible = false; }
      } else if (P.mode === 'look') {
        // done: a look round at us over its shoulder, legs swinging
        anchor.rotation.y = Math.PI + Math.sin(Math.min(1, P.t / 1.4) * Math.PI) * .8;
        const kick = Math.sin(P.t * 6) * .4;
        P.limbs = { armL: arm(-1, .65, .15), armR: arm(1, .65, .15), legL: leg(-1, Math.max(0, kick)), legR: leg(1, Math.max(0, -kick)) };
        if (P.t > 1.6) { P.mode = 'jump'; P.t = 0; P.vy = 4.2; P.vz = 3.2; }
      } else if (P.mode === 'jump') {
        // pushes off the panel, a back flip, lands on the table in front
        P.vy -= 26 * dt; anchor.position.y += P.vy * dt; anchor.position.z += P.vz * dt;
        const fall = Math.min(1, P.t / .95); anchor.rotation.x = -api.panel.tilt * (1 - fall) - fall * Math.PI * 2; anchor.rotation.z = 0;
        const tuck = Math.sin(fall * Math.PI);
        P.limbs = { armL: arm(-1, .4 + tuck * .25, .2 * tuck), armR: arm(1, .4 + tuck * .25, .2 * tuck), legL: leg(-1, tuck * 1.1, .45), legR: leg(1, tuck * 1.1, .45) };
        if (anchor.position.y <= groundY + HALF && P.vy < 0) { stand(); anchor.rotation.set(0, Math.PI, 0, 'YXZ'); P.mode = 'cheer'; P.t = 0; P.done = true; }
      } else if (P.mode === 'cheer') {
        const clap = Math.abs(Math.sin(P.t * 9)) * .25;
        stand(); face(0, dt * 2);
        P.limbs = { armL: arm(-1, .3 + clap * .8, .15), armR: arm(1, .3 + clap * .8, .15), legL: leg(-1), legR: leg(1) };   // (arms not too high)
        if (P.t > 1.8) { P.mode = 'wait'; P.t = 0; P.wait = 2 + Math.random() * 3; }
      } else if (P.mode === 'roam') {
        // pootles about in front of the stand
        if (walkTo(dt, 1.1)) { P.mode = 'wait'; P.t = 0; P.wait = 2.5 + Math.random() * 4; }
      }
      plush.update(anchor, { ground: P.mode === 'climb' || P.mode === 'write' || P.mode === 'look' ? null : groundY, limbs: P.limbs }); behindStand(api);
    },
  };
  anchor.visible = false;
  return play;
}
