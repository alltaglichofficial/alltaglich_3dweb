import * as THREE from 'three';

// Makes the plush swim bear look like it is in the water, although the pool itself is drawn
// by a product viewer behind the scene (so nothing of it can hide the bear):
//   · the bear picture is cut at the water line; below it the same picture is drawn again,
//     faint and water-blue, as if seen through the water
//   · a ring of foam hugs the bear at the water line, ripples spread out from it, and a
//     little wake trails behind while it swims
// parent – the group the bear lives in; H – the bear's height; spread – how far the ripples run.
// Needs renderer.localClippingEnabled (main.js turns it on).
export function createWaterline(parent, plush, { H = plush.height, tint = 0x5fb2d6, spread = 1 } = {}) {
  const sprite = plush.sprite;
  const above = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), below = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  // the bear under the water: the same picture, tinted and faint
  const under = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite.material.map, color: tint, transparent: true, opacity: .42, depthWrite: false, clippingPlanes: [below] }));
  under.name = 'PlushUnderwater'; under.renderOrder = 2; under.visible = false; parent.add(under);

  const group = new THREE.Group(); group.name = 'BearWater'; parent.add(group);
  const ringMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  // foam where the body meets the water
  const foam = new THREE.Mesh(new THREE.RingGeometry(.3, .5, 48), ringMat()); foam.rotation.x = -Math.PI / 2; foam.renderOrder = 4; group.add(foam);
  // ripples spreading out
  const ripples = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(.94, 1, 64), ringMat()); m.rotation.x = -Math.PI / 2; m.renderOrder = 4; m.userData.age = 9; group.add(m); return m; });
  // wake: a few short trailing streaks
  // (the wake stays where it was left in the water, so it lives in its own group, not one that follows the bear)
  const trail = new THREE.Group(); trail.name = 'BearWake'; parent.add(trail);
  const wake = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ringMat()); m.rotation.x = -Math.PI / 2; m.renderOrder = 4; m.userData.age = 9; m.visible = false; trail.add(m); return m; });
  let next = 0, nextWake = 0, last = null, on = false, fade = 0, side = 1;
  const wp = new THREE.Vector3(), dir = new THREE.Vector3();

  return {
    // call after plush.update each frame. water: the water level under the bear (parent
    // coordinates) or null when it is out of the water; x, z: where the bear is.
    update(dt, water, x, z, reducedMotion = false) {
      const was = on; on = water !== null && water !== undefined;
      fade = THREE.MathUtils.clamp(fade + (on ? dt * 4 : -dt * 3), 0, 1);
      // cut the picture at the water line (world height)
      if (on) { wp.set(x, water, z); parent.localToWorld(wp); above.constant = -wp.y; below.constant = wp.y; }
      sprite.material.clippingPlanes = on ? [above] : null;
      under.visible = on && sprite.visible;
      if (under.visible) { under.position.copy(sprite.position); under.scale.copy(sprite.scale); under.center.copy(sprite.center); under.material.opacity = .42 * fade; }
      group.visible = fade > 0;
      if (!group.visible) { last = null; for (const w of wake) w.visible = false; return; }
      if (on) group.position.set(x, water + .01, z);
      // how fast and which way it is moving
      let speed = 0;
      if (on && last) { dir.set(x - last[0], 0, z - last[1]); speed = dir.length() / Math.max(dt, 1e-4); if (speed > 1e-4) dir.normalize(); }
      last = on ? [x, z] : null;
      const t = performance.now() / 1000;
      foam.scale.setScalar(H * (.95 + Math.sin(t * 5) * .05)); foam.material.opacity = .55 * fade;
      // ripples: a new one every so often, more often while it swims
      next -= dt;
      if (on && next <= 0 && !reducedMotion) { const r = ripples.find(m => m.userData.age >= 1) ?? ripples[0]; r.userData.age = 0; next = speed > .3 ? .45 : .9; }
      for (const r of ripples) {
        const a = r.userData.age = Math.min(9, r.userData.age + dt / 1.8);
        r.visible = a < 1; if (!r.visible) continue;
        r.scale.setScalar(H * (.45 + a * 1.6 * spread)); r.material.opacity = (1 - a) * .55 * fade;
      }
      // wake: short streaks left behind either side, pointing back along the way it swims
      nextWake -= dt;
      if (on && speed > .3 && nextWake <= 0 && !reducedMotion) {
        const w = wake.find(m => m.userData.age >= 1) ?? wake[0];
        w.userData.age = 0; side = -side; nextWake = .16;
        w.position.set(x - dir.x * H * .45 + dir.z * side * H * .22, water + .012, z - dir.z * H * .45 - dir.x * side * H * .22);
        w.rotation.set(-Math.PI / 2, 0, Math.atan2(dir.x, dir.z) + side * .35);
      }
      for (const w of wake) {
        const a = w.userData.age = Math.min(9, w.userData.age + dt / 1.1);
        w.visible = a < 1; if (!w.visible) continue;
        w.scale.set(H * .07, H * (.35 + a * .5), 1); w.material.opacity = (1 - a) * .5 * fade;
      }
    },
    hide() { sprite.material.clippingPlanes = null; under.visible = false; group.visible = false; for (const w of wake) w.visible = false; fade = 0; last = null; },
  };
}
