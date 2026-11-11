import * as THREE from 'three';

// A big poolside floor lamp, designed for the swimming island: the stand is a
// polished stainless tube bent like a pool-ladder handrail, rising from a heavy
// round base and curving out over the water, where it ends in a wide, shallow
// shade shaped like a swim cap (white with a pool-blue rim band). The warm
// diffuser glows and throws a soft pool of light onto the water below.
export function createPoolLamp(parent, { x, z, groundY, reach = 5, height = 7.6, yaw = 0, scale = 1, lightSize = 6.2 * scale }) {
  const lamp = new THREE.Group(); lamp.name = 'PoolsideLamp'; lamp.position.set(x, groundY, z); lamp.rotation.y = yaw; lamp.scale.setScalar(scale); parent.add(lamp);
  const steel = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, metalness: 1, roughness: .18 });
  const enamel = new THREE.MeshPhysicalMaterial({ color: 0xf7f6f1, roughness: .32, clearcoat: .6, clearcoatRoughness: .2 });
  const band = new THREE.MeshPhysicalMaterial({ color: 0x5fa8b8, roughness: .35, clearcoat: .5 });
  const base = new THREE.MeshPhysicalMaterial({ color: 0x5fa8b8, roughness: .45, clearcoat: .3 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xfff1d6 });
  const add = (geo, mat, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; lamp.add(m); return m; };

  // heavy round base with a rubber foot ring and a steel collar for the tube
  const plinth = add(new THREE.CylinderGeometry(1.15, 1.25, .26, 56), base); plinth.position.y = .17;
  const foot = add(new THREE.TorusGeometry(1.18, .05, 10, 56), new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: .9 })); foot.rotation.x = Math.PI / 2; foot.position.y = .05;
  const collar = add(new THREE.CylinderGeometry(.2, .26, .32, 32), steel); collar.position.y = .46;

  // the handrail tube: straight up, a big bend over, a straight run out, and a
  // short bend down to the shade
  const r1 = 1.3, r2 = .7, run = Math.max(.5, reach - r1 - r2), up = height - r1;
  const pts = [];
  for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(0, .3 + (up - .3) * i / 8, 0));
  for (let i = 1; i <= 16; i++) { const a = i / 16 * Math.PI / 2; pts.push(new THREE.Vector3(r1 - Math.cos(a) * r1, up + Math.sin(a) * r1, 0)); }
  for (let i = 1; i <= 6; i++) pts.push(new THREE.Vector3(r1 + run * i / 6, height, 0));
  for (let i = 1; i <= 10; i++) { const a = i / 10 * Math.PI / 2; pts.push(new THREE.Vector3(r1 + run + Math.sin(a) * r2, height - r2 + Math.cos(a) * r2, 0)); }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  add(new THREE.TubeGeometry(curve, 160, .13, 20, false), steel);

  // shade: a shallow cap with a rolled rim and a blue band
  const tip = new THREE.Vector3(r1 + run + r2, height - r2, 0);
  const shade = new THREE.Group(); shade.position.copy(tip); lamp.add(shade);
  const capProfile = [];
  for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; capProfile.push(new THREE.Vector2(Math.max(.001, Math.sin(a) * 1.55), (Math.cos(a) - 1) * .72)); }
  const capGeo = new THREE.LatheGeometry(capProfile, 72);
  const cap = new THREE.Mesh(capGeo, enamel); cap.castShadow = false; cap.position.y = .02; shade.add(cap);
  enamel.side = THREE.DoubleSide;
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.565, 1.59, .2, 72, 1, true), band); stripe.position.y = -.62; shade.add(stripe);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.575, .045, 10, 72), enamel); lip.rotation.x = Math.PI / 2; lip.position.y = -.73; shade.add(lip);
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(.24, .28, .3, 24), steel); socket.position.y = .1; shade.add(socket);
  // frosted diffuser inside the cap, glowing warm
  const diffuser = new THREE.Mesh(new THREE.CircleGeometry(1.32, 64), glow); diffuser.rotation.x = Math.PI / 2; diffuser.position.y = -.5; shade.add(diffuser);

  // a soft pool of warm light on the water below (additive, so it brightens only)
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.45, 'rgba(255,255,255,.55)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const poolLight = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffd9a0, map: new THREE.CanvasTexture(c), transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false }));
  poolLight.rotation.x = -Math.PI / 2; poolLight.renderOrder = 5; parent.add(poolLight);
  lamp.updateMatrixWorld(true);
  const tipWorld = shade.getWorldPosition(new THREE.Vector3());
  return {
    object: lamp,
    materials: [steel, enamel, band, base],
    tip: tipWorld,
    // keep the light pool on the moving water surface
    update(surfaceAt) {
      const y = surfaceAt(tipWorld.x, tipWorld.z);
      poolLight.position.set(tipWorld.x, y + .03, tipWorld.z); poolLight.scale.setScalar(lightSize);
    },
    setMood(mood) {
      const dark = mood === 'dark';
      poolLight.material.opacity = dark ? .6 : .26;
      glow.color.setHex(dark ? 0xffe9c4 : 0xfff1d6);
    },
  };
}

