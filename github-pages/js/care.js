import * as THREE from 'three';
import { cylinder, ico, mesh } from './geometry.js';
import { advanceRoute } from './activities.js';

export function createDogCare(root) {
  const bowl = new THREE.Group(); bowl.name = 'SpitzFoodBowl'; bowl.visible = false;
  cylinder(bowl, .26, .31, .15, 0, .09, 0, 0xd7b9a0, 20);
  cylinder(bowl, .225, .225, .025, 0, .165, 0, 0x7f634c, 20);
  const rim = mesh(new THREE.TorusGeometry(.255, .035, 8, 28), 0xf1d9bf, [0, .17, 0], bowl); rim.rotation.x = Math.PI / 2;
  const food = new THREE.Group(); bowl.add(food);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, r = i === 0 ? 0 : .13;
    ico(food, .055, Math.cos(a) * r, .20 + (i % 3) * .012, Math.sin(a) * r, [0x98704b, 0xb18555, 0x7e593c][i % 3]);
  }
  let world, nav, mode = '', phase = '', points = [], timer = 0, petWarmth = 0, linger = 0;
  function cancel() { mode = ''; phase = ''; points = []; timer = 0; bowl.visible = false; petWarmth = 0; }
  return {
    get active() { return Boolean(mode); },
    get mode() { return mode; },
    setEnvironment(next, navigation) { cancel(); world = next; nav = navigation; world.root.add(bowl); },
    cancel,
    feed() {
      const target = world.island.spawn;
      const route = nav.findPath({ x: root.position.x, z: root.position.z }, target);
      if (!route.length) return false;
      cancel(); mode = 'feed'; phase = 'approach'; points = route; linger = 0;
      bowl.position.set(target.x, world.heightAt(target.x, target.z), target.z + .72);
      food.scale.setScalar(1); bowl.visible = true; return true;
    },
    pet() { if (!nav.isWalkable(root.position.x, root.position.z)) return false; cancel(); mode = 'pet'; phase = 'petting'; return true; },
    stroke() { if (mode !== 'pet') return false; petWarmth = 1.2; return true; },
    snapshot: () => ({ mode, phase, petWarmth, eatingProgress: mode === 'feed' && phase === 'eating' ? Math.min(1, timer / 3.2) : 0, bowlVisible: bowl.visible, foodScale: food.scale.x }),
    update(dt, time) {
      let travelled = 0, completed = false, failed = false;
      petWarmth = Math.max(0, petWarmth - dt);
      if (mode === 'feed') {
        if (phase === 'approach') {
          const result = advanceRoute(root.position, points, dt * 1.5, (x, z) => nav.isWalkable(x, z));
          travelled = result.travelled;
          if (result.heading !== null) root.rotation.y += Math.atan2(Math.sin(result.heading - root.rotation.y), Math.cos(result.heading - root.rotation.y)) * (1 - Math.exp(-dt * 10));
          root.position.y = world.heightAt(root.position.x, root.position.z);
          if (result.blocked) { cancel(); failed = true; }
          else if (result.done) { phase = 'eating'; timer = 0; }
        } else {
          timer += dt;
          root.rotation.y += Math.atan2(Math.sin(-root.rotation.y), Math.cos(-root.rotation.y)) * (1 - Math.exp(-dt * 9));
          food.scale.setScalar(Math.max(0, 1 - timer / 3.2));
          if (timer >= 3.2) { completed = true; mode = ''; phase = ''; linger = 1.5; }
        }
      } else if (!mode && bowl.visible) { linger -= dt; if (linger <= 0) bowl.visible = false; }
      return { travelled, completed, failed, eating: mode === 'feed' && phase === 'eating', petting: mode === 'pet' && petWarmth > 0, chew: Math.sin(time * 18) };
    },
  };
}
