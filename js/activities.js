const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

// Shared exact waypoint integrator for walks, fetch runs and swimming strokes.
export function advanceRoute(position, points, budget, allowed = () => true) {
  let travelled = 0, heading = null, blocked = false;
  while (budget > 0 && points.length) {
    const target = points[0], dx = target.x - position.x, dz = target.z - position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 1e-9) { position.x = target.x; position.z = target.z; points.shift(); continue; }
    const arriving = budget >= distance, step = Math.min(budget, distance);
    const x = arriving ? target.x : position.x + dx / distance * step;
    const z = arriving ? target.z : position.z + dz / distance * step;
    if (!allowed(x, z)) { blocked = true; break; }
    position.x = x; position.z = z; travelled += step; budget -= step; heading = Math.atan2(dx, dz);
    if (arriving) points.shift();
  }
  return { travelled, heading, blocked, done: points.length === 0 };
}

export function isSwimPositionAllowed(x, z) {
  // Central pool plus the lane corridor out to the ladder on the front side wall.
  return Math.abs(x) <= 2.55 && Math.abs(z) <= 3.15 || Math.abs(x) <= .55 && z >= 2.8 && z <= 10.1;
}

export function createDogActivities(world, navigation, root, mouth) {
  let config = world.activity;
  let active = false, exiting = false, queue = [], task = null;
  let carrying = false, completion = null, failure = false;
  const ground = p => world.heightAt(p.x, p.z);
  const land = (point, label) => ({ mode: 'land', point, label });
  const pause = (duration, label, onStart) => ({ mode: 'pause', duration, label, onStart });
  const jump = point => ({ mode: 'jump', point, duration: .85, label: '낮은 발판을 폴짝! 매트에 사뿐 내려와요.' });
  const water = (points, label) => ({ mode: 'water', points: points.map(p => ({ ...p })), label });
  const ladder = up => ({ mode: 'ladder', up, point: up ? config.entry : config.waterEntry, duration: config.ladderTop ? 3.2 : 2, label: up ? '사다리를 짚고 차근차근 올라와요.' : '사다리를 따라 조심조심 물에 들어가요.' });
  // From the open pool, swim to the corridor mouth first, then along the lane to the ladder.
  const swimHome = () => {
    const mouth = config.corridorStart, p = root.position;
    return mouth && !(Math.abs(p.x - mouth.x) <= .55 && p.z >= mouth.z) ? [{ ...mouth }, config.waterEntry] : [config.waterEntry];
  };
  const waterHeight = point => world.getSurfaceHeight ? world.getSurfaceHeight(point.x, point.z) - .46 : -.34;
  function resetProps() {
    world.setSwimmer?.(null);
    if (config?.ball) {
      world.root.add(config.ball); config.ball.position.set(config.ballHome.x, config.ballHome.y, config.ballHome.z);
      config.ball.scale.setScalar(1); config.ball.rotation.set(0, 0, 0); carrying = false;
    }
  }
  function cancel() { active = false; exiting = false; queue = []; task = null; resetProps(); }
  function finish() { completion = { type: config.type, exiting }; active = false; exiting = false; task = null; resetProps(); }
  function startTask() {
    task = queue.shift();
    if (!task) { finish(); return; }
    task.time = 0;
    task.from = { x: root.position.x, y: root.position.y, z: root.position.z };
    if (task.mode === 'land') {
      task.points = navigation.findPath(task.from, task.point);
      if (!task.points.length) { failure = true; cancel(); return; }
    }
    if (task.mode === 'drop') {
      world.root.updateWorldMatrix(true, true);
      const p = config.ball.getWorldPosition(config.ball.position.clone()); world.root.worldToLocal(p);
      world.root.add(config.ball); config.ball.position.copy(p); config.ball.scale.setScalar(1);
      task.from = { x: p.x, y: p.y, z: p.z }; carrying = false;
    }
    task.onStart?.();
  }
  return {
    get active() { return active; },
    get exiting() { return exiting; },
    snapshot() { return { active, exiting, type: config?.type, stage: task?.mode || null, carrying, label: task?.label || '' }; },
    cancel,
    start(kind) {
      if (!active) config = kind === 'fetch' ? world.fetchActivity || (world.activity?.type === 'fetch' ? world.activity : null) : world.activity;
      if (active || !config || config.type === 'none') return false;
      resetProps(); active = true; exiting = false; failure = false; completion = null;
      if (config.type === 'fetch') {
        queue = [
          land(config.ballHome, '노란 테니스공을 찾으러 달려가요.'),
          pause(.45, '테니스공을 입에 물었어요!', () => { mouth.add(config.ball); config.ball.position.set(0, -.095, .56); config.ball.scale.setScalar(1); carrying = true; }),
          land(config.returnTo, '공을 물고 신나게 돌아와요.'),
          pause(1.8, '공을 찾았어요! 꼬리를 흔들며 자랑해요.'),
          { mode: 'drop', duration: 1.2, label: '공을 톡! 다시 굴려 보아요.' },
        ];
      } else if (config.type === 'swim') {
        queue = [land(config.entry, '수영장 사다리로 가고 있어요.'), ladder(false), water(config.route, '첨벙첨벙! 작은 발로 물장구를 치며 헤엄쳐요.'), water([config.waterEntry], '사다리로 헤엄쳐 돌아와요.'), ladder(true), pause(1.2, '물 밖에서 몸을 털어요!')];
      } else {
        queue = [land(config.entry, '작은 볼더링 발판으로 가고 있어요.')];
        for (const step of config.steps) queue.push(jump(step), pause(.65, '발판 위에서 다음 발판을 살펴봐요.'));
        queue.push(jump({ ...config.landing, y: ground(config.landing) }), pause(1.3, '도전 성공! 푹신한 매트 위에 착지했어요.'));
      }
      startTask(); return active;
    },
    requestExit() {
      if (!active) return false;
      if (exiting) return true;
      if (config.type === 'swim' && (task?.mode === 'ladder' || !navigation.isWalkable(root.position.x, root.position.z))) {
        exiting = true;
        queue = task?.mode === 'ladder' && task.up ? [pause(.5, '물 밖에 도착했어요.')] : [water(swimHome(), '명령을 듣고 사다리로 헤엄쳐요.'), ladder(true), pause(.5, '물 밖에 도착했어요.')];
        if (task?.mode !== 'ladder') { task = null; startTask(); }
        return true;
      }
      if (config.type === 'climb' && (task?.mode === 'jump' || !navigation.isWalkable(root.position.x, root.position.z))) {
        exiting = true;
        queue = [jump({ ...config.landing, y: ground(config.landing) })];
        if (task?.mode !== 'jump') { task = null; startTask(); }
        return true;
      }
      cancel(); return false;
    },
    update(dt, time, reducedMotion) {
      let travelled = 0, heading = null, swimming = false, jumping = false, shaking = false, climbingLadder = false;
      if (active && task) {
        task.time += dt;
        let done = false;
        if (task.mode === 'land' || task.mode === 'water') {
          const wet = task.mode === 'water';
          const result = advanceRoute(root.position, task.points, dt * (wet ? 1.05 : 2.05), wet ? isSwimPositionAllowed : (x, z) => navigation.isWalkable(x, z));
          travelled = result.travelled; heading = result.heading; done = result.done;
          if (result.blocked) { failure = true; cancel(); }
          if (wet) {
            root.position.y = waterHeight(root.position) + (reducedMotion ? 0 : Math.sin(time * 5) * .018);
            swimming = true;
            world.setSwimmer?.(swimming ? root.position : null);
          } else root.position.y = ground(root.position);
        } else if (task.mode === 'ladder') {
          const t = Math.min(1, task.time / task.duration);
          const targetY = task.up ? ground(task.point) : waterHeight(task.point);
          // With a ladder over a wall, climb to the rim first, then down the other side.
          const top = config.ladderTop, first = top && t < .5;
          const a = top && !first ? top : task.from, b = first ? top : { x: task.point.x, y: targetY, z: task.point.z };
          const s = smooth(top ? (first ? t * 2 : t * 2 - 1) : t);
          root.position.set(mix(a.x, b.x, s), mix(a.y, b.y, s) + (reducedMotion ? 0 : Math.sin(t * Math.PI * 12) * .018 * Math.sin(t * Math.PI)), mix(a.z, b.z, s));
          heading = top ? (task.up ? 0 : Math.PI) : Math.atan2(task.point.x - task.from.x, task.point.z - task.from.z);
          climbingLadder = true; travelled = dt * .6; done = t === 1; world.setSwimmer?.(null);
        } else if (task.mode === 'jump') {
          const t = Math.min(1, task.time / task.duration), s = smooth(t);
          root.position.set(mix(task.from.x, task.point.x, s), mix(task.from.y, task.point.y, s) + Math.sin(Math.PI * t) * .65, mix(task.from.z, task.point.z, s));
          heading = Math.atan2(task.point.x - task.from.x, task.point.z - task.from.z);
          jumping = t < 1; done = t === 1;
        } else if (task.mode === 'drop') {
          const t = Math.min(1, task.time / task.duration), b = config.ballHome;
          config.ball.position.set(mix(task.from.x, b.x, t), mix(task.from.y, b.y, t) + Math.sin(t * Math.PI) * .45, mix(task.from.z, b.z, t));
          config.ball.rotation.x += dt * 6; done = t === 1;
        } else {
          shaking = config.type === 'swim'; done = task.time >= task.duration;
        }
        if (heading !== null) root.rotation.y += Math.atan2(Math.sin(heading - root.rotation.y), Math.cos(heading - root.rotation.y)) * (1 - Math.exp(-dt * 12));
        if (done && active) startTask();
      }
      const result = { travelled, swimming, jumping, shaking, climbingLadder, carrying, completed: completion, failed: failure };
      completion = null; failure = false; return result;
    },
  };
}