// A big clip-on lamp, an original design for the swimming island: a pool-blue
// spring clamp bites onto the pool wall, a short steel stem rises to a ball joint,
// and a straight arm carries a deep round bowl shade (pool-blue enamel outside,
// white inside) that leans in over the water. A black cord loops from the shade
// back down to the clamp. The bulb glows and lights a soft pool on the water.
export function createClipLamp(parent, { x, z, rimY, wall = .45, aim, scale = 1 }) {
  const lamp = new THREE.Group(); lamp.name = 'PoolClipLamp'; lamp.position.set(x, rimY, z); parent.add(lamp);
  const steel = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, metalness: 1, roughness: .2 });
  const blue = new THREE.MeshPhysicalMaterial({ color: 0x5fa8b8, roughness: .32, clearcoat: .7, clearcoatRoughness: .15 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf6f5f0, roughness: .4, side: THREE.DoubleSide });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: .85 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xfff2d8 });
  const S = scale;
  const add = (geo, mat, at, parentObj = lamp) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; if (at) m.position.copy(at); parentObj.add(m); return m; };
  const V = (a, b, c) => new THREE.Vector3(a, b, c).multiplyScalar(S);
  const rbox = (w, h, d, r) => { const g = new THREE.ExtrudeGeometry(roundRect(w, h, r), { depth: d - r * .6, bevelEnabled: true, bevelThickness: r * .3, bevelSize: r * .3, bevelSegments: 3, curveSegments: 8 }); g.translate(0, 0, -(d - r * .6) / 2); return g; };

  // clamp: two jaws either side of the wall (+x is the pool side), joined over the rim
  const jawH = 1.25, jawW = 1.5, jawT = .16, gap = wall;
  const outer = add(rbox(jawT * S, jawH * S, jawW * S, .06 * S), blue, V(-jawT / 2 - .02, -jawH / 2 + .12, 0));
  const inner = add(rbox(jawT * S, jawH * .8 * S, jawW * S, .06 * S), blue, V(gap + jawT / 2 + .02, -jawH * .4 + .12, 0));
  for (const [jx, jy] of [[-.01, -jawH + .3], [gap + .01, -jawH * .8 + .3]]) add(new THREE.BoxGeometry(.05 * S, .4 * S, jawW * .8 * S), rubber, V(jx + (jx < 0 ? -0 : 0), jy, 0));
  add(rbox((gap + jawT * 2 + .1) * S, .24 * S, jawW * S, .08 * S), blue, V(gap / 2, .26, 0));
  // spring barrel and the two squeeze levers sweeping up and out over the outside
  const barrel = add(new THREE.CylinderGeometry(.17 * S, .17 * S, jawW * .9 * S, 24), steel, V(-.35, .45, 0)); barrel.rotation.x = Math.PI / 2;
  for (let i = 0; i < 7; i++) { const coil = add(new THREE.TorusGeometry(.19 * S, .035 * S, 6, 20), steel, V(-.35, .45, -jawW * .38 + i * jawW * .127)); }
  for (const dz of [-.45, .45]) {
    const lever = new THREE.CatmullRomCurve3([V(-.2, .38, dz), V(-.8, .55, dz), V(-1.45, 1.05, dz * 1.1), V(-1.75, 1.6, dz * 1.15)]);
    add(new THREE.TubeGeometry(lever, 30, .075 * S, 10, false), steel);
    add(new THREE.SphereGeometry(.13 * S, 16, 12), rubber, V(-1.75, 1.6, dz * 1.15));
  }
  // stem and ball joint
  const stemTop = V(gap / 2, 3.2, 0);
  add(new THREE.CylinderGeometry(.13 * S, .16 * S, (3.2 - .38) * S, 20), steel, V(gap / 2, (3.2 + .38) / 2, 0));
  add(new THREE.SphereGeometry(.34 * S, 24, 18), steel, stemTop);
  add(new THREE.CylinderGeometry(.16 * S, .16 * S, .22 * S, 18), rubber, stemTop.clone().add(V(0, 0, .38))).rotation.x = Math.PI / 2;

  // arm toward the aim point, then the shade
  const aimLocal = lamp.worldToLocal(parent.localToWorld(aim.clone()));
  const toAim = aimLocal.clone().sub(stemTop); toAim.y = 0; toAim.normalize();
  const elbow = stemTop.clone().addScaledVector(toAim, 2.4 * S).add(V(0, 1.3, 0));
  add(new THREE.TubeGeometry(new THREE.LineCurve3(stemTop, elbow), 4, .11 * S, 14, false), steel);
  add(new THREE.SphereGeometry(.22 * S, 18, 14), steel, elbow);
  const shade = new THREE.Group(); shade.position.copy(elbow); lamp.add(shade);
  const axis = aimLocal.clone().sub(elbow).normalize();                    // the shade looks at the aim point
  shade.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), axis);
  const R = 2.1 * S;
  const bowl = add(new THREE.SphereGeometry(R, 56, 24, 0, Math.PI * 2, 0, Math.PI * .42), blue, new THREE.Vector3(0, -R * .2, 0), shade);
  bowl.position.y = -R;                                            // pole at the joint, opening down the shade axis
  const lining = add(new THREE.SphereGeometry(R * .985, 56, 24, 0, Math.PI * 2, 0, Math.PI * .42), white, null, shade);
  lining.position.y = -R * .985 - .02 * S; lining.castShadow = false;
  const rimR = R * Math.sin(Math.PI * .42), lipY = -R + R * Math.cos(Math.PI * .42);
  const lip = add(new THREE.TorusGeometry(rimR, .06 * S, 10, 72), white, new THREE.Vector3(0, lipY, 0), shade); lip.rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(.32 * S, .26 * S, .5 * S, 20), steel, new THREE.Vector3(0, .15 * S, 0), shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.62 * S, 24, 16), glow); bulb.position.y = -R * .42; shade.add(bulb);
  // cord: from the back of the shade, a lazy loop, down to the clamp
  lamp.updateMatrixWorld(true);
  const back = shade.localToWorld(new THREE.Vector3(0, .1 * S, -.3 * S)), backL = lamp.worldToLocal(back.clone());
  const cord = new THREE.CatmullRomCurve3([backL, backL.clone().add(V(-.6, .9, .4)), stemTop.clone().add(V(-.9, .4, .5)), V(-.5, 1.6, .55), V(-.3, .5, .5)]);
  add(new THREE.TubeGeometry(cord, 60, .06 * S, 8, false), rubber);

  // light pool on the water around the aim point
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.45, 'rgba(255,255,255,.55)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const poolLight = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffd9a0, map: new THREE.CanvasTexture(c), transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false }));
  poolLight.rotation.x = -Math.PI / 2; poolLight.renderOrder = 5; parent.add(poolLight);
  const spot = aim.clone();
  return {
    object: lamp, materials: [steel, blue, white],
    update(surfaceAt) { poolLight.position.set(spot.x, surfaceAt(spot.x, spot.z) + .03, spot.z); poolLight.scale.setScalar(7.5 * Math.min(1.4, S)); },
    setMood(mood) { poolLight.material.opacity = mood === 'dark' ? .62 : .3; },
  };
}

function roundRect(w, h, r) {
  const s = new THREE.Shape(), x = w / 2, y = h / 2;
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}
