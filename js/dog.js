import * as THREE from 'three';
import { mesh, fluffGeometry } from './geometry.js';
import { createDogActivities } from './activities.js';
import { createDogCare } from './care.js';
import { createTricks, TRICK_COMMANDS } from './tricks.js';

export function createDog(world, navigation) {
  const root = new THREE.Group(); root.name = 'AlltaglichSpitz'; root.scale.setScalar(.9);
  const posePivot = new THREE.Group(); posePivot.position.y = .55; root.add(posePivot);
  const body = new THREE.Group(); body.position.y = -.55; posePivot.add(body);
  // Japanese spitz: plush double coat, a lion-like neck ruff and chest bib,
  // fluffy cheeks around a short fox muzzle, small erect ears set close together,
  // feathered "pants" and a plume tail curled flat over the back.
  const fur = new THREE.MeshPhysicalMaterial({ color: 0xfdfbf6, roughness: .9, sheen: 1, sheenRoughness: .42, sheenColor: 0xffffff });
  const underFur = new THREE.MeshPhysicalMaterial({ color: 0xf2ece1, roughness: .92, sheen: .8, sheenRoughness: .5, sheenColor: 0xfffaf0 });
  const ink = new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: .28 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xeab3ab, roughness: .7 });
  const part = (geo, mat, parent, [x, y, z], [sx, sy, sz] = [1, 1, 1]) => {
    const object = new THREE.Mesh(geo, mat); object.position.set(x, y, z); object.scale.set(sx, sy, sz);
    object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
  };
  const ball = new THREE.SphereGeometry(1, 20, 14);
  const tuft = (parent, r, at, scale = [1, 1, 1], seed = 1, amp = .12, mat = fur) => part(fluffGeometry(seed, amp), mat, parent, at, scale.map(v => v * r));

  tuft(body, .3, [0, .52, -.12], [1, .98, 1.42], 1, .09);
  tuft(body, .27, [0, .55, -.43], [1.05, 1, 1], 2, .1);
  const belly = part(ball, pink, body, [0, .25, -.15], [.26, .045, .33]); belly.visible = false;
  tuft(body, .36, [0, .72, .14], [1.1, 1.02, .8], 3, .16);
  tuft(body, .22, [0, .48, .27], [1, 1.25, .8], 4, .18, underFur);
  for (const side of [-1, 1]) tuft(body, .17, [side * .17, .41, -.43], [1, 1.2, 1.1], 5 + side, .14);

  const head = new THREE.Group(); head.position.set(0, .99, .29); body.add(head);
  tuft(head, .245, [0, .02, 0], [1.05, .95, .98], 7, .04);
  for (const side of [-1, 1]) tuft(head, .16, [side * .14, -.1, .0], [1, .95, 1], 8 + side, .1);
  tuft(head, .1, [0, .17, -.05], [1.2, .7, 1], 11, .1);
  part(new THREE.ConeGeometry(1, 1, 14), fur, head, [0, -.072, .27], [.098, .2, .078]).rotation.x = Math.PI / 2;
  part(ball, fur, head, [0, -.06, .19], [.11, .085, .13]);
  part(ball, ink, head, [0, -.06, .37], [.042, .034, .03]);
  const smile = part(new THREE.TorusGeometry(.032, .005, 4, 14, Math.PI), ink, head, [0, -.112, .325]);
  smile.rotation.set(-.3, 0, Math.PI);
  const eyes = [], eyeShines = [];
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const side of [-1, 1]) {
    const eye = part(ball, ink, head, [side * .094, .035, .2], [.042, .036, .024]);
    eye.rotation.z = side * .28; eye.userData.baseY = eye.scale.y; eyes.push(eye);
    eyeShines.push(part(ball, shine, head, [side * .094 - .012, .049, .222], [.011, .011, .008]));
  }
  const ears = [];
  const earGeo = new THREE.ConeGeometry(.095, .23, 4), innerEarGeo = new THREE.ConeGeometry(.055, .14, 4);
  for (const side of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(side * .12, .2, -.035); ear.rotation.set(-.12, 0, -side * .2);
    part(earGeo, fur, ear, [0, .08, 0], [1, 1, .55]).rotation.y = Math.PI / 4;
    part(innerEarGeo, pink, ear, [0, .065, .028], [.95, 1, .18]).rotation.y = Math.PI / 4;
    head.add(ear); ears.push(ear);
  }
  const legs = [];
  const legGeo = new THREE.CylinderGeometry(.068, .074, .32, 10);
  for (const [x, z, rear] of [[-.13, .2, 0], [.13, .2, 0], [-.15, -.4, 1], [.15, -.4, 1]]) {
    const leg = new THREE.Group(); leg.position.set(x, .4, z);
    part(legGeo, fur, leg, [0, -.17, 0]);
    part(ball, fur, leg, [0, -.355, .03], [.085, .055, .11]);
    tuft(leg, rear ? .12 : .085, [0, rear ? -.06 : -.08, -.035], [1, 1.3, 1], 12 + x * 10 + z, .16);
    body.add(leg); legs.push(leg);
  }
  const tail = new THREE.Group(); tail.position.set(0, .72, -.5);
  for (const [y, z, r, x] of [[.06, -.03, .1, 0], [.18, -.04, .14, 0], [.29, .05, .17, .02], [.31, .2, .16, .05], [.25, .33, .12, .08]]) tuft(tail, r, [x, y, z], [1.1, .9, 1.15], 20 + y * 10, .13);
  body.add(tail);
  const tongue = part(ball, pink, head, [0, -.14, .31], [.036, .05, .028]); tongue.visible = false;
  const hitArea = mesh(new THREE.SphereGeometry(.75, 8, 6), 0xffffff, [0, .65, 0], root);
  hitArea.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  hitArea.castShadow = false; hitArea.receiveShadow = false;
  const care = createDogCare(root);
  const tricks = createTricks();

  let environment = world, nav = navigation;
  let path = [], stop = 0, state = 'resting', rest = 1.2, command = 'walk';
  let speed = 0, gait = 0, wag = 0, looking = 0, sitting = 0;
  let running = false, visited = new Set([0]), routeFailures = 0, lastCollision = null;
  let activities = null, pendingCommand = null, hasPlayed = false, completedActivities = new Set();
  let petReturn = 'walk';
  let homePhase = null, afterHouseCommand = null;
  const events = [];
  const pos = () => ({ x: root.position.x, z: root.position.z });
  function greet() { wag = 3; looking = .4; }
  function goTo(destination, run = false) {
    const next = nav.findPath(pos(), destination);
    if (!next.length) return false;
    path = next; running = run; state = 'walking'; rest = 0; return true;
  }
  function setEnvironment(nextWorld, nextNavigation) {
    activities?.cancel();
    tricks.cancel(); root.visible = true; homePhase = null; afterHouseCommand = null;
    environment = nextWorld; nav = nextNavigation; environment.root.add(root);
    const spawn = environment.island.spawn;
    root.position.set(spawn.x, environment.heightAt(spawn.x, spawn.z), spawn.z);
    root.rotation.y = .35; path = []; speed = 0; stop = 0; rest = 1.2; visited = new Set([0]); routeFailures = 0;
    lastCollision = null; pendingCommand = null; hasPlayed = false; completedActivities = new Set();
    activities = createDogActivities(environment, nav, root, head);
    care.setEnvironment(environment, nav);
    // Sit/stay are persistent, including when the user changes islands.
    if (!['walk', 'sit', 'stay'].includes(command)) command = 'walk';
    state = command === 'sit' ? 'sitting' : command === 'stay' ? 'waiting' : 'resting';
  }
  function execute(next) {
    if (!['come', 'sit', 'stay', 'walk', 'play', 'feed', 'pet', 'fetch', 'home', ...TRICK_COMMANDS].includes(next)) return false;
    if (next === 'feed' && care.mode === 'feed') return false;
    if (next === 'pet' && care.mode === 'pet') return true;
    if (next === 'home' && state === 'in-house') return true;
    if (homePhase === 'exit' && next !== 'home') { afterHouseCommand = next; command = next; return true; }
    if (state === 'in-house' && next !== 'home') {
      root.visible = true; command = next; homePhase = 'exit'; afterHouseCommand = next;
      return goTo(environment.house.approach);
    }
    care.cancel(); tricks.cancel(); homePhase = null; afterHouseCommand = null;
    if (activities.active && next === 'play' && command === 'play' && !activities.exiting) return true;
    if (activities.active) {
      command = next; pendingCommand = next; path = [];
      if (activities.requestExit()) { state = 'returning'; return true; }
      pendingCommand = null;
    }
    command = next; path = []; running = false;
    root.visible = true;
    if (next === 'play' || next === 'fetch') {
      hasPlayed = true; speed = 0; state = 'playing';
      const accepted = activities.start(next === 'fetch' ? 'fetch' : undefined);
      if (!accepted) { command = 'stay'; state = 'waiting'; }
      return accepted;
    }
    if (TRICK_COMMANDS.includes(next)) { speed = 0; state = next === 'bang' ? 'belly-up' : 'trick'; greet(); return tricks.start(next); }
    if (next === 'home') {
      homePhase = 'approach';
      if (!environment.house || !goTo(environment.house.approach)) { homePhase = null; command = 'stay'; state = 'waiting'; return false; }
      return true;
    }
    if (next === 'feed' || next === 'pet') {
      const accepted = next === 'feed' ? care.feed() : care.pet();
      state = accepted ? next === 'feed' ? 'feeding' : 'petted' : 'waiting'; speed = 0;
      if (!accepted) command = 'stay';
      return accepted;
    }
    if (next === 'sit') { state = 'sitting'; speed = 0; greet(); }
    if (next === 'stay') { state = 'waiting'; speed = 0; }
    if (next === 'walk') { state = 'resting'; rest = 0; }
    if (next === 'come') {
      greet();
      if (!goTo(environment.island.spawn, true)) { command = 'stay'; state = 'waiting'; return false; }
    }
    return true;
  }
  setEnvironment(world, navigation);
  return {
    root, greet, setEnvironment, execute,
    beginPet() { if (command !== 'pet') petReturn = command === 'sit' || command === 'stay' ? command : 'walk'; return execute('pet'); },
    petStroke() { if (!care.stroke()) return false; greet(); return true; },
    endPet() { if (command === 'pet') execute(petReturn); },
    drainEvents() { return events.splice(0); },
    call: () => execute('come'),
    snapshot: () => ({ ...pos(), y: root.position.y, state, command, speed, wag, sitting, stop, routeFailures, lastCollision, visited: [...visited], island: environment.island.id, activity: activities.snapshot(), care: care.snapshot(), trick: tricks.snapshot(), bellyRoll: Math.abs(posePivot.rotation.x), visible: root.visible, homePhase, completedActivities: [...completedActivities], pendingCommand, path: path.map(p => ({ ...p })) }),
    update(dt, time, reducedMotion) {
      wag = Math.max(0, wag - dt);
      const wasPlaying = activities.active;
      const playFrame = activities.update(dt, time, reducedMotion);
      if (playFrame.failed) { routeFailures++; command = 'stay'; state = 'waiting'; }
      if (playFrame.completed) {
        if (!playFrame.completed.exiting) completedActivities.add(playFrame.completed.type);
        if (!playFrame.completed.exiting && ['play', 'fetch'].includes(command)) events.push({ island: environment.island.id, kind: 'play' });
        const next = pendingCommand; pendingCommand = null;
        if (next) execute(next);
        else { if (['play', 'fetch'].includes(command)) command = 'walk'; state = 'resting'; rest = 2.3; }
      }
      const wasCaring = care.active, careFrame = care.update(dt, time);
      if (careFrame.failed) { routeFailures++; command = 'stay'; state = 'waiting'; }
      if (careFrame.completed) {
        events.push({ island: environment.island.id, kind: 'feed' });
        command = 'walk'; state = 'resting'; rest = 2.5; greet();
      }
      const trickFrame = tricks.update(dt);
      if (trickFrame.finished) { command = trickFrame.kind === 'greet' ? 'stay' : 'sit'; state = command === 'sit' ? 'sitting' : 'waiting'; }
      let moving = state === 'walking' && path.length > 0;
      speed = THREE.MathUtils.damp(speed, moving ? (running ? 2.45 : 1.1) : 0, moving ? 4 : 8, dt);
      let travelled = 0, blocked = false;
      if (wasCaring) {
        moving = careFrame.travelled > 0; travelled = careFrame.travelled; speed = dt ? travelled / dt : 0;
        if (care.active) state = care.mode === 'feed' ? 'feeding' : 'petted';
      } else if (wasPlaying) {
        moving = playFrame.travelled > 0;
        travelled = playFrame.travelled; speed = dt ? travelled / dt : 0;
        if (activities.active) state = pendingCommand ? 'returning' : playFrame.climbingLadder ? 'climbing-ladder' : playFrame.swimming ? 'swimming' : 'playing';
      } else if (moving) {
        let budget = speed * dt;
        while (budget > 0 && path.length) {
          const target = path[0], dx = target.x - root.position.x, dz = target.z - root.position.z;
          const distance = Math.hypot(dx, dz);
          if (distance < 1e-8) { root.position.x = target.x; root.position.z = target.z; path.shift(); continue; }
          const arriving = budget >= distance, step = Math.min(budget, distance);
          // Reach the waypoint exactly before turning. Dropping it early can
          // cut across an inflated wall corner even when both segments are safe.
          const x = arriving ? target.x : root.position.x + dx / distance * step;
          const z = arriving ? target.z : root.position.z + dz / distance * step;
          if (!nav.isWalkable(x, z)) { lastCollision = { from: pos(), to: { x, z }, target: { ...target }, path: path.map(p => ({ ...p })) }; path = []; blocked = true; routeFailures++; state = 'resting'; rest = .5; break; }
          root.position.x = x; root.position.z = z; budget -= step; travelled += step;
          const angle = Math.atan2(dx, dz);
          root.rotation.y += Math.atan2(Math.sin(angle - root.rotation.y), Math.cos(angle - root.rotation.y)) * (1 - Math.exp(-dt * 10));
          if (arriving) path.shift();
        }
        if (blocked && command === 'come' && !goTo(environment.island.spawn, true)) { command = 'stay'; state = 'waiting'; }
        if (!path.length && !blocked) {
          if (homePhase === 'approach') {
            homePhase = 'bed';
            if (!goTo(environment.house.bed)) { homePhase = null; command = 'stay'; state = 'waiting'; routeFailures++; }
          } else if (homePhase === 'bed') {
            homePhase = null; state = 'in-house'; root.visible = false; speed = 0;
          } else if (homePhase === 'exit') {
            const next = afterHouseCommand; homePhase = null; afterHouseCommand = null; execute(next);
          } else {
            state = command === 'come' ? 'greeting' : 'resting';
            rest = command === 'come' ? 2.5 : 1.8 + Math.random() * 2.4;
            if (command === 'come') greet(); else visited.add(stop);
          }
        }
      } else if (!['sit', 'stay', 'pet', 'feed', 'home', 'fetch', ...TRICK_COMMANDS].includes(command)) {
        rest -= dt;
        if (rest <= 0) {
          if (command === 'come') command = 'walk';
          if (!hasPlayed && command === 'walk') {
            hasPlayed = true;
            if (activities.start()) state = 'playing'; else rest = 1;
          } else {
            stop = (stop + 1) % environment.island.stops.length;
            if (stop === 0) hasPlayed = false;
            if (!goTo(environment.island.stops[stop], stop % 3 === 0)) rest = 1;
          }
        }
      }
      gait += playFrame.swimming || playFrame.climbingLadder ? dt * 11 : travelled * (running ? 7.8 : 10);
      sitting = THREE.MathUtils.damp(sitting, trickFrame.sit || (command === 'sit' && !activities.active ? 1 : 0), 7, dt);
      for (let i = 0; i < legs.length; i++) {
        const target = i === 0 && trickFrame.paw ? -trickFrame.paw : trickFrame.belly ? -.7 + Math.sin(time * 3 + i) * .12 : playFrame.jumping ? (i < 2 ? .55 : -.8) : moving ? Math.sin(gait + ([0, 3].includes(i) ? 0 : Math.PI)) * (playFrame.swimming || playFrame.climbingLadder ? .85 : running ? .7 : .48) : i > 1 ? -sitting * 1.05 : sitting * .15;
        legs[i].rotation.x = THREE.MathUtils.damp(legs[i].rotation.x, target, 18, dt);
        legs[i].rotation.z = THREE.MathUtils.damp(legs[i].rotation.z, i === 0 ? trickFrame.pawWave : 0, 12, dt);
        legs[i].position.y = .4 + (i === 0 ? trickFrame.paw * (trickFrame.kind === 'highfive' ? .22 : .15) : 0);
      }
      if (!wasPlaying && !wasCaring) root.position.y = THREE.MathUtils.damp(root.position.y, environment.heightAt(root.position.x, root.position.z), 14, dt);
      const bounce = reducedMotion || playFrame.swimming || playFrame.jumping ? 0 : moving ? Math.abs(Math.sin(gait)) * (running ? .075 : .035) : Math.sin(time * 2) * .008;
      posePivot.rotation.x = THREE.MathUtils.damp(posePivot.rotation.x, -trickFrame.belly * Math.PI, 9, dt);
      posePivot.position.y = THREE.MathUtils.damp(posePivot.position.y, .55 - trickFrame.belly * .2, 9, dt); belly.visible = Math.abs(posePivot.rotation.x) > .6;
      body.position.y = -.55 + bounce - sitting * .14;
      body.rotation.x = -sitting * .23 + (playFrame.climbingLadder ? -.3 : playFrame.swimming ? .12 : moving && running ? Math.sin(gait * 2) * .035 : 0);
      body.rotation.z = playFrame.shaking && !reducedMotion ? Math.sin(time * 30) * .13 : 0;
      looking = THREE.MathUtils.damp(looking, moving ? 0 : Math.sin(time * .9) * .27, 3, dt);
      head.position.y = THREE.MathUtils.damp(head.position.y, trickFrame.belly ? .5 : careFrame.eating ? .73 : .99, 9, dt);
      head.position.z = THREE.MathUtils.damp(head.position.z, careFrame.eating ? .37 : .29, 9, dt);
      head.rotation.y = careFrame.eating ? 0 : looking;
      head.rotation.x = -posePivot.rotation.x * .5 + trickFrame.nod + (careFrame.eating ? .82 + careFrame.chew * .06 : moving ? Math.sin(gait) * .035 : Math.sin(time * 1.3) * .04);
      head.rotation.z = careFrame.petting ? Math.sin(time * 4) * .10 : 0;
      for (let i = 0; i < eyes.length; i++) { eyes[i].scale.y = eyes[i].userData.baseY * (careFrame.petting ? .25 : 1); eyeShines[i].visible = !careFrame.petting; }
      for (let i = 0; i < ears.length; i++) ears[i].rotation.x = moving ? Math.sin(gait + i * .5) * .075 : 0;
      tail.rotation.z = Math.sin(time * (wag > 0 || playFrame.carrying ? 23 : 5)) * (wag > 0 || playFrame.carrying ? .65 : .1);
      tongue.visible = wag > 0 && !playFrame.swimming && !playFrame.carrying;
    },
  };
}

