import * as THREE from 'three';

// Pool toys for the swim bear: a striped swim ring, a pair of fins and a kickboard.
// They are kept in the 물놀이 tray (an inventory above the button, see main.js) and put
// on by dragging them from the tray onto the bear. With the ring the bear sits up and
// drifts lazily; fins make it much faster; with the kickboard it holds the board out and just kicks.
//   parent      – group the toys live in (pool coordinates)
//   bearCentre  – () => Vector3, the bear's middle in parent coordinates
//   bearQuat    – () => Quaternion, the bear's orientation
//   bearHeight  – the bear's height
//   surfaceAt   – (x, z) => water height, inPool(x, z), groundY
//   onChange    – (gear) => void, called when something is put on or taken away
export function createPoolGear(parent, { bearCentre, bearQuat, bearHeight: H, surfaceAt, onChange }) {
  const group = new THREE.Group(); group.name = 'PoolGear'; parent.add(group);
  const gear = { tube: false, fins: false, board: false };
  const pop = { tube: 1, fins: 1, board: 1 };

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

  // ---- kickboard: the foam board beginners hold out in front while they kick
  const boardShape = new THREE.Shape();
  boardShape.moveTo(-.2, -.26); boardShape.lineTo(-.2, .08); boardShape.bezierCurveTo(-.2, .3, .2, .3, .2, .08); boardShape.lineTo(.2, -.26); boardShape.quadraticCurveTo(0, -.2, -.2, -.26);
  const boardGeo = new THREE.ExtrudeGeometry(boardShape, { depth: .05, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 3, curveSegments: 20 });
  boardGeo.translate(0, 0, -.025); boardGeo.scale(H * 1.5, H * 1.5, H * 1.5); boardGeo.rotateX(-Math.PI / 2);   // lies flat, rounded nose toward -z
  const board = new THREE.Mesh(boardGeo, new THREE.MeshPhysicalMaterial({ color: 0xf2d24b, roughness: .7, clearcoat: .15 }));
  board.name = 'Kickboard'; board.castShadow = true; group.add(board);
  const band = new THREE.Mesh(new THREE.BoxGeometry(H * .62, H * .012, H * .1), new THREE.MeshStandardMaterial({ color: 0x5fa8b8, roughness: .7 })); band.position.set(0, H * .07, H * .12); board.add(band);

  const tmp = new THREE.Vector3(), fwd = new THREE.Vector3(), qk = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
  const show = () => { tube.visible = gear.tube; fins.forEach(f => { f.visible = gear.fins; }); board.visible = gear.board; };
  show();

  return {
    gear, group,
    // put a toy on the bear or take it off
    set(key, on) { if (!(key in gear) || gear[key] === !!on) return; gear[key] = !!on; pop[key] = 0; show(); onChange({ ...gear }); },
    clear() { let any = false; for (const k in gear) { any ||= gear[k]; gear[k] = false; } show(); if (any) onChange({ ...gear }); },
    update(time, dt, camera, swimming) {
      if (!gear.tube && !gear.fins && !gear.board) return;
      const c = bearCentre(), bq = bearQuat();
      for (const k in pop) pop[k] = Math.min(1, pop[k] + dt * 4);
      const scale = k => { const p = pop[k]; return .4 + .6 * p + Math.sin(p * Math.PI) * .22; };   // pops on
      if (gear.tube) {
        tube.position.set(c.x, c.y - H * .2, c.z); tube.rotation.set(Math.sin(time * 1.7) * .05, 0, Math.cos(time * 1.3) * .05);
        tube.scale.setScalar(scale('tube'));
        // turn the near half toward the camera
        if (camera) { camera.getWorldPosition(tmp); parent.worldToLocal(tmp); tube.rotation.y = Math.atan2(tmp.x - tube.position.x, tmp.z - tube.position.z); }
      }
      if (gear.fins) fins.forEach((f, i) => {
        // on the feet: pointing on down the legs, kicking when swimming
        tmp.set(f.userData.side * H * .16, -H * .47, H * .02).applyQuaternion(bq); f.position.copy(c).add(tmp);
        const kick = swimming ? Math.sin(time * 13 + i * Math.PI) * .55 : Math.sin(time * 3 + i * Math.PI) * .08;
        qk.setFromAxisAngle(AX, Math.PI + kick + .25); f.quaternion.copy(bq).multiply(qk); f.scale.setScalar(scale('fins'));
      });
      if (gear.board) {
        const sc = scale('board');
        if (swimming && !gear.tube) {
          // held out in front on the water, nose first, bobbing with the kick
          fwd.set(0, 1, 0).applyQuaternion(bq); fwd.y = 0; fwd.normalize();
          board.position.set(c.x + fwd.x * H * .62, surfaceAt(c.x + fwd.x * H * .62, c.z + fwd.z * H * .62) + H * .03 + Math.sin(time * 9) * H * .01, c.z + fwd.z * H * .62);
          board.quaternion.setFromAxisAngle(AY, Math.atan2(-fwd.x, -fwd.z)).multiply(qk.setFromAxisAngle(AX, .1 + Math.sin(time * 9) * .04));
        } else {
          // out of the water (or in the ring): hugged to its tummy
          tmp.set(0, -H * .02, H * .34).applyQuaternion(bq); board.position.copy(c).add(tmp);
          board.quaternion.copy(bq).multiply(qk.setFromAxisAngle(AX, Math.PI / 2 - .15));
        }
        board.scale.setScalar(sc);
      }
    },
  };
}
