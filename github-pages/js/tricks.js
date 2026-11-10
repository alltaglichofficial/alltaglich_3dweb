const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export const TRICK_COMMANDS = ['paw', 'highfive', 'bang', 'greet'];

// Time-based poses are independent of frame rate and interruptible at any point.
export function createTricks() {
  let kind = null, time = 0;
  return {
    start(command) { if (!TRICK_COMMANDS.includes(command)) return false; kind = command; time = 0; return true; },
    cancel() { kind = null; time = 0; },
    snapshot() { return { kind, time }; },
    update(dt) {
      time += dt;
      const pose = { active: !!kind, kind, sit: 0, paw: 0, pawWave: 0, belly: 0, nod: 0, finished: false };
      if (!kind) return pose;
      if (kind === 'bang') { pose.belly = ease(time / .85); return pose; }
      if (kind === 'greet') pose.nod = Math.sin(Math.max(0, time - .25) * Math.PI * 3) * .28 * ease(time / .3) * ease((2.35 - time) / .4);
      else {
        pose.sit = ease(time / .4);
        pose.paw = ease((time - .3) / .55) * ease((2.9 - time) / .5) * (kind === 'highfive' ? 2.6 : 1.35);
        pose.pawWave = kind === 'highfive' ? Math.sin(time * 8) * .12 * pose.paw : 0;
      }
      if (time >= (kind === 'greet' ? 2.4 : 3)) { pose.finished = true; kind = null; }
      return pose;
    },
  };
}
