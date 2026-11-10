import * as THREE from 'three';
import { sphere, ico, cylinder, mesh } from './geometry.js';
import { createDogActivities } from './activities.js';
import { createDogCare } from './care.js';
import { createTricks, TRICK_COMMANDS } from './tricks.js';

export function createDog(world, navigation) {
  const root = new THREE.Group(); root.name = 'AlltaglichSpitz'; root.scale.setScalar(.9);
  const posePivot = new THREE.Group(); posePivot.position.y = .55; root.add(posePivot);
  const body = new THREE.Group(); body.position.y = -.55; posePivot.add(body);
  const white = 0xfffcf5, cream = 0xf1e9da, nose = 0x333a31;
  sphere(body, .34, 0, .55, -.12, white, [1, 1, 1.35]);
  const belly = sphere(body, .27, 0, .225, -.17, 0xe7bfb6, [.95, .16, 1.25]); belly.visible = false;
  // Full neck ruff, compact body, pointed ears and a curled tail: a small spitz.
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    ico(body, .19, Math.cos(a) * .23, .68 + Math.sin(a) * .25, .17, i % 2 ? cream : white, [1, 1.2, 1]);
  }
  for (const [x, y, z] of [[-.25, .53, -.35], [.25, .53, -.35], [0, .78, -.25], [-.26, .48, 0], [.26, .48, 0]]) ico(body, .19, x, y, z, white);
  const head = new THREE.Group(); head.position.set(0, .99, .29); body.add(head);
  sphere(head, .3, 0, 0, 0, white, [1.1, .98, .95]);
  for (const side of [-1, 1]) ico(head, .17, side * .22, -.08, .06, white, [1.1, 1, .9]);
  const snout = mesh(new THREE.ConeGeometry(.15, .32, 5), white, [0, -.065, .31], head);
  snout.rotation.x = Math.PI / 2;
  sphere(head, .064, 0, -.065, .478, nose, [1.1, .8, .7]);
  const eyes = [], eyeShines = [];
  for (const x of [-.142, .142]) {
    eyes.push(sphere(head, .044, x, .045, .255, nose, [1, 1.12, .75]));
    eyeShines.push(sphere(head, .013, x - .008, .059, .285, 0xffffff));
  }
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(side * .215, .24, -.025); ear.rotation.z = -side * .16;
    mesh(new THREE.ConeGeometry(.17, .38, 3), white, [0, .02, 0], ear, [1, 1, .65]);
    mesh(new THREE.ConeGeometry(.105, .245, 3), 0xe8cabe, [0, .015, .075], ear, [.85, 1, .1]);
    head.add(ear); ears.push(ear);
  }
  const legs = [];
  for (const [x, z] of [[-.22, .2], [.22, .2], [-.22, -.36], [.22, -.36]]) {
    const leg = new THREE.Group(); leg.position.set(x, .4, z);
    cylinder(leg, .105, .075, .25, 0, -.105, 0, white, 8);
    sphere(leg, .115, 0, -.265, .04, white, [1, .7, 1.25]);
    body.add(leg); legs.push(leg);
  }
  const tail = new THREE.Group(); tail.position.set(0, .75, -.42); tail.rotation.y = .35;
  mesh(new THREE.TorusGeometry(.22, .105, 8, 18, Math.PI * 1.85), white, [.025, .13, 0], tail);
  ico(tail, .15, .22, .14, .015, white); body.add(tail);
  const tongue = sphere(head, .055, 0, -.145, .35, 0xd9928b, [.65, 1, .4]); tongue.visible = false;
  const hitArea = mesh(new THREE.SphereGeometry(.75, 8, 6), white, [0, .65, 0], root);
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
      for (let i = 0; i < eyes.length; i++) { eyes[i].scale.y = .044 * (careFrame.petting ? .28 : 1.12); eyeShines[i].visible = !careFrame.petting; }
      for (let i = 0; i < ears.length; i++) ears[i].rotation.x = moving ? Math.sin(gait + i * .5) * .075 : 0;
      tail.rotation.z = Math.sin(time * (wag > 0 || playFrame.carrying ? 23 : 5)) * (wag > 0 || playFrame.carrying ? .65 : .1);
      tongue.visible = wag > 0 && !playFrame.swimming && !playFrame.carrying;
    },
  };
}
