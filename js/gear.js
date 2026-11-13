import * as THREE from 'three';

// Pool toys for the swim bear: a striped swim ring and a pair of fins. They come out
// with the "물놀이" button, can be dragged about, and are put on by dropping them on
// the bear (or tapping them). With the ring the bear sits up and drifts lazily; with
// the fins it kicks along much faster.
//   parent      – group the toys live in (pool coordinates)
//   bearCentre  – () => Vector3, the bear's middle in parent coordinates
//   bearQuat    – () => Quaternion, the bear's orientation
//   bearHeight  – the bear's height
//   surfaceAt   – (x, z) => water height, inPool(x, z), groundY
//   onChange    – (gear) => void, called when something is put on or taken away
export function createPoolGear(parent, { bearCentre, bearQuat, bearHeight: H, surfaceAt, inPool, groundY, home, onChange }) {
  const group = new THREE.Group(); group.name = 'PoolGear'; parent.add(group);
  const gear = { tube: false, fins: false };
  let out = false, camera = null;

  // ---- swim ring: two half rings, so the half toward the camera can be drawn over the
  // (flat) bear picture and the far half behind it
  const stripe = document.createElement('canvas'); stripe.width = 256; stripe.height = 16;
  const sg = stripe.getContext('2d');
  for (let i = 0; i < 8; i++) { sg.fillStyle = i % 2 ? '#f7f5ee' : '#5fa8b8'; sg.fillRect(i * 32, 0, 32, 16); }
  const stripeTex = new THREE.CanvasTexture(stripe); stripeTex.colorSpace = THREE.SRGBColorSpace; stripeTex.wrapS = THREE.RepeatWrapping;
  const R = H * .4, TUBE_R = H * .15;
  const tube = new THREE.Group(); tube.name = 'SwimRing';
  const halves = [0, 1].map(i => {
    const geo = new THREE.TorusGeometry(R, TUBE_R, 18, 36, Math.PI); geo.rotateX(-Math.PI / 2);   // lies flat, arc on the -z side
    const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, (uv.getX(k) + i) * .5);   // stripes run on round the whole ring
    const mat = new THREE.MeshPhysicalMaterial({ map: stripeTex, roughness: .35, clearcoat: .6, clearcoatRoughness: .25 });
    const m = new THREE.Mesh(geo, mat); m.rotation.y = i ? Math.PI : 0; m.castShadow = true; tube.add(m); return m;
  });
  // halves[0] covers -z (far when the group faces the camera along +z), halves[1] covers +z (near)
  // (drawn with the see-through things, after the bear picture, so it can cover it)
  halves[1].material.transparent = true; halves[1].renderOrder = 6; halves[0].renderOrder = 2;
  group.add(tube);

  // ---- fins
  const finShape = new THREE.Shape();
  finShape.moveTo(-.11, 0); finShape.lineTo(.11, 0); finShape.bezierCurveTo(.16, .25, .3, .55, .32, .8);
  finShape.quadraticCurveTo(0, .9, -.32, .8); finShape.bezierCurveTo(-.3, .55, -.16, .25, -.11, 0);
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: .05, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2, curveSegments: 16 });
  finGeo.translate(0, 0, -.025); finGeo.scale(H * .62, H * .62, H * .62);
  const finMat = new THREE.MeshPhysicalMaterial({ color: 0xf0a04b, roughness: .5, clearcoat: .3 });
  const ribMat = new THREE.MeshStandardMaterial({ color: 0xd8823a, roughness: .6 });
  const fins = [-1, 1].map(side => {
    const f = new THREE.Group(); f.name = 'Fin';
    const blade = new THREE.Mesh(finGeo, finMat); blade.castShadow = true; f.add(blade);
    for (const x of [-.09, 0, .09]) { const rib = new THREE.Mesh(new THREE.BoxGeometry(H * .018, H * .36, H * .05), ribMat); rib.position.set(x * H, H * .28, 0); rib.rotation.z = -x * 2.2; f.add(rib); }
    const pocket = new THREE.Mesh(new THREE.CapsuleGeometry(H * .085, H * .08, 6, 12), ribMat); pocket.position.y = H * .04; pocket.scale.z = .6; f.add(pocket);
    f.userData.side = side; group.add(f); return f;
  });

  // ---- loose toys: where each one rests, and a little state for dragging
  const items = {
    tube: { key: 'tube', objects: [tube], pos: new THREE.Vector3(home.x - 1.6, 0, home.z + 2.5), held: false, pop: 0, spin: Math.random() * 6 },
    fins: { key: 'fins', objects: fins, pos: new THREE.Vector3(home.x + 2.2, 0, home.z + 3), held: false, pop: 0, spin: .5 },
  };
  group.visible = false;
  const tmp = new THREE.Vector3(), q = new THREE.Quaternion(), qk = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0), flat = new THREE.Quaternion().setFromAxisAngle(AX, -Math.PI / 2);
  const restY = (x, z) => inPool(x, z) ? surfaceAt(x, z) : groundY;
  const near = p => { const c = bearCentre(); return Math.hypot(p.x - c.x, p.z - c.z) < H * .95 && Math.abs(p.y - c.y) < H * 1.3; };
  const give = key => { if (gear[key]) return; gear[key] = true; items[key].pop = 0; onChange({ ...gear }); };

  const plane = new THREE.Plane(), hit = new THREE.Vector3(), normal = new THREE.Vector3(), offset = new THREE.Vector3();
  const target = item => ({
    get meshes() { const list = []; for (const o of item.objects) o.traverse(m => { if (m.isMesh) list.push(m); }); return list; },
    grab(point, cam) {
      if (gear[item.key]) { gear[item.key] = false; onChange({ ...gear }); item.pos.copy(bearCentre()); }   // pulled off the bear
      cam.getWorldDirection(normal); plane.setFromNormalAndCoplanarPoint(normal, point);
      offset.copy(parent.localToWorld(item.pos.clone())).sub(point); item.held = true;
    },
    drag(ray) { if (!item.held || !ray.intersectPlane(plane, hit)) return; parent.worldToLocal(item.pos.copy(hit).add(offset)); item.pos.y = Math.max(item.pos.y, restY(item.pos.x, item.pos.z)); },
    release() { item.held = false; if (near(item.pos)) give(item.key); },
    tap() { give(item.key); },   // a tap hands it straight to the bear
  });
  const targets = [target(items.tube), target(items.fins)];

  return {
    gear, group,
    get out() { return out; },
    get grabTargets() { return out ? targets : []; },
    // bring the toys out / put them away (taking them off the bear)
    toggle() {
      out = !out; group.visible = out;
      if (out) { for (const k in items) { items[k].pop = 0; items[k].held = false; } items.tube.pos.set(home.x - 1.6, 0, home.z + 2.5); items.fins.pos.set(home.x + 2.2, 0, home.z + 3); }
      else if (gear.tube || gear.fins) { gear.tube = gear.fins = false; onChange({ ...gear }); }
      return out;
    },
    update(time, dt, cam, swimming) {
      if (!out) return;
      camera = cam;
      const c = bearCentre(), bq = bearQuat();
      for (const k in items) { const it = items[k]; it.pop = Math.min(1, it.pop + dt * 4); }
      const popScale = it => { const p = it.pop; return 1 + Math.sin(p * Math.PI) * .25 * (1 - p) + (p - 1) * (1 - p); };

      // swim ring
      {
        const it = items.tube, s = .35 + .65 * popScale(it) * Math.min(1, it.pop * 1.4);
        if (gear.tube) { tube.position.set(c.x, c.y - H * .2, c.z); tube.rotation.set(Math.sin(time * 1.7) * .05, 0, Math.cos(time * 1.3) * .05); }
        else {
          if (!it.held) { const y = restY(it.pos.x, it.pos.z) + TUBE_R * (inPool(it.pos.x, it.pos.z) ? .35 : 1); it.pos.y += (y - it.pos.y) * Math.min(1, dt * 7); }
          tube.position.copy(it.pos); tube.rotation.set(Math.sin(time * 1.6 + 1) * .04, 0, Math.cos(time * 1.2) * .04);
        }
        tube.scale.setScalar(s);
        // turn the near half toward the camera
        if (camera) { camera.getWorldPosition(tmp); parent.worldToLocal(tmp); tube.rotation.y = Math.atan2(tmp.x - tube.position.x, tmp.z - tube.position.z); }
        // only the worn ring needs its near half drawn over the bear
        halves[1].material.depthTest = !gear.tube;
      }
      // fins
      {
        const it = items.fins, s = .35 + .65 * popScale(it) * Math.min(1, it.pop * 1.4);
        fins.forEach((f, i) => {
          const side = f.userData.side;
          if (gear.fins) {
            // on the feet: pointing on down the legs, kicking when swimming
            tmp.set(side * H * .16, -H * .47, H * .02).applyQuaternion(bq); f.position.copy(c).add(tmp);
            const kick = swimming ? Math.sin(time * 13 + i * Math.PI) * .55 : Math.sin(time * 3 + i * Math.PI) * .08;
            qk.setFromAxisAngle(AX, Math.PI + kick + .25);
            f.quaternion.copy(bq).multiply(qk);
          } else {
            if (!it.held) { const y = restY(it.pos.x, it.pos.z) + H * .03; it.pos.y += (y - it.pos.y) * Math.min(1, dt * 7); }
            f.position.set(it.pos.x + side * H * .2, it.pos.y, it.pos.z);
            q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.spin + side * .25); f.quaternion.copy(q).multiply(flat);
            if (it.held) f.rotation.z += Math.sin(time * 9 + i) * .08;
          }
          f.scale.setScalar(s);
        });
      }
    },
  };
}
