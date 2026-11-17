import * as THREE from 'three';
import { createSwimBear } from './bear.js';
import { plushAnchor, createThrowable, bearTarget, runLimbs } from './plush.js';
import { createWetMarks } from './wetmarks.js';
import { createWaterline } from './waterline.js';

// The swim bear on the Grip Tok. The grip itself is drawn by its viewer (products/griptok.html)
// behind the scene; this moves the bear over it.
//   · on the grip's wavy resin top it swims round in little circles (the top is a tiny pool)
//   · opening the grip flings it up: a little way from one folded stage, high up from fully folded
//   · it can be picked up and thrown, far; where it comes down the table gets wet, and it runs
//     back leaving wet paw prints, then jumps up onto the grip from just in front of it
// Sizes come from the viewer in millimetres; K is world units per millimetre.
//   site()   – the grip viewer's interface (or null while it loads)
export function createGripPlay(parent, { plush, groundY, K, site, onReady }) {
  const root = new THREE.Group(); root.name = 'GripPlay'; root.visible = false; parent.add(root);
  const bear = createSwimBear(root, { x: 0, z: 0 });
  bear.parts.rings.forEach(r => { r.visible = false; });
  const body = bear.object; body.rotation.set(0, 0, 0); body.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(body), foot = body.position.y - box.min.y;
  const { anchor } = plushAnchor(body);
  body.rotation.order = 'YXZ';

  const capR = () => (site()?.R ?? 21.5) * K;
  // half under the water of the grip's little pool while it swims (ripples kept on the grip)
  const water = createWaterline(parent, plush, { spread: .7 });
  // the table gets wet where it lands and where it runs (it has just been swimming)
  const marks = createWetMarks(root, groundY);
  let wet = 0, runPh = 0;
  // the surface under (x, z): the grip's top, the phone, or the table
  function surface(x, z) {
    const api = site(); if (!api) return groundY;
    const h = api.top(x / K, z / K); if (h >= 0) return groundY + h * K;
    const p = api.phoneBox?.();
    if (p && Math.abs(x / K - p[0]) < p[2] && Math.abs(z / K - p[1]) < p[3]) return groundY + p[4] * K;
    return groundY;
  }
  const LIMIT = 26;   // how far it can be thrown (it runs back)
  const toss = createThrowable(body, { bottom: foot, groundAt: surface, limit: (x, z) => { const d = Math.hypot(x, z); return d > LIMIT ? [x * LIMIT / d, z * LIMIT / d] : [x, z]; } });
  const st = { mode: 'swim', a: 0, r: 0, dir: 1, speed: .55, turnIn: 6, walkHop: 0, ph: 0 };
  const qYaw = new THREE.Quaternion(), qPitch = new THREE.Quaternion(), qRoll = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
  const settleOn = () => {
    const x = body.position.x, z = body.position.z, d = Math.hypot(x, z);
    if (d < capR() * .9) { st.mode = 'swim'; st.a = Math.atan2(z, x); st.r = Math.min(d, capR() * .62); }
    else st.mode = 'walk';
  };
  // an invisible stand-in for the grip, so it can be tapped
  const gripProxy = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24), new THREE.MeshBasicMaterial({ visible: false }));
  root.add(gripProxy);
  // the grip is drawn by its own viewer behind the scene: an invisible cylinder in its place
  // writes depth (after the bear's underwater picture, before the bear), so from behind the grip
  // hides the bear. Its top sits a little under the wavy resin top, where the bear swims.
  const occluder = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48), new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, depthWrite: true }));
  occluder.name = 'GripOccluder'; occluder.renderOrder = 2.5; root.add(occluder);

  const play = {
    root, toss,
    // everything it draws: the bear's group (wet marks, stand-in) and its water
    get objects() { return [root, ...water.objects]; },
    get mode() { return toss.busy() ? toss.state : st.mode; },
    // the bear arrives on the grip
    // (waits for the grip's viewer if it is still loading)
    enter() { root.visible = true; toss.cancel(); st.pending = true; },
    arrive() {
      st.pending = false; onReady?.();
      st.mode = 'swim'; st.a = Math.random() * Math.PI * 2; st.r = capR() * .4;
      body.position.set(Math.cos(st.a) * st.r, surface(0, 0) + 3.5, Math.sin(st.a) * st.r);
      toss.launch(new THREE.Vector3(0, 2, 0), 2);   // drops in
    },
    leave() { root.visible = false; toss.cancel(); water.hide(); },   // (wet marks dry where they are)
    // the grip opened: 1 = from one folded stage (a little hop), 2 = from fully folded (sent flying)
    launch(power) {
      if (toss.state === 'held' || st.mode !== 'swim' || toss.busy()) return false;
      const a = Math.random() * Math.PI * 2, far = power >= 2;
      const side = far ? 1.2 + Math.random() * 1.6 : .15 + Math.random() * .25;
      body.position.y = surface(body.position.x, body.position.z) + foot + .05;
      toss.launch(new THREE.Vector3(Math.cos(a) * side, far ? 35 : 15.5, Math.sin(a) * side), far ? 8 : 3.5);   // (twice the height of before: v × √2)
      return true;
    },
    bearTarget: bearTarget(plush, toss),
    gripProxy,
    update(time, dt, reducedMotion) {
      if (!root.visible) return;
      if (st.pending) { if (site()) play.arrive(); else return; }
      // the grip's stand-in follows its height
      const R = capR(), topY = surface(0, 0);
      gripProxy.scale.set(R, Math.max(.1, topY - groundY), R); gripProxy.position.set(0, (topY + groundY) / 2, 0);
      { const top = Math.max(groundY + .05, topY - R * .1); occluder.scale.set(R * .99, top - groundY, R * .99); occluder.position.set(0, (top + groundY) / 2, 0); }
      if (toss.busy()) {
        const s = toss.update(dt);
        if (s === 'landed') {
          settleOn();
          if (st.mode === 'walk' && wet > .04) {   // a splat of water where it comes down
            const x = body.position.x, z = body.position.z, y = surface(x, z), bs = plush.height;
            marks.add(x, z, bs * .55 * (.6 + wet * .4), true, y);
            for (let i = 0; i < 5; i++) { const a = Math.random() * Math.PI * 2, d = bs * (.35 + Math.random() * .5); marks.add(x + Math.cos(a) * d, z + Math.sin(a) * d, bs * (.08 + Math.random() * .12), false, y); }
          }
        }
        plush.update(anchor, { ground: surface(body.position.x, body.position.z) });
        water.update(dt, null, body.position.x, body.position.z, reducedMotion);
        return;
      }
      marks.update(dt);
      if (st.mode === 'swim') {
        wet = 1;
        // laps round the little pool on top; now and then it turns or changes lane
        st.turnIn -= dt;
        if (st.turnIn <= 0 && !reducedMotion) { st.turnIn = 4 + Math.random() * 6; if (Math.random() < .5) st.dir *= -1; st.r = R * (.28 + Math.random() * .34); }
        const target = st.r, d = Math.hypot(body.position.x, body.position.z);
        if (!reducedMotion) st.a += st.dir * st.speed * dt / Math.max(.6, d) * 1.6;
        const nr = d + (target - d) * Math.min(1, dt * 1.5);
        const x = Math.cos(st.a) * nr, z = Math.sin(st.a) * nr;
        // lying on the water, head first along the circle, rolling with each stroke (freestyle)
        st.ph += dt * (reducedMotion ? 0 : 5.5);
        const tx = -Math.sin(st.a) * st.dir, tz = Math.cos(st.a) * st.dir;
        qYaw.setFromAxisAngle(AY, Math.atan2(tx, tz)); qPitch.setFromAxisAngle(AX, 1.25); qRoll.setFromAxisAngle(AY, Math.sin(st.ph) * .4);
        body.quaternion.copy(qYaw).multiply(qPitch).multiply(qRoll);
        body.position.set(x, surface(x, z) + foot * .32 + Math.sin(st.ph * 2) * .015, z);
        plush.update(anchor, { swim: true, goggles: true, ground: surface(x, z) });
        water.update(dt, body.position.y + .02, x, z, reducedMotion);
        return;
      }
      // on the table or the phone: run back to the grip (wet paw prints) and jump up onto it
      wet = Math.max(0, wet - dt / 40);
      const x = body.position.x, z = body.position.z, d = Math.hypot(x, z) || .001, H = plush.height;
      let limbs = null;
      if (d > R + 1.4) {
        const step = Math.min(d - R - 1.3, (reducedMotion ? 9 : 5.5) * dt), before = Math.floor(runPh / Math.PI);
        runPh += dt * 14; limbs = runLimbs(runPh);
        body.position.x -= x / d * step; body.position.z -= z / d * step;
        body.rotation.set(-.12, Math.atan2(-x, -z), Math.sin(runPh) * .08, 'YXZ');
        body.position.y = surface(body.position.x, body.position.z) + foot + Math.abs(Math.sin(runPh)) * H * .14;
        if (Math.floor(runPh / Math.PI) !== before && wet > .04) {   // a foot comes down: a wet paw print
          const side = Math.floor(runPh / Math.PI) % 2 ? 1 : -1, yaw = Math.atan2(-x, -z), px = Math.cos(yaw), pz = -Math.sin(yaw);
          const fx = body.position.x + px * side * H * .12, fz = body.position.z + pz * side * H * .12;
          marks.paw(fx, fz, yaw, H * .4, wet, surface(fx, fz));
        }
      } else {
        body.rotation.set(0, Math.atan2(-x, -z), 0, 'YXZ');
        // jump onto the grip, landing a third of the way in
        const to = new THREE.Vector3(-x / d * R * .35, 0, -z / d * R * .35); to.y = surface(to.x, to.z) + foot;
        const T = .75, from = body.position;
        toss.launch(new THREE.Vector3((to.x - from.x) / T, (to.y - from.y + .5 * 30 * T * T) / T, (to.z - from.z) / T), 2.5);
      }
      plush.update(anchor, { ground: surface(body.position.x, body.position.z), limbs });
      water.update(dt, null, body.position.x, body.position.z, reducedMotion);
    },
  };
  return play;
}
