import * as THREE from 'three';

// Makes the plush swim bear look like it is in the water, although the pool itself is drawn
// by a product viewer behind the scene (so nothing of it can hide the bear):
//   · the bear picture is cut at the water line; below it the same picture is drawn again,
//     faint and water-blue, as if seen through the water
//   · little water drops splash up from its paws and feet in time with the strokes
// parent – the group the bear lives in; H – the bear's height; spread – how far the splashes fly.
// Needs renderer.localClippingEnabled (main.js turns it on).
export function createWaterline(parent, plush, { H = plush.height, tint = 0x5fb2d6, spread = 1 } = {}) {
  const sprite = plush.sprite;
  const above = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), below = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  // the bear under the water: the same picture, tinted and faint
  const under = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite.material.map, color: tint, transparent: true, opacity: .42, depthWrite: false, clippingPlanes: [below] }));
  under.name = 'PlushUnderwater'; under.renderOrder = 2; under.visible = false; parent.add(under);

  // splashes: little water drops thrown up by the paws and feet as it swims
  const COUNT = 90;
  const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, depthWrite: false, roughness: .03, ior: 1.33, clearcoat: 1, clearcoatRoughness: .02, specularIntensity: 1 });
  const dropTint = { value: new THREE.Color(.80, .92, .97) };   // the water colour of the drops (follows the print)
  dropMat.onBeforeCompile = shader => {
    shader.uniforms.uDropTint = dropTint;
    shader.fragmentShader = 'uniform vec3 uDropTint;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
      float rim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 1.8);
      float glint = saturate((max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b) - 1.0) * 1.2);
      gl_FragColor.rgb = mix(uDropTint, vec3(1.), glint) * mix(1.0, .82, rim);
      gl_FragColor.a = saturate(.45 + rim * .55 + glint * .8);`);
  };
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), dropMat, COUNT);
  mesh.name = 'BearSwimSplash'; mesh.frustumCulled = false; mesh.renderOrder = 4;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); parent.add(mesh);
  { const zero = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < COUNT; i++) mesh.setMatrixAt(i, zero); mesh.visible = false; }   // nothing until the first splash
  const drops = Array.from({ length: COUNT }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: 0, floor: 0 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), vdir = new THREE.Vector3();
  let next = 0, spawn = 0, last = null, on = false, fade = 0, beat = 0, live = 0;
  const wp = new THREE.Vector3(), dir = new THREE.Vector3(1, 0, 0);
  const G = 30 * H / 2.4;   // gravity, scaled to the bear
  function splash(x, y, z, n, power) {
    for (let k = 0; k < n; k++) {
      const d = drops[next++ % COUNT], a = Math.random() * Math.PI * 2, out = (.4 + Math.random() * .9) * power * H;
      d.p.set(x + Math.cos(a) * H * .06, y, z + Math.sin(a) * H * .06);
      d.v.set(Math.cos(a) * out, (1.6 + Math.random() * 1.8) * power * H, Math.sin(a) * out);
      d.r = H * (.018 + Math.random() * .03); d.life = 1.4; d.floor = y - H * .02;
    }
  }
  return {
    objects: [under, mesh],   // what it adds to the parent
    // match the water to the pool under the bear: tile colour (#rrggbb or THREE.Color)
    setWater(tile) {
      const c = new THREE.Color(tile);
      under.material.color.copy(c).lerp(new THREE.Color(1, 1, 1), .25);       // the bear seen through that water
      dropTint.value.copy(c).lerp(new THREE.Color(1, 1, 1), .55);            // drops: the same water, thin and light
    },
    // call after plush.update each frame. water: the water level under the bear (parent
    // coordinates) or null when it is out of the water; x, z: where the bear is.
    update(dt, water, x, z, reducedMotion = false) {
      on = water !== null && water !== undefined;
      fade = THREE.MathUtils.clamp(fade + (on ? dt * 4 : -dt * 3), 0, 1);
      // cut the picture at the water line (world height)
      if (on) { wp.set(x, water, z); parent.localToWorld(wp); above.constant = -wp.y; below.constant = wp.y; }
      sprite.material.clippingPlanes = on ? [above] : null;
      under.visible = on && sprite.visible;
      if (under.visible) { under.position.copy(sprite.position); under.scale.copy(sprite.scale); under.center.copy(sprite.center); under.material.opacity = .42 * fade; }
      // which way it is swimming
      let speed = 0;
      if (on && last) { const dx = x - last[0], dz = z - last[1], d = Math.hypot(dx, dz); speed = d / Math.max(dt, 1e-4); if (d > 1e-5) dir.set(dx / d, 0, dz / d); }
      last = on ? [x, z] : null;
      // splashes in time with the strokes: a paw at one side, then the other, and the kicking feet behind
      if (on && !reducedMotion) {
        const quick = speed > Math.min(.2, H * .25);   // swimming along (relative to the bear's size)
        beat += dt * (quick ? 3.2 : 1.2);
        const side = Math.floor(beat) % 2 ? 1 : -1, px = -dir.z, pz = dir.x;
        spawn -= dt;
        if (spawn <= 0) {
          spawn = quick ? .07 : .2;
          const fx = x + dir.x * H * .3 + px * side * H * .3, fz = z + dir.z * H * .3 + pz * side * H * .3;   // the paw coming down
          splash(fx, water, fz, quick ? 2 : 1, quick ? 1 : .55);
          if (quick && Math.random() < .6) splash(x - dir.x * H * .45, water, z - dir.z * H * .45, 1, .6);   // the feet
        }
      }
      // fly, fall back into the water and vanish
      live = 0;
      for (let i = 0; i < COUNT; i++) {
        const d = drops[i];
        if (d.life > 0) {
          d.life -= dt; d.v.y -= G * dt; d.p.addScaledVector(d.v, dt);
          if (d.p.y < d.floor && d.v.y < 0) d.life = 0;
        }
        if (d.life <= 0) { m4.makeScale(0, 0, 0); mesh.setMatrixAt(i, m4); continue; }
        live++;
        // stretched a little along the way it flies
        const v = d.v.length(); vdir.copy(d.v).divideScalar(v || 1); q.setFromUnitVectors(up, vdir);
        const st = 1 + Math.min(1.2, v / (H * 6)); sc.set(d.r, d.r * st, d.r);
        m4.compose(d.p, q, sc); mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true; mesh.visible = live > 0;
    },
    hide() { sprite.material.clippingPlanes = null; under.visible = false; for (const d of drops) d.life = 0; mesh.visible = false; fade = 0; last = null; },
  };
}
