import * as THREE from 'three';

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
    const sw = Math.sin(P.phase);
    P.limbs = { armL: arm(-1, .12, sw * .55), armR: arm(1, .12, -sw * .55), legL: leg(-1, Math.max(0, sw)), legR: leg(1, Math.max(0, -sw)) };
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
  // where the bear's middle goes for the pen at memo point (xp, yp): its right paw reaches up and right to the pen
  const penSpot = (xp, yp) => { const [x, z] = memoPoint(xp, yp); return [x - HMM * .16, z + HMM * .36]; };

  const play = {
    anchor,
    enter() {
      P.mode = 'wait'; P.t = 0; P.wait = .8; P.written = 0; P.done = false;
      anchor.visible = true;
      // arrives from the front right, on the table
      anchor.position.set(70 * K, groundY + HALF, 90 * K); anchor.rotation.set(0, -2.4, 0, 'YXZ');
    },
    leave() { anchor.visible = false; plush.sprite.visible = false; plush.shadow.visible = false; },
    // tap the bear: open it large
    target: { object: plush.proxy, grab() {}, drag() {}, release() {}, tap() { plush.open(); } },
    update(time, dt, reducedMotion) {
      if (!anchor.visible) return;
      const api = site(); if (!api) return;
      P.t += dt;
      const top = api.panel.half[1];   // panel z of the bottom edge (PL2)
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
        const [tx, tz] = penSpot(api.lines[0].x0, api.lines[0].y);
        const MOVE = .7, m = Math.floor(P.t / MOVE), f = (P.t % MOVE) / MOVE, side = m % 2 ? 1 : -1;
        const reach = Math.min(1, f / .45), pull = Math.max(0, (f - .45) / .55), ease = pull * pull * (3 - 2 * pull);
        const rise = HMM * .26, climbed = (m + ease) * rise;
        P.pz = Math.max(tz, P.startZ - climbed); P.px += (tx - P.px) * Math.min(1, dt * 1.2);
        onPanel(P.px, P.pz, OUT(), anchor.position);
        anchor.rotation.set(-api.panel.tilt, Math.PI, side * .1 * Math.sin(f * Math.PI), 'YXZ');
        const up = side < 0 ? 'armL' : 'armR', down = side < 0 ? 'armR' : 'armL';
        P.limbs = {};
        P.limbs[up] = arm(side, .35 + .45 * reach - .2 * ease, 1.05);
        P.limbs[down] = arm(-side, .8 - .45 * ease * .8, 1.05);
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
        const scrib = Math.sin(time * 22) * .12, wob = Math.sin(time * 9) * .05;
        anchor.rotation.set(-api.panel.tilt, Math.PI + wob * .4, wob, 'YXZ');
        P.limbs = { armL: arm(-1, .62, 1.05), armR: arm(1, .5 + scrib, .95 + scrib * .6), legL: leg(-1, .3, .5), legR: leg(1, .2, .5) };
        if (P.written >= total()) { P.mode = 'look'; P.t = 0; }
      } else if (P.mode === 'look') {
        // done: a look round at us over its shoulder, legs swinging
        anchor.rotation.y = Math.PI + Math.sin(Math.min(1, P.t / 1.4) * Math.PI) * .8;
        const kick = Math.sin(P.t * 6) * .4;
        P.limbs = { armL: arm(-1, .7, 1.05), armR: arm(1, .7, 1.05), legL: leg(-1, Math.max(0, kick)), legR: leg(1, Math.max(0, -kick)) };
        if (P.t > 1.6) { P.mode = 'jump'; P.t = 0; P.vy = 4.2; P.vz = 3.2; }
      } else if (P.mode === 'jump') {
        // pushes off the panel, a back flip, lands on the table in front
        P.vy -= 26 * dt; anchor.position.y += P.vy * dt; anchor.position.z += P.vz * dt;
        const fall = Math.min(1, P.t / .95); anchor.rotation.x = -api.panel.tilt * (1 - fall) - fall * Math.PI * 2; anchor.rotation.z = 0;
        const tuck = Math.sin(fall * Math.PI);
        P.limbs = { armL: arm(-1, .6 + tuck * .4, 1.2 * tuck), armR: arm(1, .6 + tuck * .4, 1.2 * tuck), legL: leg(-1, tuck * 1.1, .45), legR: leg(1, tuck * 1.1, .45) };
        if (anchor.position.y <= groundY + HALF && P.vy < 0) { stand(); anchor.rotation.set(0, Math.PI, 0, 'YXZ'); P.mode = 'cheer'; P.t = 0; P.done = true; }
      } else if (P.mode === 'cheer') {
        const clap = Math.abs(Math.sin(P.t * 9)) * .25;
        stand(); face(0, dt * 2);
        P.limbs = { armL: arm(-1, .55, .95 + clap), armR: arm(1, .55, .95 + clap), legL: leg(-1), legR: leg(1) };
        if (P.t > 1.8) { P.mode = 'wait'; P.t = 0; P.wait = 2 + Math.random() * 3; }
      } else if (P.mode === 'roam') {
        // pootles about in front of the stand
        if (walkTo(dt, 1.1)) { P.mode = 'wait'; P.t = 0; P.wait = 2.5 + Math.random() * 4; }
      }
      plush.update(anchor, { ground: P.mode === 'climb' || P.mode === 'write' || P.mode === 'look' ? null : groundY, limbs: P.limbs });
    },
  };
  anchor.visible = false;
  return play;
}
